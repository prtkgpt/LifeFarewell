import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  Circle,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { PlanPreferenceForm } from "./preference-form";

export default async function PlanOverviewPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const { planId } = await params;

  const plan = await prisma.plan.findFirst({
    where: { id: planId, userId: session.user.id },
    include: {
      preferences: {
        orderBy: { createdAt: "asc" },
      },
      checklistItems: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!plan) notFound();

  const statusColor: Record<string, string> = {
    draft: "bg-stone-100 text-stone-700",
    active: "bg-emerald-100 text-emerald-700",
    completed: "bg-blue-100 text-blue-700",
    archived: "bg-stone-100 text-stone-500",
  };

  return (
    <div>
      {/* Back link */}
      <Link
        href="/app"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 transition-colors hover:text-stone-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-stone-900">
              {plan.title}
            </h1>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                statusColor[plan.status] || statusColor.draft
              }`}
            >
              {plan.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-500">
            Created {formatDate(plan.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Plan notes */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="mb-3 text-lg font-semibold text-stone-900">
              Plan Notes
            </h2>
            {plan.notes ? (
              <p className="text-sm leading-relaxed text-stone-700">
                {plan.notes}
              </p>
            ) : (
              <p className="text-sm text-stone-400">
                No notes added yet. Use the preferences form to start planning.
              </p>
            )}
          </div>

          {/* Preference form */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-stone-900">
              Preferences
            </h2>
            <PlanPreferenceForm
              planId={planId}
              existingPreferences={JSON.parse(
                JSON.stringify(plan.preferences)
              )}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick info */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-stone-700">
              Plan Info
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-stone-400">Status</dt>
                <dd className="mt-0.5 text-sm capitalize text-stone-900">
                  {plan.status}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-stone-400">Created</dt>
                <dd className="mt-0.5 text-sm text-stone-900">
                  {formatDate(plan.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-stone-400">
                  Last Updated
                </dt>
                <dd className="mt-0.5 text-sm text-stone-900">
                  {formatDate(plan.updatedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-stone-400">
                  Preferences Set
                </dt>
                <dd className="mt-0.5 text-sm text-stone-900">
                  {plan.preferences.length}
                </dd>
              </div>
            </dl>
          </div>

          {/* Checklist */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-stone-700">
              Checklist
            </h3>
            {plan.checklistItems.length === 0 ? (
              <div className="py-6 text-center">
                <FileText className="mx-auto h-6 w-6 text-stone-300" />
                <p className="mt-2 text-xs text-stone-400">
                  No checklist items yet
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {plan.checklistItems.map((item) => (
                  <li key={item.id} className="flex items-start gap-2.5">
                    {item.status === "COMPLETED" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    ) : item.status === "IN_PROGRESS" ? (
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-stone-300" />
                    )}
                    <span
                      className={`text-sm ${
                        item.status === "COMPLETED"
                          ? "text-stone-400 line-through"
                          : "text-stone-700"
                      }`}
                    >
                      {item.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
