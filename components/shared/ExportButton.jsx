"use client";

import { useState } from "react";
import { Download, Check } from "lucide-react";

export default function ExportButton({ run, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  if (!run) return null;

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(run, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${run.name || "benchmark-run"}_${run.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
    setIsOpen(false);
  };

  const exportCSV = () => {
    const results = run.results || [];
    if (results.length === 0) return;

    const headers = [
      "modelId",
      "promptId",
      "category",
      "success",
      "totalLatencyMs",
      "ttfbMs",
      "tokensPerSec",
      "qualityScore",
      "errorCode",
      "judgeReasoning",
      "response",
    ];

    const rows = results.map((r) => [
      `"${r.modelId}"`,
      `"${r.promptId}"`,
      `"${r.category || ""}"`,
      r.success ? "true" : "false",
      r.totalLatencyMs || 0,
      r.ttfbMs || 0,
      r.tokensPerSec || 0,
      r.qualityScore !== null && r.qualityScore !== undefined ? r.qualityScore : "",
      `"${r.errorCode || ""}"`,
      `"${(r.judgeReasoning || "").replace(/"/g, '""')}"`,
      `"${(r.response || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `${run.name || "benchmark-run"}_${run.id}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 px-3 rounded-[6px] border border-line text-xs text-text-main hover:bg-surface-raised transition-colors duration-120 flex items-center gap-1.5"
      >
        {downloaded ? (
          <Check className="h-3 w-3" style={{ color: "var(--sig-ok)" }} />
        ) : (
          <Download className="h-3 w-3" />
        )}
        <span>Export</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 rounded-[4px] border border-line-strong bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.45)] p-1 min-w-[130px] space-y-0.5">
          <button
            type="button"
            onClick={exportCSV}
            className="w-full px-2.5 py-1.5 rounded-[4px] text-xs text-text-main hover:bg-surface-raised transition-colors text-left"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={exportJSON}
            className="w-full px-2.5 py-1.5 rounded-[4px] text-xs text-text-main hover:bg-surface-raised transition-colors text-left"
          >
            Export JSON
          </button>
        </div>
      )}
    </div>
  );
}
