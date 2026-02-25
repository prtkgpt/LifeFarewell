import { z } from "zod";
import { PipelineStage } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { logAudit } from "./audit";

// ─── Input Schema ────────────────────────────────────────────────────────────

const OrchestratorInputSchema = z.object({
  caseId: z.string().min(1),
});

export type OrchestratorInput = z.infer<typeof OrchestratorInputSchema>;

// ─── Output Types ────────────────────────────────────────────────────────────

export interface NextAction {
  actionType:
    | "DISCOVER_VENDORS"
    | "SEND_OUTREACH"
    | "FOLLOW_UP"
    | "NORMALIZE_QUOTE"
    | "COMPARE_QUOTES"
    | "GENERATE_RECOMMENDATION"
    | "INITIATE_CALL"
    | "NEGOTIATE"
    | "AWAIT_USER_DECISION";
  description: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  targetVendorId?: string;
  targetQuoteRequestId?: string;
}

export interface OrchestratorResult {
  caseId: string;
  previousStage: PipelineStage;
  currentStage: PipelineStage;
  nextActions: NextAction[];
}

// ─── Stage Transition Logic ──────────────────────────────────────────────────

function determineStage(context: {
  shortlistCount: number;
  outreachSentCount: number;
  quotesReceivedCount: number;
  quotesNormalizedCount: number;
  totalVendorsContacted: number;
}): PipelineStage {
  const {
    shortlistCount,
    outreachSentCount,
    quotesReceivedCount,
    quotesNormalizedCount,
  } = context;

  // If we have normalized quotes and at least 2 responses, move to COMPARISON
  if (quotesNormalizedCount >= 2) {
    return PipelineStage.COMPARISON;
  }

  // If we have received quotes, we're in RESPONSES stage
  if (quotesReceivedCount > 0) {
    return PipelineStage.RESPONSES;
  }

  // If outreach has been sent, we're in OUTREACH stage
  if (outreachSentCount > 0) {
    return PipelineStage.OUTREACH;
  }

  // If we have a shortlist but haven't reached out yet, still DISCOVERY
  // (need to transition to OUTREACH once outreach begins)
  if (shortlistCount > 0) {
    return PipelineStage.DISCOVERY;
  }

  return PipelineStage.DISCOVERY;
}

// ─── Implementation ──────────────────────────────────────────────────────────

