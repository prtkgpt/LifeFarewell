import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function processJobs() {
  const jobs = await prisma.job.findMany({
    where: {
      status: "PENDING",
      runAt: { lte: new Date() },
    },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  const results = [];

  for (const job of jobs) {
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "RUNNING", attempts: job.attempts + 1 },
    });

    try {
      const payload = job.payload as Record<string, string>;

      switch (job.type) {
        case "vendor_discovery": {
          const { runVendorDiscovery } = await import("@/agents/vendor-discovery");
          await runVendorDiscovery({ caseId: payload.caseId });
          break;
        }
        case "outreach": {
          const { runOutreach } = await import("@/agents/outreach");
          await runOutreach({ caseId: payload.caseId, vendorId: payload.vendorId });
          break;
        }
        case "request_quotes": {
          const { runOutreach } = await import("@/agents/outreach");
          await runOutreach({ caseId: payload.caseId, vendorId: payload.vendorId });
          break;
        }
        case "normalize_quotes": {
          const { runQuoteNormalization } = await import("@/agents/quote-normalization");
          const quotes = await prisma.quoteRequest.findMany({
            where: { caseId: payload.caseId },
          });
          for (const quote of quotes) {
            await runQuoteNormalization({ quoteRequestId: quote.id });
          }
          break;
        }
        case "calling": {
          const { runCalling } = await import("@/agents/calling");
          await runCalling({ caseId: payload.caseId, vendorId: payload.vendorId });
          break;
        }
        case "trigger": {
          const { runTrigger } = await import("@/agents/trigger");
          await runTrigger({ caseId: payload.caseId });
          break;
        }
        case "send_email":
        case "send_sms":
        case "send_call":
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      await prisma.job.update({
        where: { id: job.id },
        data: { status: "COMPLETED", result: { success: true } },
      });

      results.push({ id: job.id, status: "COMPLETED" });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";

      const shouldRetry = job.attempts + 1 < job.maxAttempts;

      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: shouldRetry ? "PENDING" : "FAILED",
          lastError: errorMessage,
        },
      });

      results.push({
        id: job.id,
        status: shouldRetry ? "RETRY" : "FAILED",
        error: errorMessage,
      });
    }
  }

  return { processed: results.length, results };
}

// Vercel Cron handler — authenticated via CRON_SECRET
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processJobs();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Job runner error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Manual trigger — authenticated via user session
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processJobs();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Job runner error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
