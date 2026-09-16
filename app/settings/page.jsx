"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sun,
  Moon,
  Monitor,
  Trash2,
  Check,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { CATEGORIES } from "@/lib/model-categorizer";
import { storage } from "@/lib/storage";

export default function SettingsPage() {
  const {
    theme,
    setTheme,
    scoringWeights,
    setScoringWeights,
    categoryOverrides,
    setCategoryOverride,
    clearCategoryOverrides,
    resetSettings,
    apiKeyStatus,
  } = useAppStore();

  const [weights, setWeights] = useState({ ...scoringWeights });
  const [weightSaveNotice, setWeightSaveNotice] = useState("");
  const [modelSearch, setModelSearch] = useState("");

  const { data: modelsData } = useQuery({
    queryKey: ["models"],
    queryFn: async () => {
      const res = await fetch("/api/models");
      if (!res.ok) throw new Error("API check failed");
      return res.json();
    },
  });

  const models = modelsData?.models || [];

  // Weight adjustments
  const handleWeightChange = (key, value) => {
    const num = Math.max(0, Math.min(100, parseInt(value, 10) || 0));
    setWeights((prev) => ({ ...prev, [key]: num }));
  };

  const totalWeight = weights.quality + weights.speed + weights.reliability;
  const isWeightSumValid = totalWeight === 100;

  const handleSaveWeights = () => {
    if (!isWeightSumValid) return;
    setScoringWeights(weights);
    setWeightSaveNotice("Benchmark weights updated");
    setTimeout(() => setWeightSaveNotice(""), 3000);
  };

  const handleResetWeights = () => {
    const defaults = { quality: 55, speed: 25, reliability: 20 };
    setWeights(defaults);
    setScoringWeights(defaults);
    setWeightSaveNotice("Reset to default 55 / 25 / 20 weights");
    setTimeout(() => setWeightSaveNotice(""), 3000);
  };

  const handleClearAllStorage = async () => {
    if (confirm("Clear all locally stored benchmark runs, chat sessions, and custom prompt suites?")) {
      await storage.clearAll();
      resetSettings();
      alert("All local data has been cleared.");
      window.location.reload();
    }
  };

  const filteredModels = models.filter((m) => {
    if (!modelSearch) return true;
    return (
      m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
      (m.owned_by || "").toLowerCase().includes(modelSearch.toLowerCase())
    );
  });

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page Header */}
      <div className="pb-4 border-b border-line-strong">
        <h2 className="text-[26px] font-[550] text-text tracking-tight">Settings</h2>
        <p className="text-xs text-text-muted mt-1 max-w-[68ch]">
          Configure API credentials, customize benchmark scoring formula weights, override model categories, and manage local storage.
        </p>
      </div>

      {/* 1. API Key Status & Instructions */}
      <div className="rounded-[4px] border border-line bg-surface p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h3 className="text-sm font-medium text-text">NVIDIA API credentials</h3>
          <div>
            {apiKeyStatus.valid ? (
              <span className="text-xs font-mono flex items-center gap-1.5 text-sig-ok">
                <span>●</span>
                <span className="font-sans text-[11px] text-text">Operational</span>
              </span>
            ) : (
              <span className="text-xs font-mono flex items-center gap-1.5 text-sig-fail">
                <span>■</span>
                <span className="font-sans text-[11px] text-text">Missing or invalid</span>
              </span>
            )}
          </div>
        </div>

        <div className="text-xs text-text-muted space-y-2 leading-relaxed max-w-[68ch]">
          <p>
            NIM Console communicates with NVIDIA's API server-side using the <code className="font-mono text-text">NVIDIA_API_KEY</code> environment variable.
          </p>
          <div className="p-3 bg-canvas rounded-[4px] border border-line font-mono text-[11px] text-text select-text">
            # In your .env.local file:
            <br />
            NVIDIA_API_KEY=nvapi-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
            <br />
            NVIDIA_JUDGE_MODEL=openai/gpt-oss-20b
          </div>
          <p className="text-[11px]">
            Need a key? Generate one at{" "}
            <a
              href="https://build.nvidia.com"
              target="_blank"
              rel="noreferrer"
              className="text-text hover:underline inline-flex items-center gap-0.5"
            >
              build.nvidia.com <ExternalLink className="h-3 w-3 text-text-muted" />
            </a>{" "}
            with 1,000 free inference credits.
          </p>
        </div>
      </div>

      {/* 2. Benchmark Scoring Weights */}
      <div className="rounded-[4px] border border-line bg-surface p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-line pb-3">
          <div>
            <h3 className="text-sm font-medium text-text">Composite score weights</h3>
            <p className="text-xs text-text-muted mt-0.5 max-w-[68ch]">
              Customize relative weights of quality, speed, and reliability. Weights must sum to 100%.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetWeights}
            className="h-7 px-2.5 rounded-[6px] border border-line text-xs text-text-muted hover:text-text hover:bg-surface-raised transition flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset default weights</span>
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Quality Weight */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <label className="text-text-muted">Quality score weight</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={weights.quality}
                  onChange={(e) => handleWeightChange("quality", e.target.value)}
                  className="w-14 px-2 py-0.5 text-right font-mono text-xs bg-surface-raised border border-line rounded-[4px] text-text focus:outline-none focus:border-focus focus:ring-1 focus:ring-focus tabular-nums"
                />
                <span className="text-[11px] text-text-muted font-mono">%</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={weights.quality}
              onChange={(e) => handleWeightChange("quality", e.target.value)}
              className="w-full accent-text h-1 bg-surface-raised rounded cursor-pointer"
            />
          </div>

          {/* Speed Weight */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <label className="text-text-muted">Speed and latency weight</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={weights.speed}
                  onChange={(e) => handleWeightChange("speed", e.target.value)}
                  className="w-14 px-2 py-0.5 text-right font-mono text-xs bg-surface-raised border border-line rounded-[4px] text-text focus:outline-none focus:border-focus focus:ring-1 focus:ring-focus tabular-nums"
                />
                <span className="text-[11px] text-text-muted font-mono">%</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={weights.speed}
              onChange={(e) => handleWeightChange("speed", e.target.value)}
              className="w-full accent-text h-1 bg-surface-raised rounded cursor-pointer"
            />
          </div>

          {/* Reliability Weight */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <label className="text-text-muted">Reliability weight</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={weights.reliability}
                  onChange={(e) => handleWeightChange("reliability", e.target.value)}
                  className="w-14 px-2 py-0.5 text-right font-mono text-xs bg-surface-raised border border-line rounded-[4px] text-text focus:outline-none focus:border-focus focus:ring-1 focus:ring-focus tabular-nums"
                />
                <span className="text-[11px] text-text-muted font-mono">%</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={weights.reliability}
              onChange={(e) => handleWeightChange("reliability", e.target.value)}
              className="w-full accent-text h-1 bg-surface-raised rounded cursor-pointer"
            />
          </div>

          <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-line">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-text-muted">Total sum:</span>
              <span
                className={`font-mono font-medium tabular-nums ${
                  isWeightSumValid ? "text-sig-ok" : "text-sig-fail"
                }`}
              >
                {totalWeight} %
              </span>
              {!isWeightSumValid && (
                <span className="text-sig-fail text-[11px]">(Must sum to exactly 100%)</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {weightSaveNotice && (
                <span className="text-text-muted text-xs flex items-center gap-1">
                  <Check className="h-3.5 w-3.5 text-sig-ok" /> {weightSaveNotice}
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveWeights}
                disabled={!isWeightSumValid}
                className="h-8 px-4 rounded-[6px] bg-text text-canvas hover:bg-white text-xs font-medium transition disabled:opacity-30"
              >
                Save weights
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Appearance Theme */}
      <div className="rounded-[4px] border border-line bg-surface p-5 space-y-3">
        <div className="border-b border-line pb-2">
          <h3 className="text-sm font-medium text-text">Theme preference</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Switch between developer dark mode, light mode, or system default.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-1">
          {[
            { id: "dark", label: "Dark mode", icon: Moon },
            { id: "light", label: "Light mode", icon: Sun },
            { id: "system", label: "System default", icon: Monitor },
          ].map((t) => {
            const Icon = t.icon;
            const isSelected = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={`p-3 rounded-[4px] border flex flex-col items-center gap-2 text-xs transition ${
                  isSelected
                    ? "bg-surface-raised border-text text-text font-medium"
                    : "bg-surface border-line text-text-muted hover:text-text hover:bg-surface-raised"
                }`}
              >
                <Icon className="h-4 w-4 text-text-muted" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Model Category Overrides */}
      <div className="rounded-[4px] border border-line bg-surface p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-line pb-2">
          <div>
            <h3 className="text-sm font-medium text-text">Category classification overrides</h3>
            <p className="text-xs text-text-muted mt-0.5 max-w-[68ch]">
              Manually correct model classifications if keyword heuristics misidentified a capability.
            </p>
          </div>

          {Object.keys(categoryOverrides).length > 0 && (
            <button
              type="button"
              onClick={clearCategoryOverrides}
              className="h-7 px-2.5 rounded-[6px] border border-line text-xs text-text-muted hover:text-text hover:bg-surface-raised transition"
            >
              Clear overrides
            </button>
          )}
        </div>

        <input
          type="text"
          placeholder="Filter models to override category..."
          value={modelSearch}
          onChange={(e) => setModelSearch(e.target.value)}
          className="w-full px-3 h-8 bg-surface-raised border border-line rounded-[6px] text-xs text-text placeholder:text-text-faint focus:outline-none focus:border-focus focus:ring-1 focus:ring-focus font-sans"
        />

        <div className="max-h-64 overflow-y-auto space-y-0.5 border border-line rounded-[4px] p-1 bg-canvas">
          {filteredModels.slice(0, 50).map((m) => {
            const currentCat = categoryOverrides[m.id] || m.category || "chat";
            const isOverridden = Boolean(categoryOverrides[m.id]);

            return (
              <div
                key={m.id}
                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[4px] hover:bg-surface-raised text-xs"
              >
                <span className="font-mono truncate text-text max-w-sm">{m.id}</span>
                <select
                  value={currentCat}
                  onChange={(e) => setCategoryOverride(m.id, e.target.value)}
                  className={`h-7 px-2 rounded-[4px] text-xs border font-sans ${
                    isOverridden
                      ? "bg-surface-raised border-text text-text font-medium"
                      : "bg-surface border-line text-text-muted"
                  }`}
                >
                  {Object.entries(CATEGORIES).map(([catKey, catVal]) => (
                    <option key={catKey} value={catKey}>
                      {catVal.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Clear Local Storage */}
      <div className="rounded-[4px] border border-line bg-surface p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-medium text-text">
            Reset local storage data
          </h4>
          <p className="text-xs text-text-muted mt-1 max-w-[68ch]">
            Clears all locally stored benchmark runs, cached chat sessions, custom suites, and settings from your browser storage.
          </p>
        </div>

        <button
          type="button"
          onClick={handleClearAllStorage}
          className="h-8 px-4 rounded-[6px] border border-sig-fail text-sig-fail hover:bg-sig-fail/10 text-xs font-medium shrink-0 transition flex items-center gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Clear run history and storage</span>
        </button>
      </div>
    </div>
  );
}
