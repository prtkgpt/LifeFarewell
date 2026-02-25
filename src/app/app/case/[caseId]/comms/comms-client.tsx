"use client";

import { useState } from "react";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import {
  Mail,
  MessageSquare,
  Phone,
  ArrowUpRight,
  ArrowDownLeft,
  Play,
  FileText,
  Clock,
  MessageCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Email = {
  id: string;
  caseId: string;
  threadId: string | null;
  toAddress: string;
  fromAddress: string | null;
  subject: string;
  body: string;
  disclosureText: string | null;
  status: string;
  providerId: string | null;
  sentAt: string | null;
  createdAt: string;
};

type SmsMessage = {
  id: string;
  caseId: string;
  threadId: string | null;
  toNumber: string;
  fromNumber: string | null;
  body: string;
  disclosureText: string | null;
  status: string;
  providerId: string | null;
  sentAt: string | null;
  createdAt: string;
};

type CallEntry = {
  id: string;
  caseId: string;
  threadId: string | null;
  toNumber: string;
  fromNumber: string | null;
  script: string;
  disclosureText: string | null;
  status: string;
  providerCallSid: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  recordingUrl: string | null;
  transcriptText: string | null;
  transcriptStatus: string;
  createdAt: string;
};

type TimelineItem = {
  id: string;
  type: "email" | "sms" | "call";
  date: string;
  data: Email | SmsMessage | CallEntry;
};

const MESSAGE_STATUS_STYLES: Record<
  string,
  { variant: "success" | "warning" | "destructive" | "secondary" | "outline" | "default"; label: string }
> = {
  SENT: { variant: "success", label: "Sent" },
  DELIVERED: { variant: "success", label: "Delivered" },
  SIMULATED: { variant: "warning", label: "Simulated" },
  FAILED: { variant: "destructive", label: "Failed" },
  DRAFT: { variant: "secondary", label: "Draft" },
  PENDING_APPROVAL: { variant: "outline", label: "Pending Approval" },
  APPROVED: { variant: "default", label: "Approved" },
  INITIATED: { variant: "outline", label: "Initiated" },
  IN_PROGRESS: { variant: "warning", label: "In Progress" },
  COMPLETED: { variant: "success", label: "Completed" },
};

function StatusBadge({ status }: { status: string }) {
  const style = MESSAGE_STATUS_STYLES[status] ?? {
    variant: "secondary" as const,
    label: status,
  };
  return <Badge variant={style.variant}>{style.label}</Badge>;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export function CommsClient({
  caseId,
  emails,
  smsMessages,
  calls,
}: {
  caseId: string;
  emails: Email[];
  smsMessages: SmsMessage[];
  calls: CallEntry[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Build unified timeline
  const allItems: TimelineItem[] = [
    ...emails.map((e) => ({
      id: e.id,
      type: "email" as const,
      date: e.sentAt ?? e.createdAt,
      data: e,
    })),
    ...smsMessages.map((s) => ({
      id: s.id,
      type: "sms" as const,
      date: s.sentAt ?? s.createdAt,
      data: s,
    })),
    ...calls.map((c) => ({
      id: c.id,
      type: "call" as const,
      date: c.startedAt ?? c.createdAt,
      data: c,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const emailItems = allItems.filter((i) => i.type === "email");
  const smsItems = allItems.filter((i) => i.type === "sms");
  const callItems = allItems.filter((i) => i.type === "call");

  const totalCount = allItems.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900">
          Communications Log
        </h1>
        <p className="mt-1 text-stone-500">
          {totalCount} communication{totalCount !== 1 ? "s" : ""} tracked for
          this case
        </p>
      </div>

      {totalCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 p-16 text-center">
          <MessageCircle className="mx-auto h-12 w-12 text-stone-300" />
          <h2 className="mt-4 text-lg font-semibold text-stone-700">
            No communications yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
            When the concierge agent sends emails, SMS messages, or makes calls
            on your behalf, they will appear here.
          </p>
        </div>
      ) : (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all" className="gap-1.5">
              All
              <span className="ml-0.5 text-xs text-stone-400">
                {allItems.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="emails" className="gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Emails
              <span className="ml-0.5 text-xs text-stone-400">
                {emailItems.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              SMS
              <span className="ml-0.5 text-xs text-stone-400">
                {smsItems.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="calls" className="gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              Calls
              <span className="ml-0.5 text-xs text-stone-400">
                {callItems.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Timeline
              items={allItems}
              expandedId={expandedId}
              onToggle={setExpandedId}
            />
          </TabsContent>
          <TabsContent value="emails">
            <Timeline
              items={emailItems}
              expandedId={expandedId}
              onToggle={setExpandedId}
            />
          </TabsContent>
          <TabsContent value="sms">
            <Timeline
              items={smsItems}
              expandedId={expandedId}
              onToggle={setExpandedId}
            />
          </TabsContent>
          <TabsContent value="calls">
            <Timeline
              items={callItems}
              expandedId={expandedId}
              onToggle={setExpandedId}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Timeline({
  items,
  expandedId,
  onToggle,
}: {
  items: TimelineItem[];
  expandedId: string | null;
  onToggle: (id: string | null) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 p-10 text-center">
        <p className="text-sm text-stone-500">No items in this category</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {items.map((item) => {
        const isExpanded = expandedId === item.id;
        return (
          <div key={item.id}>
            <button
              onClick={() => onToggle(isExpanded ? null : item.id)}
              className={`w-full rounded-2xl border text-left transition-all ${
                isExpanded
                  ? "border-stone-300 bg-white shadow-md"
                  : "border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center gap-4 p-4">
                {/* Type icon */}
                <div
                  className={`shrink-0 rounded-lg p-2.5 ${
                    item.type === "email"
                      ? "bg-blue-50 text-blue-600"
                      : item.type === "sms"
                        ? "bg-green-50 text-green-600"
                        : "bg-violet-50 text-violet-600"
                  }`}
                >
                  {item.type === "email" ? (
                    <Mail className="h-4 w-4" />
                  ) : item.type === "sms" ? (
                    <MessageSquare className="h-4 w-4" />
                  ) : (
                    <Phone className="h-4 w-4" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {item.type === "email" && (
                      <>
                        <span className="truncate text-sm font-medium text-stone-900">
                          {(item.data as Email).subject}
                        </span>
                      </>
                    )}
                    {item.type === "sms" && (
                      <span className="line-clamp-1 text-sm font-medium text-stone-900">
                        {(item.data as SmsMessage).body.slice(0, 80)}
                        {(item.data as SmsMessage).body.length > 80 ? "..." : ""}
                      </span>
                    )}
                    {item.type === "call" && (
                      <span className="truncate text-sm font-medium text-stone-900">
                        Call to {(item.data as CallEntry).toNumber}
                        {(item.data as CallEntry).durationSeconds != null && (
                          <span className="ml-2 text-xs font-normal text-stone-400">
                            ({formatDuration((item.data as CallEntry).durationSeconds!)})
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="mt-0.5 flex items-center gap-2 text-xs text-stone-500">
                    {item.type === "email" && (
                      <>
                        <span className="flex items-center gap-0.5">
                          <ArrowUpRight className="h-3 w-3" />
                          {(item.data as Email).toAddress}
                        </span>
                        {(item.data as Email).fromAddress && (
                          <>
                            <span className="text-stone-300">|</span>
                            <span className="flex items-center gap-0.5">
                              <ArrowDownLeft className="h-3 w-3" />
                              {(item.data as Email).fromAddress}
                            </span>
                          </>
                        )}
                      </>
                    )}
                    {item.type === "sms" && (
                      <span className="flex items-center gap-0.5">
                        <ArrowUpRight className="h-3 w-3" />
                        {(item.data as SmsMessage).toNumber}
                      </span>
                    )}
                    {item.type === "call" && (
                      <span className="flex items-center gap-0.5">
                        <ArrowUpRight className="h-3 w-3" />
                        {(item.data as CallEntry).toNumber}
                        {(item.data as CallEntry).fromNumber && (
                          <>
                            <span className="mx-1 text-stone-300">|</span>
                            <ArrowDownLeft className="h-3 w-3" />
                            {(item.data as CallEntry).fromNumber}
                          </>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status & time */}
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge
                    status={
                      item.type === "email"
                        ? (item.data as Email).status
                        : item.type === "sms"
                          ? (item.data as SmsMessage).status
                          : (item.data as CallEntry).status
                    }
                  />
                  <span className="whitespace-nowrap text-xs text-stone-400">
                    {formatRelativeTime(item.date)}
                  </span>
                </div>
              </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="mx-4 mb-1 mt-0 rounded-b-xl border-x border-b border-stone-200 bg-stone-50/50 p-5">
                {item.type === "email" && (
                  <EmailDetail email={item.data as Email} />
                )}
                {item.type === "sms" && (
                  <SmsDetail sms={item.data as SmsMessage} />
                )}
                {item.type === "call" && (
                  <CallDetail call={item.data as CallEntry} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EmailDetail({ email }: { email: Email }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="font-medium text-stone-500">To:</span>{" "}
          <span className="text-stone-700">{email.toAddress}</span>
        </div>
        {email.fromAddress && (
          <div>
            <span className="font-medium text-stone-500">From:</span>{" "}
            <span className="text-stone-700">{email.fromAddress}</span>
          </div>
        )}
        <div>
          <span className="font-medium text-stone-500">Subject:</span>{" "}
          <span className="text-stone-700">{email.subject}</span>
        </div>
        <div>
          <span className="font-medium text-stone-500">Date:</span>{" "}
          <span className="text-stone-700">{formatDateTime(email.createdAt)}</span>
        </div>
      </div>
      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-stone-700">
          {email.body}
        </pre>
      </div>
      {email.disclosureText && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
            Disclosure
          </p>
          <p className="mt-1 text-xs text-amber-700">{email.disclosureText}</p>
        </div>
      )}
    </div>
  );
}

function SmsDetail({ sms }: { sms: SmsMessage }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-xs">
        <div>
          <span className="font-medium text-stone-500">To:</span>{" "}
          <span className="text-stone-700">{sms.toNumber}</span>
        </div>
        {sms.fromNumber && (
          <div>
            <span className="font-medium text-stone-500">From:</span>{" "}
            <span className="text-stone-700">{sms.fromNumber}</span>
          </div>
        )}
        <div>
          <span className="font-medium text-stone-500">Date:</span>{" "}
          <span className="text-stone-700">{formatDateTime(sms.createdAt)}</span>
        </div>
      </div>
      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <p className="text-sm leading-relaxed text-stone-700">{sms.body}</p>
      </div>
      {sms.disclosureText && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
            Disclosure
          </p>
          <p className="mt-1 text-xs text-amber-700">{sms.disclosureText}</p>
        </div>
      )}
    </div>
  );
}

function CallDetail({ call }: { call: CallEntry }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        <div>
          <span className="font-medium text-stone-500">To:</span>{" "}
          <span className="text-stone-700">{call.toNumber}</span>
        </div>
        {call.fromNumber && (
          <div>
            <span className="font-medium text-stone-500">From:</span>{" "}
            <span className="text-stone-700">{call.fromNumber}</span>
          </div>
        )}
        <div>
          <span className="font-medium text-stone-500">Date:</span>{" "}
          <span className="text-stone-700">{formatDateTime(call.createdAt)}</span>
        </div>
        {call.durationSeconds != null && (
          <div>
            <span className="font-medium text-stone-500">Duration:</span>{" "}
            <span className="text-stone-700">
              {formatDuration(call.durationSeconds)}
            </span>
          </div>
        )}
        {call.startedAt && (
          <div>
            <span className="font-medium text-stone-500">Started:</span>{" "}
            <span className="text-stone-700">
              {formatDateTime(call.startedAt)}
            </span>
          </div>
        )}
        {call.endedAt && (
          <div>
            <span className="font-medium text-stone-500">Ended:</span>{" "}
            <span className="text-stone-700">
              {formatDateTime(call.endedAt)}
            </span>
          </div>
        )}
      </div>

      {/* Script */}
      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-stone-500">
          <FileText className="h-3 w-3" />
          Call Script
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-stone-700">
            {call.script}
          </pre>
        </div>
      </div>

      {/* Recording */}
      {call.recordingUrl && (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-stone-500">
            <Play className="h-3 w-3" />
            Recording
          </div>
          <a
            href={call.recordingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 transition-colors hover:bg-stone-50"
          >
            <ExternalLink className="h-3 w-3" />
            Listen to recording
          </a>
        </div>
      )}

      {/* Transcript */}
      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-stone-500">
          <MessageSquare className="h-3 w-3" />
          Transcript
          <Badge
            variant={
              call.transcriptStatus === "COMPLETED"
                ? "success"
                : call.transcriptStatus === "PROCESSING"
                  ? "warning"
                  : call.transcriptStatus === "FAILED"
                    ? "destructive"
                    : "secondary"
            }
            className="ml-1"
          >
            {call.transcriptStatus === "PROCESSING" && (
              <Loader2 className="mr-0.5 h-2.5 w-2.5 animate-spin" />
            )}
            {call.transcriptStatus}
          </Badge>
        </div>
        {call.transcriptText ? (
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-stone-700">
              {call.transcriptText}
            </pre>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-stone-200 bg-stone-50/50 p-4 text-center">
            <p className="text-xs text-stone-400">
              {call.transcriptStatus === "PENDING"
                ? "Transcript not yet available"
                : call.transcriptStatus === "PROCESSING"
                  ? "Transcript is being generated..."
                  : call.transcriptStatus === "FAILED"
                    ? "Transcription failed"
                    : "No transcript available"}
            </p>
          </div>
        )}
      </div>

      {call.disclosureText && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
            Disclosure
          </p>
          <p className="mt-1 text-xs text-amber-700">{call.disclosureText}</p>
        </div>
      )}
    </div>
  );
}
