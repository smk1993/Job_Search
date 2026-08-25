"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Search,
  Sparkles,
  Heart,
  Briefcase,
  FileText,
  Mail,
  Users,
  MessageSquare,
  BarChart2,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Search Jobs", icon: Search },
  { href: "/curated-jobs", label: "For You", icon: Sparkles },
  { href: "/saved", label: "Saved Jobs", icon: Heart },
  { href: "/applications", label: "Applications", icon: Briefcase },
  { href: "/cover-letters", label: "Cover Letters", icon: FileText },
  { href: "/email", label: "Email Recruiter", icon: Mail },
  { href: "/reddit-jobs", label: "Reddit Jobs", icon: MessageSquare },
  { href: "/recruiters", label: "Recruiters", icon: Users },
  { href: "/stats", label: "Analytics", icon: BarChart2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 border-r bg-muted/20 flex flex-col h-full shrink-0">
      {/* Brand */}
      <div className="h-14 flex items-center px-5 border-b">
        <span className="font-bold text-base tracking-tight">JobSearch AI</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Settings at bottom */}
      <div className="border-t p-2">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <Settings className="h-4 w-4 flex-shrink-0" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
