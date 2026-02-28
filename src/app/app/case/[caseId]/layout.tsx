import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { CaseSidebar } from "@/components/layout/case-sidebar";
import { caseAccessWhere } from "@/lib/case-access";

export default async function CaseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ caseId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const { caseId } = await params;

  const caseData = await prisma.case.findFirst({
    where: caseAccessWhere(session.user.id, caseId),
  });

  if (!caseData) notFound();

  return (
    <div className="flex gap-6">
      <div className="hidden lg:block">
        <CaseSidebar caseId={caseId} />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
