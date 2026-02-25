"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  bereavedDetailsSchema,
  communicationConsentSchema,
} from "@/lib/validations/onboarding";
import { redirect } from "next/navigation";

export async function createBereavedCase(formData: {
  relationship: string;
  city: string;
  state: string;
  dateOfDeath?: string;
  hasExistingFuneralHome: boolean;
  immediateNeeds: string[];
  budgetTarget: number;
  budgetMax: number;
  allowOutbound: boolean;
  allowEmail: boolean;
  allowSms: boolean;
  allowCalls: boolean;
  callingWindowStart?: string;
  callingWindowEnd?: string;
  timezone: string;
  approvalLevel: "LEVEL_1_REVIEW_ALL" | "LEVEL_2_AUTO_OUTREACH" | "LEVEL_3_AUTO_EXECUTE_LIMITED";
  disclosureMode: "FULL" | "MINIMAL";
  contactFirstName: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  // Validate details
  const detailsParsed = bereavedDetailsSchema.safeParse({
    relationship: formData.relationship,
    city: formData.city,
    state: formData.state,
    dateOfDeath: formData.dateOfDeath,
    hasExistingFuneralHome: formData.hasExistingFuneralHome,
    immediateNeeds: formData.immediateNeeds,
    budgetTarget: formData.budgetTarget,
    budgetMax: formData.budgetMax,
  });

  if (!detailsParsed.success) {
    return { error: detailsParsed.error.flatten().fieldErrors };
  }

  // Validate consent
  const consentParsed = communicationConsentSchema.safeParse({
    allowOutbound: formData.allowOutbound,
    allowEmail: formData.allowEmail,
    allowSms: formData.allowSms,
    allowCalls: formData.allowCalls,
    callingWindowStart: formData.callingWindowStart,
    callingWindowEnd: formData.callingWindowEnd,
    timezone: formData.timezone,
    approvalLevel: formData.approvalLevel,
    disclosureMode: formData.disclosureMode,
    contactFirstName: formData.contactFirstName,
  });

  if (!consentParsed.success) {
    return { error: consentParsed.error.flatten().fieldErrors };
  }

  const details = detailsParsed.data;
  const consent = consentParsed.data;

  // Create everything in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create onboarding profile
    await tx.onboardingProfile.create({
      data: {
        userId: session.user.id,
        useCase: "BEREAVED",
        relationship: details.relationship,
        city: details.city,
        state: details.state,
        dateOfDeath: details.dateOfDeath ? new Date(details.dateOfDeath) : null,
        hasExistingFuneralHome: details.hasExistingFuneralHome,
        immediateNeeds: details.immediateNeeds,
        budgetTarget: details.budgetTarget,
        budgetMax: details.budgetMax,
      },
    });

    // Create case
    const newCase = await tx.case.create({
      data: {
        userId: session.user.id,
        title: `Arrangements for ${consent.contactFirstName}'s family`,
        pipelineStage: "DISCOVERY",
        goalSummary: `Get 3 comparable funeral quotes under $${(details.budgetMax / 100).toLocaleString()}`,
        budgetTarget: details.budgetTarget,
        budgetMax: details.budgetMax,
        city: details.city,
        state: details.state,
        sandboxMode: true,
      },
    });

    // Create decedent profile
    await tx.decedentProfile.create({
      data: {
        caseId: newCase.id,
        dateOfDeath: details.dateOfDeath ? new Date(details.dateOfDeath) : null,
        city: details.city,
        state: details.state,
      },
    });

    // Create communication policy
    await tx.communicationPolicy.create({
      data: {
        caseId: newCase.id,
        approvalLevel: consent.approvalLevel,
        disclosureMode: consent.disclosureMode,
        allowOutbound: consent.allowOutbound,
        allowEmail: consent.allowEmail,
        allowSms: consent.allowSms,
        allowCalls: consent.allowCalls,
        callingWindowStart: consent.callingWindowStart,
        callingWindowEnd: consent.callingWindowEnd,
        timezone: consent.timezone,
        contactFirstName: consent.contactFirstName,
      },
    });

    // Create initial checklist items
    const checklistItems = getDefaultChecklist();
    await tx.checklistItem.createMany({
      data: checklistItems.map((item, index) => ({
        caseId: newCase.id,
        scopeType: "CASE",
        title: item.title,
        description: item.description,
        category: item.category,
        sortOrder: index,
        status: "NOT_STARTED",
      })),
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        caseId: newCase.id,
        actorType: "USER",
        actionType: "case.created",
        summary: `Case created: ${newCase.title}`,
        payload: {
          relationship: details.relationship,
          city: details.city,
          state: details.state,
          budgetTarget: details.budgetTarget,
          budgetMax: details.budgetMax,
          approvalLevel: consent.approvalLevel,
          disclosureMode: consent.disclosureMode,
        },
      },
    });

    return newCase;
  });

  redirect(`/app/case/${result.id}/concierge`);
}

export async function createPreneedPlan(formData: {
  title: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const plan = await prisma.$transaction(async (tx) => {
    await tx.onboardingProfile.create({
      data: {
        userId: session.user.id,
        useCase: "PRENEED",
      },
    });

    const newPlan = await tx.plan.create({
      data: {
        userId: session.user.id,
        title: formData.title || "My Pre-Need Plan",
        notes: formData.notes,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        planId: newPlan.id,
        actorType: "USER",
        actionType: "plan.created",
        summary: `Pre-need plan created: ${newPlan.title}`,
      },
    });

    return newPlan;
  });

  redirect(`/app/plan/${plan.id}/overview`);
}

function getDefaultChecklist() {
  return [
    { title: "Obtain legal pronouncement of death", description: "Contact hospice, hospital, or coroner", category: "immediate" },
    { title: "Contact close family and friends", description: "Notify immediate family members personally", category: "immediate" },
    { title: "Arrange care of dependents and pets", description: "Ensure children and pets are looked after", category: "immediate" },
    { title: "Secure the home of the deceased", description: "Lock up, forward mail, adjust utilities", category: "immediate" },
    { title: "Choose a funeral home", description: "Compare options and select a provider", category: "first_week" },
    { title: "Plan memorial or funeral service", description: "Decide on type, location, date", category: "first_week" },
    { title: "Obtain death certificates", description: "Request 10-15 certified copies", category: "first_week" },
    { title: "Write and publish obituary", description: "Draft, review, and submit to publications", category: "first_week" },
    { title: "Notify employer and benefits", description: "Contact HR for benefits and final pay", category: "first_month" },
    { title: "Contact Social Security Administration", description: "Report the death and apply for benefits", category: "first_month" },
    { title: "Review life insurance policies", description: "File claims with all insurers", category: "first_month" },
    { title: "Contact financial institutions", description: "Banks, investments, retirement accounts", category: "first_month" },
    { title: "Begin probate process if needed", description: "Consult with estate attorney", category: "ongoing" },
    { title: "Update accounts and subscriptions", description: "Cancel or transfer services", category: "ongoing" },
    { title: "File final tax returns", description: "Federal, state, and estate taxes", category: "ongoing" },
  ];
}
