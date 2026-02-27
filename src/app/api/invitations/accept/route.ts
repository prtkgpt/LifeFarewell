import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";

const acceptSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = acceptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token: parsed.data.token },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid invitation link" },
        { status: 404 }
      );
    }

    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { error: "This invitation has already been used" },
        { status: 400 }
      );
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 }
      );
    }

    // Check if email matches the invitation
    if (parsed.data.email !== invitation.email) {
      return NextResponse.json(
        { error: "Email does not match the invitation" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existingUser) {
      // User already has an account — just add as member
      const existingMember = await prisma.caseMember.findUnique({
        where: {
          caseId_userId: {
            caseId: invitation.caseId,
            userId: existingUser.id,
          },
        },
      });

      if (existingMember) {
        return NextResponse.json(
          { error: "You are already a member of this case" },
          { status: 409 }
        );
      }

      await prisma.$transaction([
        prisma.caseMember.create({
          data: {
            caseId: invitation.caseId,
            userId: existingUser.id,
            role: "SECONDARY",
          },
        }),
        prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: "ACCEPTED", acceptedAt: new Date() },
        }),
      ]);

      return NextResponse.json({
        message: "Invitation accepted",
        caseId: invitation.caseId,
        existingAccount: true,
      });
    }

    // Create new user + case member in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: parsed.data.email,
          name: parsed.data.name,
          hashedPassword: hashPassword(parsed.data.password),
          isGuest: false,
        },
      });

      await tx.caseMember.create({
        data: {
          caseId: invitation.caseId,
          userId: user.id,
          role: "SECONDARY",
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      });

      return { userId: user.id, caseId: invitation.caseId };
    });

    return NextResponse.json({
      message: "Account created and invitation accepted",
      caseId: result.caseId,
      existingAccount: false,
    });
  } catch (error) {
    console.error("Accept invitation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
