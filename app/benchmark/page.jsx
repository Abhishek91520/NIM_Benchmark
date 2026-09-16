"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import RunConfigForm from "@/components/benchmark/RunConfigForm";
import { storage } from "@/lib/storage";

function BenchmarkConfigContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectRaw = searchParams.get("preselect");
  const preselectedModelIds = preselectRaw ? preselectRaw.split(",") : [];

  const { data } = useQuery({
    queryKey: ["models"],
    queryFn: async () => {
      const res = await fetch("/api/models");
      if (!res.ok) throw new Error("Failed to load models");
      return res.json();
    },
  });

  const availableModels = data?.models || [];

  const handleLaunch = async (config) => {
    const runId = `run_${Date.now()}`;
    const initialRun = {
      id: runId,
      name: `Benchmark run (${config.modelIds.length} models)`,
      createdAt: new Date().toISOString(),
      status: "running",
      promptSuiteId: config.promptSuite.id,
      promptSuite: config.promptSuite,
      modelIds: config.modelIds,
      cursor: null,
      results: [],
      leaderboard: [],
      judgeScoring: config.judgeScoring ?? false,
      timeBudgetMs: config.timeBudgetMs || 45_000,
      concurrency: config.concurrency || 4,
      maxTokens: config.maxTokens || 128,
      timeoutMs: config.timeoutMs || 15_000,
    };

    await storage.set(`benchmark:run:${runId}`, initialRun);
    router.push(`/benchmark/${runId}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-text-main">
            Benchmark
          </h1>
          <p className="text-xs text-text-muted mt-0.5 max-w-[68ch]">
            Configure and launch multi-model automated benchmarks across standard test suites.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/history")}
          className="h-8 px-3 rounded-[6px] border border-line text-xs text-text-main hover:bg-surface-raised transition-colors"
        >
          View past runs
        </button>
      </div>

      <RunConfigForm
        availableModels={availableModels}
        preselectedModelIds={preselectedModelIds}
        onLaunch={handleLaunch}
      />
    </div>
  );
}

export default function BenchmarkPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-text-muted">Loading Benchmark…</div>}>
      <BenchmarkConfigContent />
    </Suspense>
  );
}
