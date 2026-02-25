import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ChecklistClient } from "./checklist-client";

export default async function ChecklistPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const { caseId } = await params;

  const caseData = await prisma.case.findFirst({
    where: { id: caseId, userId: session.user.id },
  });

  if (!caseData) notFound();

  const checklistItems = await prisma.checklistItem.findMany({
    where: { caseId },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  return (
    <ChecklistClient
      caseId={caseId}
      items={JSON.parse(JSON.stringify(checklistItems))}
    />
  );
}
