import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "./audit";

// ─── Input Schema ────────────────────────────────────────────────────────────

const QuoteNormalizationInputSchema = z.object({
  quoteRequestId: z.string().min(1),
});

export type QuoteNormalizationInput = z.infer<
  typeof QuoteNormalizationInputSchema
>;

// ─── Constants ───────────────────────────────────────────────────────────────

const STANDARD_CATEGORIES = [
  "basic_services",
  "cremation",
  "container",
  "transport",
  "permits",
  "death_certificates",
  "ceremony",
  "other",
] as const;

type LineItemCategory = (typeof STANDARD_CATEGORIES)[number];

// Keywords that map to standard categories
const CATEGORY_KEYWORDS: Record<LineItemCategory, string[]> = {
  basic_services: [
    "basic",
    "professional",
    "overhead",
    "staff",
    "coordination",
    "arrangement",
    "administrative",
    "service fee",
    "professional fee",
    "basic services",
  ],
  cremation: [
    "cremation",
    "crematory",
    "incineration",
    "direct cremation",
  ],
  container: [
    "casket",
    "coffin",
    "urn",
    "container",
    "vault",
    "outer burial",
    "alternative container",
  ],
  transport: [
    "transport",
    "transfer",
    "hearse",
    "vehicle",
    "removal",
    "delivery",
    "mileage",
    "shipping",
  ],
  permits: [
    "permit",
    "filing",
    "legal",
    "documentation",
    "paperwork",
  ],
  death_certificates: [
    "death certificate",
    "certificate",
    "certified cop",
  ],
  ceremony: [
    "ceremony",
    "memorial",
    "visitation",
    "viewing",
    "service",
    "chapel",
    "funeral service",
    "graveside",
    "reception",
    "flowers",
    "music",
    "program",
    "obituary",
  ],
  other: [],
};

// Thresholds for flagging potentially hidden fees
const HIGH_AMOUNT_THRESHOLDS: Partial<Record<LineItemCategory, number>> = {
  basic_services: 3500,
  transport: 1500,
  permits: 500,
  death_certificates: 200,
  other: 2000,
};

// ─── Output Types ────────────────────────────────────────────────────────────

export interface ParsedLineItem {
  category: LineItemCategory;
  description: string;
  amount: number;
  isRequired: boolean;
  isFlagged: boolean;
  flagReason: string | null;
}

export interface QuoteNormalizationResult {
  quoteRequestId: string;
  totalPrice: number;
  lineItemCount: number;
  flaggedCount: number;
  lineItems: ParsedLineItem[];
  status: string;
}

// ─── Parsing Logic ───────────────────────────────────────────────────────────

function categorizeDescription(description: string): LineItemCategory {
  const lower = description.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === "other") continue;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return category as LineItemCategory;
      }
    }
  }

  return "other";
}

function parseAmount(raw: string): number | null {
  // Remove currency symbols, commas, whitespace
  const cleaned = raw.replace(/[$,\s]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.round(num * 100); // Store as cents
}

function parseRawContent(rawContent: string): ParsedLineItem[] {
  const items: ParsedLineItem[] = [];
  const lines = rawContent.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Try common patterns:
    // "Description: $1,234"
    // "Description - $1,234"
    // "Description ... $1,234"
    // "$1,234 - Description"
    // "Description  1234"

    let description = "";
    let amountStr = "";

    // Pattern 1: amount at end — "Description: $1,234.56"
    const endAmountMatch = line.match(
      /^(.+?)[\s:.\-|]+\$?\s*([\d,]+\.?\d*)\s*$/
    );
    if (endAmountMatch) {
      description = endAmountMatch[1].trim();
      amountStr = endAmountMatch[2];
    }

    // Pattern 2: amount at start — "$1,234.56 - Description"
    if (!description) {
      const startAmountMatch = line.match(
        /^\$?\s*([\d,]+\.?\d*)\s*[\s:.\-|]+(.+)$/
      );
      if (startAmountMatch) {
        amountStr = startAmountMatch[1];
        description = startAmountMatch[2].trim();
      }
    }

    // Pattern 3: tab-separated — "Description\t1234"
    if (!description) {
      const tabMatch = line.match(/^(.+?)\t+\$?\s*([\d,]+\.?\d*)\s*$/);
      if (tabMatch) {
        description = tabMatch[1].trim();
        amountStr = tabMatch[2];
      }
    }

    if (!description || !amountStr) {
      // Could not parse this line — skip but it might be a header/footer
      continue;
    }

    const amount = parseAmount(amountStr);
    if (amount === null || amount <= 0) continue;

    const category = categorizeDescription(description);
    const threshold = HIGH_AMOUNT_THRESHOLDS[category];
    const amountDollars = amount / 100;

    let isFlagged = false;
    let flagReason: string | null = null;

    // Flag if category is "other" (not standard)
    if (category === "other") {
      isFlagged = true;
      flagReason = `Item "${description}" does not match any standard service category.`;
    }

    // Flag if amount is unusually high for the category
    if (threshold && amountDollars > threshold) {
      isFlagged = true;
      flagReason = flagReason
        ? `${flagReason} Amount ($${amountDollars}) exceeds typical range for ${category} ($${threshold}).`
        : `Amount ($${amountDollars}) exceeds typical range for ${category} ($${threshold}).`;
    }

    items.push({
      category,
      description,
      amount,
      isRequired: category !== "other",
      isFlagged,
      flagReason,
    });
  }

  return items;
}

