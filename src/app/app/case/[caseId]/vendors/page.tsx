import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { formatRelativeTime } from "@/lib/utils";
import {
  Star,
  Phone,
  Mail,
  Globe,
  MapPin,
  Plus,
  Building2,
  Tag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VendorShortlistButton } from "./shortlist-button";

type VendorData = {
  id: string;
  name: string;
  category: string;
  city: string;
  state: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  rating: number | null;
  priceRange: string | null;
  description: string | null;
  services: string[];
};

type ShortlistEntry = {
  id: string;
  caseId: string;
  vendorId: string;
  priority: number;
  status: string;
  notes: string | null;
  createdAt: Date;
  vendor: VendorData;
};

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-xs text-stone-400">No rating</span>;
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < full
              ? "fill-amber-400 text-amber-400"
              : i === full && hasHalf
                ? "fill-amber-400/50 text-amber-400"
                : "fill-stone-200 text-stone-200"
          }`}
        />
      ))}
      <span className="ml-1 text-xs text-stone-500">{rating.toFixed(1)}</span>
    </div>
  );
}

function ShortlistStatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "warning" | "success" | "outline"> = {
    pending: "secondary",
    contacted: "warning",
    responded: "success",
    declined: "outline",
  };
  return (
    <Badge variant={variants[status] ?? "secondary"}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default async function VendorsPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const { caseId } = await params;

  const caseData = await prisma.case.findFirst({
    where: { id: caseId, userId: session.user.id },
    include: {
      vendorShortlists: {
        include: { vendor: true },
        orderBy: { priority: "asc" },
      },
    },
  });

  if (!caseData) notFound();

  // Load vendors matching the case city/state
  const shortlistedVendors = caseData.vendorShortlists as ShortlistEntry[];
  const shortlistedVendorIds = shortlistedVendors.map((s) => s.vendorId);

  const matchingVendorResults = await prisma.vendor.findMany({
    where: {
      ...(caseData.city || caseData.state
        ? {
            OR: [
              ...(caseData.city ? [{ city: { equals: caseData.city, mode: "insensitive" as const } }] : []),
              ...(caseData.state ? [{ state: { equals: caseData.state, mode: "insensitive" as const } }] : []),
            ],
          }
        : {}),
      id: { notIn: shortlistedVendorIds },
    },
    orderBy: [{ rating: "desc" }, { name: "asc" }],
  });

  const availableVendors = matchingVendorResults as VendorData[];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Vendor Directory</h1>
        <p className="mt-1 text-stone-500">
          Browse and shortlist vendors
          {caseData.city || caseData.state
            ? ` in ${[caseData.city, caseData.state].filter(Boolean).join(", ")}`
            : ""}
        </p>
      </div>

      {/* Shortlisted vendors */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-stone-900">
            Shortlisted Vendors
          </h2>
          {shortlistedVendors.length > 0 && (
            <Badge variant="secondary">{shortlistedVendors.length}</Badge>
          )}
        </div>

        {shortlistedVendors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 p-10 text-center">
            <Building2 className="mx-auto h-10 w-10 text-stone-300" />
            <p className="mt-3 text-sm font-medium text-stone-600">
              No vendors shortlisted yet
            </p>
            <p className="mt-1 text-xs text-stone-400">
              Browse the directory below and add vendors to your shortlist
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shortlistedVendors.map((entry) => {
              const vendor = entry.vendor;
              return (
                <div
                  key={entry.id}
                  className="relative rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Status badge */}
                  <div className="absolute right-4 top-4">
                    <ShortlistStatusBadge status={entry.status} />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-stone-900 pr-24">
                        {vendor.name}
                      </h3>
                      <p className="text-xs text-stone-500">{vendor.category}</p>
                    </div>

                    <StarRating rating={vendor.rating} />

                    <div className="flex items-center gap-1.5 text-xs text-stone-500">
                      <MapPin className="h-3 w-3" />
                      {vendor.city}, {vendor.state}
                      {vendor.priceRange && (
                        <>
                          <span className="mx-1 text-stone-300">|</span>
                          <span className="font-medium text-stone-600">
                            {vendor.priceRange}
                          </span>
                        </>
                      )}
                    </div>

                    {vendor.description && (
                      <p className="line-clamp-2 text-sm text-stone-600">
                        {vendor.description}
                      </p>
                    )}

                    {/* Services tags */}
                    {vendor.services.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {vendor.services.map((service) => (
                          <span
                            key={service}
                            className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-600"
                          >
                            <Tag className="h-2.5 w-2.5" />
                            {service}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Contact info */}
                    <div className="flex flex-wrap gap-3 border-t border-stone-100 pt-3 text-xs text-stone-500">
                      {vendor.phone && (
                        <a
                          href={`tel:${vendor.phone}`}
                          className="flex items-center gap-1 hover:text-stone-700"
                        >
                          <Phone className="h-3 w-3" />
                          {vendor.phone}
                        </a>
                      )}
                      {vendor.email && (
                        <a
                          href={`mailto:${vendor.email}`}
                          className="flex items-center gap-1 hover:text-stone-700"
                        >
                          <Mail className="h-3 w-3" />
                          {vendor.email}
                        </a>
                      )}
                      {vendor.website && (
                        <a
                          href={vendor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-stone-700"
                        >
                          <Globe className="h-3 w-3" />
                          Website
                        </a>
                      )}
                    </div>

                    {entry.notes && (
                      <p className="text-xs italic text-stone-400">
                        {entry.notes}
                      </p>
                    )}

                    <p className="text-[10px] text-stone-300">
                      Added {formatRelativeTime(entry.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Directory */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-stone-900">
            Available Vendors
          </h2>
          <p className="text-sm text-stone-500">
            {availableVendors.length} vendor{availableVendors.length !== 1 ? "s" : ""} found
            {caseData.city || caseData.state
              ? ` near ${[caseData.city, caseData.state].filter(Boolean).join(", ")}`
              : ""}
          </p>
        </div>

        {availableVendors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 p-10 text-center">
            <MapPin className="mx-auto h-10 w-10 text-stone-300" />
            <p className="mt-3 text-sm font-medium text-stone-600">
              No additional vendors found
            </p>
            <p className="mt-1 text-xs text-stone-400">
              {caseData.city || caseData.state
                ? "Try updating the case location to discover more vendors"
                : "Set a city or state on the case to discover vendors"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {availableVendors.map((vendor) => (
              <div
                key={vendor.id}
                className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-stone-900">
                      {vendor.name}
                    </h3>
                    <p className="text-xs text-stone-500">{vendor.category}</p>
                  </div>

                  <StarRating rating={vendor.rating} />

                  <div className="flex items-center gap-1.5 text-xs text-stone-500">
                    <MapPin className="h-3 w-3" />
                    {vendor.city}, {vendor.state}
                    {vendor.priceRange && (
                      <>
                        <span className="mx-1 text-stone-300">|</span>
                        <span className="font-medium text-stone-600">
                          {vendor.priceRange}
                        </span>
                      </>
                    )}
                  </div>

                  {vendor.description && (
                    <p className="line-clamp-2 text-sm text-stone-600">
                      {vendor.description}
                    </p>
                  )}

                  {/* Services tags */}
                  {vendor.services.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {vendor.services.map((service) => (
                        <span
                          key={service}
                          className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-600"
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {service}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Contact info */}
                  <div className="flex flex-wrap gap-3 border-t border-stone-100 pt-3 text-xs text-stone-500">
                    {vendor.phone && (
                      <a
                        href={`tel:${vendor.phone}`}
                        className="flex items-center gap-1 hover:text-stone-700"
                      >
                        <Phone className="h-3 w-3" />
                        {vendor.phone}
                      </a>
                    )}
                    {vendor.email && (
                      <a
                        href={`mailto:${vendor.email}`}
                        className="flex items-center gap-1 hover:text-stone-700"
                      >
                        <Mail className="h-3 w-3" />
                        {vendor.email}
                      </a>
                    )}
                    {vendor.website && (
                      <a
                        href={vendor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-stone-700"
                      >
                        <Globe className="h-3 w-3" />
                        Website
                      </a>
                    )}
                  </div>

                  {/* Add to shortlist */}
                  <div className="border-t border-stone-100 pt-3">
                    <VendorShortlistButton
                      caseId={caseId}
                      vendorId={vendor.id}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
