import { NextRequest, NextResponse } from "next/server";
import { auth, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const claimSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.isGuest) {
      return NextResponse.json(
        { error: "Account is already claimed" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = claimSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check if the email is already in use by another account
    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existing && existing.id !== user.id) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Upgrade the guest account
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        hashedPassword: hashPassword(parsed.data.password),
        isGuest: false,
      },
    });

    return NextResponse.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
    });
  } catch (error) {
    console.error("Claim account error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