// ─── Implementation ──────────────────────────────────────────────────────────

export async function runQuoteNormalization(
  params: QuoteNormalizationInput
): Promise<QuoteNormalizationResult> {
  const input = QuoteNormalizationInputSchema.parse(params);

  // Load the quote request
  const quoteRequest = await prisma.quoteRequest.findUniqueOrThrow({
    where: { id: input.quoteRequestId },
    include: { lineItems: true, vendor: true },
  });

  if (!quoteRequest.rawContent) {
    throw new Error(
      `QuoteRequest ${input.quoteRequestId} has no rawContent to normalize.`
    );
  }

  // Parse the raw content into structured line items
  const parsedItems = parseRawContent(quoteRequest.rawContent);

  // Calculate total
  const totalPrice = parsedItems.reduce((sum, item) => sum + item.amount, 0);
  const flaggedCount = parsedItems.filter((item) => item.isFlagged).length;

  // Delete existing line items if re-normalizing
  if (quoteRequest.lineItems.length > 0) {
    await prisma.quoteLineItem.deleteMany({
      where: { quoteRequestId: input.quoteRequestId },
    });
  }

  // Create QuoteLineItem records
  for (const item of parsedItems) {
    await prisma.quoteLineItem.create({
      data: {
        quoteRequestId: input.quoteRequestId,
        category: item.category,
        description: item.description,
        amount: item.amount,
        isRequired: item.isRequired,
        isFlagged: item.isFlagged,
        flagReason: item.flagReason,
      },
    });
  }

  // Update QuoteRequest with total and status
  const newStatus =
    flaggedCount > 0 ? "normalized_with_flags" : "normalized";

  await prisma.quoteRequest.update({
    where: { id: input.quoteRequestId },
    data: {
      totalPrice,
      status: newStatus,
    },
  });

  // Write audit log
  await logAudit({
    caseId: quoteRequest.caseId,
    actorType: "AGENT",
    actionType: "QUOTE_NORMALIZED",
    summary: `Normalized quote from ${quoteRequest.vendor.name}: ${parsedItems.length} line item(s), total $${(totalPrice / 100).toFixed(2)}, ${flaggedCount} flagged.`,
    payload: {
      quoteRequestId: input.quoteRequestId,
      vendorId: quoteRequest.vendorId,
      vendorName: quoteRequest.vendor.name,
      lineItemCount: parsedItems.length,
      totalPrice,
      totalPriceDollars: (totalPrice / 100).toFixed(2),
      flaggedCount,
      status: newStatus,
      lineItems: parsedItems.map((item) => ({
        category: item.category,
        description: item.description,
        amount: item.amount,
        isFlagged: item.isFlagged,
        flagReason: item.flagReason,
      })),
    },
  });

  return {
    quoteRequestId: input.quoteRequestId,
    totalPrice,
    lineItemCount: parsedItems.length,
    flaggedCount,
    lineItems: parsedItems,
    status: newStatus,
  };
}
