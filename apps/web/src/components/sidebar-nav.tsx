"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/sources", label: "Sources" },
  { href: "/dashboard/articles", label: "Articles" },
  { href: "/dashboard/content", label: "Content Review" },
  { href: "/dashboard/clusters", label: "Story Clusters" },
  { href: "/dashboard/trends", label: "Macro Trends" },
  { href: "/dashboard/calendar", label: "Calendar" },
  { href: "/dashboard/settings/feedback", label: "AI Feedback" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-4 py-6 space-y-2">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname?.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-3 py-2 rounded-md transition-colors ${
              isActive
                ? "bg-gray-800 text-white font-medium"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
