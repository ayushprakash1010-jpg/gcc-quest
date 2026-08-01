"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/content", label: "Content Review" },
  { href: "/clusters", label: "Story Clusters" },
  { href: "/trends", label: "Macro Trends" },
  { href: "/calendar", label: "Calendar" },
  { href: "/settings/feedback", label: "AI Feedback" },
  { href: "/settings", label: "Settings" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-4 py-6 space-y-2">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname?.startsWith(item.href));

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
