"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  Zap,
  Play,
  Loader2,
  Check,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { runAgentAction } from "@/lib/actions/case";

interface RunResult {
  success: boolean;
  message: string;
  timestamp: string;
}

export default function TriggerPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const [runningTrigger, setRunningTrigger] = useState(false);
  const [runningJobs, setRunningJobs] = useState(false);
  const [triggerResult, setTriggerResult] = useState<RunResult | null>(null);
  const [jobsResult, setJobsResult] = useState<RunResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  async function handleRunTrigger() {
    setRunningTrigger(true);
    setTriggerResult(null);
    try {
      const result = await runAgentAction(caseId, "trigger");
      setTriggerResult({
        success: true,
        message:
          "Trigger action enqueued successfully. The agent will simulate event verification, run the orchestrator, and seed the checklist.",
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setTriggerResult({
        success: false,
        message:
          err instanceof Error ? err.message : "Failed to run trigger action",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setRunningTrigger(false);
    }
  }

  async function handleRunJobs() {
    setRunningJobs(true);
    setJobsResult(null);
    try {
      const res = await fetch("/api/jobs/run", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setJobsResult({
          success: true,
          message: `Processed ${data.processed} job(s). ${
            data.results
              ?.map(
                (r: { id: string; status: string }) => `${r.id}: ${r.status}`
              )
              .join(", ") || "No pending jobs."
          }`,
          timestamp: new Date().toISOString(),
        });
      } else {
        setJobsResult({
          success: false,
          message: data.error || "Failed to run jobs",
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      setJobsResult({
        success: false,
        message:
          err instanceof Error ? err.message : "Failed to run jobs",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setRunningJobs(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900">
          Trigger & Simulation
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Manually trigger agent actions and process pending jobs
        </p>
      </div>

      {/* Sandbox warning */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <h3 className="text-sm font-semibold text-amber-900">
            Sandbox Mode Recommended
          </h3>
          <p className="mt-1 text-sm text-amber-800">
            It is strongly recommended to have sandbox mode enabled when running
            triggers and simulations. This ensures no real communications are
            sent to vendors. Check your{" "}
            <a
              href={`/app/case/${caseId}/settings`}
              className="font-medium underline"
            >
              case settings
            </a>{" "}
            to verify.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Trigger Agent */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100">
                <Zap className="h-5 w-5 text-stone-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-stone-900">
                  Run Trigger
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Simulates the event verification process
                </p>
              </div>
            </div>
            <button
              onClick={handleRunTrigger}
              disabled={runningTrigger}
              className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-50"
            >
              {runningTrigger ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {runningTrigger ? "Running..." : "Run Trigger"}
            </button>
          </div>

          {/* What it does */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="mt-4 flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900"
          >
            {showDetails ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            What does this do?
          </button>

          {showDetails && (
            <div className="mt-3 rounded-xl bg-stone-50 p-4">
              <ul className="space-y-2 text-sm text-stone-600">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400" />
                  Simulates event verification (validates that the case trigger
                  conditions are met)
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400" />
                  Runs the orchestrator agent to plan next steps
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400" />
                  Seeds the case checklist with initial tasks
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400" />
                  May enqueue vendor discovery and outreach jobs
                </li>
              </ul>
            </div>
          )}

          {/* Trigger result */}
          {triggerResult && (
            <div
              className={`mt-4 rounded-xl border p-4 ${
                triggerResult.success
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex items-start gap-2">
                {triggerResult.success ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                )}
                <div>
                  <p
                    className={`text-sm font-medium ${
                      triggerResult.success
                        ? "text-emerald-800"
                        : "text-red-800"
                    }`}
                  >
                    {triggerResult.success ? "Success" : "Error"}
                  </p>
                  <p
                    className={`mt-0.5 text-sm ${
                      triggerResult.success
                        ? "text-emerald-700"
                        : "text-red-700"
                    }`}
                  >
                    {triggerResult.message}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">
                    {new Date(triggerResult.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Run Jobs */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100">
                <RefreshCw className="h-5 w-5 text-stone-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-stone-900">
                  Run Jobs Now
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Process all pending background jobs immediately
                </p>
              </div>
            </div>
            <button
              onClick={handleRunJobs}
              disabled={runningJobs}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50"
            >
              {runningJobs ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {runningJobs ? "Processing..." : "Run Jobs"}
            </button>
          </div>

          <p className="mt-3 text-sm text-stone-500">
            This processes all pending jobs in the queue, including vendor
            discovery, outreach, quote normalization, and communication sends.
            Jobs created by the trigger action above will be processed here.
          </p>

          {/* Jobs result */}
          {jobsResult && (
            <div
              className={`mt-4 rounded-xl border p-4 ${
                jobsResult.success
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex items-start gap-2">
                {jobsResult.success ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                )}
                <div>
                  <p
                    className={`text-sm font-medium ${
                      jobsResult.success ? "text-emerald-800" : "text-red-800"
                    }`}
                  >
                    {jobsResult.success ? "Completed" : "Error"}
                  </p>
                  <p
                    className={`mt-0.5 text-sm ${
                      jobsResult.success ? "text-emerald-700" : "text-red-700"
                    }`}
                  >
                    {jobsResult.message}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">
                    {new Date(jobsResult.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Typical workflow */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
          <h3 className="text-sm font-semibold text-stone-700">
            Typical Workflow
          </h3>
          <ol className="mt-3 space-y-2 text-sm text-stone-600">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-semibold text-stone-700">
                1
              </span>
              Verify sandbox mode is enabled in Settings
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-semibold text-stone-700">
                2
              </span>
              Click &quot;Run Trigger&quot; to enqueue the trigger agent job
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-semibold text-stone-700">
                3
              </span>
              Click &quot;Run Jobs&quot; to process the enqueued trigger and any
              subsequent jobs
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-semibold text-stone-700">
                4
              </span>
              Check the Concierge console and Checklist for results
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
