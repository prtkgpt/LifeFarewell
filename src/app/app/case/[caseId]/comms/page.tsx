import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { CommsClient } from "./comms-client";

export default async function CommsPage({
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

  const [emails, smsMessages, calls] = await Promise.all([
    prisma.emailMessage.findMany({
      where: { caseId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.smsMessage.findMany({
      where: { caseId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.call.findMany({
      where: { caseId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <CommsClient
      caseId={caseId}
      emails={JSON.parse(JSON.stringify(emails))}
      smsMessages={JSON.parse(JSON.stringify(smsMessages))}
      calls={JSON.parse(JSON.stringify(calls))}
    />
  );
}
