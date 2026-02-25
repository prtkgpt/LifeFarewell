import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ConciergeConsole } from "@/components/concierge/console";

export default async function ConciergePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const { caseId } = await params;

  const caseData = await prisma.case.findFirst({
    where: { id: caseId, userId: session.user.id },
    include: {
      communicationPolicy: true,
      decedentProfile: true,
      vendorShortlists: {
        include: { vendor: true },
        orderBy: { priority: "asc" },
      },
      quoteRequests: {
        include: { vendor: true, lineItems: true },
      },
      pendingApprovals: {
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
      },
      checklistItems: {
        orderBy: { sortOrder: "asc" },
      },
      _count: {
        select: {
          emailMessages: true,
          smsMessages: true,
          calls: true,
        },
      },
    },
  });

  if (!caseData) notFound();

  const recentActivity = await prisma.auditLog.findMany({
    where: { caseId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <ConciergeConsole
      caseData={JSON.parse(JSON.stringify(caseData))}
      recentActivity={JSON.parse(JSON.stringify(recentActivity))}
    />
  );
}
