import { NextResponse } from "next/server";
import { listModels, isApiKeyConfigured } from "@/lib/nim-client";
import { categorize } from "@/lib/model-categorizer";

export const runtime = "nodejs";

// In-memory 5-minute cache
let cachedModels = null;
let cacheTimestamp = 0;
let knownModelIds = new Set();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("refresh") === "true";

  if (!isApiKeyConfigured()) {
    return NextResponse.json(
      {
        error: {
          code: "unauthorized",
          message: "NVIDIA_API_KEY is not configured. Add it to .env.local to access NVIDIA NIM models.",
        },
        models: [],
      },
      { status: 401 }
    );
  }

  const now = Date.now();
  if (!forceRefresh && cachedModels && now - cacheTimestamp < CACHE_TTL_MS) {
    return NextResponse.json({
      models: cachedModels,
      cached: true,
      timestamp: cacheTimestamp,
    });
  }

  try {
    const rawList = await listModels();

    const isFirstLoad = knownModelIds.size === 0;

    const enriched = rawList.map((m) => {
      const id = m.id;
      const isNew = !isFirstLoad && !knownModelIds.has(id);
      knownModelIds.add(id);

      const parts = id.split("/");
      const ownedBy = m.owned_by || (parts.length > 1 ? parts[0] : "nvidia");

      return {
        id,
        owned_by: ownedBy,
        created: m.created || Math.floor(Date.now() / 1000),
        category: categorize(id),
        status: "unknown",
        lastChecked: null,
        avgLatencyMs: null,
        isNew,
      };
    });

    cachedModels = enriched;
    cacheTimestamp = now;

    return NextResponse.json({
      models: enriched,
      cached: false,
      timestamp: cacheTimestamp,
    });
  } catch (err) {
    const status = err?.status || (err?.message?.includes("401") ? 401 : 500);
    return NextResponse.json(
      {
        error: {
          code: status === 401 ? "unauthorized" : "unknown",
          message: err?.message || "Failed to fetch models from NVIDIA NIM catalog",
        },
        models: cachedModels || [],
      },
      { status: status === 401 ? 401 : 500 }
    );
  }
}
