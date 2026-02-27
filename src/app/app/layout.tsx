import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isGuest: true, name: true },
  });

  return (
    <AppShell userName={user?.name ?? session.user.name} isGuest={user?.isGuest ?? false}>
      {children}
    </AppShell>
  );
}
