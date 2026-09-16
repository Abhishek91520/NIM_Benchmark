"use client";

import { useState, useMemo, Fragment } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Zap,
  Clock,
  Gauge,
  SlidersHorizontal,
  Search,
} from "lucide-react";

function getScoreColor(score) {
  if (score >= 70) return "var(--sig-ok)";
  if (score >= 40) return "var(--sig-warn)";
  return "var(--sig-fail)";
}

function InlineScoreBar({ score, label = null }) {
  if (score === null || score === undefined || isNaN(score)) {
    return <span className="font-mono text-xs text-text-faint">--</span>;
  }

  const s = Math.round(score);
  const color = getScoreColor(s);

  return (
    <div className="relative w-full h-7 bg-surface-raised overflow-hidden flex items-center select-none">
      <div
        className="absolute left-0 top-0 bottom-0 transition-all duration-400"
        style={{
          width: `${Math.max(0, Math.min(100, s))}%`,
          backgroundColor: color,
          opacity: 0.35,
        }}
      />
      <div className="relative z-10 flex items-center justify-between w-full px-2">
        <span className="font-mono text-xs font-semibold text-text-main tabular-nums">
          {s}
        </span>
        {label && <span className="text-[10px] text-text-faint font-mono">{label}</span>}
      </div>
    </div>
  );
}