export async function runOrchestrator(
  params: OrchestratorInput
): Promise<OrchestratorResult> {
  const input = OrchestratorInputSchema.parse(params);

  const caseRecord = await prisma.case.findUniqueOrThrow({
    where: { id: input.caseId },
    include: {
      vendorShortlists: { include: { vendor: true } },
      quoteRequests: { include: { lineItems: true } },
      emailMessages: true,
      smsMessages: true,
      calls: true,
      communicationPolicy: true,
      checklistItems: true,
      pendingApprovals: true,
    },
  });

  const previousStage = caseRecord.pipelineStage;

  // Count key metrics
  const shortlistCount = caseRecord.vendorShortlists.length;

  const sentStatuses: string[] = ["SENT", "DELIVERED", "SIMULATED"];
  const outreachSentCount =
    caseRecord.emailMessages.filter((e: { status: string }) =>
      sentStatuses.includes(e.status)
    ).length +
    caseRecord.smsMessages.filter((s: { status: string }) =>
      sentStatuses.includes(s.status)
    ).length;

  const quotesReceivedCount = caseRecord.quoteRequests.filter(
    (q: { rawContent: string | null }) => q.rawContent !== null
  ).length;

  const quotesNormalizedCount = caseRecord.quoteRequests.filter(
    (q: { totalPrice: number | null; lineItems: unknown[] }) =>
      q.totalPrice !== null && q.lineItems.length > 0
  ).length;

  const totalVendorsContacted = new Set([
    ...caseRecord.emailMessages
      .filter((e: { status: string }) => sentStatuses.includes(e.status))
      .map((e: { threadId: string | null }) => e.threadId),
    ...caseRecord.smsMessages
      .filter((s: { status: string }) => sentStatuses.includes(s.status))
      .map((s: { threadId: string | null }) => s.threadId),
  ]).size;

  // Determine new stage
  const newStage = determineStage({
    shortlistCount,
    outreachSentCount,
    quotesReceivedCount,
    quotesNormalizedCount,
    totalVendorsContacted,
  });

  // Build next actions
  const nextActions: NextAction[] = [];

  // DISCOVERY: need vendors
  if (shortlistCount === 0) {
    nextActions.push({
      actionType: "DISCOVER_VENDORS",
      description: "Search for matching vendors in the case area",
      priority: "HIGH",
    });
  }

  // DISCOVERY -> OUTREACH: vendors shortlisted but not contacted
  const uncontactedVendors = caseRecord.vendorShortlists.filter(
    (vs: { vendor: { email: string | null; phone: string | null; name: string }; vendorId: string }) => {
      const hasEmail = caseRecord.emailMessages.some(
        (e: { toAddress: string; status: string }) =>
          e.toAddress === vs.vendor.email && sentStatuses.includes(e.status)
      );
      const hasSms = caseRecord.smsMessages.some(
        (s: { toNumber: string; status: string }) =>
          s.toNumber === vs.vendor.phone && sentStatuses.includes(s.status)
      );
      return !hasEmail && !hasSms;
    }
  );

  for (const vs of uncontactedVendors) {
    nextActions.push({
      actionType: "SEND_OUTREACH",
      description: `Send initial outreach to ${vs.vendor.name}`,
      priority: "HIGH",
      targetVendorId: vs.vendorId,
    });
  }

  // OUTREACH -> RESPONSES: vendors contacted but no quote yet
  const vendorsAwaitingQuote = caseRecord.vendorShortlists.filter(
    (vs: { vendor: { email: string | null; phone: string | null; name: string }; vendorId: string }) => {
      const hasQuote = caseRecord.quoteRequests.some(
        (q: { vendorId: string; rawContent: string | null }) =>
          q.vendorId === vs.vendorId && q.rawContent !== null
      );
      const wasContacted =
        caseRecord.emailMessages.some(
          (e: { toAddress: string; status: string }) =>
            e.toAddress === vs.vendor.email && sentStatuses.includes(e.status)
        ) ||
        caseRecord.smsMessages.some(
          (s: { toNumber: string; status: string }) =>
            s.toNumber === vs.vendor.phone && sentStatuses.includes(s.status)
        );
      return wasContacted && !hasQuote;
    }
  );

  for (const vs of vendorsAwaitingQuote) {
    nextActions.push({
      actionType: "FOLLOW_UP",
      description: `Follow up with ${vs.vendor.name} for a quote`,
      priority: "MEDIUM",
      targetVendorId: vs.vendorId,
    });
  }

  // RESPONSES: normalize received but un-normalized quotes
  const unnormalizedQuotes = caseRecord.quoteRequests.filter(
    (q: { rawContent: string | null; lineItems: unknown[]; id: string }) =>
      q.rawContent !== null && q.lineItems.length === 0
  );

  for (const q of unnormalizedQuotes) {
    nextActions.push({
      actionType: "NORMALIZE_QUOTE",
      description: `Parse and normalize quote from vendor`,
      priority: "HIGH",
      targetQuoteRequestId: q.id,
    });
  }

  // COMPARISON: enough normalized quotes to compare
  if (quotesNormalizedCount >= 2) {
    nextActions.push({
      actionType: "GENERATE_RECOMMENDATION",
      description: "Generate ranked recommendations from normalized quotes",
      priority: "HIGH",
    });
  }

  // If we're in COMPARISON with recommendations ready, await user decision
  if (
    newStage === PipelineStage.COMPARISON &&
    quotesNormalizedCount >= 2 &&
    nextActions.every((a) => a.actionType !== "NORMALIZE_QUOTE")
  ) {
    nextActions.push({
      actionType: "AWAIT_USER_DECISION",
      description:
        "All quotes compared \u2014 present recommendations and await user decision",
      priority: "HIGH",
    });
  }

  // Sort actions by priority
  const priorityOrder: Record<string, number> = {
    HIGH: 0,
    MEDIUM: 1,
    LOW: 2,
  };
  nextActions.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  // Update pipeline stage if it changed
  let currentStage = previousStage;
  if (newStage !== previousStage) {
    // Only advance forward, never regress
    const stageOrder: PipelineStage[] = [
      PipelineStage.DISCOVERY,
      PipelineStage.OUTREACH,
      PipelineStage.RESPONSES,
      PipelineStage.COMPARISON,
      PipelineStage.DECISION,
    ];
    const prevIdx = stageOrder.indexOf(previousStage);
    const newIdx = stageOrder.indexOf(newStage);

    if (newIdx > prevIdx) {
      await prisma.case.update({
        where: { id: input.caseId },
        data: { pipelineStage: newStage },
      });
      currentStage = newStage;
    }
  }

  // Write audit log
  await logAudit({
    caseId: input.caseId,
    userId: caseRecord.userId,
    actorType: "AGENT",
    actionType: "ORCHESTRATOR_RUN",
    summary: `Orchestrator evaluated case. Stage: ${previousStage} -> ${currentStage}. ${nextActions.length} action(s) recommended.`,
    payload: {
      previousStage,
      currentStage,
      nextActions,
      metrics: {
        shortlistCount,
        outreachSentCount,
        quotesReceivedCount,
        quotesNormalizedCount,
        totalVendorsContacted,
      },
    },
  });

  return {
    caseId: input.caseId,
    previousStage,
    currentStage,
    nextActions,
  };
}
