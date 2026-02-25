"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addToShortlist(caseId: string, vendorId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const caseData = await prisma.case.findFirst({
    where: { id: caseId, userId: session.user.id },
  });
  if (!caseData) throw new Error("Case not found");

  // Check if already shortlisted
  const existing = await prisma.vendorShortlist.findUnique({
    where: { caseId_vendorId: { caseId, vendorId } },
  });
  if (existing) return;

  // Get next priority
  const maxPriority = await prisma.vendorShortlist.findFirst({
    where: { caseId },
    orderBy: { priority: "desc" },
    select: { priority: true },
  });

  await prisma.vendorShortlist.create({
    data: {
      caseId,
      vendorId,
      priority: (maxPriority?.priority ?? 0) + 1,
      status: "pending",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      caseId,
      actorType: "USER",
      actionType: "vendor.shortlisted",
      summary: "Vendor added to shortlist",
      payload: { vendorId },
    },
  });

  revalidatePath(`/app/case/${caseId}/vendors`);
}
