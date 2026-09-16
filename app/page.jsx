"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Search, Star, ExternalLink } from "lucide-react";
import ModelGrid from "@/components/dashboard/ModelGrid";
import SignalStrip from "@/components/dashboard/SignalStrip";
import { CATEGORIES } from "@/lib/model-categorizer";
import { useAppStore } from "@/store/useAppStore";

export default function DashboardPage() {
  const router = useRouter();
  const {
    favorites,
    categoryOverrides,
    dashboardFilter,
    setDashboardFilter,
    apiKeyStatus,
  } = useAppStore();

  const [healthMap, setHealthMap] = useState({});
  const [healthStatusText, setHealthStatusText] = useState("");
  const [highlightedModelId, setHighlightedModelId] = useState(null);

  // Fetch models
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    isError,
  } = useQuery({
    queryKey: ["models"],
    queryFn: async () => {
      const res = await fetch("/api/models");
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message || `HTTP ${res.status}`);
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const rawModels = data?.models || [];

  // Health check mutation
  const healthCheckMutation = useMutation({
    mutationFn: async (modelIds) => {
      setHealthStatusText(`Testing ${modelIds.length} models…`);
      const res = await fetch("/api/health-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelIds }),
      });
      if (!res.ok) {
        throw new Error("Health check request failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data?.results) {
        setHealthMap((prev) => ({ ...prev, ...data.results }));
        const passed = Object.values(data.results).filter((r) => r.status === "operational").length;
        setHealthStatusText(`Checked ${Object.keys(data.results).length} models (${passed} operational)`);
        setTimeout(() => setHealthStatusText(""), 4000);
      }
    },
    onError: (err) => {
      setHealthStatusText(`Health check failed: ${err.message}`);
      setTimeout(() => setHealthStatusText(""), 4000);
    },
  });

  // Filtered models
  const filteredModels = useMemo(() => {
    return rawModels.filter((model) => {
      const effectiveCategory = categoryOverrides[model.id] || model.category || "chat";
      if (dashboardFilter.category !== "all" && effectiveCategory !== dashboardFilter.category) {
        return false;
      }

      if (dashboardFilter.search) {
        const q = dashboardFilter.search.toLowerCase();
        const matchesId = model.id.toLowerCase().includes(q);
        const matchesOwner = (model.owned_by || "").toLowerCase().includes(q);
        if (!matchesId && !matchesOwner) return false;
      }

      if (dashboardFilter.favoritesOnly && !favorites.includes(model.id)) {
        return false;
      }

      if (dashboardFilter.status !== "all") {
        const liveStatus = healthMap[model.id]?.status || model.status || "unknown";
        if (liveStatus !== dashboardFilter.status) return false;
      }

      return true;
    });
  }, [rawModels, categoryOverrides, dashboardFilter, favorites, healthMap]);

  // Telemetry counts
  const stats = useMemo(() => {
    const total = rawModels.length;
    let operational = 0;
    let degraded = 0;
    let down = 0;

    for (const m of rawModels) {
      const s = healthMap[m.id]?.status || m.status;
      if (s === "operational") operational++;
      else if (s === "degraded") degraded++;
      else if (s === "down") down++;
    }

    return { total, operational, degraded, down };
  }, [rawModels, healthMap]);

  const handleRefreshCatalog = async () => {
    const res = await fetch("/api/models?refresh=true");
    if (res.ok) {
      refetch();
    }
  };

  const handleCheckStatus = () => {
    const targetIds = filteredModels.slice(0, 24).map((m) => m.id);
    if (targetIds.length > 0) {
      healthCheckMutation.mutate(targetIds);
    }
  };

  const handleModelRoulette = () => {
    const operational = filteredModels.filter(
      (m) => (healthMap[m.id]?.status || m.status) === "operational"
    );
    const pool = operational.length > 0 ? operational : filteredModels;
    if (pool.length > 0) {
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      router.push(`/playground?model=${encodeURIComponent(chosen.id)}`);
    }
  };

  const handleSelectFromStrip = (modelId) => {
    setHighlightedModelId(modelId);
    const el = document.getElementById(`model-${modelId.replace(/[^a-zA-Z0-9_-]/g, "-")}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setTimeout(() => setHighlightedModelId(null), 3000);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-text-main">
            Dashboard
          </h1>
          <p className="text-xs text-text-muted mt-0.5 max-w-[68ch]">
            Catalog availability and health telemetry across {rawModels.length} NVIDIA NIM microservices.
          </p>
        </div>

        {/* Action Buttons: Primary is inverted neutral, secondary are transparent 1px line */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={handleModelRoulette}
            disabled={rawModels.length === 0}
            className="h-8 px-3 rounded-[6px] border border-line text-xs text-text-main hover:bg-surface-raised transition-colors duration-120 disabled:opacity-50"
          >
            Random model
          </button>

          <button
            type="button"
            onClick={handleRefreshCatalog}
            disabled={isRefetching}
            className="h-8 px-3 rounded-[6px] border border-line text-xs text-text-main hover:bg-surface-raised transition-colors duration-120 disabled:opacity-50"
          >
            {isRefetching ? "Refreshing…" : "Refresh catalog"}
          </button>

          <button
            type="button"
            onClick={handleCheckStatus}
            disabled={healthCheckMutation.isPending || filteredModels.length === 0}
            className="h-8 px-3 rounded-[6px] bg-text-main text-canvas text-xs font-medium hover:opacity-90 transition-opacity duration-120 disabled:opacity-50"
          >
            {healthCheckMutation.isPending ? "Checking…" : "Check status"}
          </button>
        </div>
      </div>

      {/* Catalog Signal Strip: Signature element per Section 5 */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-text-muted font-mono">
          <span>Catalog health strip</span>
          <span>{rawModels.length} models total</span>
        </div>
        <SignalStrip
          models={rawModels}
          healthMap={healthMap}
          onSelectModel={handleSelectFromStrip}
        />
      </div>

      {/* Health check notification */}
      {healthStatusText && (
        <div className="p-2.5 rounded-[4px] bg-surface border border-line text-xs text-text-muted font-mono">
          {healthStatusText}
        </div>
      )}

      {/* API Key Missing Alert */}
      {isError && (
        <div className="rounded-[4px] border border-line bg-surface p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="text-xs font-medium text-text-main flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--sig-fail)" }} />
              NVIDIA API key not detected
            </h3>
            <p className="text-xs text-text-muted max-w-[68ch]">
              Add <code>NVIDIA_API_KEY</code> to <code>.env.local</code> to run requests against NVIDIA NIM.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://build.nvidia.com"
              target="_blank"
              rel="noreferrer"
              className="h-8 px-3 rounded-[6px] bg-text-main text-canvas text-xs font-medium flex items-center gap-1 hover:opacity-90 transition-opacity"
            >
              Get API key <ExternalLink className="h-3 w-3" />
            </a>
            <button
              onClick={() => router.push("/settings")}
              className="h-8 px-3 rounded-[6px] border border-line text-xs text-text-main hover:bg-surface-raised transition-colors"
            >
              Settings
            </button>
          </div>
        </div>
      )}

      {/* Telemetry Numbers Readouts (Panels, not cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-[4px] border border-line bg-surface">
          <div className="text-[11px] text-text-muted">Total models</div>
          <div className="text-xl font-mono font-semibold text-text-main tabular-nums mt-0.5">
            {stats.total}
          </div>
        </div>

        <div className="p-3 rounded-[4px] border border-line bg-surface">
          <div className="text-[11px] text-text-muted">Operational</div>
          <div className="text-xl font-mono font-semibold tabular-nums mt-0.5" style={{ color: "var(--sig-ok)" }}>
            {stats.operational}
          </div>
        </div>

        <div className="p-3 rounded-[4px] border border-line bg-surface">
          <div className="text-[11px] text-text-muted">Degraded</div>
          <div className="text-xl font-mono font-semibold tabular-nums mt-0.5" style={{ color: "var(--sig-warn)" }}>
            {stats.degraded}
          </div>
        </div>

        <div className="p-3 rounded-[4px] border border-line bg-surface">
          <div className="text-[11px] text-text-muted">Starred</div>
          <div className="text-xl font-mono font-semibold text-text-main tabular-nums mt-0.5">
            {favorites.length}
          </div>
        </div>
      </div>

      {/* Category Tabs & Filter Chips (Horizontally scrollable on mobile) */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setDashboardFilter({ category: "all" })}
            className={`h-7 px-2.5 rounded-[6px] text-xs whitespace-nowrap transition-colors ${
              dashboardFilter.category === "all"
                ? "bg-text-main text-canvas font-medium"
                : "bg-surface border border-line text-text-muted hover:text-text-main hover:bg-surface-raised"
            }`}
          >
            All ({rawModels.length})
          </button>

          {Object.entries(CATEGORIES).map(([key, info]) => {
            const count = rawModels.filter(
              (m) => (categoryOverrides[m.id] || m.category || "chat") === key
            ).length;
            const isSelected = dashboardFilter.category === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setDashboardFilter({ category: key })}
                className={`h-7 px-2.5 rounded-[6px] text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-text-main text-canvas font-medium"
                    : "bg-surface border border-line text-text-muted hover:text-text-main hover:bg-surface-raised"
                }`}
              >
                <span>{info.label}</span>
                <span className="font-mono text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-faint" />
            <input
              type="text"
              placeholder="Search model ID or publisher…"
              value={dashboardFilter.search}
              onChange={(e) => setDashboardFilter({ search: e.target.value })}
              className="w-full h-8 pl-8 pr-3 bg-surface border border-line rounded-[6px] text-xs placeholder:text-text-faint focus:outline-none focus:border-[var(--focus)] focus:ring-1 focus:ring-[var(--focus)] font-sans"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setDashboardFilter({ favoritesOnly: !dashboardFilter.favoritesOnly })
              }
              className={`h-8 px-2.5 rounded-[6px] text-xs border flex items-center gap-1.5 transition-colors ${
                dashboardFilter.favoritesOnly
                  ? "bg-surface-raised border-line-strong text-text-main font-medium"
                  : "bg-surface border-line text-text-muted hover:text-text-main"
              }`}
            >
              <Star
                className={`h-3 w-3 ${dashboardFilter.favoritesOnly ? "fill-amber-400 text-amber-400" : ""}`}
              />
              <span>Starred only</span>
            </button>

            <select
              value={dashboardFilter.status}
              onChange={(e) => setDashboardFilter({ status: e.target.value })}
              className="h-8 px-2 bg-surface border border-line rounded-[6px] text-xs text-text-muted hover:text-text-main focus:outline-none focus:border-[var(--focus)]"
            >
              <option value="all">All statuses</option>
              <option value="operational">Operational</option>
              <option value="degraded">Degraded</option>
              <option value="down">Down</option>
              <option value="unknown">Untested</option>
            </select>
          </div>
        </div>
      </div>

      {/* Model Grid */}
      <ModelGrid
        models={filteredModels}
        healthData={healthMap}
        isLoading={isLoading}
        highlightedModelId={highlightedModelId}
      />
    </div>
  );
}
