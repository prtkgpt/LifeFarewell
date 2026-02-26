import { z } from "zod";
import { ApprovalLevel, CallStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateTts } from "@/lib/comms/elevenlabs";
import { initiateCall, buildTwiml } from "@/lib/comms/twilio";
import { getCallDisclosure, enforceDisclosure } from "@/lib/disclosure/templates";
import { logAudit } from "./audit";

// ─── Input Schema ────────────────────────────────────────────────────────────

const CallingInputSchema = z.object({
  caseId: z.string().min(1),
  vendorId: z.string().min(1),
});

export type CallingInput = z.infer<typeof CallingInputSchema>;

// ─── Output Types ────────────────────────────────────────────────────────────

export interface CallingResult {
  caseId: string;
  vendorId: string;
  callId: string;
  callStatus: CallStatus;
  ttsAssetId: string | null;
  approvalId: string | null;
  script: string;
}

// ─── Call Script Generation ──────────────────────────────────────────────────

function generateCallScript(params: {
  vendorName: string;
  disclosure: string;
  contactFirstName?: string | null;
  city?: string | null;
  goalSummary?: string | null;
}): string {
  const locationRef = params.city ? ` in ${params.city}` : "";
  const contactRef = params.contactFirstName
    ? params.contactFirstName
    : "a family member";

  const lines = [
    // Disclosure is always first
    params.disclosure,
    ``,
    `I'm reaching out to ${params.vendorName} on behalf of ${contactRef} who is coordinating funeral arrangements${locationRef}.`,
    ``,
    `I have a few questions, if you have a moment:`,
    ``,
    `First, could you give me an overview of your services and a general price range for a standard arrangement?`,
    ``,
    `Second, what is your current availability? The family would like to proceed as soon as possible.`,
    ``,
    params.goalSummary
      ? `The family has mentioned the following needs: ${params.goalSummary}.`
      : `The family is exploring options and would appreciate any information you can share.`,
    ``,
    `Third, are there any additional fees or costs we should be aware of beyond the quoted services?`,
    ``,
    `Thank you very much for your time. We appreciate your compassion and assistance.`,
  ];

  return lines.join("\n");
}

// ─── Implementation ──────────────────────────────────────────────────────────

