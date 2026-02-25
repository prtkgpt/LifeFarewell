import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "./audit";

// ─── Input Schema ────────────────────────────────────────────────────────────

const RecommendationInputSchema = z.object({
  caseId: z.string().min(1),
});

export type RecommendationInput = z.infer<typeof RecommendationInputSchema>;

// ─── Output Types ────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  value: number;        // 0-30: price vs services
  speed: number;        // 0-25: availability
  transparency: number; // 0-25: fewer flagged items
  completeness: number; // 0-20: complete line item coverage
}

export interface VendorRecommendation {
  vendorId: string;
  vendorName: string;
  quoteRequestId: string;
  totalPrice: number;
  totalPriceDollars: string;
  scores: ScoreBreakdown;
  totalScore: number;
  rank: number;
  rationale: string;
}

export interface RecommendationResult {
  caseId: string;
  budgetTarget: number | null;
  budgetMax: number | null;
  recommendations: VendorRecommendation[];
}

// ─── Scoring Logic ───────────────────────────────────────────────────────────

const STANDARD_CATEGORIES = [
  "basic_services",
  "cremation",
  "container",
  "transport",
  "permits",
  "death_certificates",
  "ceremony",
];

function scoreValue(
  totalPrice: number,
  lineItemCount: number,
  budgetTarget: number | null,
  budgetMax: number | null
): number {
  let score = 15; // baseline

  // Price relative to budget
  if (budgetTarget !== null && totalPrice > 0) {
    const ratio = totalPrice / budgetTarget;
    if (ratio <= 0.8) {
      score += 15; // well under budget
    } else if (ratio <= 1.0) {
      score += 12; // at or just under
    } else if (ratio <= 1.2) {
      score += 6; // slightly over target but acceptable
    } else if (budgetMax !== null && totalPrice <= budgetMax) {
      score += 3; // over target but within max
    } else {
      score -= 5; // over budget max
    }
  }

  // More services at lower price = better value
  if (lineItemCount >= 5 && totalPrice > 0) {
    const costPerItem = totalPrice / lineItemCount;
    if (costPerItem < 50000) score += 3; // < $500 per item average
  }

  return Math.max(0, Math.min(30, score));
}

function scoreSpeed(vendor: {
  priceRange: string | null;
  services: string[];
}): number {
  // In a real system, this would check actual availability data.
  // For MVP, we use heuristics based on vendor data.
  let score = 15; // baseline

  // Vendors with more services tend to have better availability
  if (vendor.services.length >= 5) {
    score += 5;
  } else if (vendor.services.length >= 3) {
    score += 3;
  }

  // Direct cremation providers tend to have faster turnaround
  const hasDirect = vendor.services.some((s) =>
    s.toLowerCase().includes("direct")
  );
  if (hasDirect) {
    score += 5;
  }

  return Math.max(0, Math.min(25, score));
}

function scoreTransparency(
  lineItemCount: number,
  flaggedCount: number
): number {
  if (lineItemCount === 0) return 0;

  // Start high, deduct for flagged items
  const flagRatio = flaggedCount / lineItemCount;
  let score = 25;

  if (flagRatio > 0.5) {
    score -= 20; // more than half flagged — very opaque
  } else if (flagRatio > 0.3) {
    score -= 15;
  } else if (flagRatio > 0.1) {
    score -= 8;
  } else if (flaggedCount > 0) {
    score -= 3; // minor flags
  }

  return Math.max(0, Math.min(25, score));
}

function scoreCompleteness(categories: string[]): number {
  // Check how many standard categories are covered
  const uniqueCategories = new Set(categories);
  const covered = STANDARD_CATEGORIES.filter((c) =>
    uniqueCategories.has(c)
  ).length;

  // Score based on coverage ratio
  const ratio = covered / STANDARD_CATEGORIES.length;

  if (ratio >= 0.8) return 20;
  if (ratio >= 0.6) return 15;
  if (ratio >= 0.4) return 10;
  if (ratio >= 0.2) return 5;
  return 2;
}

function buildRationale(params: {
  vendorName: string;
  totalPriceDollars: string;
  scores: ScoreBreakdown;
  totalScore: number;
  rank: number;
  flaggedCount: number;
  lineItemCount: number;
  budgetTarget: number | null;
}): string {
  const parts: string[] = [];
  const {
    vendorName,
    totalPriceDollars,
    scores,
    rank,
    flaggedCount,
    lineItemCount,
    budgetTarget,
  } = params;

  parts.push(
    `${vendorName} is ranked #${rank} with an overall score of ${params.totalScore}/100.`
  );

  // Value commentary
  if (budgetTarget !== null) {
    const price = parseFloat(totalPriceDollars);
    if (price <= budgetTarget / 100) {
      parts.push(
        `Priced at $${totalPriceDollars}, this option is within the target budget of $${(budgetTarget / 100).toFixed(2)}.`
      );
    } else {
      parts.push(
        `Priced at $${totalPriceDollars}, this exceeds the target budget of $${(budgetTarget / 100).toFixed(2)}.`
      );
    }
  } else {
    parts.push(`Total quoted price: $${totalPriceDollars}.`);
  }

  // Transparency commentary
  if (flaggedCount === 0 && lineItemCount > 0) {
    parts.push("The quote has no flagged items, indicating good transparency.");
  } else if (flaggedCount > 0) {
    parts.push(
      `${flaggedCount} of ${lineItemCount} line items were flagged for review, which may indicate unclear pricing.`
    );
  }

  // Completeness commentary
  if (scores.completeness >= 15) {
    parts.push(
      "The quote provides comprehensive coverage across service categories."
    );
  } else if (scores.completeness >= 10) {
    parts.push("The quote covers most standard service categories.");
  } else {
    parts.push(
      "The quote is missing several standard categories — the family may want to confirm what's included."
    );
  }

  return parts.join(" ");
}

