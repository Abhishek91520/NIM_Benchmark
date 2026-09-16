import { NextResponse } from "next/server";
import { createEmbedding, isApiKeyConfigured } from "@/lib/nim-client";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  if (!isApiKeyConfigured()) {
    return NextResponse.json(
      {
        error: {
          code: "unauthorized",
          message: "NVIDIA_API_KEY is not configured.",
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

  const { modelId, input } = body;

  if (!modelId || !input) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "modelId and input are required" } },
      { status: 400 }
    );
  }

  try {
    const startTime = Date.now();
    const result = await createEmbedding({
      model: modelId,
      input: Array.isArray(input) ? input : [input],
    });
    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      data: result.data || [],
      model: modelId,
      usage: result.usage,
      latencyMs,
    });
  } catch (err) {
    const status = err?.status || 500;
    return NextResponse.json(
      {
        error: {
          code: status === 401 ? "unauthorized" : "embedding_failed",
          message: err?.message || "Failed to generate embeddings",
        },
      },
      { status }
    );
  }
}
