"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Cpu,
  PlayCircle,
  Gauge,
  History,
  MoreHorizontal,
  Columns2,
  BookOpen,
  Binary,
  Settings,
  X,
} from "lucide-react";

const PRIMARY_TABS = [
  { href: "/", label: "Dashboard", icon: Cpu },
  { href: "/playground", label: "Playground", icon: PlayCircle },
  { href: "/benchmark", label: "Benchmark", icon: Gauge },
  { href: "/history", label: "History", icon: History },
];

const SECONDARY_TABS = [
  { href: "/compare", label: "Compare", icon: Columns2 },
  { href: "/embeddings", label: "Embeddings", icon: Binary },
  { href: "/prompts", label: "Prompts", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function BottomTabBar() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  const isSecondaryActive = SECONDARY_TABS.some((t) => pathname.startsWith(t.href));

  return (
    <>
      {/* Drawer for secondary actions when "More" is tapped */}
      {showMore && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 flex flex-col justify-end"
          onClick={() => setShowMore(false)}
        >
          <div
            className="bg-surface border-t border-line-strong p-4 rounded-t-[4px] space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <span className="text-xs font-semibold text-text-muted">More Navigation</span>
              <button
                type="button"
                onClick={() => setShowMore(false)}
                className="p-1 text-text-muted hover:text-text-main"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {SECONDARY_TABS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={`flex items-center gap-2 p-3 rounded-[6px] text-xs border transition-colors ${
                      isActive
                        ? "bg-surface-raised border-line-strong text-text-main font-medium"
                        : "border-line text-text-muted hover:text-text-main"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Fixed 56px Bottom Tab Bar on Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-surface border-t border-line flex items-center justify-around z-40 pb-[env(safe-area-inset-bottom)]">
        {PRIMARY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] font-sans transition-colors ${
                isActive ? "text-text-main font-medium" : "text-text-muted"
              }`}
            >
              <Icon className="h-4 w-4 mb-0.5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] font-sans transition-colors ${
            isSecondaryActive ? "text-text-main font-medium" : "text-text-muted"
          }`}
        >
          <MoreHorizontal className="h-4 w-4 mb-0.5" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
