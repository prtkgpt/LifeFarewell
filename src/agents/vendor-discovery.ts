import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { discoverVendorsByZipCode, geocodeZipCode } from "@/lib/vendors/google-places";
import { logAudit } from "./audit";

// ─── Input Schema ────────────────────────────────────────────────────────────

const VendorDiscoveryInputSchema = z.object({
  caseId: z.string().min(1),
});

export type VendorDiscoveryInput = z.infer<typeof VendorDiscoveryInputSchema>;

// ─── Output Types ────────────────────────────────────────────────────────────

export interface ShortlistedVendor {
  vendorShortlistId: string;
  vendorId: string;
  vendorName: string;
  category: string;
  city: string;
  state: string;
  priority: number;
  matchReason: string;
}

export interface VendorDiscoveryResult {
  caseId: string;
  city: string | null;
  state: string | null;
  vendorsFound: number;
  shortlist: ShortlistedVendor[];
}

// ─── Matching / Scoring Logic ────────────────────────────────────────────────

function scoreVendor(
  vendor: {
    rating: number | null;
    services: string[];
    priceRange: string | null;
  },
  needs: string[],
  budgetTarget: number | null
): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  // Base rating score (0-5 -> 0-25 points)
  if (vendor.rating !== null) {
    score += vendor.rating * 5;
    reasons.push(`rating: ${vendor.rating}`);
  }

  // Service match score
  const matchedServices = vendor.services.filter((svc) =>
    needs.some(
      (need) =>
        svc.toLowerCase().includes(need.toLowerCase()) ||
        need.toLowerCase().includes(svc.toLowerCase())
    )
  );
  if (matchedServices.length > 0) {
    score += matchedServices.length * 10;
    reasons.push(`matched services: ${matchedServices.join(", ")}`);
  }

  // Budget alignment score
  if (budgetTarget !== null && vendor.priceRange) {
    const priceRangeLower = vendor.priceRange.toLowerCase();
    if (
      (budgetTarget < 3000 && priceRangeLower.includes("low")) ||
      (budgetTarget < 3000 && priceRangeLower.includes("$"))
    ) {
      score += 10;
      reasons.push("budget-aligned (low)");
    } else if (
      budgetTarget >= 3000 &&
      budgetTarget < 8000 &&
      priceRangeLower.includes("mid")
    ) {
      score += 10;
      reasons.push("budget-aligned (mid)");
    } else if (budgetTarget >= 8000 && priceRangeLower.includes("high")) {
      score += 10;
      reasons.push("budget-aligned (high)");
    }
  }

  return {
    score,
    reason: reasons.length > 0 ? reasons.join("; ") : "location match",
  };
}

// ─── Implementation ──────────────────────────────────────────────────────────

