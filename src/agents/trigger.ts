import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { runOrchestrator } from "./orchestrator";
import { logAudit } from "./audit";

// ─── Input Schema ────────────────────────────────────────────────────────────

const TriggerInputSchema = z.object({
  caseId: z.string().min(1),
});

export type TriggerInput = z.infer<typeof TriggerInputSchema>;

// ─── Output Types ────────────────────────────────────────────────────────────

export interface TriggerResult {
  caseId: string;
  executionRunId: string;
  pipelineStage: string;
  checklistItemsCreated: number;
  orchestratorActions: number;
  status: "completed" | "failed";
  error?: string;
}

// ─── Default Checklist Items ─────────────────────────────────────────────────

const DEFAULT_CHECKLIST_ITEMS = [
  {
    title: "Gather decedent information",
    description:
      "Collect full name, date of birth, date of death, and other vital information for the decedent.",
    category: "intake",
    sortOrder: 1,
  },
  {
    title: "Set communication preferences",
    description:
      "Configure approval level, disclosure mode, and allowed communication channels.",
    category: "intake",
    sortOrder: 2,
  },
  {
    title: "Define budget and goals",
    description:
      "Set a target and maximum budget, and describe the family's goals for arrangements.",
    category: "intake",
    sortOrder: 3,
  },
  {
    title: "Discover local vendors",
    description:
      "Search for funeral homes, cremation providers, and related services in the area.",
    category: "discovery",
    sortOrder: 4,
  },
  {
    title: "Send vendor outreach",
    description:
      "Contact shortlisted vendors to request pricing and availability.",
    category: "outreach",
    sortOrder: 5,
  },
  {
    title: "Collect and review quotes",
    description:
      "Receive vendor quotes, normalize pricing, and flag potential hidden fees.",
    category: "responses",
    sortOrder: 6,
  },
  {
    title: "Compare vendor options",
    description:
      "Review scored recommendations and compare vendors on value, speed, transparency, and completeness.",
    category: "comparison",
    sortOrder: 7,
  },
  {
    title: "Make a decision",
    description:
      "Select a vendor and service package based on the family's needs and budget.",
    category: "decision",
    sortOrder: 8,
  },
];

// ─── Implementation ──────────────────────────────────────────────────────────

export async function runTrigger(
  params: TriggerInput
): Promise<TriggerResult> {
  const input = TriggerInputSchema.parse(params);

  // Verify case exists
  const caseRecord = await prisma.case.findUniqueOrThrow({
    where: { id: input.caseId },
    include: { checklistItems: true },
  });

  // Create ExecutionRun
  const executionRun = await prisma.executionRun.create({
    data: {
      caseId: input.caseId,
      scopeType: "CASE",
      status: "running",
      startedAt: new Date(),
    },
  });

  try {
    // Seed default checklist items if none exist for this case
    let checklistItemsCreated = 0;
    if (caseRecord.checklistItems.length === 0) {
      for (const item of DEFAULT_CHECKLIST_ITEMS) {
        await prisma.checklistItem.create({
          data: {
            caseId: input.caseId,
            scopeType: "CASE",
            title: item.title,
            description: item.description,
            category: item.category,
            sortOrder: item.sortOrder,
            status: "NOT_STARTED",
          },
        });
        checklistItemsCreated++;
      }
    }

    // Run the orchestrator to get next actions and update pipeline stage
    const orchestratorResult = await runOrchestrator({
      caseId: input.caseId,
    });

    // Update case pipeline stage (orchestrator may have already done this,
    // but we ensure consistency)
    await prisma.case.update({
      where: { id: input.caseId },
      data: { pipelineStage: orchestratorResult.currentStage },
    });

    // Mark execution run as completed
    await prisma.executionRun.update({
      where: { id: executionRun.id },
      data: {
        status: "completed",
        endedAt: new Date(),
        summary: `Pipeline stage: ${orchestratorResult.currentStage}. ${orchestratorResult.nextActions.length} action(s) recommended. ${checklistItemsCreated} checklist item(s) seeded.`,
      },
    });

    // Write audit log
    await logAudit({
      caseId: input.caseId,
      userId: caseRecord.userId,
      actorType: "AGENT",
      actionType: "TRIGGER_RUN",
      summary: `Trigger completed for case. ExecutionRun: ${executionRun.id}. Stage: ${orchestratorResult.currentStage}. ${orchestratorResult.nextActions.length} action(s).`,
      payload: {
        executionRunId: executionRun.id,
        pipelineStage: orchestratorResult.currentStage,
        checklistItemsCreated,
        orchestratorActions: orchestratorResult.nextActions.length,
        nextActions: orchestratorResult.nextActions,
      },
    });

    return {
      caseId: input.caseId,
      executionRunId: executionRun.id,
      pipelineStage: orchestratorResult.currentStage,
      checklistItemsCreated,
      orchestratorActions: orchestratorResult.nextActions.length,
      status: "completed",
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : String(err);

    // Mark execution run as failed
    await prisma.executionRun.update({
      where: { id: executionRun.id },
      data: {
        status: "failed",
        endedAt: new Date(),
        summary: `Trigger failed: ${errorMessage}`,
      },
    });

    // Write audit log for failure
    await logAudit({
      caseId: input.caseId,
      userId: caseRecord.userId,
      actorType: "AGENT",
      actionType: "TRIGGER_FAILED",
      summary: `Trigger failed for case: ${errorMessage}`,
      payload: {
        executionRunId: executionRun.id,
        error: errorMessage,
      },
    });

    return {
      caseId: input.caseId,
      executionRunId: executionRun.id,
      pipelineStage: caseRecord.pipelineStage,
      checklistItemsCreated: 0,
      orchestratorActions: 0,
      status: "failed",
      error: errorMessage,
    };
  }
}