export default function LeaderboardTable({
  leaderboard = [],
  results = [],
  prompts = [],
}) {
  const [viewMode, setViewMode] = useState("speed-status"); // 'speed-status' | 'detailed-scores'
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'working' | 'failed'
  const [searchFilter, setSearchFilter] = useState("");
  const [sortField, setSortField] = useState("avgTokensPerSec");
  const [sortDirection, setSortDirection] = useState("desc");
  const [expandedModelId, setExpandedModelId] = useState(null);

  // Highest TPS among all models for relative progress bar calculation
  const maxTokensPerSec = useMemo(() => {
    let max = 1;
    for (const item of leaderboard) {
      if (item.avgTokensPerSec > max) max = item.avgTokensPerSec;
    }
    return max;
  }, [leaderboard]);

  const workingCount = useMemo(() => {
    return leaderboard.filter((item) => item.isWorking || item.successfulCount > 0).length;
  }, [leaderboard]);

  const failedCount = useMemo(() => {
    return leaderboard.filter((item) => !item.isWorking && item.successfulCount === 0).length;
  }, [leaderboard]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const filteredLeaderboard = useMemo(() => {
    return leaderboard.filter((item) => {
      const isWorking = item.isWorking || item.successfulCount > 0;
      if (statusFilter === "working" && !isWorking) return false;
      if (statusFilter === "failed" && isWorking) return false;
      if (searchFilter) {
        const q = searchFilter.toLowerCase();
        return item.modelId.toLowerCase().includes(q);
      }
      return true;
    });
  }, [leaderboard, statusFilter, searchFilter]);

  const sortedLeaderboard = useMemo(() => {
    return [...filteredLeaderboard].sort((a, b) => {
      let aVal = a[sortField] ?? 0;
      let bVal = b[sortField] ?? 0;
      if (sortField === "status") {
        aVal = a.isWorking ? 1 : 0;
        bVal = b.isWorking ? 1 : 0;
      }
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [filteredLeaderboard, sortField, sortDirection]);

  const toggleExpand = (modelId) => {
    setExpandedModelId(expandedModelId === modelId ? null : modelId);
  };

  return (
    <div className="rounded-[4px] border border-line bg-surface overflow-hidden space-y-0">
      {/* Controls Header: View Mode Switcher, Status Filters & Search */}
      <div className="p-3 border-b border-line bg-surface-raised flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Primary View Toggle: Speed & Status vs Detailed Scores */}
          <div className="flex items-center rounded-[6px] border border-line p-0.5 bg-canvas">
            <button
              type="button"
              onClick={() => {
                setViewMode("speed-status");
                setSortField("avgTokensPerSec");
                setSortDirection("desc");
              }}
              className={`flex items-center gap-1.5 h-7 px-3 rounded-[4px] text-xs font-medium transition ${
                viewMode === "speed-status"
                  ? "bg-text-main text-canvas shadow-sm"
                  : "text-text-muted hover:text-text-main"
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Speed & Status (Working & TPS)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("detailed-scores");
                setSortField("compositeScore");
                setSortDirection("desc");
              }}
              className={`flex items-center gap-1.5 h-7 px-3 rounded-[4px] text-xs font-medium transition ${
                viewMode === "detailed-scores"
                  ? "bg-text-main text-canvas shadow-sm"
                  : "text-text-muted hover:text-text-main"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Detailed Composite Scores</span>
            </button>
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1 ml-2">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`h-7 px-2.5 rounded-[4px] text-xs font-mono transition ${
                statusFilter === "all"
                  ? "bg-line-strong text-text-main font-semibold"
                  : "text-text-muted hover:text-text-main"
              }`}
            >
              All ({leaderboard.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("working")}
              className={`h-7 px-2.5 rounded-[4px] text-xs font-mono flex items-center gap-1 transition ${
                statusFilter === "working"
                  ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 font-semibold"
                  : "text-text-muted hover:text-emerald-400"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Working ({workingCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("failed")}
              className={`h-7 px-2.5 rounded-[4px] text-xs font-mono flex items-center gap-1 transition ${
                statusFilter === "failed"
                  ? "bg-rose-950/60 text-rose-400 border border-rose-800/50 font-semibold"
                  : "text-text-muted hover:text-rose-400"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>Failed ({failedCount})</span>
            </button>
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-60">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-faint" />
          <input
            type="text"
            placeholder="Filter models in table…"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full h-7 pl-8 pr-2.5 bg-canvas border border-line rounded-[4px] text-xs text-text placeholder:text-text-faint focus:outline-none focus:border-focus"
          />
        </div>
      </div>

      {/* Desktop/Tablet Table (≥768px) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-line-strong bg-surface text-text-muted font-sans text-xs sticky top-0 z-10 select-none">
              <th className="p-2.5 pl-3 w-12 text-center font-mono">#</th>
              <th className="p-2.5 font-normal">Model</th>

              {/* Status Column */}
              <th
                className="p-2.5 w-28 cursor-pointer hover:text-text-main transition-colors font-normal"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center gap-1">
                  <span>Status</span>
                  {sortField === "status" && (
                    sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </div>
              </th>

              {viewMode === "speed-status" ? (
                <>
                  {/* Tokens Per Second (Throughput) Column - High Impact */}
                  <th
                    className="p-2.5 w-48 cursor-pointer hover:text-text-main transition-colors font-semibold text-text-main"
                    onClick={() => handleSort("avgTokensPerSec")}
                  >
                    <div className="flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5 text-amber-400" />
                      <span>Tokens / Sec</span>
                      {sortField === "avgTokensPerSec" && (
                        sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>

                  {/* TTFB */}
                  <th
                    className="p-2.5 w-28 cursor-pointer hover:text-text-main transition-colors font-normal text-right"
                    onClick={() => handleSort("avgTtfbMs")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>TTFB</span>
                      {sortField === "avgTtfbMs" && (
                        sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>

                  {/* Total Latency */}
                  <th
                    className="p-2.5 w-28 cursor-pointer hover:text-text-main transition-colors font-normal text-right"
                    onClick={() => handleSort("avgLatencyMs")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Latency</span>
                      {sortField === "avgLatencyMs" && (
                        sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>

                  {/* Sample Output / Diagnostics */}
                  <th className="p-2.5 font-normal pl-4">Output / Diagnostic Preview</th>
                </>
              ) : (
                <>
                  {/* Detailed Scores Mode Columns */}
                  <th
                    className="p-2.5 w-32 cursor-pointer hover:text-text-main transition-colors font-normal"
                    onClick={() => handleSort("compositeScore")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Composite</span>
                      {sortField === "compositeScore" && (
                        sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th
                    className="p-2.5 w-28 cursor-pointer hover:text-text-main transition-colors font-normal"
                    onClick={() => handleSort("qualityScore")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Quality</span>
                      {sortField === "qualityScore" && (
                        sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th
                    className="p-2.5 w-28 cursor-pointer hover:text-text-main transition-colors font-normal"
                    onClick={() => handleSort("speedScore")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Speed</span>
                      {sortField === "speedScore" && (
                        sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th
                    className="p-2.5 w-28 cursor-pointer hover:text-text-main transition-colors font-normal"
                    onClick={() => handleSort("reliabilityPct")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Reliability</span>
                      {sortField === "reliabilityPct" && (
                        sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th
                    className="p-2.5 text-right cursor-pointer hover:text-text-main transition-colors font-normal pr-4"
                    onClick={() => handleSort("avgTokensPerSec")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Throughput</span>
                      {sortField === "avgTokensPerSec" && (
                        sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedLeaderboard.map((item, index) => {
              const isExpanded = expandedModelId === item.modelId;
              const isWorking = item.isWorking || item.successfulCount > 0;
              const modelResults = results.filter((r) => r.modelId === item.modelId);
              const tpsPercent = Math.max(0, Math.min(100, Math.round((item.avgTokensPerSec / maxTokensPerSec) * 100)));

              return (
                <Fragment key={item.modelId}>
                  <tr
                    onClick={() => toggleExpand(item.modelId)}
                    className={`h-10 border-b border-line hover:bg-surface-raised cursor-pointer transition-colors duration-100 ${
                      !isWorking ? "bg-surface/40 opacity-85" : index === 0 ? "bg-surface/90 font-medium" : ""
                    }`}
                  >
                    {/* Rank */}
                    <td className="p-2.5 pl-3 text-center font-mono text-xs text-text-muted tabular-nums">
                      {index + 1}
                    </td>

                    {/* Model Name */}
                    <td className="p-2.5 sticky left-0 bg-surface group-hover:bg-surface-raised z-10 min-w-[200px] max-w-xs">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-text-faint shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-text-faint shrink-0" />
                        )}
                        <span className="font-mono text-xs text-text-main truncate" title={item.modelId}>
                          {item.modelId}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="p-2.5">
                      {isWorking ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Working</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-medium text-rose-400 bg-rose-950/40 border border-rose-800/40 truncate max-w-[130px]"
                          title={item.errorReason || "Failed"}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                          <span className="truncate">{item.errorReason?.slice(0, 18) || "Failed"}</span>
                        </span>
                      )}
                    </td>

                    {viewMode === "speed-status" ? (
                      <>
                        {/* Tokens Per Second with dynamic comparison bar */}
                        <td className="p-2.5">
                          {isWorking && item.avgTokensPerSec > 0 ? (
                            <div className="space-y-1">
                              <div className="flex items-baseline gap-1">
                                <span className="font-mono text-sm font-bold text-text-main tabular-nums">
                                  {item.avgTokensPerSec}
                                </span>
                                <span className="text-[10px] font-mono text-text-faint">tok/s</span>
                              </div>
                              <div className="w-32 h-1.5 bg-surface-raised rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-amber-400/80 rounded-full transition-all duration-300"
                                  style={{ width: `${tpsPercent}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="font-mono text-xs text-text-faint">--</span>
                          )}
                        </td>

                        {/* TTFB */}
                        <td className="p-2.5 text-right font-mono text-xs tabular-nums text-text-muted">
                          {isWorking && item.avgTtfbMs > 0 ? (
                            <span>{item.avgTtfbMs} <span className="text-[10px] text-text-faint">ms</span></span>
                          ) : (
                            <span className="text-text-faint">--</span>
                          )}
                        </td>

                        {/* Total Latency */}
                        <td className="p-2.5 text-right font-mono text-xs tabular-nums text-text-muted">
                          {isWorking && item.avgLatencyMs > 0 ? (
                            <span>{item.avgLatencyMs} <span className="text-[10px] text-text-faint">ms</span></span>
                          ) : (
                            <span className="text-text-faint">--</span>
                          )}
                        </td>

                        {/* Output Preview */}
                        <td className="p-2.5 pl-4 max-w-sm">
                          {isWorking ? (
                            <span className="text-[11px] text-text-muted truncate block max-w-xs italic">
                              "{item.sampleResponse?.slice(0, 65) || "Completed successfully"}…"
                            </span>
                          ) : (
                            <span className="text-[11px] text-rose-400/90 truncate block max-w-xs font-mono">
                              {item.errorReason || "Error during inference"}
                            </span>
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        {/* Detailed Scores View */}
                        <td className="p-1 px-2 w-32">
                          <InlineScoreBar score={item.compositeScore} />
                        </td>
                        <td className="p-1 px-2 w-28">
                          <InlineScoreBar score={item.qualityScore} />
                        </td>
                        <td className="p-1 px-2 w-28">
                          <InlineScoreBar score={item.speedScore} />
                        </td>
                        <td className="p-1 px-2 w-28">
                          <InlineScoreBar score={item.reliabilityPct} />
                        </td>
                        <td className="p-2.5 text-right font-mono text-xs tabular-nums text-text-muted pr-4">
                          {item.avgTokensPerSec} <span className="text-[11px] text-text-faint">tok/s</span>
                        </td>
                      </>
                    )}
                  </tr>

                  {/* Expanded Prompt Results Drawer */}
                  {isExpanded && (
                    <tr className="bg-canvas border-b border-line">
                      <td colSpan={viewMode === "speed-status" ? 7 : 8} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs font-medium text-text-main border-b border-line pb-1.5">
                            <span>Prompt execution results ({modelResults.length} test{modelResults.length > 1 ? "s" : ""})</span>
                            <span className="font-mono text-text-muted">Model ID: {item.modelId}</span>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {modelResults.map((r, rIdx) => {
                              const promptMeta = prompts.find((p) => p.id === r.promptId);
                              return (
                                <div
                                  key={rIdx}
                                  className={`p-3 rounded-[4px] border bg-surface space-y-2 text-xs ${
                                    r.success ? "border-line" : "border-rose-900/40 bg-rose-950/10"
                                  }`}
                                >
                                  <div className="flex items-center justify-between border-b border-line pb-1.5 font-mono text-[11px]">
                                    <span className="text-text-muted truncate">
                                      {promptMeta?.title || r.promptId}
                                    </span>
                                    <div className="flex items-center gap-3">
                                      {r.tokensPerSec > 0 && (
                                        <span className="text-amber-400 font-semibold">
                                          {r.tokensPerSec} tok/s
                                        </span>
                                      )}
                                      <span className="text-text-faint">
                                        {r.totalLatencyMs} ms
                                      </span>
                                    </div>
                                  </div>

                                  <p className="text-[11px] text-text-muted italic line-clamp-2">
                                    "{promptMeta?.prompt || r.promptId}"
                                  </p>

                                  <div className="p-2 rounded-[4px] bg-canvas border border-line text-xs font-mono max-h-32 overflow-y-auto whitespace-pre-wrap select-text text-text-main">
                                    {r.response || (
                                      <span className="text-rose-400">
                                        {r.judgeReasoning || `Execution error (${r.errorCode})`}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List (<768px) */}
      <div className="md:hidden divide-y divide-line">
        {sortedLeaderboard.map((item, index) => {
          const isWorking = item.isWorking || item.successfulCount > 0;
          return (
            <div key={item.modelId} className="p-3.5 space-y-2.5 bg-surface">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono text-xs font-semibold text-text-main truncate">
                    #{index + 1} {item.modelId}
                  </div>
                  <div className="mt-1">
                    {isWorking ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Working
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-400">
                        <XCircle className="h-3 w-3" /> {item.errorReason?.slice(0, 30) || "Failed"}
                      </span>
                    )}
                  </div>
                </div>

                {isWorking && (
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm font-bold text-amber-400">
                      {item.avgTokensPerSec} <span className="text-[10px] text-text-faint">tok/s</span>
                    </div>
                    <div className="text-[10px] font-mono text-text-faint">
                      {item.avgLatencyMs} ms
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
