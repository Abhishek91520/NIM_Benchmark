"use client";

import { Zap, CheckCircle2, XCircle } from "lucide-react";

export default function LiveProgress({
  completedCount = 0,
  totalCount = 0,
  status = "running",
  currentModelId = "",
  elapsedSeconds = 0,
  workingCount = 0,
  failedCount = 0,
  keyCount = 3,
}) {
  const percent = totalCount > 0 ? Math.min(100, Math.round((completedCount / totalCount) * 100)) : 0;
  const isComplete = status === "complete";
  const isFailed = status === "failed";
  const remaining = Math.max(0, totalCount - completedCount);

  return (
    <div className="rounded-[4px] border border-line bg-surface p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
            style={{
              backgroundColor: isComplete
                ? "var(--sig-ok)"
                : isFailed
                ? "var(--sig-fail)"
                : "var(--sig-warn)",
              animationPlayState: isComplete ? "paused" : "running",
            }}
          />

          <div>
            <div className="text-xs font-medium text-text-main flex items-center gap-2 flex-wrap">
              <span>
                {isComplete
                  ? "Benchmark complete"
                  : isFailed
                  ? "Benchmark completed with partial errors"
                  : "Benchmarking models in parallel…"}
              </span>
              <span className="text-text-muted font-mono text-[11px] tabular-nums">
                ({completedCount} / {totalCount} pairs)
              </span>

              {/* Working vs Failed Live Badges */}
              {completedCount > 0 && (
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded-[4px] border border-emerald-800/40">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{workingCount} working</span>
                  </span>
                  {failedCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-950/40 px-1.5 py-0.5 rounded-[4px] border border-rose-800/40">
                      <XCircle className="h-3 w-3" />
                      <span>{failedCount} failed</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 text-[11px] text-text-faint font-mono mt-0.5">
              {currentModelId && !isComplete && (
                <span className="truncate max-w-sm">Active: {currentModelId}</span>
              )}
              <span className="inline-flex items-center gap-1 text-amber-400/90">
                <Zap className="h-3 w-3" />
                <span>Rotating API Keys</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-text-muted">
          <span>{elapsedSeconds}s elapsed</span>
          <span className="font-semibold text-text-main tabular-nums text-sm">{percent}%</span>
        </div>
      </div>

      {/* Progress track */}
      <div className="w-full h-2 bg-surface-raised rounded-[2px] overflow-hidden">
        <div
          className="h-full transition-all duration-300 rounded-[2px]"
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
