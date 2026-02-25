"use client";

import { useState, useTransition } from "react";
import { handleApproval } from "@/lib/actions/case";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import {
  Mail,
  MessageSquare,
  Phone,
  CreditCard,
  ShieldCheck,
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  Send,
  Ban,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Approval = {
  id: string;
  caseId: string;
  userId: string;
  type: "EMAIL" | "SMS" | "CALL" | "BOOKING" | "PAYMENT";
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  title: string;
  summary: string | null;
  payload: Record<string, unknown>;
  referenceId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  EMAIL: <Mail className="h-4 w-4" />,
  SMS: <MessageSquare className="h-4 w-4" />,
  CALL: <Phone className="h-4 w-4" />,
  BOOKING: <CreditCard className="h-4 w-4" />,
  PAYMENT: <ShieldCheck className="h-4 w-4" />,
};

const TYPE_COLORS: Record<string, string> = {
  EMAIL: "bg-blue-50 text-blue-600",
  SMS: "bg-green-50 text-green-600",
  CALL: "bg-violet-50 text-violet-600",
  BOOKING: "bg-amber-50 text-amber-600",
  PAYMENT: "bg-rose-50 text-rose-600",
};

const STATUS_BADGES: Record<
  string,
  { variant: "secondary" | "success" | "destructive" | "warning"; icon: React.ReactNode }
> = {
  PENDING: { variant: "warning", icon: <Clock className="h-3 w-3" /> },
  APPROVED: { variant: "success", icon: <CheckCircle2 className="h-3 w-3" /> },
  REJECTED: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  EXPIRED: { variant: "secondary", icon: <Clock className="h-3 w-3" /> },
};

function extractDisclosure(payload: Record<string, unknown>): string | null {
  if (typeof payload.disclosureText === "string") return payload.disclosureText;
  if (typeof payload.disclosure === "string") return payload.disclosure;
  return null;
}

function extractBody(payload: Record<string, unknown>): string | null {
  if (typeof payload.body === "string") return payload.body;
  if (typeof payload.messageBody === "string") return payload.messageBody;
  if (typeof payload.script === "string") return payload.script;
  if (typeof payload.callScript === "string") return payload.callScript;
  if (typeof payload.text === "string") return payload.text;
  return null;
}

export function ApprovalsClient({
  caseId,
  approvals,
}: {
  caseId: string;
  approvals: Approval[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    approvals.find((a) => a.status === "PENDING")?.id ?? approvals[0]?.id ?? null
  );

  const pending = approvals.filter((a) => a.status === "PENDING");
  const approved = approvals.filter((a) => a.status === "APPROVED");
  const rejected = approvals.filter(
    (a) => a.status === "REJECTED" || a.status === "EXPIRED"
  );

  const selected = approvals.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Approvals</h1>
        <p className="mt-1 text-stone-500">
          Review and approve pending communications before they are sent
        </p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Pending
            {pending.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approved
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-1.5">
            <XCircle className="h-3.5 w-3.5" />
            Rejected
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <ApprovalListAndPreview
            items={pending}
            selected={selected?.status === "PENDING" ? selected : null}
            selectedId={selectedId}
            onSelect={setSelectedId}
            emptyIcon={<Inbox className="h-10 w-10 text-stone-300" />}
            emptyTitle="No pending approvals"
            emptyDescription="All communications have been reviewed. New items will appear here when the agent drafts outreach."
            showActions
          />
        </TabsContent>

        <TabsContent value="approved">
          <ApprovalListAndPreview
            items={approved}
            selected={selected?.status === "APPROVED" ? selected : null}
            selectedId={selectedId}
            onSelect={setSelectedId}
            emptyIcon={<CheckCircle2 className="h-10 w-10 text-stone-300" />}
            emptyTitle="No approved items yet"
            emptyDescription="Approved communications will appear here."
            showActions={false}
          />
        </TabsContent>

        <TabsContent value="rejected">
          <ApprovalListAndPreview
            items={rejected}
            selected={
              selected && (selected.status === "REJECTED" || selected.status === "EXPIRED")
                ? selected
                : null
            }
            selectedId={selectedId}
            onSelect={setSelectedId}
            emptyIcon={<XCircle className="h-10 w-10 text-stone-300" />}
            emptyTitle="No rejected items"
            emptyDescription="Rejected or expired communications will appear here."
            showActions={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ApprovalListAndPreview({
  items,
  selected,
  selectedId,
  onSelect,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  showActions,
}: {
  items: Approval[];
  selected: Approval | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  showActions: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 p-12 text-center">
        {emptyIcon}
        <p className="mt-3 text-sm font-medium text-stone-600">{emptyTitle}</p>
        <p className="mt-1 text-xs text-stone-400">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-6 lg:grid-cols-5">
      {/* List panel */}
      <div className="space-y-2 lg:col-span-2">
        {items.map((approval) => (
          <button
            key={approval.id}
            onClick={() => onSelect(approval.id)}
            className={`w-full rounded-xl border p-4 text-left transition-all ${
              selectedId === approval.id
                ? "border-stone-400 bg-stone-50 shadow-sm"
                : "border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`rounded-lg p-2 ${TYPE_COLORS[approval.type] ?? "bg-stone-100 text-stone-600"}`}
              >
                {TYPE_ICONS[approval.type] ?? <Mail className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-medium text-stone-900">
                    {approval.title}
                  </h3>
                  {STATUS_BADGES[approval.status] && (
                    <Badge
                      variant={STATUS_BADGES[approval.status].variant}
                      className="shrink-0"
                    >
                      {STATUS_BADGES[approval.status].icon}
                      <span className="ml-1">{approval.status}</span>
                    </Badge>
                  )}
                </div>
                {approval.summary && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">
                    {approval.summary}
                  </p>
                )}
                <p className="mt-1 text-[10px] text-stone-400">
                  {formatRelativeTime(approval.createdAt)}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Preview panel */}
      <div className="lg:col-span-3">
        {selected ? (
          <ApprovalPreview approval={selected} showActions={showActions} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-stone-200 p-12">
            <p className="text-sm text-stone-400">
              Select an item to preview
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ApprovalPreview({
  approval,
  showActions,
}: {
  approval: Approval;
  showActions: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [actionTaken, setActionTaken] = useState<string | null>(null);

  const payload = approval.payload as Record<string, unknown>;
  const body = extractBody(payload);
  const disclosure = extractDisclosure(payload);

  const onAction = (action: "approve" | "reject") => {
    startTransition(async () => {
      await handleApproval(approval.id, action);
      setActionTaken(action);
    });
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
      {/* Preview header */}
      <div className="border-b border-stone-100 p-5">
        <div className="flex items-center gap-3">
          <div
            className={`rounded-lg p-2 ${TYPE_COLORS[approval.type] ?? "bg-stone-100 text-stone-600"}`}
          >
            {TYPE_ICONS[approval.type] ?? <Mail className="h-4 w-4" />}
          </div>
          <div>
            <h3 className="font-semibold text-stone-900">{approval.title}</h3>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-stone-500">
              <span>{approval.type}</span>
              <span className="text-stone-300">|</span>
              <span>{formatDateTime(approval.createdAt)}</span>
            </div>
          </div>
        </div>
        {approval.summary && (
          <p className="mt-3 text-sm text-stone-600">{approval.summary}</p>
        )}
      </div>

      {/* Body content */}
      <div className="p-5">
        {/* Payload metadata */}
        {(payload.toAddress || payload.toNumber || payload.to) && (
          <div className="mb-4 rounded-lg bg-stone-50 p-3">
            <dl className="grid gap-1 text-xs">
              {payload.toAddress && (
                <div className="flex gap-2">
                  <dt className="font-medium text-stone-500">To:</dt>
                  <dd className="text-stone-700">{String(payload.toAddress)}</dd>
                </div>
              )}
              {payload.toNumber && (
                <div className="flex gap-2">
                  <dt className="font-medium text-stone-500">To:</dt>
                  <dd className="text-stone-700">{String(payload.toNumber)}</dd>
                </div>
              )}
              {payload.subject && (
                <div className="flex gap-2">
                  <dt className="font-medium text-stone-500">Subject:</dt>
                  <dd className="text-stone-700">{String(payload.subject)}</dd>
                </div>
              )}
              {payload.fromAddress && (
                <div className="flex gap-2">
                  <dt className="font-medium text-stone-500">From:</dt>
                  <dd className="text-stone-700">
                    {String(payload.fromAddress)}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Message body */}
        {body && (
          <div className="rounded-lg border border-stone-100 bg-stone-50/50 p-4">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-stone-700">
              {body}
            </pre>
          </div>
        )}

        {/* Disclosure text */}
        {disclosure && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-800">
                Disclosure Notice
              </span>
              <Badge variant="warning" className="ml-auto text-[10px]">
                Required &mdash; cannot be removed
              </Badge>
            </div>
            <p className="text-xs leading-relaxed text-amber-700">
              {disclosure}
            </p>
          </div>
        )}

        {/* Raw payload (collapsed) */}
        {!body && (
          <div className="rounded-lg border border-stone-100 bg-stone-50/50 p-4">
            <p className="mb-2 text-xs font-medium text-stone-500">
              Payload Data
            </p>
            <pre className="max-h-60 overflow-auto whitespace-pre-wrap font-mono text-xs text-stone-600">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {showActions && !actionTaken && (
        <div className="flex items-center gap-3 border-t border-stone-100 p-5">
          <Button
            onClick={() => onAction("approve")}
            disabled={isPending}
            className="flex-1"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Approve &amp; Send
          </Button>
          <Button
            variant="outline"
            onClick={() => onAction("reject")}
            disabled={isPending}
            className="flex-1"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Ban className="h-4 w-4" />
            )}
            Reject
          </Button>
        </div>
      )}

      {actionTaken && (
        <div
          className={`border-t p-5 text-center text-sm font-medium ${
            actionTaken === "approve"
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : "border-red-100 bg-red-50 text-red-700"
          }`}
        >
          {actionTaken === "approve" ? (
            <span className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Approved and queued for sending
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <XCircle className="h-4 w-4" />
              Rejected
            </span>
          )}
        </div>
      )}
    </div>
  );
}
