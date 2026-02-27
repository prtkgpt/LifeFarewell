import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";

const inviteSchema = z.object({
  caseId: z.string().min(1),
  email: z.string().email(),
});

// POST — Send an invitation
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify the user is a PRIMARY member of this case
    const membership = await prisma.caseMember.findUnique({
      where: {
        caseId_userId: {
          caseId: parsed.data.caseId,
          userId: session.user.id,
        },
      },
    });

    if (!membership || membership.role !== "PRIMARY") {
      return NextResponse.json(
        { error: "Only the primary user can invite others" },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existingUser) {
      const existingMember = await prisma.caseMember.findUnique({
        where: {
          caseId_userId: {
            caseId: parsed.data.caseId,
            userId: existingUser.id,
          },
        },
      });

      if (existingMember) {
        return NextResponse.json(
          { error: "This person is already a member of this case" },
          { status: 409 }
        );
      }
    }

    // Check for existing pending invite to same email
    const existingInvite = await prisma.invitation.findFirst({
      where: {
        caseId: parsed.data.caseId,
        email: parsed.data.email,
        status: "PENDING",
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: "An invitation has already been sent to this email" },
        { status: 409 }
      );
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.invitation.create({
      data: {
        caseId: parsed.data.caseId,
        invitedBy: session.user.id,
        email: parsed.data.email,
        token,
        expiresAt,
      },
    });

    // In production, send an email here. For now, return the invite link.
    return NextResponse.json({
      id: invitation.id,
      token: invitation.token,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    console.error("Create invitation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET — List invitations for a case
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const caseId = req.nextUrl.searchParams.get("caseId");
    if (!caseId) {
      return NextResponse.json(
        { error: "caseId is required" },
        { status: 400 }
      );
    }

    // Verify user is a member
    const membership = await prisma.caseMember.findUnique({
      where: {
        caseId_userId: { caseId, userId: session.user.id },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invitations = await prisma.invitation.findMany({
      where: { caseId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Also get current members
    const members = await prisma.caseMember.findMany({
      where: { caseId },
      include: {
        user: { select: { id: true, name: true, email: true, isGuest: true } },
      },
    });

    return NextResponse.json({ invitations, members });
  } catch (error) {
    console.error("List invitations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
