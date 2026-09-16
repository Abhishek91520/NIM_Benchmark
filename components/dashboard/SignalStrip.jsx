"use client";

import { useState } from "react";

export default function SignalStrip({ models = [], healthMap = {}, onSelectModel }) {
  const [hoveredModel, setHoveredModel] = useState(null);

  if (!models || models.length === 0) return null;

  return (
    <div className="relative w-full select-none">
      {/* 28px-tall edge-to-edge packed signal strip per Section 5 */}
      <div className="w-full h-7 bg-surface border border-line rounded-none overflow-x-auto overflow-y-hidden flex items-stretch scrollbar-none">
        {models.map((model) => {
          const health = healthMap[model.id];
          const status = health?.status || model.status || "unknown";

          let tickColor = "var(--sig-idle)";
          if (model.isNew) {
            tickColor = "var(--sig-new)";
          } else if (status === "operational") {
            tickColor = "var(--sig-ok)";
          } else if (status === "degraded") {
            tickColor = "var(--sig-warn)";
          } else if (status === "down") {
            tickColor = "var(--sig-fail)";
          }

          return (
            <div
              key={model.id}
              onClick={() => onSelectModel?.(model.id)}
              onMouseEnter={() => setHoveredModel({ model, status, health })}
              onMouseLeave={() => setHoveredModel(null)}
              className="w-[3px] sm:w-[6px] h-full shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              style={{ backgroundColor: tickColor }}
              aria-label={`${model.id}: ${status}`}
            />
          );
        })}
      </div>

      {/* Floating Tooltip when tick hovered */}
      {hoveredModel && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-10 z-50 px-2.5 py-1 bg-surface-raised border border-line rounded-[4px] shadow-[0_8px_24px_rgba(0,0,0,0.45)] text-[11px] font-mono whitespace-nowrap pointer-events-none flex items-center gap-2">
          <span className="text-text-main font-semibold truncate max-w-xs">
            {hoveredModel.model.id}
          </span>
          <span className="text-text-muted capitalize">({hoveredModel.status})</span>
          {hoveredModel.health?.latencyMs && (
            <span className="text-text-faint">{hoveredModel.health.latencyMs}ms</span>
          )}
        </div>
      )}
    </div>
  );
}
