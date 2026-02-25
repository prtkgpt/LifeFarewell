import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import {
  Award,
  AlertTriangle,
  BarChart3,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const CATEGORY_LABELS: Record<string, string> = {
  basic_services: "Basic Services",
  cremation: "Cremation",
  container: "Container / Casket",
  transport: "Transportation",
  permits: "Permits & Filing",
  death_certificates: "Death Certificates",
  ceremony: "Ceremony",
  other: "Other",
};

const CATEGORY_ORDER = [
  "basic_services",
  "cremation",
  "container",
  "transport",
  "permits",
  "death_certificates",
  "ceremony",
  "other",
];

export default async function ComparePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const { caseId } = await params;

  const caseData = await prisma.case.findFirst({
    where: { id: caseId, userId: session.user.id },
  });

  if (!caseData) notFound();

  const quoteRequests = await prisma.quoteRequest.findMany({
    where: { caseId },
    include: {
      vendor: true,
      lineItems: {
        orderBy: { category: "asc" },
      },
    },
    orderBy: { totalPrice: "asc" },
  });

  // Only show quotes that have line items
  const quotesWithItems = quoteRequests.filter(
    (q) => q.lineItems.length > 0
  );

  if (quotesWithItems.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            Quote Comparison
          </h1>
          <p className="mt-1 text-stone-500">
            Compare pricing across vendors side by side
          </p>
        </div>
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 p-16 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-stone-300" />
          <h2 className="mt-4 text-lg font-semibold text-stone-700">
            No quotes to compare yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
            Run the outreach agent first to contact vendors and collect quotes.
            Once quotes arrive and are normalized, you can compare them here.
          </p>
          <a
            href={`/app/case/${caseId}/concierge`}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-800"
          >
            Go to Concierge
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  // Find cheapest total for "recommended" badge
  const cheapestQuote = quotesWithItems.reduce((min, q) =>
    (q.totalPrice ?? Infinity) < (min.totalPrice ?? Infinity) ? q : min
  );

  // Build category map for each quote
  type CategoryData = {
    amount: number;
    description: string;
    isFlagged: boolean;
    flagReason: string | null;
  };

  const quoteCategories: Map<string, Map<string, CategoryData>> = new Map();

  for (const quote of quotesWithItems) {
    const catMap = new Map<string, CategoryData>();
    for (const item of quote.lineItems) {
      // Aggregate amounts per category
      const existing = catMap.get(item.category);
      if (existing) {
        catMap.set(item.category, {
          amount: existing.amount + item.amount,
          description: existing.description + "; " + item.description,
          isFlagged: existing.isFlagged || item.isFlagged,
          flagReason: item.isFlagged
            ? [existing.flagReason, item.flagReason].filter(Boolean).join("; ")
            : existing.flagReason,
        });
      } else {
        catMap.set(item.category, {
          amount: item.amount,
          description: item.description,
          isFlagged: item.isFlagged,
          flagReason: item.flagReason,
        });
      }
    }
    quoteCategories.set(quote.id, catMap);
  }

  // Collect all categories present
  const allCategories = new Set<string>();
  for (const catMap of quoteCategories.values()) {
    for (const cat of catMap.keys()) {
      allCategories.add(cat);
    }
  }

  const sortedCategories = CATEGORY_ORDER.filter((c) => allCategories.has(c));
  // Add any categories not in the predefined order
  for (const c of allCategories) {
    if (!sortedCategories.includes(c)) {
      sortedCategories.push(c);
    }
  }

  // Determine best value per category (cheapest)
  const cheapestByCategory: Map<string, string> = new Map();
  for (const category of sortedCategories) {
    let minAmount = Infinity;
    let minQuoteId = "";
    for (const quote of quotesWithItems) {
      const catData = quoteCategories.get(quote.id)?.get(category);
      if (catData && catData.amount < minAmount) {
        minAmount = catData.amount;
        minQuoteId = quote.id;
      }
    }
    if (minQuoteId) cheapestByCategory.set(category, minQuoteId);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900">
          Quote Comparison
        </h1>
        <p className="mt-1 text-stone-500">
          Comparing {quotesWithItems.length} vendor quote
          {quotesWithItems.length !== 1 ? "s" : ""} for this case
        </p>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50">
              <th className="px-5 py-4 text-left text-sm font-semibold text-stone-700">
                Category
              </th>
              {quotesWithItems.map((quote) => (
                <th
                  key={quote.id}
                  className="px-5 py-4 text-right text-sm font-semibold text-stone-700"
                >
                  <div className="flex items-center justify-end gap-2">
                    {quote.vendor.name}
                    {quote.id === cheapestQuote.id && (
                      <Badge
                        variant="success"
                        className="ml-1"
                      >
                        <Award className="mr-0.5 h-3 w-3" />
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs font-normal text-stone-400">
                    {quote.vendor.city}, {quote.vendor.state}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedCategories.map((category, idx) => (
              <tr
                key={category}
                className={
                  idx % 2 === 0 ? "bg-white" : "bg-stone-50/50"
                }
              >
                <td className="px-5 py-3.5 text-sm font-medium text-stone-700">
                  {CATEGORY_LABELS[category] ?? category}
                </td>
                {quotesWithItems.map((quote) => {
                  const catData = quoteCategories
                    .get(quote.id)
                    ?.get(category);
                  if (!catData) {
                    return (
                      <td
                        key={quote.id}
                        className="px-5 py-3.5 text-right text-sm text-stone-300"
                      >
                        &mdash;
                      </td>
                    );
                  }
                  const isCheapest =
                    cheapestByCategory.get(category) === quote.id;
                  return (
                    <td
                      key={quote.id}
                      className={`px-5 py-3.5 text-right text-sm ${
                        catData.isFlagged
                          ? "bg-amber-50"
                          : ""
                      }`}
                      title={
                        catData.isFlagged && catData.flagReason
                          ? catData.flagReason
                          : catData.description
                      }
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        {catData.isFlagged && (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        )}
                        <span
                          className={
                            isCheapest
                              ? "font-semibold text-emerald-700"
                              : "text-stone-700"
                          }
                        >
                          {formatCurrency(catData.amount)}
                        </span>
                      </div>
                      {catData.isFlagged && catData.flagReason && (
                        <p className="mt-0.5 text-[10px] text-amber-600">
                          {catData.flagReason}
                        </p>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-stone-300 bg-stone-50">
              <td className="px-5 py-4 text-sm font-bold text-stone-900">
                Total
              </td>
              {quotesWithItems.map((quote) => (
                <td
                  key={quote.id}
                  className="px-5 py-4 text-right"
                >
                  <span
                    className={`text-base font-bold ${
                      quote.id === cheapestQuote.id
                        ? "text-emerald-700"
                        : "text-stone-900"
                    }`}
                  >
                    {quote.totalPrice != null
                      ? formatCurrency(quote.totalPrice)
                      : "N/A"}
                  </span>
                  {quote.id === cheapestQuote.id && (
                    <p className="mt-0.5 text-[10px] font-medium text-emerald-600">
                      Best value
                    </p>
                  )}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Summary section */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-50 p-2">
            <MessageSquare className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-stone-900">Recommendation</h3>
            <div className="mt-2 space-y-2 text-sm text-stone-600">
              <p>
                Based on the quotes received,{" "}
                <span className="font-semibold text-stone-900">
                  {cheapestQuote.vendor.name}
                </span>{" "}
                offers the best overall value at{" "}
                <span className="font-semibold text-emerald-700">
                  {cheapestQuote.totalPrice != null
                    ? formatCurrency(cheapestQuote.totalPrice)
                    : "N/A"}
                </span>
                .
              </p>
              {quotesWithItems.length > 1 && (
                <p>
                  This is{" "}
                  <span className="font-semibold">
                    {(() => {
                      const sorted = quotesWithItems
                        .map((q) => q.totalPrice ?? 0)
                        .filter((p) => p > 0)
                        .sort((a, b) => a - b);
                      if (sorted.length < 2) return "the only quote";
                      const savings = sorted[sorted.length - 1] - sorted[0];
                      return `${formatCurrency(savings)} less than the most expensive option`;
                    })()}
                  </span>
                  .
                </p>
              )}
              {/* Flag summary */}
              {(() => {
                const totalFlags = quotesWithItems.reduce(
                  (sum, q) =>
                    sum + q.lineItems.filter((li) => li.isFlagged).length,
                  0
                );
                if (totalFlags === 0) return null;
                return (
                  <p className="flex items-center gap-1.5 text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    {totalFlags} line item{totalFlags !== 1 ? "s" : ""}{" "}
                    flagged for review across all quotes. Hover over flagged
                    items in the table above for details.
                  </p>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
