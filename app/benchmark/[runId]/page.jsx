"use client";

import { useEffect, useState, useRef, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Zap, CheckCircle2, XCircle, Gauge, Activity } from "lucide-react";
import LiveProgress from "@/components/benchmark/LiveProgress";
import LeaderboardTable from "@/components/benchmark/LeaderboardTable";
import ScoreCharts from "@/components/benchmark/ScoreCharts";
import ExportButton from "@/components/shared/ExportButton";
import { storage } from "@/lib/storage";
import { computeLeaderboard } from "@/lib/benchmark/scoring";
import { useAppStore } from "@/store/useAppStore";

export default function BenchmarkRunPage({ params }) {
  const resolvedParams = use(params);
  const runId = resolvedParams.runId;

  const router = useRouter();
  const { scoringWeights } = useAppStore();

  const [run, setRun] = useState(null);
  const [activeTab, setActiveTab] = useState("leaderboard"); // 'leaderboard' | 'charts'
  const [isLooping, setIsLooping] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeModel, setActiveModel] = useState("");
  const [errorBanner, setErrorBanner] = useState(null);

  const timerRef = useRef(null);

  useEffect(() => {
    async function loadInitial() {
      const saved = await storage.get(`benchmark:run:${runId}`);
      if (saved) {
        setRun(saved);
        if (saved.status === "running" || saved.status === "partial") {
          startExecutionLoop(saved);
        }
      } else {
        setErrorBanner(`Benchmark run "${runId}" not found in local storage.`);
      }
    }
    loadInitial();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [runId]);

  useEffect(() => {
    if (run?.status === "running" || run?.status === "partial") {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [run?.status]);

  const startExecutionLoop = async (initialRun) => {
    if (isLooping) return;
    setIsLooping(true);

    let currentCursor = initialRun.cursor || null;
    let accumulatedResults = [...(initialRun.results || [])];
    let isComplete = false;

    const prompts = initialRun.promptSuite?.prompts || [];
    const modelIds = initialRun.modelIds || [];

    while (!isComplete) {
      const currentModelIndex = currentCursor?.modelIndex ?? currentCursor?.pairIndex ?? 0;
      if (currentModelIndex < modelIds.length) {
        setActiveModel(modelIds[currentModelIndex]);
      }

      try {
        const response = await fetch("/api/benchmark/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            runId: initialRun.id,
            modelIds,
            prompts,
            cursor: currentCursor,
            timeBudgetMs: initialRun.timeBudgetMs || 45_000,
            concurrency: initialRun.concurrency || 4,
            maxTokens: initialRun.maxTokens || 128,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `HTTP ${response.status}`);
        }

        const batchData = await response.json();
        const batchResults = batchData.results || [];

        // Grade subjective prompts using judge ONLY if judgeScoring is explicitly enabled
        if (initialRun.judgeScoring) {
          for (let i = 0; i < batchResults.length; i++) {
            const r = batchResults[i];
            const promptMeta = prompts.find((p) => p.id === r.promptId);
            if (promptMeta?.evalType === "judge" && r.success && r.qualityScore === null) {
              try {
                const judgeRes = await fetch("/api/judge", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    prompt: promptMeta.prompt,
                    response: r.response,
                    rubric: promptMeta.rubric,
                  }),
                });
                if (judgeRes.ok) {
                  const judgeJson = await judgeRes.json();
                  if (judgeJson.score !== null) {
                    r.qualityScore = Math.min(100, Math.max(0, judgeJson.score * 10));
                    r.judgeReasoning = judgeJson.reasoning;
                  }
                }
              } catch {
                // Ignore judge errors to avoid halting run
              }
            }
          }
        }

        accumulatedResults = [...accumulatedResults, ...batchResults];
        currentCursor = batchData.cursor;

        const updatedLeaderboard = computeLeaderboard(
          accumulatedResults,
          modelIds,
          scoringWeights
        );

        const updatedStatus = batchData.status === "complete" ? "complete" : "partial";
        if (batchData.status === "complete" || !currentCursor) {
          isComplete = true;
        }

        const updatedRun = {
          ...initialRun,
          cursor: currentCursor,
          results: accumulatedResults,
          leaderboard: updatedLeaderboard,
          status: updatedStatus,
          updatedAt: new Date().toISOString(),
        };

        setRun(updatedRun);
        await storage.set(`benchmark:run:${initialRun.id}`, updatedRun);

        if (isComplete) break;
      } catch (err) {
        console.error("Benchmark batch error:", err);
        setErrorBanner(`Batch notice: ${err.message}`);

        // Never wipe out accumulated results on batch failure!
        const updatedLeaderboard = computeLeaderboard(accumulatedResults, modelIds, scoringWeights);
        const finalRun = {
          ...initialRun,
          cursor: null,
          results: accumulatedResults,
          leaderboard: updatedLeaderboard,
          status: accumulatedResults.length > 0 ? "complete" : "failed",
        };
        setRun(finalRun);
        await storage.set(`benchmark:run:${initialRun.id}`, finalRun);
        break;
      }
    }

    setIsLooping(false);
  };

  const handleReRun = () => {
    if (!run) return;
    router.push(`/benchmark?preselect=${encodeURIComponent(run.modelIds.join(","))}`);
  };

  // KPI Calculations
  const stats = useMemo(() => {
    if (!run) return { workingCount: 0, failedCount: 0, peakTps: 0, avgTps: 0 };
    const results = run.results || [];
    const workingModels = new Set(results.filter((r) => r.success).map((r) => r.modelId));
    const testedModels = new Set(results.map((r) => r.modelId));
    const failedModelsCount = Array.from(testedModels).filter((id) => !workingModels.has(id)).length;

    const successfulResults = results.filter((r) => r.success && r.tokensPerSec > 0);
    const peakTps =
      successfulResults.length > 0
        ? Math.max(...successfulResults.map((r) => r.tokensPerSec))
        : 0;
    const avgTps =
      successfulResults.length > 0
        ? Math.round(
            (successfulResults.reduce((sum, r) => sum + r.tokensPerSec, 0) /
              successfulResults.length) *
              10
          ) / 10
        : 0;

    return {
      workingCount: workingModels.size,
      failedCount: failedModelsCount,
      peakTps: Math.round(peakTps * 10) / 10,
      avgTps,
    };
  }, [run]);

  if (!run && !errorBanner) {
    return (
      <div className="p-12 text-center text-xs text-text-muted">
        Loading benchmark run…
      </div>
    );
  }

  const totalPairs = (run?.modelIds?.length || 0) * (run?.promptSuite?.prompts?.length || 0);
  const completedPairs = run?.results?.length || 0;

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-text-main font-mono">
              {run?.name || runId}
            </h1>
            <span
              className="text-[11px] font-mono px-2 py-0.5 rounded-[4px] border border-line"
              style={{
                color:
                  run?.status === "complete"
                    ? "var(--sig-ok)"
                    : run?.status === "failed"
                    ? "var(--sig-fail)"
                    : "var(--sig-warn)",
              }}
            >
              {run?.status}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            {run?.modelIds?.length || 0} models evaluated across {run?.promptSuite?.prompts?.length || 0} prompt{run?.promptSuite?.prompts?.length > 1 ? "s" : ""} ({run?.promptSuite?.name || "Standard suite"})
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {run && <ExportButton run={run} />}

          <button
            type="button"
            onClick={handleReRun}
            className="h-8 px-3 rounded-[6px] border border-line text-xs text-text-main hover:bg-surface-raised transition-colors"
          >
            Re-run benchmark
          </button>

          <button
            type="button"
            onClick={() => router.push("/history")}
            className="h-8 px-3 rounded-[6px] text-xs text-text-muted hover:text-text-main transition-colors"
          >
            History
          </button>
        </div>
      </div>

      {/* Error alert */}
      {errorBanner && (
        <div className="p-3 rounded-[4px] bg-canvas border border-line space-y-1 font-mono text-xs" style={{ color: "var(--sig-fail)" }}>
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Execution notice</span>
          </div>
          <p className="text-text-muted">{errorBanner}</p>
        </div>
      )}

      {/* KPI Summary Cards: "What is working & what is tokens per sec" */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-[4px] border border-line bg-surface space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Working Models</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="font-mono text-xl font-bold text-emerald-400 tabular-nums">
            {stats.workingCount} <span className="text-xs font-normal text-text-faint font-sans">/ {run?.modelIds?.length || 0}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-[4px] border border-line bg-surface space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Failed Models</span>
            <XCircle className="h-3.5 w-3.5 text-rose-400" />
          </div>
          <div className="font-mono text-xl font-bold text-rose-400 tabular-nums">
            {stats.failedCount} <span className="text-xs font-normal text-text-faint font-sans">issues</span>
          </div>
        </div>

        <div className="p-3.5 rounded-[4px] border border-line bg-surface space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Peak Speed</span>
            <Zap className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="font-mono text-xl font-bold text-amber-400 tabular-nums">
            {stats.peakTps} <span className="text-xs font-normal text-text-faint font-mono">tok/s</span>
          </div>
        </div>

        <div className="p-3.5 rounded-[4px] border border-line bg-surface space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Avg Speed</span>
            <Gauge className="h-3.5 w-3.5 text-text-muted" />
          </div>
          <div className="font-mono text-xl font-bold text-text-main tabular-nums">
            {stats.avgTps} <span className="text-xs font-normal text-text-faint font-mono">tok/s</span>
          </div>
        </div>
      </div>

      {/* Live Progress Bar with real-time tally and key rotation indicator */}
      <LiveProgress
        completedCount={completedPairs}
        totalCount={totalPairs}
        status={run?.status || "running"}
        currentModelId={activeModel}
        elapsedSeconds={elapsedSeconds}
        workingCount={stats.workingCount}
        failedCount={stats.failedCount}
      />

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-line pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("leaderboard")}
          className={`h-7 px-3 rounded-[4px] text-xs transition-colors ${
            activeTab === "leaderboard"
              ? "bg-text-main text-canvas font-medium"
              : "text-text-muted hover:text-text-main bg-surface border border-line"
          }`}
        >
          Leaderboard & Speed
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("charts")}
          className={`h-7 px-3 rounded-[4px] text-xs transition-colors ${
            activeTab === "charts"
              ? "bg-text-main text-canvas font-medium"
              : "text-text-muted hover:text-text-main bg-surface border border-line"
          }`}
        >
          Charts & Analysis
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "leaderboard" ? (
        <LeaderboardTable
          leaderboard={run?.leaderboard || []}
          results={run?.results || []}
          prompts={run?.promptSuite?.prompts || []}
        />
      ) : (
        <ScoreCharts
          leaderboard={run?.leaderboard || []}
          results={run?.results || []}
        />
      )}
    </div>
  );
}
