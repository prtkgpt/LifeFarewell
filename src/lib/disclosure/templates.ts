import { DisclosureMode } from "@/generated/prisma";

export interface DisclosureContext {
  mode: DisclosureMode;
  contactFirstName?: string | null;
}

export function getEmailDisclosure(ctx: DisclosureContext): string {
  if (ctx.mode === "FULL") {
    const name = ctx.contactFirstName || "a family member";
    return `Note: I'm an assistant from LifeFarewell, contacting you on behalf of ${name}, an immediate family member coordinating funeral arrangements.`;
  }
  return `Note: I'm assisting the family coordinating funeral arrangements.`;
}

export function getSmsDisclosure(ctx: DisclosureContext): string {
  if (ctx.mode === "FULL") {
    const name = ctx.contactFirstName || "a family member";
    return `[LifeFarewell assistant on behalf of ${name}, coordinating arrangements]`;
  }
  return `[Assisting the family with funeral arrangements]`;
}

export function getCallDisclosure(ctx: DisclosureContext): string {
  if (ctx.mode === "FULL") {
    const name = ctx.contactFirstName || "a family member";
    return `Hello, I'm calling from LifeFarewell. I'm an assistant contacting you on behalf of ${name}, an immediate family member who is coordinating funeral arrangements.`;
  }
  return `Hello, I'm assisting a family who is coordinating funeral arrangements.`;
}

export function enforceDisclosure(
  body: string,
  disclosure: string
): string {
  if (body.includes(disclosure)) return body;
  return `${disclosure}\n\n${body}`;
}

export function validateDisclosurePresent(
  text: string,
  mode: DisclosureMode
): boolean {
  if (mode === "FULL") {
    return (
      text.includes("LifeFarewell") || text.includes("assistant")
    );
  }
  return text.includes("assisting") || text.includes("assistant");
}
