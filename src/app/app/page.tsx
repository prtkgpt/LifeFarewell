import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Heart,
  Plus,
  ArrowRight,
  Clock,
  Headphones,
  FileText,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const [cases, plans] = await Promise.all([
    prisma.case.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { pendingApprovals: { where: { status: "PENDING" } } } },
      },
    }),
    prisma.plan.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const stageLabels: Record<string, string> = {
    DISCOVERY: "Discovery",
    OUTREACH: "Outreach",
    RESPONSES: "Responses",
    COMPARISON: "Comparison",
    DECISION: "Decision",
  };

  const stageColors: Record<string, string> = {
    DISCOVERY: "bg-blue-100 text-blue-700",
    OUTREACH: "bg-amber-100 text-amber-700",
    RESPONSES: "bg-purple-100 text-purple-700",
    COMPARISON: "bg-emerald-100 text-emerald-700",
    DECISION: "bg-stone-100 text-stone-700",
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Dashboard</h1>
          <p className="mt-1 text-sm text-stone-500">
            Manage your cases and plans
          </p>
        </div>
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-800"
        >
          <Plus className="h-4 w-4" /> New Case
        </Link>
      </div>

      {/* Cases */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-stone-900">
          Active Cases
        </h2>
        {cases.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-white p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100">
              <Heart className="h-6 w-6 text-stone-400" />
            </div>
            <h3 className="font-semibold text-stone-900">No active cases</h3>
            <p className="mt-2 text-sm text-stone-500">
              Create a new case to start working with your concierge.
            </p>
            <Link
              href="/onboarding"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-800"
            >
              <Plus className="h-4 w-4" /> Get Started
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cases.map((c) => (
              <Link
                key={c.id}
                href={`/app/case/${c.id}/concierge`}
                className="group rounded-2xl border border-stone-200 bg-white p-6 transition-all hover:border-stone-300 hover:shadow-md"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 transition-colors group-hover:bg-stone-200">
                    <Headphones className="h-5 w-5 text-stone-600" />
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${stageColors[c.pipelineStage]}`}
                  >
                    {stageLabels[c.pipelineStage]}
                  </span>
                </div>
                <h3 className="font-semibold text-stone-900 group-hover:text-stone-700">
                  {c.title}
                </h3>
                {c.goalSummary && (
                  <p className="mt-1 text-sm text-stone-500 line-clamp-2">
                    {c.goalSummary}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-stone-400">
                    <Clock className="h-3 w-3" />
                    {new Date(c.createdAt).toLocaleDateString()}
                  </div>
                  {c._count.pendingApprovals > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {c._count.pendingApprovals} pending
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-stone-600 group-hover:text-stone-900">
                  Open Console <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Plans */}
      {plans.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-stone-900">
            Pre-Need Plans
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => (
              <Link
                key={p.id}
                href={`/app/plan/${p.id}/overview`}
                className="group rounded-2xl border border-stone-200 bg-white p-6 transition-all hover:border-stone-300 hover:shadow-md"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100">
                  <FileText className="h-5 w-5 text-stone-600" />
                </div>
                <h3 className="font-semibold text-stone-900">{p.title}</h3>
                <p className="mt-1 text-sm capitalize text-stone-500">
                  {p.status}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
