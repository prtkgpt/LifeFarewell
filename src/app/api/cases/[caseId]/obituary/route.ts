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
    include: { decedentProfile: true },
  });

  if (!caseData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    content: caseData.decedentProfile?.notes || "",
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { caseId } = await params;

  const caseData = await prisma.case.findFirst({
    where: { id: caseId, userId: session.user.id },
    include: { decedentProfile: true },
  });

  if (!caseData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { content } = body;

  if (typeof content !== "string") {
    return NextResponse.json(
      { error: "Content is required" },
      { status: 400 }
    );
  }

  if (caseData.decedentProfile) {
    await prisma.decedentProfile.update({
      where: { id: caseData.decedentProfile.id },
      data: { notes: content },
    });
  } else {
    await prisma.decedentProfile.create({
      data: {
        caseId,
        notes: content,
      },
    });
  }

  return NextResponse.json({ success: true });
}
