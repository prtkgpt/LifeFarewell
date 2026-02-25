import { z } from "zod";
import { MessageStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getEmailDisclosure,
  getSmsDisclosure,
  enforceDisclosure,
} from "@/lib/disclosure/templates";
import { logAudit } from "./audit";

// ─── Input Schema ────────────────────────────────────────────────────────────

const NegotiationInputSchema = z.object({
  caseId: z.string().min(1),
  vendorId: z.string().min(1),
  quoteRequestId: z.string().min(1),
});

export type NegotiationInput = z.infer<typeof NegotiationInputSchema>;

// ─── Output Types ────────────────────────────────────────────────────────────

export interface NegotiationDraft {
  type: "email" | "sms";
  id: string;
  status: MessageStatus;
  approvalId: string;
  body: string;
}

export interface NegotiationResult {
  caseId: string;
  vendorId: string;
  quoteRequestId: string;
  strategy: string;
  drafts: NegotiationDraft[];
}

// ─── Negotiation Strategy ────────────────────────────────────────────────────

type NegotiationStrategy = "REQUEST_CLARIFICATION" | "REQUEST_BETTER_PRICING" | "REQUEST_ITEMIZATION";

function determineStrategy(params: {
  totalPrice: number | null;
  budgetTarget: number | null;
  budgetMax: number | null;
  lineItemCount: number;
  flaggedItemCount: number;
}): { strategy: NegotiationStrategy; reason: string } {
  const { totalPrice, budgetTarget, budgetMax, lineItemCount, flaggedItemCount } =
    params;

  // If there are flagged items, request clarification first
  if (flaggedItemCount > 0) {
    return {
      strategy: "REQUEST_CLARIFICATION",
      reason: `${flaggedItemCount} line item(s) flagged for potential hidden fees or unclear descriptions.`,
    };
  }

  // If no line items yet, request itemization
  if (lineItemCount === 0) {
    return {
      strategy: "REQUEST_ITEMIZATION",
      reason: "Quote lacks itemized breakdown. Requesting detailed line items.",
    };
  }

  // If total exceeds budget, request better pricing
  if (
    totalPrice !== null &&
    budgetMax !== null &&
    totalPrice > budgetMax
  ) {
    return {
      strategy: "REQUEST_BETTER_PRICING",
      reason: `Quote total ($${totalPrice}) exceeds budget maximum ($${budgetMax}).`,
    };
  }

  if (
    totalPrice !== null &&
    budgetTarget !== null &&
    totalPrice > budgetTarget * 1.2
  ) {
    return {
      strategy: "REQUEST_BETTER_PRICING",
      reason: `Quote total ($${totalPrice}) is more than 20% above target budget ($${budgetTarget}).`,
    };
  }

  // Default: request clarification on services included
  return {
    strategy: "REQUEST_CLARIFICATION",
    reason: "Requesting general clarification on services and inclusions.",
  };
}

