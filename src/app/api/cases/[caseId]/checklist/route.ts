import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { caseId } = await params;

  const caseData = await prisma.case.findFirst({
    where: { id: caseId, userId: session.user.id },
  });
  if (!caseData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const items = await prisma.checklistItem.findMany({
    where: { caseId },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(items);
}
