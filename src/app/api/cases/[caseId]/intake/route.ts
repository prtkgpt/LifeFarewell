import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generateAutoResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes("cremation")) {
    return "Thank you for sharing that. Cremation services can range widely in cost and style. Direct cremation is typically the most affordable option, while a cremation with a memorial service offers more flexibility for honoring your loved one. Would you like me to help explore specific cremation options available in your area?";
  }

  if (lower.includes("budget") || lower.includes("cost") || lower.includes("price") || lower.includes("afford")) {
    return "I understand that budget is an important consideration during this time. Could you share your target budget and the maximum you'd be comfortable with? This will help us find options that respect both your wishes and your financial comfort.";
  }

  if (lower.includes("service") || lower.includes("memorial") || lower.includes("ceremony") || lower.includes("funeral")) {
    return "There are many meaningful ways to celebrate a life. Would you prefer a traditional funeral service, a more intimate memorial gathering, a celebration of life, or something else entirely? Understanding your preference will help us find the right providers.";
  }

  if (lower.includes("burial") || lower.includes("cemetery") || lower.includes("grave")) {
    return "We can help with burial arrangements. Would you like to explore traditional cemetery burial, natural burial options, or perhaps a family plot? Do you already have a cemetery in mind, or would you like us to help find one?";
  }

  if (lower.includes("flower") || lower.includes("floral")) {
    return "Floral arrangements can be a beautiful tribute. We can help you find local florists who specialize in sympathy and memorial arrangements. Do you have any specific preferences for flowers or style?";
  }

  if (lower.includes("thank") || lower.includes("thanks")) {
    return "You're very welcome. Please don't hesitate to share any other details or questions you have. We're here to help make this process as smooth as possible for you.";
  }

  return "Thank you for sharing that. Could you tell me more about what you're looking for? For instance, are you considering cremation or burial services, and do you have a particular budget range in mind? Any details you share will help us find the best options for you.";
}

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

  const messages = await prisma.caseIntakeSession.findMany({
    where: { caseId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}

export async function POST(
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
  });

  if (!caseData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const userMessage = body.message?.trim();

  if (!userMessage) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // Create user message
  await prisma.caseIntakeSession.create({
    data: {
      caseId,
      role: "user",
      content: userMessage,
    },
  });

  // Generate and create assistant response
  const assistantContent = generateAutoResponse(userMessage);
  await prisma.caseIntakeSession.create({
    data: {
      caseId,
      role: "assistant",
      content: assistantContent,
    },
  });

  // Return all messages
  const messages = await prisma.caseIntakeSession.findMany({
    where: { caseId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}