// ─── Implementation ──────────────────────────────────────────────────────────

// Local types for Prisma query results
interface LoadedLineItem {
  id: string;
  category: string;
  description: string;
  amount: number;
  isRequired: boolean;
  isFlagged: boolean;
  flagReason: string | null;
}

interface LoadedQuoteRequest {
  id: string;
  caseId: string;
  vendorId: string;
  totalPrice: number | null;
  vendor: {
    id: string;
    name: string;
    priceRange: string | null;
    services: string[];
  };
  lineItems: LoadedLineItem[];
}

export async function runRecommendation(
  params: RecommendationInput
): Promise<RecommendationResult> {
  const input = RecommendationInputSchema.parse(params);

  // Load case
  const caseRecord = await prisma.case.findUniqueOrThrow({
    where: { id: input.caseId },
  });

  // Load all normalized quotes for this case
  const quoteRequests = (await prisma.quoteRequest.findMany({
    where: {
      caseId: input.caseId,
      totalPrice: { not: null },
      lineItems: { some: {} }, // has at least one line item
    },
    include: {
      vendor: true,
      lineItems: true,
    },
  })) as unknown as LoadedQuoteRequest[];

  if (quoteRequests.length === 0) {
    await logAudit({
      caseId: input.caseId,
      userId: caseRecord.userId,
      actorType: "AGENT",
      actionType: "RECOMMENDATION_SKIPPED",
      summary: "No normalized quotes available to generate recommendations.",
    });

    return {
      caseId: input.caseId,
      budgetTarget: caseRecord.budgetTarget,
      budgetMax: caseRecord.budgetMax,
      recommendations: [],
    };
  }

  // Score each quote
  const scored: VendorRecommendation[] = quoteRequests.map((qr) => {
    const flaggedCount = qr.lineItems.filter((li) => li.isFlagged).length;
    const categories = qr.lineItems.map((li) => li.category);

    const scores: ScoreBreakdown = {
      value: scoreValue(
        qr.totalPrice!,
        qr.lineItems.length,
        caseRecord.budgetTarget,
        caseRecord.budgetMax
      ),
      speed: scoreSpeed({
        priceRange: qr.vendor.priceRange,
        services: qr.vendor.services,
      }),
      transparency: scoreTransparency(qr.lineItems.length, flaggedCount),
      completeness: scoreCompleteness(categories),
    };

    const totalScore =
      scores.value + scores.speed + scores.transparency + scores.completeness;

    const totalPriceDollars = (qr.totalPrice! / 100).toFixed(2);

    return {
      vendorId: qr.vendorId,
      vendorName: qr.vendor.name,
      quoteRequestId: qr.id,
      totalPrice: qr.totalPrice!,
      totalPriceDollars,
      scores,
      totalScore,
      rank: 0, // will be set after sorting
      rationale: "", // will be set after ranking
    };
  });

  // Sort by total score descending
  scored.sort((a, b) => b.totalScore - a.totalScore);

  // Assign ranks and build rationales
  const recommendations = scored.map((rec, idx) => {
    const rank = idx + 1;
    const qr = quoteRequests.find((q) => q.id === rec.quoteRequestId)!;
    const flaggedCount = qr.lineItems.filter((li) => li.isFlagged).length;

    const rationale = buildRationale({
      vendorName: rec.vendorName,
      totalPriceDollars: rec.totalPriceDollars,
      scores: rec.scores,
      totalScore: rec.totalScore,
      rank,
      flaggedCount,
      lineItemCount: qr.lineItems.length,
      budgetTarget: caseRecord.budgetTarget,
    });

    return { ...rec, rank, rationale };
  });

  // Write audit log
  await logAudit({
    caseId: input.caseId,
    userId: caseRecord.userId,
    actorType: "AGENT",
    actionType: "RECOMMENDATION_GENERATED",
    summary: `Generated ${recommendations.length} recommendation(s). Top: ${recommendations[0]?.vendorName ?? "none"} (score: ${recommendations[0]?.totalScore ?? 0}/100).`,
    payload: {
      budgetTarget: caseRecord.budgetTarget,
      budgetMax: caseRecord.budgetMax,
      quoteCount: quoteRequests.length,
      recommendations: recommendations.map((r) => ({
        rank: r.rank,
        vendorId: r.vendorId,
        vendorName: r.vendorName,
        totalScore: r.totalScore,
        totalPriceDollars: r.totalPriceDollars,
        scores: r.scores,
      })),
    },
  });

  return {
    caseId: input.caseId,
    budgetTarget: caseRecord.budgetTarget,
    budgetMax: caseRecord.budgetMax,
    recommendations,
  };
}
