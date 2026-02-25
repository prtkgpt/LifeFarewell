"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Settings,
  Save,
  Loader2,
  Check,
  Shield,
  Phone,
  Mail,
  MessageSquare,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  updateCaseSettings,
  updateCommunicationPolicy,
} from "@/lib/actions/case";

interface CaseData {
  id: string;
  title: string;
  goalSummary: string | null;
  goalDeadline: string | null;
  budgetTarget: number | null;
  budgetMax: number | null;
  sandboxMode: boolean;
  communicationPolicy: {
    id: string;
    approvalLevel: string;
    disclosureMode: string;
    allowOutbound: boolean;
    allowEmail: boolean;
    allowSms: boolean;
    allowCalls: boolean;
    callingWindowStart: string | null;
    callingWindowEnd: string | null;
    timezone: string;
    contactFirstName: string | null;
  } | null;
}

export default function CaseSettingsPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState<CaseData | null>(null);

  // Case details form state
  const [title, setTitle] = useState("");
  const [goalSummary, setGoalSummary] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [budgetTarget, setBudgetTarget] = useState("");
  const [budgetMax, setBudgetMax] = useState("");

  // Communication policy state
  const [approvalLevel, setApprovalLevel] = useState("LEVEL_1_REVIEW_ALL");
  const [disclosureMode, setDisclosureMode] = useState("FULL");
  const [allowEmail, setAllowEmail] = useState(true);
  const [allowSms, setAllowSms] = useState(true);
  const [allowCalls, setAllowCalls] = useState(true);
  const [callingWindowStart, setCallingWindowStart] = useState("09:00");
  const [callingWindowEnd, setCallingWindowEnd] = useState("17:00");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [contactFirstName, setContactFirstName] = useState("");

  // Sandbox
  const [sandboxMode, setSandboxMode] = useState(true);

  // Save states
  const [savingCase, setSavingCase] = useState(false);
  const [savedCase, setSavedCase] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [savedPolicy, setSavedPolicy] = useState(false);
  const [savingSandbox, setSavingSandbox] = useState(false);
  const [savedSandbox, setSavedSandbox] = useState(false);

  useEffect(() => {
    async function loadCase() {
      try {
        const res = await fetch(`/api/cases/${caseId}/settings`);
        if (res.ok) {
          const data: CaseData = await res.json();
          setCaseData(data);
          setTitle(data.title);
          setGoalSummary(data.goalSummary || "");
          setGoalDeadline(
            data.goalDeadline
              ? new Date(data.goalDeadline).toISOString().slice(0, 10)
              : ""
          );
          setBudgetTarget(data.budgetTarget?.toString() || "");
          setBudgetMax(data.budgetMax?.toString() || "");
          setSandboxMode(data.sandboxMode);

          if (data.communicationPolicy) {
            setApprovalLevel(data.communicationPolicy.approvalLevel);
            setDisclosureMode(data.communicationPolicy.disclosureMode);
            setAllowEmail(data.communicationPolicy.allowEmail);
            setAllowSms(data.communicationPolicy.allowSms);
            setAllowCalls(data.communicationPolicy.allowCalls);
            setCallingWindowStart(
              data.communicationPolicy.callingWindowStart || "09:00"
            );
            setCallingWindowEnd(
              data.communicationPolicy.callingWindowEnd || "17:00"
            );
            setTimezone(data.communicationPolicy.timezone);
            setContactFirstName(
              data.communicationPolicy.contactFirstName || ""
            );
          }
        }
      } catch (err) {
        console.error("Failed to load case settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCase();
  }, [caseId]);

  async function handleSaveCase() {
    setSavingCase(true);
    setSavedCase(false);
    try {
      await updateCaseSettings(caseId, {
        title,
        goalSummary: goalSummary || undefined,
        goalDeadline: goalDeadline || undefined,
        budgetTarget: budgetTarget ? parseInt(budgetTarget) : undefined,
        budgetMax: budgetMax ? parseInt(budgetMax) : undefined,
      });
      setSavedCase(true);
      setTimeout(() => setSavedCase(false), 3000);
    } catch (err) {
      console.error("Failed to save case settings:", err);
    } finally {
      setSavingCase(false);
    }
  }

  async function handleSavePolicy() {
    setSavingPolicy(true);
    setSavedPolicy(false);
    try {
      await updateCommunicationPolicy(caseId, {
        approvalLevel: approvalLevel as
          | "LEVEL_1_REVIEW_ALL"
          | "LEVEL_2_AUTO_OUTREACH"
          | "LEVEL_3_AUTO_EXECUTE_LIMITED",
        disclosureMode: disclosureMode as "FULL" | "MINIMAL",
        allowEmail,
        allowSms,
        allowCalls,
        callingWindowStart,
        callingWindowEnd,
        timezone,
        contactFirstName: contactFirstName || undefined,
      });
      setSavedPolicy(true);
      setTimeout(() => setSavedPolicy(false), 3000);
    } catch (err) {
      console.error("Failed to save policy:", err);
    } finally {
      setSavingPolicy(false);
    }
  }

  async function handleToggleSandbox() {
    setSavingSandbox(true);
    setSavedSandbox(false);
    const newValue = !sandboxMode;
    try {
      await updateCaseSettings(caseId, { sandboxMode: newValue });
      setSandboxMode(newValue);
      setSavedSandbox(true);
      setTimeout(() => setSavedSandbox(false), 3000);
    } catch (err) {
      console.error("Failed to toggle sandbox:", err);
    } finally {
      setSavingSandbox(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900">
          Case Settings
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Configure your case details, communication policy, and execution mode
        </p>
      </div>

      <div className="space-y-6">
        {/* Section 1: Case Details */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <div className="mb-5 flex items-center gap-2">
            <Settings className="h-5 w-5 text-stone-600" />
            <h2 className="text-lg font-semibold text-stone-900">
              Case Details
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                Case Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                Goal Summary
              </label>
              <textarea
                value={goalSummary}
                onChange={(e) => setGoalSummary(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                placeholder="Describe the main goal for this case..."
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                Deadline
              </label>
              <input
                type="date"
                value={goalDeadline}
                onChange={(e) => setGoalDeadline(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
              />
            </div>

            <div />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                Target Budget (cents)
              </label>
              <input
                type="number"
                value={budgetTarget}
                onChange={(e) => setBudgetTarget(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                placeholder="e.g., 500000"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                Maximum Budget (cents)
              </label>
              <input
                type="number"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                placeholder="e.g., 800000"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={handleSaveCase}
              disabled={savingCase}
              className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-50"
            >
              {savingCase ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : savedCase ? (
                <Check className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {savingCase ? "Saving..." : savedCase ? "Saved" : "Save Details"}
            </button>
          </div>
        </div>

        {/* Section 2: Communication Policy */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <div className="mb-5 flex items-center gap-2">
            <Shield className="h-5 w-5 text-stone-600" />
            <h2 className="text-lg font-semibold text-stone-900">
              Communication Policy
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                Approval Level
              </label>
              <select
                value={approvalLevel}
                onChange={(e) => setApprovalLevel(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
              >
                <option value="LEVEL_1_REVIEW_ALL">
                  Level 1 - Review All
                </option>
                <option value="LEVEL_2_AUTO_OUTREACH">
                  Level 2 - Auto Outreach
                </option>
                <option value="LEVEL_3_AUTO_EXECUTE_LIMITED">
                  Level 3 - Auto Execute (Limited)
                </option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                AI Disclosure Mode
              </label>
              <select
                value={disclosureMode}
                onChange={(e) => setDisclosureMode(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
              >
                <option value="FULL">Full Disclosure</option>
                <option value="MINIMAL">Minimal Disclosure</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                Contact First Name
              </label>
              <input
                type="text"
                value={contactFirstName}
                onChange={(e) => setContactFirstName(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                placeholder="Name used in outreach"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
              >
                <option value="America/New_York">Eastern</option>
                <option value="America/Chicago">Central</option>
                <option value="America/Denver">Mountain</option>
                <option value="America/Los_Angeles">Pacific</option>
              </select>
            </div>

            {/* Channels */}
            <div className="sm:col-span-2">
              <label className="mb-3 block text-sm font-medium text-stone-700">
                Allowed Channels
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setAllowEmail(!allowEmail)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                    allowEmail
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-300 bg-white text-stone-500"
                  }`}
                >
                  <Mail className="h-4 w-4" /> Email
                </button>
                <button
                  type="button"
                  onClick={() => setAllowSms(!allowSms)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                    allowSms
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-300 bg-white text-stone-500"
                  }`}
                >
                  <MessageSquare className="h-4 w-4" /> SMS
                </button>
                <button
                  type="button"
                  onClick={() => setAllowCalls(!allowCalls)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                    allowCalls
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-300 bg-white text-stone-500"
                  }`}
                >
                  <Phone className="h-4 w-4" /> Calls
                </button>
              </div>
            </div>

            {/* Calling window */}
            {allowCalls && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Calling Window Start
                  </label>
                  <input
                    type="time"
                    value={callingWindowStart}
                    onChange={(e) => setCallingWindowStart(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-stone-700">
                    Calling Window End
                  </label>
                  <input
                    type="time"
                    value={callingWindowEnd}
                    onChange={(e) => setCallingWindowEnd(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={handleSavePolicy}
              disabled={savingPolicy}
              className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-50"
            >
              {savingPolicy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : savedPolicy ? (
                <Check className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {savingPolicy
                ? "Saving..."
                : savedPolicy
                ? "Saved"
                : "Save Policy"}
            </button>
          </div>
        </div>

        {/* Section 3: Sandbox Mode */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-stone-900">
              Sandbox Mode
            </h2>
          </div>

          <p className="mb-4 text-sm text-stone-500">
            When sandbox mode is enabled, all communications are simulated. No
            real emails, SMS messages, or phone calls will be sent to vendors.
            This is recommended during initial setup and testing.
          </p>

          <div className="flex items-center justify-between rounded-xl bg-stone-50 p-4">
            <div className="flex items-center gap-3">
              {sandboxMode ? (
                <ToggleRight className="h-8 w-8 text-amber-600" />
              ) : (
                <ToggleLeft className="h-8 w-8 text-stone-400" />
              )}
              <div>
                <p className="text-sm font-semibold text-stone-900">
                  {sandboxMode ? "Sandbox Active" : "Sandbox Disabled"}
                </p>
                <p className="text-xs text-stone-500">
                  {sandboxMode
                    ? "Communications are simulated only"
                    : "Real communications will be sent"}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleSandbox}
              disabled={savingSandbox}
              className={`rounded-xl px-5 py-2.5 text-sm font-medium transition-colors ${
                sandboxMode
                  ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                  : "bg-red-100 text-red-800 hover:bg-red-200"
              } disabled:opacity-50`}
            >
              {savingSandbox ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : savedSandbox ? (
                "Updated"
              ) : sandboxMode ? (
                "Disable Sandbox"
              ) : (
                "Enable Sandbox"
              )}
            </button>
          </div>

          {!sandboxMode && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800">
                Warning: Sandbox mode is disabled. Approved communications will
                be sent to real recipients.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