export async function runVendorDiscovery(
  params: VendorDiscoveryInput
): Promise<VendorDiscoveryResult> {
  const input = VendorDiscoveryInputSchema.parse(params);

  // Load case to get location and needs
  const caseRecord = await prisma.case.findUniqueOrThrow({
    where: { id: input.caseId },
    include: {
      decedentProfile: true,
      intakeSessions: true,
      vendorShortlists: true,
    },
  });

  const zipCode = caseRecord.zipCode;
  const city = caseRecord.city ?? caseRecord.decedentProfile?.city ?? null;
  const state = caseRecord.state ?? caseRecord.decedentProfile?.state ?? null;

  // Extract needs from intake sessions and goal summary
  const needs: string[] = [];
  if (caseRecord.goalSummary) {
    needs.push(caseRecord.goalSummary);
  }
  for (const session of caseRecord.intakeSessions) {
    if (session.role === "user" && session.content) {
      const keywords = session.content
        .toLowerCase()
        .split(/\s+/)
        .filter((w: string) =>
          [
            "cremation",
            "burial",
            "funeral",
            "memorial",
            "transport",
            "embalming",
            "casket",
            "urn",
            "flowers",
            "ceremony",
            "visitation",
            "obituary",
          ].includes(w)
        );
      needs.push(...keywords);
    }
  }

  // Existing vendor IDs to avoid duplicates
  const existingVendorIds = new Set(
    caseRecord.vendorShortlists.map(
      (vs: { vendorId: string }) => vs.vendorId
    )
  );

  let resolvedCity = city;
  let resolvedState = state;
  let allVendorIds: string[] = [];

  // ─── Strategy 1: Google Places API (if zip code is available) ───────────
  if (zipCode && process.env.GOOGLE_PLACES_API_KEY) {
    try {
      const { vendors: discovered, geocode } = await discoverVendorsByZipCode(zipCode);
      resolvedCity = resolvedCity || geocode.city;
      resolvedState = resolvedState || geocode.state;

      // Update case with resolved city/state if not already set
      if (!caseRecord.city || !caseRecord.state) {
        await prisma.case.update({
          where: { id: input.caseId },
          data: {
            ...(!caseRecord.city && geocode.city ? { city: geocode.city } : {}),
            ...(!caseRecord.state && geocode.state ? { state: geocode.state } : {}),
          },
        });
      }

      // Upsert discovered vendors into DB
      for (const v of discovered) {
        const vendor = await prisma.vendor.upsert({
          where: { googlePlaceId: v.googlePlaceId },
          update: {
            name: v.name,
            phone: v.phone,
            website: v.website,
            rating: v.rating,
            description: v.description,
            address: v.address,
          },
          create: {
            googlePlaceId: v.googlePlaceId,
            name: v.name,
            category: v.category,
            city: v.city,
            state: v.state,
            address: v.address,
            phone: v.phone,
            website: v.website,
            rating: v.rating,
            description: v.description,
            services: [],
          },
        });
        allVendorIds.push(vendor.id);
      }
    } catch (err) {
      console.error("[VendorDiscovery] Google Places failed, falling back to DB:", err);
      // Fall through to DB-based discovery
    }
  }

  // ─── Strategy 2: Local DB fallback ──────────────────────────────────────
  if (allVendorIds.length === 0) {
    const whereClause: Record<string, unknown> = {};
    if (resolvedState) {
      whereClause.state = { equals: resolvedState, mode: "insensitive" };
    }
    if (resolvedCity) {
      whereClause.city = { equals: resolvedCity, mode: "insensitive" };
    }

    let vendors = await prisma.vendor.findMany({ where: whereClause });

    // Fallback: if no city match, broaden to state-only
    if (vendors.length === 0 && resolvedCity && resolvedState) {
      vendors = await prisma.vendor.findMany({
        where: {
          state: { equals: resolvedState, mode: "insensitive" },
        },
      });
    }

    allVendorIds = vendors.map((v) => v.id);
  }

  // ─── Score, rank, and shortlist ─────────────────────────────────────────

  // Load all candidate vendors
  const candidateVendors = await prisma.vendor.findMany({
    where: { id: { in: allVendorIds } },
  });

  // Exclude already-shortlisted
  const newVendors = candidateVendors.filter(
    (v) => !existingVendorIds.has(v.id)
  );

  // Score and rank
  const scoredVendors = newVendors.map((vendor) => {
    const { score, reason } = scoreVendor(
      vendor,
      needs,
      caseRecord.budgetTarget
    );
    return { vendor, score, reason };
  });

  scoredVendors.sort((a, b) => b.score - a.score);

  // Take top 5
  const topVendors = scoredVendors.slice(0, 5);

  // Create VendorShortlist entries
  const shortlist: ShortlistedVendor[] = [];
  for (let i = 0; i < topVendors.length; i++) {
    const { vendor, reason } = topVendors[i];
    const priority = i + 1;

    const entry = await prisma.vendorShortlist.create({
      data: {
        caseId: input.caseId,
        vendorId: vendor.id,
        priority,
        status: "pending",
        notes: reason,
      },
    });

    shortlist.push({
      vendorShortlistId: entry.id,
      vendorId: vendor.id,
      vendorName: vendor.name,
      category: vendor.category,
      city: vendor.city,
      state: vendor.state,
      priority,
      matchReason: reason,
    });
  }

  // Write audit log
  await logAudit({
    caseId: input.caseId,
    userId: caseRecord.userId,
    actorType: "AGENT",
    actionType: "VENDOR_DISCOVERY",
    summary: `Discovered ${allVendorIds.length} vendor(s) near ${resolvedCity ?? "unknown"}, ${resolvedState ?? "unknown"}${zipCode ? ` (${zipCode})` : ""}. Shortlisted ${shortlist.length}.`,
    payload: {
      zipCode,
      city: resolvedCity,
      state: resolvedState,
      totalFound: allVendorIds.length,
      shortlistedCount: shortlist.length,
      source: allVendorIds.length > 0 && zipCode ? "google_places" : "database",
      shortlist: shortlist.map((s) => ({
        vendorId: s.vendorId,
        name: s.vendorName,
        priority: s.priority,
        reason: s.matchReason,
      })),
    },
  });

  return {
    caseId: input.caseId,
    city: resolvedCity,
    state: resolvedState,
    vendorsFound: allVendorIds.length,
    shortlist,
  };
}
