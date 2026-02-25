import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ApprovalsClient } from "./approvals-client";

export default async function ApprovalsPage({
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

  const approvals = await prisma.pendingApproval.findMany({
    where: { caseId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ApprovalsClient
      caseId={caseId}
      approvals={JSON.parse(JSON.stringify(approvals))}
    />
  );
}
