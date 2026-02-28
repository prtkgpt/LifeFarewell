"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Headphones,
  Target,
  Clock,
  DollarSign,
  Play,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  MessageSquare,
  ArrowRight,
  RefreshCw,
  Search,
  Send,
  AlertCircle,
  TrendingUp,
  Shield,
  Star,
  ChevronRight,
  Eye,
  Zap,
} from "lucide-react";
import { handleApproval, runAgentAction } from "@/lib/actions/case";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

interface CaseData {
  id: string;
  title: string;
  pipelineStage: string;
  goalSummary: string | null;
  goalDeadline: string | null;
  budgetTarget: number | null;
  budgetMax: number | null;
  city: string | null;
  state: string | null;
  sandboxMode: boolean;
  communicationPolicy: {
    approvalLevel: string;
    disclosureMode: string;
    contactFirstName: string | null;
  } | null;
  vendorShortlists: Array<{
    id: string;
    status: string;
    priority: number;
    vendor: {
      id: string;
      name: string;
      category: string;
      city: string;
      state: string;
      phone: string | null;
      email: string | null;
      rating: number | null;
      priceRange: string | null;
    };
  }>;
  quoteRequests: Array<{
    id: string;
    status: string;
    totalPrice: number | null;
    vendor: { id: string; name: string };
    lineItems: Array<{
      id: string;
      category: string;
      description: string;
      amount: number;
      isFlagged: boolean;
      flagReason: string | null;
    }>;
  }>;
  pendingApprovals: Array<{
    id: string;
    type: string;
    status: string;
    title: string;
    summary: string | null;
    payload: Record<string, unknown>;
    createdAt: string;
  }>;
  checklistItems: Array<{
    id: string;
    title: string;
    status: string;
    category: string | null;
  }>;
  _count: {
    emailMessages: number;
    smsMessages: number;
    calls: number;
  };
}

interface AuditEntry {
  id: string;
  actorType: string;
  actionType: string;
  summary: string;
  createdAt: string;
}

const PIPELINE_STAGES = [
  { key: "DISCOVERY", label: "Discovery", icon: Search },
  { key: "OUTREACH", label: "Outreach", icon: Send },
  { key: "RESPONSES", label: "Responses", icon: MessageSquare },
  { key: "COMPARISON", label: "Comparison", icon: TrendingUp },
  { key: "DECISION", label: "Decision", icon: CheckCircle2 },
];

