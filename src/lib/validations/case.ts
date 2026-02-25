import { z } from "zod";

export const updateCaseSchema = z.object({
  title: z.string().min(1).optional(),
  goalSummary: z.string().optional(),
  goalDeadline: z.string().optional(),
  budgetTarget: z.number().min(0).optional(),
  budgetMax: z.number().min(0).optional(),
  sandboxMode: z.boolean().optional(),
});

export const updatePolicySchema = z.object({
  approvalLevel: z
    .enum([
      "LEVEL_1_REVIEW_ALL",
      "LEVEL_2_AUTO_OUTREACH",
      "LEVEL_3_AUTO_EXECUTE_LIMITED",
    ])
    .optional(),
  disclosureMode: z.enum(["FULL", "MINIMAL"]).optional(),
  allowOutbound: z.boolean().optional(),
  allowEmail: z.boolean().optional(),
  allowSms: z.boolean().optional(),
  allowCalls: z.boolean().optional(),
  callingWindowStart: z.string().optional(),
  callingWindowEnd: z.string().optional(),
  timezone: z.string().optional(),
  contactFirstName: z.string().optional(),
});

export const approvalActionSchema = z.object({
  approvalId: z.string(),
  action: z.enum(["approve", "reject"]),
  editedPayload: z.any().optional(),
});
