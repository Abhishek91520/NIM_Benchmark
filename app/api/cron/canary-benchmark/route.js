import { NextResponse } from "next/server";
import { chatCompletion, isApiKeyConfigured } from "@/lib/nim-client";

export const runtime = "nodejs";
export const maxDuration = 60;

const CANARY_MODELS = [
  "meta/llama-3.2-11b-vision-instruct",
  "openai/gpt-oss-20b",
];

export async function GET(request) {
  if (!isApiKeyConfigured()) {
    return NextResponse.json(
      { status: "skipped", message: "NVIDIA_API_KEY not configured" },
      { status: 200 }
    );
  }

  const results = {};
  for (const modelId of CANARY_MODELS) {
    const start = Date.now();
    try {
      await chatCompletion({
        model: modelId,
        messages: [{ role: "user", content: "OK" }],
        max_tokens: 5,
        stream: false,
      });
      results[modelId] = { status: "operational", latencyMs: Date.now() - start };
    } catch (err) {
      results[modelId] = { status: "degraded", error: err.message, latencyMs: Date.now() - start };
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    canaryResults: results,
  });
}
