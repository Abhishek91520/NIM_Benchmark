"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Zap,
  CheckCircle2,
  XCircle,
  HelpCircle,
  SlidersHorizontal,
  ArrowDownUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DEFAULT_PROMPT_SUITE } from "@/lib/benchmark/default-suite";
import { storage } from "@/lib/storage";

export default function RunConfigForm({
  availableModels = [],
  preselectedModelIds = [],
  onLaunch,
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedModels, setSelectedModels] = useState([]);
  const hasInitializedRef = useRef(false);

  const [search, setSearch] = useState("");
  const [modelHealthFilter, setModelHealthFilter] = useState("all"); // 'all' | 'working' | 'untested' | 'failed'
  const [sortOrder, setSortOrder] = useState("working-first"); // 'working-first' | 'name-asc' | 'throughput' | 'latency'
  const [suiteId, setSuiteId] = useState("default");
  const [customSuites, setCustomSuites] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [healthMap, setHealthMap] = useState({});

  // Configurable execution parameters (all user-tunable)
  const [concurrency, setConcurrency] = useState(4);
  const [maxTokens, setMaxTokens] = useState(128);
  const [perRequestTimeoutSec, setPerRequestTimeoutSec] = useState(15);
  const [timeBudgetSeconds, setTimeBudgetSeconds] = useState(45);
  const [judgeScoringEnabled, setJudgeScoringEnabled] = useState(false);

  // Query key pool status to display active rotating keys
  const { data: healthData } = useQuery({
    queryKey: ["key-pool-status"],
    queryFn: async () => {
      const res = await fetch("/api/health-check");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60_000,
  });

  const totalKeysConfigured = healthData?.keyPool?.totalKeys || 3;

  // Selected prompt IDs (default to 1 prompt for fast status & TPS check)
  const [selectedPromptIds, setSelectedPromptIds] = useState(() =>
    [DEFAULT_PROMPT_SUITE.prompts[0].id]
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Dynamically load health history from past benchmark runs in storage
  useEffect(() => {
    async function loadData() {
      // 1. Custom prompt suites
      const suiteItems = await storage.list("prompts:suite:");
      if (suiteItems && suiteItems.length > 0) {
        setCustomSuites(suiteItems.map((i) => i.value));
      }

      // 2. Read past runs dynamically to derive live verified model health
      const runItems = await storage.list("benchmark:run:");
      const map = {};

      for (const item of (runItems || [])) {
        const run = item.value;
        if (run?.results && Array.isArray(run.results)) {
          for (const r of run.results) {
            if (!map[r.modelId]) {
              map[r.modelId] = {
                status: r.success ? "operational" : "failed",
                tokensPerSec: r.tokensPerSec || 0,
                latencyMs: r.totalLatencyMs || 0,
                errorReason: !r.success ? (r.judgeReasoning || r.errorCode || "Failed") : null,
              };
            } else if (r.success && map[r.modelId].status !== "operational") {
              map[r.modelId] = {
                status: "operational",
                tokensPerSec: r.tokensPerSec || map[r.modelId].tokensPerSec || 0,
                latencyMs: r.totalLatencyMs || map[r.modelId].latencyMs || 0,
                errorReason: null,
              };
            }
          }
        }
      }
      setHealthMap(map);
    }
    loadData();
  }, []);

  // Dynamic helper to get health of any model from live test history
  const getModelStatus = (modelId) => {
    if (healthMap[modelId]) return healthMap[modelId];
    return { status: "untested", tokensPerSec: 0, latencyMs: 0, errorReason: null };
  };

  // Pre-select models on initial load
  useEffect(() => {
    if (!hasInitializedRef.current && availableModels.length > 0) {
      if (preselectedModelIds.length > 0) {
        setSelectedModels(preselectedModelIds);
      } else {
        // If we have working models from past runs, prioritize them
        const working = availableModels
          .filter((m) => getModelStatus(m.id).status === "operational")
          .slice(0, 4)
          .map((m) => m.id);

        if (working.length > 0) {
          setSelectedModels(working);
        } else {
          // Otherwise pick the first 4 chat models that haven't failed
          const defaults = availableModels
            .filter((m) => (m.category || "chat") === "chat" && getModelStatus(m.id).status !== "failed")
            .slice(0, 4)
            .map((m) => m.id);
          setSelectedModels(defaults);
        }
      }
      hasInitializedRef.current = true;
    }
  }, [availableModels, preselectedModelIds, healthMap]);

  const activeSuite = useMemo(() => {
    if (suiteId === "default") return DEFAULT_PROMPT_SUITE;
    const found = customSuites.find((s) => s.id === suiteId);
    return found || DEFAULT_PROMPT_SUITE;
  }, [suiteId, customSuites]);

  // Counts of models by health tier
  const modelCounts = useMemo(() => {
    let working = 0;
    let failed = 0;
    let untested = 0;

    for (const m of availableModels) {
      const st = getModelStatus(m.id).status;
      if (st === "operational") working++;
      else if (st === "failed") failed++;
      else untested++;
    }

    return { working, failed, untested, total: availableModels.length };
  }, [availableModels, healthMap]);

  // Configurable sorting and filtering
  const sortedAndFilteredModels = useMemo(() => {
    const list = availableModels.filter((m) => {
      if (search) {
        const q = search.toLowerCase();
        if (!m.id.toLowerCase().includes(q) && !(m.owned_by || "").toLowerCase().includes(q)) {
          return false;
        }
      }

      const st = getModelStatus(m.id).status;
      if (modelHealthFilter === "working" && st !== "operational") return false;
      if (modelHealthFilter === "untested" && st !== "untested") return false;
      if (modelHealthFilter === "failed" && st !== "failed") return false;

      return true;
    });

    return list.sort((a, b) => {
      const aInfo = getModelStatus(a.id);
      const bInfo = getModelStatus(b.id);

      // Strategy 1: Working on top, failures at bottom
      if (sortOrder === "working-first") {
        const tierOrder = { operational: 1, untested: 2, failed: 3 };
        const aTier = tierOrder[aInfo.status] || 2;
        const bTier = tierOrder[bInfo.status] || 2;

        if (aTier !== bTier) {
          return aTier - bTier;
        }

        if (aInfo.status === "operational" && bInfo.status === "operational") {
          if (bInfo.tokensPerSec !== aInfo.tokensPerSec) {
            return (bInfo.tokensPerSec || 0) - (aInfo.tokensPerSec || 0);
          }
        }
        return a.id.localeCompare(b.id);
      }

      // Strategy 2: Alphabetical
      if (sortOrder === "name-asc") {
        return a.id.localeCompare(b.id);
      }

      // Strategy 3: Throughput (tok/s)
      if (sortOrder === "throughput") {
        return (bInfo.tokensPerSec || 0) - (aInfo.tokensPerSec || 0);
      }

      // Strategy 4: Latency (fastest first)
      if (sortOrder === "latency") {
        const aLat = aInfo.latencyMs || 99999;
        const bLat = bInfo.latencyMs || 99999;
        return aLat - bLat;
      }

      return a.id.localeCompare(b.id);
    });
  }, [availableModels, search, healthMap, modelHealthFilter, sortOrder]);

  const toggleModel = (id) => {
    if (selectedModels.includes(id)) {
      setSelectedModels(selectedModels.filter((m) => m !== id));
    } else {
      setSelectedModels([...selectedModels, id]);
    }
  };

  const selectAllWorking = () => {
    const workingIds = availableModels
      .filter((m) => getModelStatus(m.id).status === "operational")
      .map((m) => m.id);
    setSelectedModels(workingIds);
  };

  const selectAllVisible = () => {
    setSelectedModels(sortedAndFilteredModels.map((m) => m.id));
  };

  const deselectAll = () => {
    setSelectedModels([]);
  };

  const selectedPrompts = useMemo(() => {
    const list = (activeSuite.prompts || []).filter((p) => selectedPromptIds.includes(p.id));
    if (list.length === 0 && (activeSuite.prompts || []).length > 0) {
      return [activeSuite.prompts[0]];
    }
    return list;
  }, [activeSuite, selectedPromptIds]);

  const handleSetPromptCount = (count) => {
    const clamped = Math.max(1, Math.min(count, Math.min(8, activeSuite.prompts?.length || 8)));
    const newIds = (activeSuite.prompts || []).slice(0, clamped).map((p) => p.id);
    setSelectedPromptIds(newIds);
  };

  const handleTogglePrompt = (id) => {
    if (selectedPromptIds.includes(id)) {
      if (selectedPromptIds.length <= 1) return;
      setSelectedPromptIds(selectedPromptIds.filter((pId) => pId !== id));
    } else {
      if (selectedPromptIds.length >= 8) return;
      setSelectedPromptIds([...selectedPromptIds, id]);
    }
  };

  const handleSpeedStatusPreset = () => {
    setSelectedPromptIds([activeSuite.prompts[0]?.id || "prompt-1-reasoning"]);
    setJudgeScoringEnabled(false);
    setMaxTokens(128);
    setConcurrency(4);
    setPerRequestTimeoutSec(15);
  };

  const handleFullSuitePreset = () => {
    setSelectedPromptIds((activeSuite.prompts || []).slice(0, 8).map((p) => p.id));
    setJudgeScoringEnabled(true);
    setMaxTokens(512);
  };

  const totalPairs = selectedModels.length * selectedPrompts.length;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedModels.length === 0 || selectedPrompts.length === 0) return;

    onLaunch({
      modelIds: selectedModels,
      promptSuite: {
        ...activeSuite,
        prompts: selectedPrompts,
      },
      judgeScoring: judgeScoringEnabled,
      timeBudgetMs: timeBudgetSeconds * 1000,
      concurrency: Number(concurrency) || 4,
      maxTokens: Number(maxTokens) || 128,
      timeoutMs: Number(perRequestTimeoutSec) * 1000 || 15_000,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Preset Selector Banner & Key Rotation Status */}
      <div className="rounded-[4px] border border-line bg-surface p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-text flex items-center gap-1.5 mr-1">
            <Zap className="h-4 w-4 text-amber-400" />
            <span>Preset:</span>
          </span>
          <button
            type="button"
            onClick={handleSpeedStatusPreset}
            className={`h-7 px-3 rounded-[4px] text-xs font-medium transition ${
              selectedPrompts.length === 1 && !judgeScoringEnabled
                ? "bg-text-main text-canvas shadow-sm"
                : "bg-surface-raised border border-line text-text-muted hover:text-text-main"
            }`}
          >
            ⚡ Speed & Status Check (1 prompt, ~5s)
          </button>
          <button
            type="button"
            onClick={handleFullSuitePreset}
            className={`h-7 px-3 rounded-[4px] text-xs font-medium transition ${
              selectedPrompts.length > 1 && judgeScoringEnabled
                ? "bg-text-main text-canvas shadow-sm"
                : "bg-surface-raised border border-line text-text-muted hover:text-text-main"
            }`}
          >
            Full Benchmark (8 prompts)
          </button>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-amber-400 bg-amber-950/30 px-2.5 py-1 rounded-[4px] border border-amber-800/40 shrink-0">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>{totalKeysConfigured} API Key{totalKeysConfigured > 1 ? "s" : ""} in Rotation</span>
        </div>
      </div>

      {/* Step 1: Select Models Panel with Configurable Ordering & Dynamic Health */}
      <div className="rounded-[4px] border border-line bg-surface p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-2.5">
          <div>
            <h3 className="text-xs font-semibold text-text font-sans" suppressHydrationWarning>
              Select candidate models ({isMounted ? selectedModels.length : 0} selected)
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5 max-w-[68ch]">
              Configure model ordering, filter by health status, and select candidate models.
            </p>
          </div>

          {/* Quick Selection Actions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {modelCounts.working > 0 && (
              <button
                type="button"
                onClick={selectAllWorking}
                className="text-[11px] font-medium text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 px-2.5 py-1 rounded-[4px] transition-colors flex items-center gap-1"
                title="Select all verified working models"
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>Select all working ({modelCounts.working})</span>
              </button>
            )}
            <button
              type="button"
              onClick={selectAllVisible}
              className="text-[11px] text-text-muted hover:text-text px-2 py-1 rounded-[4px] hover:bg-surface-raised transition-colors"
            >
              Select visible
            </button>
            <button
              type="button"
              onClick={deselectAll}
              className="text-[11px] text-text-muted hover:text-text px-2 py-1 rounded-[4px] hover:bg-surface-raised transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Ordering Selector, Health Filter Chips & Search Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pt-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Health Filter Chips */}
            <button
              type="button"
              onClick={() => setModelHealthFilter("all")}
              className={`h-6 px-2 rounded-[4px] text-[11px] font-mono transition ${
                modelHealthFilter === "all"
                  ? "bg-line-strong text-text-main font-semibold"
                  : "text-text-muted hover:text-text-main"
              }`}
            >
              All ({modelCounts.total})
            </button>
            {modelCounts.working > 0 && (
              <button
                type="button"
                onClick={() => setModelHealthFilter("working")}
                className={`h-6 px-2 rounded-[4px] text-[11px] font-mono flex items-center gap-1 transition ${
                  modelHealthFilter === "working"
                    ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 font-semibold"
                    : "text-text-muted hover:text-emerald-400"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Working ({modelCounts.working})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setModelHealthFilter("untested")}
              className={`h-6 px-2 rounded-[4px] text-[11px] font-mono flex items-center gap-1 transition ${
                modelHealthFilter === "untested"
                  ? "bg-surface-raised text-text-main border border-line font-semibold"
                  : "text-text-muted hover:text-text-main"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-text-faint" />
              <span>Untested ({modelCounts.untested})</span>
            </button>
            {modelCounts.failed > 0 && (
              <button
                type="button"
                onClick={() => setModelHealthFilter("failed")}
                className={`h-6 px-2 rounded-[4px] text-[11px] font-mono flex items-center gap-1 transition ${
                  modelHealthFilter === "failed"
                    ? "bg-rose-950/60 text-rose-400 border border-rose-800/50 font-semibold"
                    : "text-text-muted hover:text-rose-400"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span>Failed ({modelCounts.failed})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Sort Order Selector */}
            <div className="flex items-center gap-1.5 text-xs text-text-muted shrink-0">
              <ArrowDownUp className="h-3.5 w-3.5 text-text-faint" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="h-7 px-2 bg-canvas border border-line rounded-[4px] text-[11px] font-sans text-text focus:outline-none focus:border-focus"
              >
                <option value="working-first">Working on Top, Failed at Bottom</option>
                <option value="throughput">Throughput (Highest tok/s)</option>
                <option value="name-asc">Alphabetical (A–Z)</option>
                <option value="latency">Latency (Lowest first)</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-52">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-faint" />
              <input
                type="text"
                placeholder="Search models…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-7 pl-8 pr-3 bg-canvas border border-line rounded-[4px] text-xs text-text placeholder:text-text-faint focus:outline-none focus:border-focus"
              />
            </div>
          </div>
        </div>

        {/* Model Rows */}
        <div className="max-h-72 overflow-y-auto space-y-0.5 border border-line rounded-[4px] p-1 bg-canvas">
          {!isMounted ? (
            <div className="p-4 text-center text-xs text-text-faint">Loading models…</div>
          ) : sortedAndFilteredModels.length === 0 ? (
            <div className="p-4 text-center text-xs text-text-faint">No models match current filter</div>
          ) : (
            sortedAndFilteredModels.map((model) => {
              const isChecked = selectedModels.includes(model.id);
              const info = getModelStatus(model.id);
              const isWorking = info.status === "operational";
              const isFailed = info.status === "failed";

              return (
                <div
                  key={model.id}
                  onClick={() => toggleModel(model.id)}
                  className={`flex items-center justify-between p-2 rounded-[4px] cursor-pointer text-xs transition-colors duration-100 ${
                    isChecked
                      ? "bg-surface-raised text-text font-medium"
                      : isFailed
                      ? "hover:bg-surface-raised/40 text-text-faint opacity-65"
                      : "hover:bg-surface-raised/50 text-text-muted"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="h-3.5 w-3.5 rounded-[3px] accent-focus cursor-pointer shrink-0"
                    />
                    <span className="font-mono text-xs truncate max-w-sm sm:max-w-md" title={model.id}>
                      {model.id}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pl-2">
                    {/* Status badge */}
                    {isWorking ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded-[3px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Working {info.tokensPerSec > 0 ? `• ${info.tokensPerSec} tok/s` : ""}</span>
                      </span>
                    ) : isFailed ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-rose-400 bg-rose-950/40 border border-rose-800/40 px-1.5 py-0.5 rounded-[3px] max-w-[150px] truncate"
                        title={info.errorReason || "Failed"}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                        <span className="truncate">{info.errorReason?.slice(0, 18) || "Failed"}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-text-faint bg-surface border border-line px-1.5 py-0.5 rounded-[3px]">
                        Untested
                      </span>
                    )}

                    <span className="text-[11px] font-mono text-text-faint w-20 text-right truncate">
                      {model.owned_by}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Step 2: Prompt Suite & Prompts Count Selection */}
      <div className="rounded-[4px] border border-line bg-surface p-4 space-y-3">
        <div className="border-b border-line pb-2">
          <h3 className="text-xs font-semibold text-text font-sans">Prompt suite</h3>
          <p className="text-[11px] text-text-muted mt-0.5 max-w-[68ch]">
            Select prompt suite and configure how many test prompts (between 1 to 8) to benchmark.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div
            onClick={() => setSuiteId("default")}
            className={`p-3 rounded-[4px] border cursor-pointer transition-colors duration-100 ${
              suiteId === "default"
                ? "bg-surface-raised border-line-strong text-text"
                : "border-line text-text-muted hover:text-text"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{DEFAULT_PROMPT_SUITE.name}</span>
              <span className="text-[10px] font-mono text-text-faint">Standard</span>
            </div>
            <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
              {DEFAULT_PROMPT_SUITE.description}
            </p>
            <div className="mt-2 text-[11px] font-mono text-text-faint">
              {DEFAULT_PROMPT_SUITE.prompts.length} total prompts available
            </div>
          </div>

          {customSuites.map((cs) => (
            <div
              key={cs.id}
              onClick={() => setSuiteId(cs.id)}
              className={`p-3 rounded-[4px] border cursor-pointer transition-colors duration-100 ${
                suiteId === cs.id
                  ? "bg-surface-raised border-line-strong text-text"
                  : "border-line text-text-muted hover:text-text"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{cs.name}</span>
                <span className="text-[10px] font-mono text-text-faint">Custom</span>
              </div>
              <p className="text-[11px] text-text-muted mt-1">
                {cs.description || "Custom prompt suite"}
              </p>
              <div className="mt-2 text-[11px] font-mono text-text-faint">
                {cs.prompts?.length || 0} prompts available
              </div>
            </div>
          ))}
        </div>

        {/* Option to select between 1 to 8 prompts/pairs */}
        <div className="space-y-2.5 pt-3 border-t border-line">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-xs font-medium text-text flex items-center gap-2">
                <span>Select test prompts ({selectedPrompts.length} of {Math.min(8, activeSuite.prompts?.length || 8)} selected)</span>
                <span className="font-mono text-[11px] text-text-muted">
                  ({selectedPrompts.length} pair{selectedPrompts.length > 1 ? "s" : ""} per model)
                </span>
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">
                Choose test prompts. Select a preset count or toggle individual cases below.
              </p>
            </div>

            {/* Quick 1 to 8 count selector */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-text-muted mr-1">Count:</span>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
                const isSelected = selectedPrompts.length === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleSetPromptCount(num)}
                    className={`h-6 w-6 rounded-[4px] text-xs font-mono tabular-nums transition ${
                      isSelected
                        ? "bg-text text-canvas font-medium"
                        : "bg-surface-raised border border-line text-text-muted hover:text-text hover:bg-line"
                    }`}
                    title={`Select first ${num} prompt${num > 1 ? "s" : ""}`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prompt list */}
          <div className="max-h-56 overflow-y-auto space-y-1 border border-line rounded-[4px] p-1.5 bg-canvas">
            {(activeSuite.prompts || []).slice(0, 8).map((p, idx) => {
              const isChecked = selectedPromptIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => handleTogglePrompt(p.id)}
                  className={`flex items-center justify-between p-2 rounded-[4px] cursor-pointer text-xs transition-colors duration-100 ${
                    isChecked
                      ? "bg-surface-raised text-text font-medium"
                      : "hover:bg-surface-raised/50 text-text-muted"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="h-3.5 w-3.5 rounded-[3px] accent-focus cursor-pointer"
                    />
                    <span className="font-mono text-[11px] text-text-faint tabular-nums shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="truncate">{p.title || p.id}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 pl-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-surface border border-line text-text-muted font-sans">
                      {p.category}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-surface border border-line text-text-muted font-sans">
                      {p.evalType}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Advanced Settings Collapsible: All parameters user-configurable */}
      <div className="rounded-[4px] border border-line bg-surface p-3.5">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between text-xs text-text-muted hover:text-text transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Advanced engine settings (concurrency, token budget, timeouts)</span>
          </div>
          {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {showAdvanced && (
          <div className="mt-3 pt-3 border-t border-line grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Concurrency Setting */}
            <div className="space-y-1">
              <span className="text-text-muted">Concurrency</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={concurrency}
                  onChange={(e) => setConcurrency(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 4)))}
                  className="w-14 h-7 px-2 bg-canvas border border-line rounded-[4px] font-mono text-xs tabular-nums text-right text-text"
                />
                <span className="text-[11px] text-text-faint">workers</span>
              </div>
            </div>

            {/* Max Output Tokens Setting */}
            <div className="space-y-1">
              <span className="text-text-muted">Max output tokens</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="32"
                  max="2048"
                  step="32"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Math.max(32, Math.min(2048, parseInt(e.target.value, 10) || 128)))}
                  className="w-16 h-7 px-2 bg-canvas border border-line rounded-[4px] font-mono text-xs tabular-nums text-right text-text"
                />
                <span className="text-[11px] text-text-faint">tokens</span>
              </div>
            </div>

            {/* Per-Request Timeout Setting */}
            <div className="space-y-1">
              <span className="text-text-muted">Model timeout</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={perRequestTimeoutSec}
                  onChange={(e) => setPerRequestTimeoutSec(Math.max(5, Math.min(60, parseInt(e.target.value, 10) || 15)))}
                  className="w-14 h-7 px-2 bg-canvas border border-line rounded-[4px] font-mono text-xs tabular-nums text-right text-text"
                />
                <span className="text-[11px] text-text-faint">sec / model</span>
              </div>
            </div>

            {/* Batch Time Budget */}
            <div className="space-y-1">
              <span className="text-text-muted">Batch timeout</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="15"
                  max="60"
                  value={timeBudgetSeconds}
                  onChange={(e) => setTimeBudgetSeconds(Math.max(15, Math.min(60, parseInt(e.target.value, 10) || 45)))}
                  className="w-14 h-7 px-2 bg-canvas border border-line rounded-[4px] font-mono text-xs tabular-nums text-right text-text"
                />
                <span className="text-[11px] text-text-faint">sec batch</span>
              </div>
            </div>

            {/* Automated Judge Grading Toggle */}
            <div className="sm:col-span-2 md:col-span-4 pt-1">
              <label className="flex items-center justify-between cursor-pointer p-2 rounded-[4px] bg-canvas border border-line">
                <div>
                  <span className="text-text block font-medium">Automated judge grading</span>
                  <span className="text-[11px] text-text-faint block">Calls secondary model for qualitative rubric scoring (disabling speeds up runs)</span>
                </div>
                <input
                  type="checkbox"
                  checked={judgeScoringEnabled}
                  onChange={(e) => setJudgeScoringEnabled(e.target.checked)}
                  className="h-4 w-4 rounded-[3px] accent-focus cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Action Bar with Outcome-Naming Button */}
      <div className="p-3.5 rounded-[4px] border border-line bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs font-mono text-text-muted">
          <span suppressHydrationWarning>
            {isMounted ? selectedModels.length : 0} models × {selectedPrompts.length} prompt{selectedPrompts.length > 1 ? "s" : ""} ={" "}
            <span className="text-text font-medium">{isMounted ? totalPairs : 0} pairs</span>
          </span>
        </div>

        <button
          type="submit"
          disabled={!isMounted || selectedModels.length === 0 || selectedPrompts.length === 0}
          className="h-8 px-5 rounded-[6px] bg-text text-canvas font-medium text-xs hover:bg-white transition-opacity disabled:opacity-50"
          suppressHydrationWarning
        >
          Run benchmark ({isMounted ? totalPairs : 0} pairs)
        </button>
      </div>
    </form>
  );
}