function generateNegotiationEmailBody(params: {
  vendorName: string;
  strategy: NegotiationStrategy;
  reason: string;
  totalPrice: number | null;
  budgetTarget: number | null;
  flaggedItems: Array<{ description: string; flagReason: string | null }>;
}): { subject: string; body: string } {
  const { vendorName, strategy, flaggedItems, totalPrice, budgetTarget } = params;

  let subject: string;
  let body: string;

  switch (strategy) {
    case "REQUEST_CLARIFICATION": {
      subject = `Follow-up questions about your quote`;
      const questions = flaggedItems.length > 0
        ? flaggedItems
            .map(
              (item, i) =>
                `${i + 1}. "${item.description}" — ${item.flagReason ?? "Could you clarify what this includes?"}`
            )
            .join("\n")
        : "Could you clarify exactly what services are included in your quoted price?";

      body = [
        `Dear ${vendorName},`,
        ``,
        `Thank you for providing your quote. Before the family makes a decision, we have a few clarifying questions:`,
        ``,
        questions,
        ``,
        `We want to make sure we have a complete understanding of all costs involved. Your transparency is greatly appreciated.`,
        ``,
        `Thank you,`,
        `LifeFarewell Assistant`,
      ].join("\n");
      break;
    }

    case "REQUEST_BETTER_PRICING": {
      subject = `Pricing discussion for funeral services`;
      body = [
        `Dear ${vendorName},`,
        ``,
        `Thank you for your quote${totalPrice ? ` of $${totalPrice}` : ""}. The family is carefully reviewing options from several providers.`,
        ``,
        budgetTarget
          ? `The family's budget target is around $${budgetTarget}. Is there any flexibility in your pricing, or are there alternative service packages that might fit closer to their budget?`
          : `The family is working within a specific budget. Is there any flexibility in your pricing, or are there alternative packages available?`,
        ``,
        `We understand the value of your services and are not looking to cut corners on quality — just want to explore all available options.`,
        ``,
        `Thank you for your understanding,`,
        `LifeFarewell Assistant`,
      ].join("\n");
      break;
    }

    case "REQUEST_ITEMIZATION": {
      subject = `Request for itemized pricing`;
      body = [
        `Dear ${vendorName},`,
        ``,
        `Thank you for your response. To help the family make an informed comparison, could you provide an itemized breakdown of your pricing?`,
        ``,
        `Specifically, we would like to see individual costs for:`,
        `- Basic services and overhead`,
        `- Any preparation or handling`,
        `- Container or casket`,
        `- Transportation`,
        `- Permits and documentation`,
        `- Ceremony or visitation`,
        `- Any other applicable charges`,
        ``,
        `This will help us ensure a clear and fair comparison. Thank you for your time.`,
        ``,
        `Best regards,`,
        `LifeFarewell Assistant`,
      ].join("\n");
      break;
    }
  }

  return { subject, body };
}

function generateNegotiationSmsBody(params: {
  vendorName: string;
  strategy: NegotiationStrategy;
}): string {
  switch (params.strategy) {
    case "REQUEST_CLARIFICATION":
      return `Hi ${params.vendorName}, thank you for the quote. The family has a few clarifying questions — could you provide more detail on what's included? We'll follow up by email shortly.`;
    case "REQUEST_BETTER_PRICING":
      return `Hi ${params.vendorName}, thank you for the quote. The family is reviewing options and wanted to ask if there's any flexibility in pricing or alternative packages available. We'll send details via email.`;
    case "REQUEST_ITEMIZATION":
      return `Hi ${params.vendorName}, thank you for your response. Could you provide an itemized breakdown of your pricing? We'll follow up by email with specifics.`;
  }
}

// ─── Implementation ──────────────────────────────────────────────────────────

