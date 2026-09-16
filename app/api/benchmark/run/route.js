import { NextResponse } from "next/server";
import { isApiKeyConfigured } from "@/lib/nim-client";
import { runBenchmarkBatch } from "@/lib/benchmark/engine";
import { DEFAULT_PROMPT_SUITE } from "@/lib/benchmark/default-suite";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  if (!isApiKeyConfigured()) {
    return NextResponse.json(
      {
        error: {
          code: "unauthorized",
          message: "NVIDIA_API_KEY is not configured. Configure it in .env.local or Settings.",
        },
      },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const {
    runId = `run_${Date.now()}`,
    modelIds = [],
    prompts = DEFAULT_PROMPT_SUITE.prompts,
    cursor = null,
    timeBudgetMs = 45_000,
    concurrency = 4,
    maxTokens = 128,
  } = body;

  if (!Array.isArray(modelIds) || modelIds.length === 0) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "modelIds array is required" } },
      { status: 400 }
    );
  }

  try {
    const batchResult = await runBenchmarkBatch({
      modelIds,
      prompts,
      cursor,
      timeBudgetMs,
      concurrency,
      maxTokens,
    });

    return NextResponse.json({
      runId,
      results: batchResult.results || [],
      cursor: batchResult.cursor || null,
      status: batchResult.status || "complete",
    });
  } catch (err) {
    if (err?.isAuthError) {
      return NextResponse.json(
        {
          error: {
            code: "unauthorized",
            message: "NVIDIA API key invalid or rejected by NVIDIA API.",
          },
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "batch_failed",
          message: err?.message || "Batch benchmark execution failed",
        },
      },
      { status: 500 }
    );
  }
}
