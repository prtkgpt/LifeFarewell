import { z } from "zod";
import { JobStatus } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { runOrchestrator } from "./orchestrator";
import { runVendorDiscovery } from "./vendor-discovery";
import { runOutreach } from "./outreach";
import { runCalling } from "./calling";
import { runNegotiation } from "./negotiation";
import { runQuoteNormalization } from "./quote-normalization";
import { runRecommendation } from "./recommendation";
import { runTrigger } from "./trigger";
import { logAudit } from "./audit";

// ─── Job Type Definitions ────────────────────────────────────────────────────

const JOB_TYPES = [
  "ORCHESTRATOR",
  "VENDOR_DISCOVERY",
  "OUTREACH",
  "CALLING",
  "NEGOTIATION",
  "QUOTE_NORMALIZATION",
  "RECOMMENDATION",
  "TRIGGER",
] as const;

type JobType = (typeof JOB_TYPES)[number];

// Payload schemas for each job type
const JobPayloadSchemas: Record<JobType, z.ZodType> = {
  ORCHESTRATOR: z.object({ caseId: z.string() }),
  VENDOR_DISCOVERY: z.object({ caseId: z.string() }),
  OUTREACH: z.object({ caseId: z.string(), vendorId: z.string() }),
  CALLING: z.object({ caseId: z.string(), vendorId: z.string() }),
  NEGOTIATION: z.object({
    caseId: z.string(),
    vendorId: z.string(),
    quoteRequestId: z.string(),
  }),
  QUOTE_NORMALIZATION: z.object({ quoteRequestId: z.string() }),
  RECOMMENDATION: z.object({ caseId: z.string() }),
  TRIGGER: z.object({ caseId: z.string() }),
};

// ─── Output Types ────────────────────────────────────────────────────────────

export interface JobProcessingResult {
  jobId: string;
  type: string;
  status: "COMPLETED" | "FAILED";
  result?: unknown;
  error?: string;
}

export interface JobRunnerResult {
  processedCount: number;
  results: JobProcessingResult[];
}

// ─── Job Dispatcher ──────────────────────────────────────────────────────────

async function dispatchJob(
  type: string,
  payload: unknown
): Promise<unknown> {
  if (!JOB_TYPES.includes(type as JobType)) {
    throw new Error(`Unknown job type: ${type}`);
  }

  const jobType = type as JobType;
  const schema = JobPayloadSchemas[jobType];
  const validatedPayload = schema.parse(payload);

  switch (jobType) {
    case "ORCHESTRATOR":
      return runOrchestrator(
        validatedPayload as { caseId: string }
      );

    case "VENDOR_DISCOVERY":
      return runVendorDiscovery(
        validatedPayload as { caseId: string }
      );

    case "OUTREACH":
      return runOutreach(
        validatedPayload as { caseId: string; vendorId: string }
      );

    case "CALLING":
      return runCalling(
        validatedPayload as { caseId: string; vendorId: string }
      );

    case "NEGOTIATION":
      return runNegotiation(
        validatedPayload as {
          caseId: string;
          vendorId: string;
          quoteRequestId: string;
        }
      );

    case "QUOTE_NORMALIZATION":
      return runQuoteNormalization(
        validatedPayload as { quoteRequestId: string }
      );

    case "RECOMMENDATION":
      return runRecommendation(
        validatedPayload as { caseId: string }
      );

    case "TRIGGER":
      return runTrigger(
        validatedPayload as { caseId: string }
      );

    default: {
      // Exhaustive check
      const _exhaustive: never = jobType;
      throw new Error(`Unhandled job type: ${_exhaustive}`);
    }
  }
}

// ─── Single Job Processor ────────────────────────────────────────────────────

