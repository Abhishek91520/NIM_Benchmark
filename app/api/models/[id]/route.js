import { NextResponse } from "next/server";
import { getModel, isApiKeyConfigured } from "@/lib/nim-client";
import { categorize } from "@/lib/model-categorizer";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  if (!isApiKeyConfigured()) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "NVIDIA_API_KEY is not configured." } },
      { status: 401 }
    );
  }

  // params may be a Promise in Next.js 15+
  const resolvedParams = await params;
  const modelId = decodeURIComponent(resolvedParams.id);

  try {
    const data = await getModel(modelId);
    return NextResponse.json({
      id: data.id,
      owned_by: data.owned_by,
      created: data.created,
      category: categorize(data.id),
      raw: data,
    });
  } catch (err) {
    const status = err?.status || 404;
    return NextResponse.json(
      { error: { code: "not_found", message: `Model ${modelId} not found or deprecated.` } },
      { status }
    );
  }
}
