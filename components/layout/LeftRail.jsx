"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Cpu,
  PlayCircle,
  Columns2,
  Gauge,
  History,
  BookOpen,
  Binary,
  Settings,
} from "lucide-react";

export const NAV_LINKS = [
  { href: "/", label: "Dashboard", icon: Cpu },
  { href: "/playground", label: "Playground", icon: PlayCircle },
  { href: "/compare", label: "Compare", icon: Columns2 },
  { href: "/benchmark", label: "Benchmark", icon: Gauge },
  { href: "/embeddings", label: "Embeddings", icon: Binary },
  { href: "/history", label: "History", icon: History },
  { href: "/prompts", label: "Prompts", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function LeftRail() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-14 lg:w-[216px] shrink-0 border-r border-line bg-surface min-h-[calc(100vh-48px)] select-none">
      <nav className="py-2 flex flex-col space-y-0.5">
        {NAV_LINKS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center h-9 px-3.5 text-sm transition-colors duration-100 ${
                isActive
                  ? "bg-surface-raised text-text-main font-medium"
                  : "text-text-muted hover:text-text-main hover:bg-surface-raised/60"
              }`}
              title={item.label}
            >
              {/* 2px --focus bar on left edge for active item per Section 4 */}
              {isActive && (
                <span
                  className="absolute left-0 top-0 bottom-0 w-[2px]"
                  style={{ backgroundColor: "var(--focus)" }}
                />
              )}

              <Icon className="h-4 w-4 shrink-0 lg:mr-3" />
              <span className="hidden lg:inline truncate font-sans text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
