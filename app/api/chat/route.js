import { NextResponse } from "next/server";
import { getNimClient, isApiKeyConfigured } from "@/lib/nim-client";

export const runtime = "nodejs";
export const maxDuration = 60;

function classifyError(err) {
  const status = err?.status || err?.statusCode || 500;
  const message = err?.message || "An error occurred with NVIDIA NIM API";
  const retryAfter = err?.headers?.["retry-after"]
    ? parseInt(err.headers["retry-after"], 10) * 1000
    : 3000;

  if (status === 401 || !isApiKeyConfigured()) {
    return {
      status: 401,
      code: "unauthorized",
      message: "NVIDIA_API_KEY is missing or invalid. Check your environment settings.",
    };
  }

  if (status === 429) {
    return {
      status: 429,
      code: "rate_limited",
      message: "Rate limit reached for this NVIDIA NIM model. Please wait a moment.",
      retryAfterMs: retryAfter,
    };
  }

  if (status === 404 || (status === 400 && /not found|unknown model|deprecated/i.test(message))) {
    return {
      status: 404,
      code: "model_unavailable",
      message: `Model is unavailable or deprecated by NVIDIA: ${message}`,
    };
  }

  if (status === 408 || status === 504 || /timeout/i.test(message)) {
    return {
      status: 504,
      code: "timeout",
      message: "Request timed out waiting for response from model.",
    };
  }

  return {
    status,
    code: "unknown",
    message,
  };
}

export async function POST(request) {
  if (!isApiKeyConfigured()) {
    return NextResponse.json(
      {
        error: {
          code: "unauthorized",
          message: "NVIDIA_API_KEY is missing or invalid. Please configure it in .env.local or Settings.",
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
      { error: { code: "bad_request", message: "Invalid JSON in request body" } },
      { status: 400 }
    );
  }

  const {
    modelId,
    messages = [],
    params = {},
    stream = true,
    tools = undefined,
    tool_choice = undefined,
  } = body;

  if (!modelId) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "modelId is required" } },
      { status: 400 }
    );
  }

  const client = getNimClient();

  const completionPayload = {
    model: modelId,
    messages,
    temperature: typeof params.temperature === "number" ? params.temperature : 0.7,
    top_p: typeof params.top_p === "number" ? params.top_p : 1.0,
    max_tokens: typeof params.max_tokens === "number" ? params.max_tokens : 1024,
    frequency_penalty: typeof params.frequency_penalty === "number" ? params.frequency_penalty : 0,
    presence_penalty: typeof params.presence_penalty === "number" ? params.presence_penalty : 0,
    stream: Boolean(stream),
  };

  if (tools && Array.isArray(tools) && tools.length > 0) {
    completionPayload.tools = tools;
    if (tool_choice) completionPayload.tool_choice = tool_choice;
  }

  // Handle streaming
  if (stream) {
    try {
      const upstream = await client.chat.completions.create(completionPayload);

      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of upstream) {
              const deltaContent = chunk.choices?.[0]?.delta?.content;
              const deltaReasoning =
                chunk.choices?.[0]?.delta?.reasoning_content ||
                chunk.choices?.[0]?.delta?.reasoning;
              const delta = deltaContent || deltaReasoning || "";
              const toolCalls = chunk.choices?.[0]?.delta?.tool_calls;
              const usage = chunk.usage;
              if (delta || toolCalls || usage) {
                const data = JSON.stringify({
                  content: delta,
                  tool_calls: toolCalls,
                  usage,
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (err) {
            const errInfo = classifyError(err);
            const data = JSON.stringify({ error: errInfo });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    } catch (err) {
      const errInfo = classifyError(err);
      return NextResponse.json({ error: errInfo }, { status: errInfo.status });
    }
  }

  // Non-streaming
  try {
    const res = await client.chat.completions.create({
      ...completionPayload,
      stream: false,
    });
    return NextResponse.json({
      message: res.choices?.[0]?.message || { role: "assistant", content: "" },
      usage: res.usage,
      created: res.created,
    });
  } catch (err) {
    // If it's a legacy completion fallback
    if (err?.status === 400 && /not a chat|use \/completions/i.test(err?.message || "")) {
      try {
        const prompt = messages.map((m) => `${m.role}: ${m.content}`).join("\n\n");
        const legacyRes = await client.completions.create({
          model: modelId,
          prompt,
          temperature: completionPayload.temperature,
          max_tokens: completionPayload.max_tokens,
        });
        return NextResponse.json({
          message: {
            role: "assistant",
            content: legacyRes.choices?.[0]?.text || "",
          },
          usage: legacyRes.usage,
        });
      } catch (legacyErr) {
        const errInfo = classifyError(legacyErr);
        return NextResponse.json({ error: errInfo }, { status: errInfo.status });
      }
    }

    const errInfo = classifyError(err);
    return NextResponse.json({ error: errInfo }, { status: errInfo.status });
  }
}
