"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateCaseSettings(
  caseId: string,
  data: {
    title?: string;
    goalSummary?: string;
    goalDeadline?: string;
    budgetTarget?: number;
    budgetMax?: number;
    sandboxMode?: boolean;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const existing = await prisma.case.findFirst({
    where: { id: caseId, userId: session.user.id },
  });
  if (!existing) throw new Error("Case not found");

  await prisma.case.update({
    where: { id: caseId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.goalSummary !== undefined && { goalSummary: data.goalSummary }),
      ...(data.goalDeadline !== undefined && {
        goalDeadline: new Date(data.goalDeadline),
      }),
      ...(data.budgetTarget !== undefined && { budgetTarget: data.budgetTarget }),
      ...(data.budgetMax !== undefined && { budgetMax: data.budgetMax }),
      ...(data.sandboxMode !== undefined && { sandboxMode: data.sandboxMode }),
    },
  });

  revalidatePath(`/app/case/${caseId}`);
}

export async function updateCommunicationPolicy(
  caseId: string,
  data: {
    approvalLevel?: "LEVEL_1_REVIEW_ALL" | "LEVEL_2_AUTO_OUTREACH" | "LEVEL_3_AUTO_EXECUTE_LIMITED";
    disclosureMode?: "FULL" | "MINIMAL";
    allowOutbound?: boolean;
    allowEmail?: boolean;
    allowSms?: boolean;
    allowCalls?: boolean;
    callingWindowStart?: string;
    callingWindowEnd?: string;
    timezone?: string;
    contactFirstName?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const existing = await prisma.case.findFirst({
    where: { id: caseId, userId: session.user.id },
    include: { communicationPolicy: true },
  });
  if (!existing || !existing.communicationPolicy) {
    throw new Error("Case or policy not found");
  }

  await prisma.communicationPolicy.update({
    where: { id: existing.communicationPolicy.id },
    data,
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      caseId,
      actorType: "USER",
      actionType: "policy.updated",
      summary: "Communication policy updated",
      payload: data,
    },
  });

  revalidatePath(`/app/case/${caseId}`);
}

export async function handleApproval(
  approvalId: string,
  action: "approve" | "reject"
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const approval = await prisma.pendingApproval.findFirst({
    where: { id: approvalId, userId: session.user.id, status: "PENDING" },
  });
  if (!approval) throw new Error("Approval not found");

  const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

  await prisma.pendingApproval.update({
    where: { id: approvalId },
    data: { status: newStatus, resolvedAt: new Date() },
  });

  // If approved, execute the action
  if (action === "approve" && approval.referenceId) {
    const payload = approval.payload as Record<string, unknown>;
    switch (approval.type) {
      case "EMAIL":
        await prisma.emailMessage.update({
          where: { id: approval.referenceId },
          data: {
            status: process.env.SANDBOX_MODE === "true" ? "SIMULATED" : "APPROVED",
          },
        });
        break;
      case "SMS":
        await prisma.smsMessage.update({
          where: { id: approval.referenceId },
          data: {
            status: process.env.SANDBOX_MODE === "true" ? "SIMULATED" : "APPROVED",
          },
        });
        break;
      case "CALL":
        await prisma.call.update({
          where: { id: approval.referenceId },
          data: {
            status: process.env.SANDBOX_MODE === "true" ? "SIMULATED" : "APPROVED",
          },
        });
        break;
    }

    // Create send job for approved communications
    if (process.env.SANDBOX_MODE !== "true") {
      await prisma.job.create({
        data: {
          type: `send_${approval.type.toLowerCase()}`,
          payload: { referenceId: approval.referenceId, ...payload },
          status: "PENDING",
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      caseId: approval.caseId,
      actorType: "USER",
      actionType: `approval.${action}d`,
      summary: `${approval.type} ${action}d: ${approval.title}`,
      payload: { approvalId, type: approval.type },
    },
  });

  revalidatePath(`/app/case/${approval.caseId}`);
  return { success: true };
}

export async function runAgentAction(
  caseId: string,
  actionType: string
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const existing = await prisma.case.findFirst({
    where: { id: caseId, userId: session.user.id },
    include: { vendorShortlists: true },
  });
  if (!existing) throw new Error("Case not found");

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      caseId,
      actorType: "USER",
      actionType: `agent.${actionType}.started`,
      summary: `Agent action started: ${actionType}`,
    },
  });

  // Execute the agent directly instead of just enqueuing
  try {
    switch (actionType) {
      case "vendor_discovery": {
        const { runVendorDiscovery } = await import("@/agents/vendor-discovery");
        await runVendorDiscovery({ caseId });
        break;
      }
      case "outreach":
      case "request_quotes": {
        const { runOutreach } = await import("@/agents/outreach");
        // Auto-select uncontacted vendors from the shortlist
        const uncontacted = existing.vendorShortlists.filter(
          (vs) => vs.status === "pending"
        );
        if (uncontacted.length === 0) {
          throw new Error("No uncontacted vendors. Run vendor discovery first.");
        }
        // For "request_quotes", reach out to up to 3; for "outreach", just 1
        const targets = actionType === "request_quotes"
          ? uncontacted.slice(0, 3)
          : uncontacted.slice(0, 1);
        for (const vs of targets) {
          await runOutreach({ caseId, vendorId: vs.vendorId });
          // Mark vendor as contacted
          await prisma.vendorShortlist.update({
            where: { id: vs.id },
            data: { status: "contacted" },
          });
        }
        break;
      }
      case "normalize_quotes": {
        const { runQuoteNormalization } = await import("@/agents/quote-normalization");
        const quotes = await prisma.quoteRequest.findMany({
          where: { caseId },
        });
        for (const quote of quotes) {
          await runQuoteNormalization({ quoteRequestId: quote.id });
        }
        break;
      }
      case "trigger": {
        const { runTrigger } = await import("@/agents/trigger");
        await runTrigger({ caseId });
        break;
      }
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }

    // Update pipeline stage after executing any action
    const { runOrchestrator } = await import("@/agents/orchestrator");
    await runOrchestrator({ caseId });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        caseId,
        actorType: "SYSTEM",
        actionType: `agent.${actionType}.failed`,
        summary: `Agent action failed: ${errorMessage}`,
      },
    });
    throw err;
  }

  revalidatePath(`/app/case/${caseId}`);
  return { success: true };
}

export async function updateChecklistItem(
  itemId: string,
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED"
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const item = await prisma.checklistItem.findUnique({
    where: { id: itemId },
    include: { case: true },
  });
  if (!item || (item.case && item.case.userId !== session.user.id)) {
    throw new Error("Item not found");
  }

  await prisma.checklistItem.update({
    where: { id: itemId },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });

  if (item.caseId) {
    revalidatePath(`/app/case/${item.caseId}`);
  }
}
