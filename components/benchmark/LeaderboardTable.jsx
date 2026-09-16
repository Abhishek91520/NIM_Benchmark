"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import { formatLatency } from "@/lib/utils";

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
      {/* Horizontal filling bar proportional to score per Section 5 */}
      <div
        className="absolute left-0 top-0 bottom-0 transition-all duration-400"
        style={{
          width: `${Math.max(0, Math.min(100, s))}%`,
          backgroundColor: color,
          opacity: 0.35,
        }}
      />
      {/* Value overlaid in mono at left edge */}
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
  const [sortField, setSortField] = useState("compositeScore");
  const [sortDirection, setSortDirection] = useState("desc");
  const [expandedModelId, setExpandedModelId] = useState(null);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    const aVal = a[sortField] ?? 0;
    const bVal = b[sortField] ?? 0;
    return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
  });

  const toggleExpand = (modelId) => {
    setExpandedModelId(expandedModelId === modelId ? null : modelId);
  };

  return (
    <div className="rounded-[4px] border border-line bg-surface overflow-hidden">
      {/* Desktop/Tablet: Real Table (≥768px) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-line-strong bg-surface text-text-muted font-sans text-xs sticky top-0 z-10 select-none">
              <th className="p-2.5 pl-3 w-12 text-center font-mono">#</th>
              <th className="p-2.5 font-normal">Model</th>
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
                className="p-2.5 text-right cursor-pointer hover:text-text-main transition-colors font-normal"
                onClick={() => handleSort("avgLatencyMs")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Avg latency</span>
                  {sortField === "avgLatencyMs" && (
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
            </tr>
          </thead>
          <tbody>
            {sortedLeaderboard.map((item, index) => {
              const isExpanded = expandedModelId === item.modelId;
              const isRank1 = item.rank === 1;
              const modelResults = results.filter((r) => r.modelId === item.modelId);

              return (
                <tr key={item.modelId} className="contents">
                  <tr
                    onClick={() => toggleExpand(item.modelId)}
                    className={`h-9 border-b border-line hover:bg-surface-raised cursor-pointer transition-colors duration-100 ${
                      isRank1 ? "font-medium bg-surface/80" : ""
                    }`}
                  >
                    {/* Rank column: Plain numerals, mono per Section 6 (no medal emoji) */}
                    <td className="p-2.5 pl-3 text-center font-mono text-xs text-text-muted tabular-nums">
                      {item.rank}
                    </td>

                    {/* Model name (sticky left: 0 per Section 8) */}
                    <td className="p-2.5 sticky left-0 bg-surface group-hover:bg-surface-raised z-10 min-w-[220px]">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3 text-text-faint shrink-0" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-text-faint shrink-0" />
                        )}
                        <span className="font-mono text-xs text-text-main truncate">
                          {item.modelId}
                        </span>
                      </div>
                    </td>

                    {/* Signature Moment: Four side-by-side inline score bars */}
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

                    {/* Numeric columns: right-aligned, mono, tabular-nums with units */}
                    <td className="p-2.5 text-right font-mono text-xs tabular-nums text-text-muted">
                      {item.avgLatencyMs}{" "}
                      <span className="text-[11px] text-text-faint">ms</span>
                    </td>
                    <td className="p-2.5 text-right font-mono text-xs tabular-nums text-text-muted pr-4">
                      {item.avgTokensPerSec}{" "}
                      <span className="text-[11px] text-text-faint">tok/s</span>
                    </td>
                  </tr>

                  {/* Expanded Prompt Results */}
                  {isExpanded && (
                    <tr className="bg-canvas border-b border-line">
                      <td colSpan={8} className="p-4">
                        <div className="space-y-3">
                          <div className="text-xs font-medium text-text-main">
                            Prompt breakdown ({modelResults.length} prompts)
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {modelResults.map((r, rIdx) => {
                              const promptMeta = prompts.find((p) => p.id === r.promptId);
                              return (
                                <div
                                  key={rIdx}
                                  className="p-3 rounded-[4px] border border-line bg-surface space-y-2 text-xs"
                                >
                                  <div className="flex items-center justify-between border-b border-line pb-1.5 font-mono text-[11px]">
                                    <span className="text-text-muted truncate">
                                      {promptMeta?.title || r.promptId}
                                    </span>
                                    <div className="flex items-center gap-3">
                                      {r.qualityScore !== null && (
                                        <span className="text-text-main font-semibold">
                                          score: {r.qualityScore}
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

                                  <div className="p-2 rounded-[4px] bg-canvas border border-line text-xs font-mono max-h-28 overflow-y-auto whitespace-pre-wrap select-text text-text-main">
                                    {r.response || (
                                      <span style={{ color: "var(--sig-fail)" }}>
                                        No response ({r.errorCode})
                                      </span>
                                    )}
                                  </div>

                                  {r.judgeReasoning && (
                                    <div className="text-[11px] text-text-muted border-t border-line pt-1 font-mono">
                                      Judge: {r.judgeReasoning}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Record Cards (<768px per Section 8) */}
      <div className="md:hidden divide-y divide-line">
        {sortedLeaderboard.map((item) => (
          <div key={item.modelId} className="p-3.5 space-y-3 bg-surface">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 font-mono text-xs font-semibold text-text-main truncate">
                {item.modelId}
              </div>
              <span className="font-mono text-xs text-text-muted shrink-0 tabular-nums">
                #{item.rank}
              </span>
            </div>

            {/* Stacked four full-width score bars */}
            <div className="space-y-1.5">
              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px] text-text-muted">
                  <span>Composite</span>
                  <span className="font-mono text-text-main">{item.compositeScore}</span>
                </div>
                <InlineScoreBar score={item.compositeScore} />
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px] text-text-muted">
                  <span>Quality</span>
                  <span className="font-mono text-text-main">{item.qualityScore}</span>
                </div>
                <InlineScoreBar score={item.qualityScore} />
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px] text-text-muted">
                  <span>Speed</span>
                  <span className="font-mono text-text-main">{item.speedScore}</span>
                </div>
                <InlineScoreBar score={item.speedScore} />
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px] text-text-muted">
                  <span>Reliability</span>
                  <span className="font-mono text-text-main">{item.reliabilityPct}%</span>
                </div>
                <InlineScoreBar score={item.reliabilityPct} />
              </div>
            </div>

            {/* Latency & Throughput row */}
            <div className="flex justify-between items-center pt-2 border-t border-line text-xs font-mono text-text-muted">
              <span>
                {item.avgLatencyMs} <span className="text-text-faint">ms</span>
              </span>
              <span>
                {item.avgTokensPerSec} <span className="text-text-faint">tok/s</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
