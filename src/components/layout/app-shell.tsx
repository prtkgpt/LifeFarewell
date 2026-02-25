"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart,
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronDown,
  User,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  userName?: string | null;
}

export function AppShell({ children, userName }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-stone-25">
      {/* Top Nav */}
      <nav className="sticky top-0 z-50 border-b border-stone-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/app" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900">
                <Heart className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-stone-900">
                LifeFarewell
              </span>
            </Link>
            <div className="hidden items-center gap-1 sm:flex">
              <Link
                href="/app"
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === "/app"
                    ? "bg-stone-100 text-stone-900"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                <LayoutDashboard className="mr-1.5 inline h-4 w-4" />
                Dashboard
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100">
                <User className="h-4 w-4 text-stone-600" />
              </div>
              <span className="text-sm font-medium text-stone-700">
                {userName || "Account"}
              </span>
              <ChevronDown className="h-3 w-3 text-stone-400" />
            </div>
            <Link
              href="/app/settings"
              className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
            >
              <Settings className="h-4 w-4" />
            </Link>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
