import { z } from "zod";
import { ApprovalLevel, MessageStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/comms/resend";
import { sendSms } from "@/lib/comms/twilio";
import {
  getEmailDisclosure,
  getSmsDisclosure,
  enforceDisclosure,
} from "@/lib/disclosure/templates";
import { logAudit } from "./audit";

// ─── Input Schema ────────────────────────────────────────────────────────────

const OutreachInputSchema = z.object({
  caseId: z.string().min(1),
  vendorId: z.string().min(1),
});

export type OutreachInput = z.infer<typeof OutreachInputSchema>;

// ─── Output Types ────────────────────────────────────────────────────────────

export interface OutreachMessageRecord {
  type: "email" | "sms";
  id: string;
  status: MessageStatus;
  requiresApproval: boolean;
  approvalId?: string;
}

export interface OutreachResult {
  caseId: string;
  vendorId: string;
  threadId: string;
  messages: OutreachMessageRecord[];
}

// ─── Email / SMS Draft Generation ────────────────────────────────────────────

function generateEmailBody(params: {
  vendorName: string;
  contactFirstName?: string | null;
  city?: string | null;
  goalSummary?: string | null;
}): { subject: string; body: string } {
  const contactRef = params.contactFirstName
    ? params.contactFirstName
    : "a family member";
  const locationRef = params.city ? ` in ${params.city}` : "";

  const subject = `Inquiry about funeral services${locationRef}`;
  const body = [
    `Dear ${params.vendorName},`,
    ``,
    `I am reaching out on behalf of ${contactRef} who is coordinating funeral arrangements${locationRef}. We are gathering information and pricing from local providers to help the family make an informed decision.`,
    ``,
    params.goalSummary
      ? `The family is looking for: ${params.goalSummary}`
      : `The family would appreciate information about your available services and general pricing.`,
    ``,
    `Could you please provide:`,
    `1. A general price list or quote for your services`,
    `2. Current availability`,
    `3. Any additional services you offer`,
    ``,
    `Thank you for your time and compassion during this difficult period.`,
    ``,
    `Best regards,`,
    `LifeFarewell Assistant`,
  ].join("\n");

  return { subject, body };
}

function generateSmsBody(params: {
  vendorName: string;
  contactFirstName?: string | null;
  city?: string | null;
}): string {
  const contactRef = params.contactFirstName
    ? params.contactFirstName
    : "a family";
  const locationRef = params.city ? ` in ${params.city}` : "";
  return `Hi ${params.vendorName}, I'm assisting ${contactRef} with funeral arrangements${locationRef}. Could you share your general pricing and availability? Thank you.`;
}

// ─── Implementation ──────────────────────────────────────────────────────────

export async function runOutreach(
  params: OutreachInput
): Promise<OutreachResult> {
  const input = OutreachInputSchema.parse(params);

  // Load case with communication policy
  const caseRecord = await prisma.case.findUniqueOrThrow({
    where: { id: input.caseId },
    include: { communicationPolicy: true },
  });

  // Load vendor
  const vendor = await prisma.vendor.findUniqueOrThrow({
    where: { id: input.vendorId },
  });

  const policy = caseRecord.communicationPolicy;
  const approvalLevel = policy?.approvalLevel ?? ApprovalLevel.LEVEL_1_REVIEW_ALL;
  const disclosureMode = policy?.disclosureMode ?? "FULL";
  const contactFirstName = policy?.contactFirstName ?? null;

  // Determine if auto-send is allowed
  // LEVEL_1: everything needs approval
  // LEVEL_2 and LEVEL_3 (MVP: treat LEVEL_3 as LEVEL_2): auto-send outreach
  const autoSend =
    approvalLevel === ApprovalLevel.LEVEL_2_AUTO_OUTREACH ||
    approvalLevel === ApprovalLevel.LEVEL_3_AUTO_EXECUTE_LIMITED;

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
        subject: `Outreach to ${vendor.name}`,
        status: "active",
      },
    });
  }

  const messages: OutreachMessageRecord[] = [];

  // ── Send Email ──────────────────────────────────────────────────────────
  if (vendor.email && (policy?.allowEmail ?? true)) {
    const disclosure = getEmailDisclosure({
      mode: disclosureMode,
      contactFirstName,
    });

    const draft = generateEmailBody({
      vendorName: vendor.name,
      contactFirstName,
      city: caseRecord.city,
      goalSummary: caseRecord.goalSummary,
    });

    const bodyWithDisclosure = enforceDisclosure(draft.body, disclosure);

    let emailStatus: MessageStatus = MessageStatus.DRAFT;
    let providerId: string | null = null;

    if (autoSend) {
      try {
        const result = await sendEmail({
          to: vendor.email,
          subject: draft.subject,
          body: bodyWithDisclosure,
        });
        providerId = result.id;
        emailStatus =
          result.status === "SIMULATED"
            ? MessageStatus.SIMULATED
            : MessageStatus.SENT;
      } catch (err) {
        console.error("[OutreachAgent] Email send failed:", err);
        emailStatus = MessageStatus.FAILED;
      }
    } else {
      emailStatus = MessageStatus.PENDING_APPROVAL;
    }

    const emailRecord = await prisma.emailMessage.create({
      data: {
        caseId: input.caseId,
        threadId: thread.id,
        toAddress: vendor.email,
        subject: draft.subject,
        body: bodyWithDisclosure,
        disclosureText: disclosure,
        status: emailStatus,
        providerId,
        sentAt:
          emailStatus === MessageStatus.SENT ||
          emailStatus === MessageStatus.SIMULATED
            ? new Date()
            : null,
      },
    });

    const record: OutreachMessageRecord = {
      type: "email",
      id: emailRecord.id,
      status: emailStatus,
      requiresApproval: !autoSend,
    };

    // Create PendingApproval if needed
    if (!autoSend) {
      const approval = await prisma.pendingApproval.create({
        data: {
          caseId: input.caseId,
          userId: caseRecord.userId,
          type: "EMAIL",
          status: "PENDING",
          title: `Approve email to ${vendor.name}`,
          summary: `Email outreach to ${vendor.name} (${vendor.email}) requesting pricing and availability.`,
          payload: {
            emailMessageId: emailRecord.id,
            toAddress: vendor.email,
            subject: draft.subject,
            bodyPreview: bodyWithDisclosure.slice(0, 200),
          },
          referenceId: emailRecord.id,
        },
      });
      record.approvalId = approval.id;
    }

    messages.push(record);
  }

  // ── Send SMS ────────────────────────────────────────────────────────────
  if (vendor.phone && (policy?.allowSms ?? true)) {
    const disclosure = getSmsDisclosure({
      mode: disclosureMode,
      contactFirstName,
    });

    const smsBody = generateSmsBody({
      vendorName: vendor.name,
      contactFirstName,
      city: caseRecord.city,
    });

    const bodyWithDisclosure = enforceDisclosure(smsBody, disclosure);

    let smsStatus: MessageStatus = MessageStatus.DRAFT;
    let providerId: string | null = null;

    if (autoSend) {
      try {
        const result = await sendSms({
          to: vendor.phone,
          body: bodyWithDisclosure,
        });
        providerId = result.sid;
        smsStatus =
          result.status === "SIMULATED"
            ? MessageStatus.SIMULATED
            : MessageStatus.SENT;
      } catch (err) {
        console.error("[OutreachAgent] SMS send failed:", err);
        smsStatus = MessageStatus.FAILED;
      }
    } else {
      smsStatus = MessageStatus.PENDING_APPROVAL;
    }

    const smsRecord = await prisma.smsMessage.create({
      data: {
        caseId: input.caseId,
        threadId: thread.id,
        toNumber: vendor.phone,
        body: bodyWithDisclosure,
        disclosureText: disclosure,
        status: smsStatus,
        providerId,
        sentAt:
          smsStatus === MessageStatus.SENT ||
          smsStatus === MessageStatus.SIMULATED
            ? new Date()
            : null,
      },
    });

    const record: OutreachMessageRecord = {
      type: "sms",
      id: smsRecord.id,
      status: smsStatus,
      requiresApproval: !autoSend,
    };

    // Create PendingApproval if needed
    if (!autoSend) {
      const approval = await prisma.pendingApproval.create({
        data: {
          caseId: input.caseId,
          userId: caseRecord.userId,
          type: "SMS",
          status: "PENDING",
          title: `Approve SMS to ${vendor.name}`,
          summary: `SMS outreach to ${vendor.name} (${vendor.phone}) requesting pricing and availability.`,
          payload: {
            smsMessageId: smsRecord.id,
            toNumber: vendor.phone,
            bodyPreview: bodyWithDisclosure.slice(0, 160),
          },
          referenceId: smsRecord.id,
        },
      });
      record.approvalId = approval.id;
    }

    messages.push(record);
  }

  // Write audit log
  await logAudit({
    caseId: input.caseId,
    userId: caseRecord.userId,
    actorType: "AGENT",
    actionType: "OUTREACH_SENT",
    summary: `Outreach to ${vendor.name}: ${messages.length} message(s) created. Auto-send: ${autoSend}.`,
    payload: {
      vendorId: input.vendorId,
      vendorName: vendor.name,
      threadId: thread.id,
      approvalLevel,
      autoSend,
      messages: messages.map((m) => ({
        type: m.type,
        id: m.id,
        status: m.status,
        requiresApproval: m.requiresApproval,
      })),
    },
  });

  return {
    caseId: input.caseId,
    vendorId: input.vendorId,
    threadId: thread.id,
    messages,
  };
}
