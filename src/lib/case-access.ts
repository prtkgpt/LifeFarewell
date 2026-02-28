import { prisma } from "@/lib/prisma";

/**
 * Returns a Prisma where clause that matches cases accessible by a given user.
 * A user can access a case if they are the owner OR a CaseMember.
 */
export function caseAccessWhere(userId: string, caseId: string) {
  return {
    id: caseId,
    OR: [
      { userId },
      { members: { some: { userId } } },
    ],
  };
}

/**
 * Find a case the user has access to (owner or member).
 * Returns null if not found or not accessible.
 */
export async function findAccessibleCase(userId: string, caseId: string) {
  return prisma.case.findFirst({
    where: caseAccessWhere(userId, caseId),
  });
}
