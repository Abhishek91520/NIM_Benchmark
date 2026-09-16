"use client";

import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";

export default function LiveProgress({
  completedCount = 0,
  totalCount = 0,
  status = "running",
  currentModelId = "",
  elapsedSeconds = 0,
}) {
  const percent = totalCount > 0 ? Math.min(100, Math.round((completedCount / totalCount) * 100)) : 0;
  const isComplete = status === "complete";
  const isFailed = status === "failed";

  return (
    <div className="rounded-[4px] border border-line bg-surface p-4 space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              backgroundColor: isComplete
                ? "var(--sig-ok)"
                : isFailed
                ? "var(--sig-fail)"
                : "var(--sig-warn)",
            }}
          />

          <div>
            <div className="text-xs font-medium text-text-main flex items-center gap-2">
              <span>
                {isComplete
                  ? "Benchmark complete"
                  : isFailed
                  ? "Benchmark stopped on error"
                  : "Running benchmark…"}
              </span>
              <span className="text-text-muted font-mono text-[11px] tabular-nums">
                ({completedCount} / {totalCount} pairs)
              </span>
            </div>
            {currentModelId && !isComplete && (
              <div className="text-[11px] text-text-faint font-mono truncate max-w-md">
                Active: {currentModelId}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-text-muted">
          <span>{elapsedSeconds}s elapsed</span>
          <span className="font-semibold text-text-main tabular-nums">{percent}%</span>
        </div>
      </div>

      {/* Progress track: No gradients, no shimmer per Section 7 */}
      <div className="w-full h-1.5 bg-surface-raised rounded-none overflow-hidden">
        <div
          className="h-full transition-all duration-300 rounded-none"
          style={{
            width: `${percent}%`,
            backgroundColor: isComplete
              ? "var(--sig-ok)"
              : isFailed
              ? "var(--sig-fail)"
              : "var(--focus)",
          }}
        />
      </div>
    </div>
  );
}
