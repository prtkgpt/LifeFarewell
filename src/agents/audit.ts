import { z } from "zod";
import { prisma } from "@/lib/prisma";

// ─── Input Schema ────────────────────────────────────────────────────────────

const LogAuditInputSchema = z.object({
  userId: z.string().optional(),
  caseId: z.string().optional(),
  planId: z.string().optional(),
  actorType: z.string().optional().default("SYSTEM"),
  actionType: z.string(),
  summary: z.string(),
  payload: z.any().optional(),
});

export type LogAuditInput = z.infer<typeof LogAuditInputSchema>;

// ─── Output Type ─────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  caseId: string | null;
  planId: string | null;
  actorType: string;
  actionType: string;
  summary: string;
  payload: unknown;
  createdAt: Date;
}

// ─── Implementation ──────────────────────────────────────────────────────────

export async function logAudit(params: LogAuditInput): Promise<AuditLogEntry> {
  const input = LogAuditInputSchema.parse(params);

  const entry = await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      caseId: input.caseId ?? null,
      planId: input.planId ?? null,
      actorType: input.actorType ?? "SYSTEM",
      actionType: input.actionType,
      summary: input.summary,
      payload: input.payload ?? undefined,
    },
  });

  return entry;
}
