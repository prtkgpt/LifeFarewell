import { z } from "zod";

export const useCaseSchema = z.object({
  useCase: z.enum(["BEREAVED", "PRENEED"]),
});

export const bereavedDetailsSchema = z.object({
  relationship: z.enum(["spouse", "child", "parent", "sibling", "other"]),
  zipCode: z.string().length(5, "Zip code must be 5 digits").regex(/^\d{5}$/, "Invalid zip code"),
  city: z.string().optional(),
  state: z.string().optional(),
  dateOfDeath: z.string().optional(),
  hasExistingFuneralHome: z.boolean(),
  immediateNeeds: z.array(z.string()).min(1, "Select at least one need"),
  budgetTarget: z.number().min(0),
  budgetMax: z.number().min(0),
});

export const communicationConsentSchema = z.object({
  allowOutbound: z.literal(true, {
    error: "You must allow outbound contact to use the concierge",
  }),
  allowEmail: z.boolean(),
  allowSms: z.boolean(),
  allowCalls: z.boolean(),
  callingWindowStart: z.string().optional(),
  callingWindowEnd: z.string().optional(),
  timezone: z.string(),
  approvalLevel: z.enum([
    "LEVEL_1_REVIEW_ALL",
    "LEVEL_2_AUTO_OUTREACH",
    "LEVEL_3_AUTO_EXECUTE_LIMITED",
  ]),
  disclosureMode: z.enum(["FULL", "MINIMAL"]),
  contactFirstName: z.string().min(1, "First name is required for disclosure"),
});

export const preneedDetailsSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
});

export type UseCaseInput = z.infer<typeof useCaseSchema>;
export type BereavedDetailsInput = z.infer<typeof bereavedDetailsSchema>;
export type CommunicationConsentInput = z.infer<
  typeof communicationConsentSchema
>;
export type PreneedDetailsInput = z.infer<typeof preneedDetailsSchema>;
