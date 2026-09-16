"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CompareGrid from "@/components/compare/CompareGrid";

function CompareContent() {
  const searchParams = useSearchParams();
  const model1 = searchParams.get("model1");
  const model2 = searchParams.get("model2");

  const initialModels = [];
  if (model1) initialModels.push(model1);
  if (model2) initialModels.push(model2);

  return (
    <div className="space-y-4">
      <div className="border-b border-line pb-4">
        <h1 className="text-[26px] font-semibold tracking-tight text-text-main">
          Compare
        </h1>
        <p className="text-xs text-text-muted mt-0.5 max-w-[68ch]">
          Evaluate 2 to 4 models simultaneously on latency, token throughput, and word-by-word response differences.
        </p>
      </div>

      <CompareGrid initialModels={initialModels} />
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-text-muted">Loading Compare…</div>}>
      <CompareContent />
    </Suspense>
  );
}