export async function runNegotiation(
  params: NegotiationInput
): Promise<NegotiationResult> {
  const input = NegotiationInputSchema.parse(params);

  // Load case, vendor, quote
  const caseRecord = await prisma.case.findUniqueOrThrow({
    where: { id: input.caseId },
    include: { communicationPolicy: true },
  });

  const vendor = await prisma.vendor.findUniqueOrThrow({
    where: { id: input.vendorId },
  });

  const quoteRequest = await prisma.quoteRequest.findUniqueOrThrow({
    where: { id: input.quoteRequestId },
    include: { lineItems: true },
  });

  const policy = caseRecord.communicationPolicy;
  const disclosureMode = policy?.disclosureMode ?? "FULL";
  const contactFirstName = policy?.contactFirstName ?? null;

  // Determine negotiation strategy
  const flaggedItems = quoteRequest.lineItems
    .filter((li: { isFlagged: boolean }) => li.isFlagged)
    .map((li: { description: string; flagReason: string | null }) => ({
      description: li.description,
      flagReason: li.flagReason,
    }));

  const { strategy, reason } = determineStrategy({
    totalPrice: quoteRequest.totalPrice,
    budgetTarget: caseRecord.budgetTarget,
    budgetMax: caseRecord.budgetMax,
    lineItemCount: quoteRequest.lineItems.length,
    flaggedItemCount: flaggedItems.length,
  });

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
        subject: `Negotiation with ${vendor.name}`,
        status: "active",
      },
    });
  }

  const drafts: NegotiationDraft[] = [];

  // ── Email Draft ─────────────────────────────────────────────────────────
  // Negotiation always creates drafts with PENDING_APPROVAL — never commits or confirms
  if (vendor.email && (policy?.allowEmail ?? true)) {
    const disclosure = getEmailDisclosure({
      mode: disclosureMode,
      contactFirstName,
    });

    const emailDraft = generateNegotiationEmailBody({
      vendorName: vendor.name,
      strategy,
      reason,
      totalPrice: quoteRequest.totalPrice,
      budgetTarget: caseRecord.budgetTarget,
      flaggedItems,
    });

    const bodyWithDisclosure = enforceDisclosure(emailDraft.body, disclosure);

    const emailRecord = await prisma.emailMessage.create({
      data: {
        caseId: input.caseId,
        threadId: thread.id,
        toAddress: vendor.email,
        subject: emailDraft.subject,
        body: bodyWithDisclosure,
        disclosureText: disclosure,
        status: MessageStatus.PENDING_APPROVAL,
      },
    });

    const approval = await prisma.pendingApproval.create({
      data: {
        caseId: input.caseId,
        userId: caseRecord.userId,
        type: "EMAIL",
        status: "PENDING",
        title: `Approve negotiation email to ${vendor.name}`,
        summary: `Negotiation follow-up (${strategy.toLowerCase().replace(/_/g, " ")}): ${reason}`,
        payload: {
          emailMessageId: emailRecord.id,
          strategy,
          reason,
          toAddress: vendor.email,
          subject: emailDraft.subject,
          bodyPreview: bodyWithDisclosure.slice(0, 200),
        },
        referenceId: emailRecord.id,
      },
    });

    drafts.push({
      type: "email",
      id: emailRecord.id,
      status: MessageStatus.PENDING_APPROVAL,
      approvalId: approval.id,
      body: bodyWithDisclosure,
    });
  }

  // ── SMS Draft ───────────────────────────────────────────────────────────
  if (vendor.phone && (policy?.allowSms ?? true)) {
    const disclosure = getSmsDisclosure({
      mode: disclosureMode,
      contactFirstName,
    });

    const smsBody = generateNegotiationSmsBody({
      vendorName: vendor.name,
      strategy,
    });

    const bodyWithDisclosure = enforceDisclosure(smsBody, disclosure);

    const smsRecord = await prisma.smsMessage.create({
      data: {
        caseId: input.caseId,
        threadId: thread.id,
        toNumber: vendor.phone,
        body: bodyWithDisclosure,
        disclosureText: disclosure,
        status: MessageStatus.PENDING_APPROVAL,
      },
    });

    const approval = await prisma.pendingApproval.create({
      data: {
        caseId: input.caseId,
        userId: caseRecord.userId,
        type: "SMS",
        status: "PENDING",
        title: `Approve negotiation SMS to ${vendor.name}`,
        summary: `Negotiation follow-up (${strategy.toLowerCase().replace(/_/g, " ")}): ${reason}`,
        payload: {
          smsMessageId: smsRecord.id,
          strategy,
          reason,
          toNumber: vendor.phone,
          bodyPreview: bodyWithDisclosure.slice(0, 160),
        },
        referenceId: smsRecord.id,
      },
    });

    drafts.push({
      type: "sms",
      id: smsRecord.id,
      status: MessageStatus.PENDING_APPROVAL,
      approvalId: approval.id,
      body: bodyWithDisclosure,
    });
  }

  // Write audit log
  await logAudit({
    caseId: input.caseId,
    userId: caseRecord.userId,
    actorType: "AGENT",
    actionType: "NEGOTIATION_DRAFT",
    summary: `Negotiation with ${vendor.name}: strategy=${strategy}. ${drafts.length} draft(s) created pending approval.`,
    payload: {
      vendorId: input.vendorId,
      vendorName: vendor.name,
      quoteRequestId: input.quoteRequestId,
      strategy,
      reason,
      totalPrice: quoteRequest.totalPrice,
      budgetTarget: caseRecord.budgetTarget,
      budgetMax: caseRecord.budgetMax,
      flaggedItemCount: flaggedItems.length,
      draftCount: drafts.length,
    },
  });

  return {
    caseId: input.caseId,
    vendorId: input.vendorId,
    quoteRequestId: input.quoteRequestId,
    strategy,
    drafts,
  };
}
