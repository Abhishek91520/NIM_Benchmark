import { NextResponse } from "next/server";
import { chatCompletion, isApiKeyConfigured, getKeyPoolStatus } from "@/lib/nim-client";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({
    status: isApiKeyConfigured() ? "ok" : "unauthorized",
    configured: isApiKeyConfigured(),
    keyPool: getKeyPoolStatus(),
  });
}

const CONCURRENCY_LIMIT = 8;
const PROBE_TIMEOUT_MS = 10_000;

async function checkSingleModel(modelId) {
  const startTime = Date.now();
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Health check timed out (10s)")), PROBE_TIMEOUT_MS)
    );

    const callPromise = chatCompletion({
      model: modelId,
      messages: [{ role: "user", content: "Reply with OK." }],
      max_tokens: 5,
      temperature: 0.1,
      stream: false,
    });

    await Promise.race([callPromise, timeoutPromise]);
    const latencyMs = Date.now() - startTime;

    return {
      modelId,
      status: "operational",
      latencyMs,
      error: null,
      lastChecked: new Date().toISOString(),
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const statusVal = err?.status || err?.statusCode;
    const errMsg = err?.message || String(err);

    let status = "down";
    if (statusVal === 429) {
      status = "degraded";
    }

    return {
      modelId,
      status,
      latencyMs,
      error: errMsg,
      lastChecked: new Date().toISOString(),
    };
  }
}

// Bounded concurrency pool
async function mapWithConcurrency(items, limit, fn) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++;
      const res = await fn(items[currentIndex]);
      results[currentIndex] = res;
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function POST(request) {
  if (!isApiKeyConfigured()) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "NVIDIA_API_KEY is not configured." } },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const modelIds = Array.isArray(body.modelIds) ? body.modelIds : [];

    if (modelIds.length === 0) {
      return NextResponse.json({ results: {} });
    }

    const checkResults = await mapWithConcurrency(modelIds, CONCURRENCY_LIMIT, checkSingleModel);

    const resultsMap = {};
    for (const r of checkResults) {
      if (r?.modelId) {
        resultsMap[r.modelId] = {
          status: r.status,
          latencyMs: r.latencyMs,
          error: r.error,
          lastChecked: r.lastChecked,
        };
      }
    }

    return NextResponse.json({ results: resultsMap });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "internal_error", message: err?.message || "Health check failed" } },
      { status: 500 }
    );
  }
}
