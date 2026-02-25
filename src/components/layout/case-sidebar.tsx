"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Headphones,
  MessageSquare,
  Store,
  GitCompareArrows,
  CheckSquare2,
  FileText,
  Users,
  Settings,
  Mail,
  ScrollText,
  Zap,
} from "lucide-react";

interface CaseSidebarProps {
  caseId: string;
}

const navItems = [
  { href: "concierge", label: "Concierge", icon: Headphones },
  { href: "intake", label: "Intake Chat", icon: MessageSquare },
  { href: "vendors", label: "Vendors", icon: Store },
  { href: "compare", label: "Compare", icon: GitCompareArrows },
  { href: "approvals", label: "Approvals", icon: CheckSquare2 },
  { href: "comms", label: "Communications", icon: Mail },
  { href: "checklist", label: "Checklist", icon: ScrollText },
  { href: "documents", label: "Documents", icon: FileText },
  { href: "contacts", label: "Contacts", icon: Users },
  { href: "obituary", label: "Obituary", icon: FileText },
  { href: "trigger", label: "Trigger Run", icon: Zap },
  { href: "settings", label: "Settings", icon: Settings },
];

export function CaseSidebar({ caseId }: CaseSidebarProps) {
  const pathname = usePathname();
  const basePath = `/app/case/${caseId}`;

  return (
    <nav className="w-56 shrink-0">
      <div className="sticky top-20 space-y-1">
        {navItems.map((item) => {
          const fullPath = `${basePath}/${item.href}`;
          const isActive = pathname === fullPath;
          return (
            <Link
              key={item.href}
              href={fullPath}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
