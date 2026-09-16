"use client";

import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { useAppStore } from "@/store/useAppStore";
import { CATEGORIES } from "@/lib/model-categorizer";

export default function ModelGrid({
  models = [],
  healthData = {},
  isLoading = false,
  highlightedModelId = null,
}) {
  const router = useRouter();
  const { favorites, toggleFavorite, categoryOverrides, setSelectedModels } = useAppStore();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-36 rounded-[4px] border border-line bg-surface p-4 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="h-3 bg-surface-raised rounded w-1/3" />
              <div className="h-4 bg-surface-raised rounded w-3/4" />
            </div>
            <div className="h-3 bg-surface-raised rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="text-center py-16 border border-line rounded-[4px] p-8 bg-surface">
        <h3 className="text-sm font-medium text-text-main">No models found</h3>
        <p className="text-xs text-text-muted mt-1 max-w-[68ch] mx-auto">
          No models matched your search or filters. Try adjusting your query or click Refresh catalog.
        </p>
      </div>
    );
  }

  const handleQuickCompare = (e, modelId) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedModels([modelId]);
    router.push(`/compare?model1=${encodeURIComponent(modelId)}`);
  };

  const handleQuickBenchmark = (e, modelId) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedModels([modelId]);
    router.push(`/benchmark?preselect=${encodeURIComponent(modelId)}`);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {models.map((model) => {
        const isFav = favorites.includes(model.id);
        const overrideCat = categoryOverrides[model.id];
        const categoryKey = overrideCat || model.category || "chat";
        const categoryInfo = CATEGORIES[categoryKey] || CATEGORIES.other;

        const health = healthData[model.id];
        const currentStatus = health?.status || model.status || "unknown";
        const latency = health?.latencyMs ?? model.avgLatencyMs;
        const isHighlighted = highlightedModelId === model.id;

        return (
          <div
            id={`model-${model.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`}
            key={model.id}
            onClick={() => router.push(`/playground?model=${encodeURIComponent(model.id)}`)}
            className={`cursor-pointer rounded-[4px] border bg-surface p-4 flex flex-col justify-between transition-colors duration-120 hover:bg-surface-raised ${
              isHighlighted
                ? "border-[var(--focus)] ring-2 ring-[var(--focus-soft)]"
                : "border-line"
            }`}
          >
            <div>
              {/* Header: Publisher & Favorite */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-mono text-text-muted truncate">
                    {model.owned_by}
                  </span>
                  <span className="text-text-faint text-[10px]">/</span>
                  <span className="text-[11px] font-sans text-text-faint truncate">
                    {categoryInfo.label}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(model.id);
                  }}
                  className={`p-1 rounded-[4px] hover:bg-surface-raised transition-colors ${
                    isFav ? "text-amber-400 fill-amber-400" : "text-text-faint hover:text-text-main"
                  }`}
                  aria-label={isFav ? "Remove star" : "Star model"}
                >
                  <Star className={`h-3.5 w-3.5 ${isFav ? "fill-amber-400 text-amber-400" : ""}`} />
                </button>
              </div>

              {/* Model ID */}
              <h3 className="font-mono text-xs font-semibold text-text-main tracking-tight line-clamp-2">
                {model.id}
              </h3>
            </div>

            {/* Bottom Meta & Action buttons */}
            <div className="mt-4 pt-3 border-t border-line flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs">
                <StatusBadge status={currentStatus} isNew={model.isNew} />

                {latency ? (
                  <span className="font-mono text-[11px] text-text-muted tabular-nums">
                    {Math.round(latency)} <span className="text-[10px] text-text-faint">ms</span>
                  </span>
                ) : (
                  <span className="font-mono text-[11px] text-text-faint">--</span>
                )}
              </div>

              {/* Action Links */}
              <div className="flex items-center justify-between gap-1 pt-1 border-t border-line text-xs">
                <span className="text-[11px] text-text-main font-sans font-medium hover:underline">
                  Playground
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => handleQuickCompare(e, model.id)}
                    className="h-6 px-2 rounded-[4px] text-[11px] text-text-muted hover:text-text-main hover:bg-surface-raised transition-colors"
                  >
                    Compare
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleQuickBenchmark(e, model.id)}
                    className="h-6 px-2 rounded-[4px] text-[11px] text-text-muted hover:text-text-main hover:bg-surface-raised transition-colors"
                  >
                    Benchmark
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
