"use client";

import { cn } from "@/lib/utils";

export default function StatusBadge({ status, isNew = false, className = "" }) {
  if (isNew) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-sans text-text-main select-none",
          className
        )}
      >
        <span
          className="text-[10px] leading-none shrink-0"
          style={{ color: "var(--sig-new)" }}
          aria-hidden="true"
        >
          ▲
        </span>
        <span className="hidden sm:inline text-text-muted text-xs">New</span>
      </span>
    );
  }

  switch (status) {
    case "operational":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-sans text-text-main select-none",
            className
          )}
        >
          <span
            className="text-[10px] leading-none shrink-0"
            style={{ color: "var(--sig-ok)" }}
            aria-hidden="true"
          >
            ●
          </span>
          <span className="hidden sm:inline text-text-muted text-xs">Operational</span>
        </span>
      );

    case "degraded":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-sans text-text-main select-none",
            className
          )}
        >
          <span
            className="text-[10px] leading-none shrink-0 font-bold"
            style={{ color: "var(--sig-warn)" }}
            aria-hidden="true"
          >
            ○
          </span>
          <span className="hidden sm:inline text-text-muted text-xs">Degraded</span>
        </span>
      );

    case "down":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-sans text-text-main select-none",
            className
          )}
        >
          <span
            className="text-[10px] leading-none shrink-0"
            style={{ color: "var(--sig-fail)" }}
            aria-hidden="true"
          >
            ■
          </span>
          <span className="hidden sm:inline text-text-muted text-xs">Down</span>
        </span>
      );

    case "unknown":
    default:
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-sans text-text-muted select-none",
            className
          )}
        >
          <span
            className="text-[10px] leading-none shrink-0"
            style={{ color: "var(--sig-idle)" }}
            aria-hidden="true"
          >
            ◇
          </span>
          <span className="hidden sm:inline text-text-faint text-xs">Untested</span>
        </span>
      );
  }
}
