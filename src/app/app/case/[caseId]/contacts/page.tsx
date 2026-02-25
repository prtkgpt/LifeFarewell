import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Phone,
  Mail,
  Globe,
  Star,
  ExternalLink,
  User,
  Store,
} from "lucide-react";

export default async function ContactsPage({
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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });

  const vendors = caseData.vendorShortlists;
  const hasVendors = vendors.length > 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900">Contacts</h1>
        <p className="mt-1 text-sm text-stone-500">
          People and providers involved in this case
        </p>
      </div>

      {/* Your contact info */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-stone-900">
          Your Information
        </h2>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
              <User className="h-6 w-6 text-stone-600" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900">
                {user?.name || "Your Name"}
              </h3>
              <p className="text-sm text-stone-500">{user?.email}</p>
              <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                Case Owner
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Vendor contacts */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">
            Vendor Contacts
          </h2>
          <Link
            href={`/app/case/${caseId}/vendors`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
          >
            View all vendors <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        {!hasVendors ? (
          <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-white p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100">
              <Store className="h-6 w-6 text-stone-400" />
            </div>
            <h3 className="font-semibold text-stone-900">
              No vendor contacts yet
            </h3>
            <p className="mt-2 text-sm text-stone-500">
              Vendors will appear here once they are added to your shortlist
              during the discovery phase.
            </p>
            <Link
              href={`/app/case/${caseId}/vendors`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-800"
            >
              <Store className="h-4 w-4" /> Browse Vendors
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Name
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Category
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Phone
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Email
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Rating
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {vendors.map((shortlist) => {
                  const v = shortlist.vendor;
                  return (
                    <tr
                      key={shortlist.id}
                      className="transition-colors hover:bg-stone-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100">
                            <Store className="h-4 w-4 text-stone-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-stone-900">
                              {v.name}
                            </p>
                            {v.city && v.state && (
                              <p className="text-xs text-stone-400">
                                {v.city}, {v.state}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-block rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium capitalize text-stone-600">
                          {v.category}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {v.phone ? (
                          <a
                            href={`tel:${v.phone}`}
                            className="inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {v.phone}
                          </a>
                        ) : (
                          <span className="text-xs text-stone-400">--</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {v.email ? (
                          <a
                            href={`mailto:${v.email}`}
                            className="inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            {v.email}
                          </a>
                        ) : (
                          <span className="text-xs text-stone-400">--</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {v.rating ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span className="text-sm text-stone-700">
                              {v.rating.toFixed(1)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-stone-400">--</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                            shortlist.status === "contacted"
                              ? "bg-blue-100 text-blue-700"
                              : shortlist.status === "responded"
                              ? "bg-emerald-100 text-emerald-700"
                              : shortlist.status === "selected"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {shortlist.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