export function ConciergeConsole({
  caseData,
  recentActivity: initialActivity,
}: {
  caseData: CaseData;
  recentActivity: AuditEntry[];
}) {
  const router = useRouter();
  const [activity, setActivity] = useState(initialActivity);
  const [loading, setLoading] = useState<string | null>(null);
  const [approvalLoading, setApprovalLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Poll for new activity
  const pollActivity = useCallback(async () => {
    try {
      const res = await fetch(`/api/cases/${caseData.id}/activity`);
      if (res.ok) {
        const data = await res.json();
        setActivity(data);
      }
    } catch {
      // Silently fail polling
    }
  }, [caseData.id]);

  useEffect(() => {
    const interval = setInterval(pollActivity, 5000);
    return () => clearInterval(interval);
  }, [pollActivity]);

  async function handleAction(actionType: string) {
    setLoading(actionType);
    setActionError(null);
    try {
      await runAgentAction(caseData.id, actionType);
      await pollActivity();
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setActionError(message);
      await pollActivity();
    }
    setLoading(null);
  }

  async function onApproval(approvalId: string, action: "approve" | "reject") {
    setApprovalLoading(approvalId);
    try {
      await handleApproval(approvalId, action);
      router.refresh();
    } catch (err) {
      console.error(err);
    }
    setApprovalLoading(null);
  }

  const currentStageIndex = PIPELINE_STAGES.findIndex(
    (s) => s.key === caseData.pipelineStage
  );

  const completedChecklist = caseData.checklistItems.filter(
    (i) => i.status === "COMPLETED"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Headphones className="h-5 w-5 text-amber-600" />
              <h1 className="text-xl font-semibold text-stone-900">
                Concierge Console
              </h1>
              {caseData.sandboxMode && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  Sandbox
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-stone-500">{caseData.title}</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {caseData.communicationPolicy && (
              <div className="flex items-center gap-1.5 rounded-lg bg-stone-50 px-3 py-1.5">
                <Shield className="h-3.5 w-3.5 text-stone-500" />
                <span className="text-stone-600">
                  {caseData.communicationPolicy.approvalLevel === "LEVEL_1_REVIEW_ALL"
                    ? "Review All"
                    : "Auto Outreach"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Goal Banner */}
        {caseData.goalSummary && (
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl bg-stone-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-stone-700">
                {caseData.goalSummary}
              </span>
            </div>
            {caseData.goalDeadline && (
              <div className="flex items-center gap-1 text-xs text-stone-500">
                <Clock className="h-3 w-3" />
                by {new Date(caseData.goalDeadline).toLocaleDateString()}
              </div>
            )}
            {caseData.budgetMax && (
              <div className="flex items-center gap-1 text-xs text-stone-500">
                <DollarSign className="h-3 w-3" />
                under {formatCurrency(caseData.budgetMax)}
              </div>
            )}
          </div>
        )}

        {/* Pipeline Progress */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            {PIPELINE_STAGES.map((stage, i) => {
              const isActive = stage.key === caseData.pipelineStage;
              const isComplete = i < currentStageIndex;
              const Icon = stage.icon;
              return (
                <div key={stage.key} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                        isActive
                          ? "bg-amber-600 text-white shadow-md shadow-amber-200"
                          : isComplete
                            ? "bg-stone-900 text-white"
                            : "bg-stone-100 text-stone-400"
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium ${
                        isActive
                          ? "text-amber-700"
                          : isComplete
                            ? "text-stone-900"
                            : "text-stone-400"
                      }`}
                    >
                      {stage.label}
                    </span>
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <div
                      className={`mx-2 h-0.5 flex-1 rounded ${
                        i < currentStageIndex
                          ? "bg-stone-900"
                          : "bg-stone-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Actions + Approvals */}
        <div className="space-y-6">
          {/* Next Best Actions */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900">
              <Zap className="h-4 w-4 text-amber-600" />
              Quick Actions
            </h2>
            {actionError && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Action failed</p>
                    <p className="mt-0.5 text-xs text-red-600">{actionError}</p>
                  </div>
                  <button
                    onClick={() => setActionError(null)}
                    className="ml-auto text-red-400 hover:text-red-600"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <button
                onClick={() => handleAction("vendor_discovery")}
                disabled={loading === "vendor_discovery"}
                className="flex w-full items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 text-left text-sm transition-colors hover:bg-stone-50 disabled:opacity-50"
              >
                <Search className="h-4 w-4 text-stone-500" />
                <span className="flex-1 font-medium text-stone-700">
                  Discover Vendors
                </span>
                {loading === "vendor_discovery" ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-stone-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-stone-400" />
                )}
              </button>

              <button
                onClick={() => handleAction("outreach")}
                disabled={loading === "outreach" || caseData.vendorShortlists.length === 0}
                className="flex w-full items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 text-left text-sm transition-colors hover:bg-stone-50 disabled:opacity-50"
              >
                <Send className="h-4 w-4 text-stone-500" />
                <span className="flex-1 font-medium text-stone-700">
                  Start Outreach
                </span>
                {loading === "outreach" ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-stone-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-stone-400" />
                )}
              </button>

              <button
                onClick={() => handleAction("request_quotes")}
                disabled={loading === "request_quotes"}
                className="flex w-full items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 text-left text-sm transition-colors hover:bg-stone-50 disabled:opacity-50"
              >
                <DollarSign className="h-4 w-4 text-stone-500" />
                <span className="flex-1 font-medium text-stone-700">
                  Request 3 Quotes
                </span>
                {loading === "request_quotes" ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-stone-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-stone-400" />
                )}
              </button>

              <button
                onClick={() => handleAction("normalize_quotes")}
                disabled={loading === "normalize_quotes" || caseData.quoteRequests.length === 0}
                className="flex w-full items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 text-left text-sm transition-colors hover:bg-stone-50 disabled:opacity-50"
              >
                <TrendingUp className="h-4 w-4 text-stone-500" />
                <span className="flex-1 font-medium text-stone-700">
                  Generate Comparison
                </span>
                {loading === "normalize_quotes" ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-stone-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-stone-400" />
                )}
              </button>
            </div>
          </div>

          {/* Approvals Inbox */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-900">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Approvals
              {caseData.pendingApprovals.length > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {caseData.pendingApprovals.length}
                </span>
              )}
            </h2>
            {caseData.pendingApprovals.length === 0 ? (
              <p className="py-4 text-center text-sm text-stone-400">
                No pending approvals
              </p>
            ) : (
              <div className="space-y-3">
                {caseData.pendingApprovals.map((approval) => (
                  <div
                    key={approval.id}
                    className="rounded-xl border border-stone-200 p-4"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {approval.type === "EMAIL" && (
                          <Mail className="h-4 w-4 text-blue-500" />
                        )}
                        {approval.type === "SMS" && (
                          <MessageSquare className="h-4 w-4 text-green-500" />
                        )}
                        {approval.type === "CALL" && (
                          <Phone className="h-4 w-4 text-purple-500" />
                        )}
                        <span className="text-sm font-medium text-stone-900">
                          {approval.title}
                        </span>
                      </div>
                      <span className="text-xs text-stone-400">
                        {formatRelativeTime(approval.createdAt)}
                      </span>
                    </div>
                    {approval.summary && (
                      <p className="mb-3 text-xs text-stone-500 line-clamp-2">
                        {approval.summary}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => onApproval(approval.id, "approve")}
                        disabled={approvalLoading === approval.id}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-stone-900 py-2 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve & Send
                      </button>
                      <button
                        onClick={() => onApproval(approval.id, "reject")}
                        disabled={approvalLoading === approval.id}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                      <button className="flex items-center justify-center rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-500 hover:bg-stone-50">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checklist Summary */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-stone-900">
              Checklist Progress
            </h2>
            <div className="mb-2 flex items-center justify-between text-xs text-stone-500">
              <span>
                {completedChecklist} of {caseData.checklistItems.length} complete
              </span>
              <span>
                {caseData.checklistItems.length > 0
                  ? Math.round(
                      (completedChecklist / caseData.checklistItems.length) * 100
                    )
                  : 0}
                %
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{
                  width: `${
                    caseData.checklistItems.length > 0
                      ? (completedChecklist / caseData.checklistItems.length) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Middle Column: Vendors */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-stone-900">
              Vendor Pipeline
            </h2>
            {caseData.vendorShortlists.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100">
                  <Search className="h-5 w-5 text-stone-400" />
                </div>
                <p className="text-sm text-stone-500">No vendors yet</p>
                <p className="mt-1 text-xs text-stone-400">
                  Click &quot;Discover Vendors&quot; to find local providers
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {caseData.vendorShortlists.map((vs) => {
                  const statusColors: Record<string, string> = {
                    pending: "bg-stone-100 text-stone-600",
                    contacted: "bg-blue-100 text-blue-700",
                    responded: "bg-emerald-100 text-emerald-700",
                    declined: "bg-red-100 text-red-700",
                  };
                  const quote = caseData.quoteRequests.find(
                    (q) => q.vendor.id === vs.vendor.id
                  );
                  return (
                    <div
                      key={vs.id}
                      className="rounded-xl border border-stone-200 p-4 transition-colors hover:bg-stone-50"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-stone-900">
                            {vs.vendor.name}
                          </h3>
                          <p className="mt-0.5 text-xs text-stone-500">
                            {vs.vendor.city}, {vs.vendor.state}
                            {vs.vendor.priceRange && ` · ${vs.vendor.priceRange}`}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            statusColors[vs.status] || statusColors.pending
                          }`}
                        >
                          {vs.status}
                        </span>
                      </div>
                      {vs.vendor.rating && (
                        <div className="mt-2 flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span className="text-xs text-stone-600">
                            {vs.vendor.rating}
                          </span>
                        </div>
                      )}
                      {quote && quote.totalPrice && (
                        <div className="mt-2 flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2">
                          <span className="text-xs text-stone-500">Quote</span>
                          <span className="text-sm font-semibold text-stone-900">
                            {formatCurrency(quote.totalPrice)}
                          </span>
                        </div>
                      )}
                      {vs.status === "pending" && (
                        <button
                          onClick={() => handleAction("outreach")}
                          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-stone-200 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50"
                        >
                          <Send className="h-3 w-3" /> Contact Vendor
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Comparison Preview */}
          {caseData.quoteRequests.filter((q) => q.totalPrice).length > 0 && (
            <div className="rounded-2xl border border-stone-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-semibold text-stone-900">
                Quote Comparison
              </h2>
              <div className="space-y-2">
                {caseData.quoteRequests
                  .filter((q) => q.totalPrice)
                  .sort((a, b) => (a.totalPrice || 0) - (b.totalPrice || 0))
                  .map((q, i) => (
                    <div
                      key={q.id}
                      className={`flex items-center justify-between rounded-xl border p-3 ${
                        i === 0
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-stone-200"
                      }`}
                    >
                      <div>
                        <span className="text-sm font-medium text-stone-900">
                          {q.vendor.name}
                        </span>
                        {i === 0 && (
                          <span className="ml-2 text-xs font-medium text-emerald-600">
                            Best Value
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-stone-900">
                        {formatCurrency(q.totalPrice!)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Activity Feed + Comms Summary */}
        <div className="space-y-6">
          {/* Communications Summary */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-stone-900">
              Communications
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-stone-50 p-3 text-center">
                <Mail className="mx-auto mb-1 h-4 w-4 text-stone-500" />
                <div className="text-lg font-semibold text-stone-900">
                  {caseData._count.emailMessages}
                </div>
                <div className="text-xs text-stone-500">Emails</div>
              </div>
              <div className="rounded-xl bg-stone-50 p-3 text-center">
                <MessageSquare className="mx-auto mb-1 h-4 w-4 text-stone-500" />
                <div className="text-lg font-semibold text-stone-900">
                  {caseData._count.smsMessages}
                </div>
                <div className="text-xs text-stone-500">SMS</div>
              </div>
              <div className="rounded-xl bg-stone-50 p-3 text-center">
                <Phone className="mx-auto mb-1 h-4 w-4 text-stone-500" />
                <div className="text-lg font-semibold text-stone-900">
                  {caseData._count.calls}
                </div>
                <div className="text-xs text-stone-500">Calls</div>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-900">
                Activity Feed
              </h2>
              <button
                onClick={pollActivity}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
            {activity.length === 0 ? (
              <p className="py-6 text-center text-sm text-stone-400">
                No activity yet. Start by discovering vendors.
              </p>
            ) : (
              <div className="space-y-0">
                {activity.map((entry, i) => {
                  const iconMap: Record<string, typeof Play> = {
                    "case.created": CheckCircle2,
                    "email.sent": Mail,
                    "email.drafted": Mail,
                    "sms.sent": MessageSquare,
                    "sms.drafted": MessageSquare,
                    "call.initiated": Phone,
                    "call.drafted": Phone,
                    "approval.created": AlertCircle,
                    "approval.approved": CheckCircle2,
                    "approval.rejected": XCircle,
                    "vendor.discovered": Search,
                    "vendor.shortlisted": Star,
                    "quote.normalized": TrendingUp,
                    "policy.updated": Shield,
                  };
                  const Icon = iconMap[entry.actionType] || Play;

                  return (
                    <div
                      key={entry.id}
                      className="flex gap-3 py-3"
                      style={{
                        animationDelay: `${i * 50}ms`,
                      }}
                    >
                      <div className="flex flex-col items-center">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100">
                          <Icon className="h-3.5 w-3.5 text-stone-500" />
                        </div>
                        {i < activity.length - 1 && (
                          <div className="w-px flex-1 bg-stone-100" />
                        )}
                      </div>
                      <div className="min-w-0 pb-3">
                        <p className="text-sm text-stone-700">
                          {entry.summary}
                        </p>
                        <p className="mt-0.5 text-xs text-stone-400">
                          {formatRelativeTime(entry.createdAt)}
                          {entry.actorType !== "USER" && (
                            <span className="ml-1 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-500">
                              {entry.actorType}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