export async function runCalling(
  params: CallingInput
): Promise<CallingResult> {
  const input = CallingInputSchema.parse(params);

  // Load case and policy
  const caseRecord = await prisma.case.findUniqueOrThrow({
    where: { id: input.caseId },
    include: { communicationPolicy: true },
  });

  // Load vendor
  const vendor = await prisma.vendor.findUniqueOrThrow({
    where: { id: input.vendorId },
  });

  if (!vendor.phone) {
    throw new Error(
      `Vendor ${vendor.name} (${vendor.id}) does not have a phone number on file.`
    );
  }

  const policy = caseRecord.communicationPolicy;
  const approvalLevel = policy?.approvalLevel ?? ApprovalLevel.LEVEL_1_REVIEW_ALL;
  const disclosureMode = policy?.disclosureMode ?? "FULL";
  const contactFirstName = policy?.contactFirstName ?? null;

  // Determine if auto-execute is allowed
  // LEVEL_1: requires approval
  // LEVEL_2 and LEVEL_3 (MVP: treat LEVEL_3 as LEVEL_2): auto-execute
  const autoExecute =
    approvalLevel === ApprovalLevel.LEVEL_2_AUTO_OUTREACH ||
    approvalLevel === ApprovalLevel.LEVEL_3_AUTO_EXECUTE_LIMITED;

  // Generate disclosure text
  const disclosure = getCallDisclosure({
    mode: disclosureMode,
    contactFirstName,
  });

  // Generate call script
  const script = generateCallScript({
    vendorName: vendor.name,
    disclosure,
    contactFirstName,
    city: caseRecord.city,
    goalSummary: caseRecord.goalSummary,
  });

  // Ensure disclosure is present
  const finalScript = enforceDisclosure(script, disclosure);

  // Generate TTS audio
  let ttsAssetId: string | null = null;
  let ttsAudioUrl: string | null = null;
  let ttsVoiceId: string | null = null;

  try {
    const ttsResult = await generateTts({ text: finalScript });
    ttsAudioUrl = ttsResult.audioUrl;
    ttsVoiceId = ttsResult.voiceId;

    const ttsAsset = await prisma.ttsAsset.create({
      data: {
        text: finalScript,
        voiceId: ttsResult.voiceId,
        audioUrl: ttsResult.audioUrl,
      },
    });
    ttsAssetId = ttsAsset.id;
  } catch (err) {
    console.error("[CallingAgent] TTS generation failed:", err);
    // Continue without TTS — we can fall back to Twilio's built-in TTS
  }

  // Find or create conversation thread
  let thread = await prisma.vendorConversationThread.findFirst({
    where: {
      caseId: input.caseId,
      vendorId: input.vendorId,
    },
  });

  if (!thread) {
    thread = await prisma.vendorConversationThread.create({
      data: {
        caseId: input.caseId,
        vendorId: input.vendorId,
        subject: `Call to ${vendor.name}`,
        status: "active",
      },
    });
  }

  // Determine initial call status
  let callStatus: CallStatus = CallStatus.DRAFT;
  let providerCallSid: string | null = null;

  if (autoExecute) {
    // Build TwiML and initiate call
    try {
      const twiml = buildTwiml({
        playUrl: ttsAudioUrl ?? undefined,
        sayText: ttsAudioUrl ? undefined : finalScript,
      });

      const callResult = await initiateCall({
        to: vendor.phone,
        twiml,
      });

      providerCallSid = callResult.sid;
      callStatus =
        callResult.status === "SIMULATED"
          ? CallStatus.SIMULATED
          : CallStatus.INITIATED;
    } catch (err) {
      console.error("[CallingAgent] Call initiation failed:", err);
      callStatus = CallStatus.FAILED;
    }
  } else {
    callStatus = CallStatus.PENDING_APPROVAL;
  }

  // Create Call record
  const callRecord = await prisma.call.create({
    data: {
      caseId: input.caseId,
      threadId: thread.id,
      toNumber: vendor.phone,
      script: finalScript,
      disclosureText: disclosure,
      status: callStatus,
      providerCallSid,
      ttsAudioUrl,
      ttsVoiceId,
      startedAt:
        callStatus === CallStatus.INITIATED ||
        callStatus === CallStatus.SIMULATED
          ? new Date()
          : null,
    },
  });

  // Update TTS asset with call reference
  if (ttsAssetId) {
    await prisma.ttsAsset.update({
      where: { id: ttsAssetId },
      data: { callId: callRecord.id },
    });
  }

  // Create PendingApproval if needed
  let approvalId: string | null = null;
  if (!autoExecute) {
    const approval = await prisma.pendingApproval.create({
      data: {
        caseId: input.caseId,
        userId: caseRecord.userId,
        type: "CALL",
        status: "PENDING",
        title: `Approve call to ${vendor.name}`,
        summary: `Phone call to ${vendor.name} (${vendor.phone}) to request pricing, availability, and service details.`,
        payload: {
          callId: callRecord.id,
          toNumber: vendor.phone,
          scriptPreview: finalScript.slice(0, 300),
          hasTtsAudio: !!ttsAudioUrl,
        },
        referenceId: callRecord.id,
      },
    });
    approvalId = approval.id;
  }

  // Write audit log
  await logAudit({
    caseId: input.caseId,
    userId: caseRecord.userId,
    actorType: "AGENT",
    actionType: "CALL_CREATED",
    summary: `Call to ${vendor.name} (${vendor.phone}): status=${callStatus}, autoExecute=${autoExecute}.`,
    payload: {
      vendorId: input.vendorId,
      vendorName: vendor.name,
      callId: callRecord.id,
      callStatus,
      ttsAssetId,
      approvalId,
      autoExecute,
    },
  });

  return {
    caseId: input.caseId,
    vendorId: input.vendorId,
    callId: callRecord.id,
    callStatus,
    ttsAssetId,
    approvalId,
    script: finalScript,
  };
}