async function processJob(
  job: {
    id: string;
    type: string;
    payload: unknown;
    attempts: number;
    maxAttempts: number;
  }
): Promise<JobProcessingResult> {
  // Mark as RUNNING
  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: JobStatus.RUNNING,
      attempts: job.attempts + 1,
    },
  });

  try {
    const result = await dispatchJob(job.type, job.payload);

    // Mark as COMPLETED
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.COMPLETED,
        result: result as object,
        lastError: null,
      },
    });

    return {
      jobId: job.id,
      type: job.type,
      status: "COMPLETED",
      result,
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : String(err);

    const newAttempts = job.attempts + 1;
    const hasRetriesLeft = newAttempts < job.maxAttempts;

    // If retries left, set back to PENDING with incremented attempts
    // If no retries left, mark as FAILED
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: hasRetriesLeft ? JobStatus.PENDING : JobStatus.FAILED,
        lastError: errorMessage,
        // If retrying, push runAt forward by exponential backoff
        ...(hasRetriesLeft
          ? {
              runAt: new Date(
                Date.now() + Math.pow(2, newAttempts) * 1000 * 60
              ), // 2^n minutes
            }
          : {}),
      },
    });

    // Log the failure
    const payload = job.payload as Record<string, unknown>;
    const caseId =
      typeof payload?.caseId === "string" ? payload.caseId : undefined;

    await logAudit({
      caseId,
      actorType: "SYSTEM",
      actionType: "JOB_FAILED",
      summary: `Job ${job.id} (${job.type}) failed (attempt ${newAttempts}/${job.maxAttempts}): ${errorMessage}`,
      payload: {
        jobId: job.id,
        jobType: job.type,
        attempt: newAttempts,
        maxAttempts: job.maxAttempts,
        willRetry: hasRetriesLeft,
        error: errorMessage,
      },
    });

    return {
      jobId: job.id,
      type: job.type,
      status: "FAILED",
      error: errorMessage,
    };
  }
}

// ─── Main Job Runner ─────────────────────────────────────────────────────────

export async function runJobRunner(): Promise<JobRunnerResult> {
  // Fetch pending jobs whose runAt is now or in the past
  const pendingJobs = await prisma.job.findMany({
    where: {
      status: JobStatus.PENDING,
      runAt: { lte: new Date() },
    },
    orderBy: { runAt: "asc" },
    take: 10, // Process up to 10 jobs per run
  });

  if (pendingJobs.length === 0) {
    return {
      processedCount: 0,
      results: [],
    };
  }

  const results: JobProcessingResult[] = [];

  // Process jobs sequentially to avoid overwhelming external APIs
  for (const job of pendingJobs) {
    const result = await processJob({
      id: job.id,
      type: job.type,
      payload: job.payload,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
    });
    results.push(result);
  }

  // Write summary audit log
  const completed = results.filter((r) => r.status === "COMPLETED").length;
  const failed = results.filter((r) => r.status === "FAILED").length;

  await logAudit({
    actorType: "SYSTEM",
    actionType: "JOB_RUNNER_COMPLETE",
    summary: `Job runner processed ${results.length} job(s): ${completed} completed, ${failed} failed.`,
    payload: {
      processedCount: results.length,
      completed,
      failed,
      jobs: results.map((r) => ({
        jobId: r.jobId,
        type: r.type,
        status: r.status,
        error: r.error,
      })),
    },
  });

  return {
    processedCount: results.length,
    results,
  };
}

// ─── Utility: Create a Job ───────────────────────────────────────────────────

const CreateJobInputSchema = z.object({
  type: z.enum(JOB_TYPES),
  payload: z.record(z.string(), z.string()),
  runAt: z.date().optional(),
  maxAttempts: z.number().int().min(1).max(10).optional().default(3),
});

export type CreateJobInput = z.infer<typeof CreateJobInputSchema>;

export async function createJob(params: CreateJobInput) {
  const input = CreateJobInputSchema.parse(params);

  const job = await prisma.job.create({
    data: {
      type: input.type,
      payload: input.payload,
      status: JobStatus.PENDING,
      runAt: input.runAt ?? new Date(),
      maxAttempts: input.maxAttempts,
    },
  });

  return job;
}
