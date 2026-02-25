import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planId } = await params;

  const plan = await prisma.plan.findFirst({
    where: { id: planId, userId: session.user.id },
    include: { preferences: { orderBy: { createdAt: "asc" } } },
  });

  if (!plan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(plan.preferences);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planId } = await params;

  const plan = await prisma.plan.findFirst({
    where: { id: planId, userId: session.user.id },
  });

  if (!plan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { preferences } = body;

  if (!Array.isArray(preferences)) {
    return NextResponse.json(
      { error: "Preferences must be an array" },
      { status: 400 }
    );
  }

  // Delete existing preferences and recreate
  await prisma.planPreference.deleteMany({
    where: { planId },
  });

  if (preferences.length > 0) {
    await prisma.planPreference.createMany({
      data: preferences.map((p: { key: string; value: string }) => ({
        planId,
        key: p.key,
        value: p.value,
      })),
    });
  }

  const updated = await prisma.planPreference.findMany({
    where: { planId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(updated);
}
