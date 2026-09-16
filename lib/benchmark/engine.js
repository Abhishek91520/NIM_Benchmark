import {
  MAX_CONCURRENT_MODELS,
  PER_REQUEST_TIMEOUT_MS,
  MAX_RETRIES,
  BASE_BACKOFF_MS,
  TIME_BUDGET_MS,
} from "./config";
import { getNimClient, isApiKeyConfigured, chatCompletion } from "@/lib/nim-client";
import { evaluateSingleResponse } from "./scoring";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute one model on one prompt with retry, backoff, and TTFB measurement
 */
export async function executePairWithRetry({ modelId, promptItem }) {
  let attempt = 0;
  let lastError = null;

  while (attempt <= MAX_RETRIES) {
    const startTime = Date.now();
    let firstTokenTime = null;

    try {
      const client = getNimClient();

      // Streaming call so we can record exact TTFB
      const streamPromise = client.chat.completions.create({
        model: modelId,
        messages: [{ role: "user", content: promptItem.prompt }],
        temperature: 0.2,
        max_tokens: 1024,
        stream: true,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timeout exceeding ${PER_REQUEST_TIMEOUT_MS}ms`)),
          PER_REQUEST_TIMEOUT_MS
        )
      );

      const upstream = await Promise.race([streamPromise, timeoutPromise]);

      let fullText = "";
      for await (const chunk of upstream) {
        if (!firstTokenTime) {
          firstTokenTime = Date.now();
        }
        const deltaContent = chunk.choices?.[0]?.delta?.content;
        const deltaReasoning =
          chunk.choices?.[0]?.delta?.reasoning_content ||
          chunk.choices?.[0]?.delta?.reasoning;
        const delta = deltaContent || deltaReasoning || "";
        fullText += delta;
      }

      const totalLatencyMs = Date.now() - startTime;
      const ttfbMs = firstTokenTime ? firstTokenTime - startTime : totalLatencyMs;
      const approxTokens = Math.max(1, Math.ceil(fullText.length / 4));
      const tokensPerSec =
        totalLatencyMs > 0 ? approxTokens / (totalLatencyMs / 1000) : 0;

      // Deterministic initial scoring (keyword, json-valid, none)
      const initialEval = evaluateSingleResponse({
        evalType: promptItem.evalType,
        response: fullText,
        expectedKeywords: promptItem.expectedKeywords,
        expectedSchemaKeys: promptItem.expectedSchemaKeys,
      });

      return {
        modelId,
        promptId: promptItem.id,
        category: promptItem.category,
        ttfbMs,
        totalLatencyMs,
        tokensPerSec: Math.round(tokensPerSec * 10) / 10,
        success: true,
        errorCode: null,
        response: fullText,
        qualityScore: initialEval.qualityScore,
        judgeReasoning: initialEval.reasoning,
      };
    } catch (err) {
      lastError = err;
      const status = err?.status || err?.statusCode || 500;
      const msg = err?.message || "";

      // 401 -> fatal, do not retry
      if (status === 401 || !isApiKeyConfigured()) {
        const authErr = new Error("API key invalid or missing");
        authErr.isAuthError = true;
        throw authErr;
      }

      // 404 or 400 unknown model -> non-retryable model error
      if (status === 404 || (status === 400 && /unknown model|not found|deprecated/i.test(msg))) {
        return {
          modelId,
          promptId: promptItem.id,
          category: promptItem.category,
          ttfbMs: 0,
          totalLatencyMs: Date.now() - startTime,
          tokensPerSec: 0,
          success: false,
          errorCode: "unavailable",
          response: "",
          qualityScore: 0,
          judgeReasoning: `Model unavailable: ${msg}`,
          isModelUnavailable: true,
        };
      }

      // 429 Rate Limit or 5xx -> Exponential backoff and retry
      if (status === 429 || status >= 500 || /timeout/i.test(msg)) {
        attempt++;
        if (attempt <= MAX_RETRIES) {
          const retryAfterSec = err?.headers?.["retry-after"]
            ? parseInt(err.headers["retry-after"], 10)
            : null;
          const backoff = retryAfterSec
            ? retryAfterSec * 1000
            : BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
          await sleep(backoff);
          continue;
        }
      }

      // Max retries reached or other non-retryable error
      const errorCode =
        status === 429
          ? "rate_limited"
          : /timeout/i.test(msg)
          ? "timeout"
          : "error";

      return {
        modelId,
        promptId: promptItem.id,
        category: promptItem.category,
        ttfbMs: 0,
        totalLatencyMs: Date.now() - startTime,
        tokensPerSec: 0,
        success: false,
        errorCode,
        response: "",
        qualityScore: 0,
        judgeReasoning: `Failed (${errorCode}): ${msg}`,
      };
    }
  }

  return {
    modelId,
    promptId: promptItem.id,
    category: promptItem.category,
    ttfbMs: 0,
    totalLatencyMs: 0,
    tokensPerSec: 0,
    success: false,
    errorCode: "error",
    response: "",
    qualityScore: 0,
    judgeReasoning: lastError?.message || "Execution failed",
  };
}

/**
 * Run a time-budgeted batch across model×prompt matrix
 */
export async function runBenchmarkBatch({
  modelIds = [],
  prompts = [],
  cursor = null,
  timeBudgetMs = TIME_BUDGET_MS,
}) {
  const batchStartTime = Date.now();
  const results = [];
  const unavailableModels = new Set();

  let mIdx = cursor?.modelIndex ?? 0;
  let pIdx = cursor?.promptIndex ?? 0;

  while (mIdx < modelIds.length) {
    const currentModelId = modelIds[mIdx];

    // If model was flagged as unavailable, skip all its remaining prompts
    if (unavailableModels.has(currentModelId)) {
      mIdx++;
      pIdx = 0;
      continue;
    }

    while (pIdx < prompts.length) {
      // Check if time budget exceeded for this serverless invocation
      if (Date.now() - batchStartTime > timeBudgetMs && results.length > 0) {
        return {
          results,
          cursor: { modelIndex: mIdx, promptIndex: pIdx },
          status: "partial",
        };
      }

      const promptItem = prompts[pIdx];

      try {
        const pairResult = await executePairWithRetry({
          modelId: currentModelId,
          promptItem,
        });

        results.push(pairResult);

        if (pairResult.isModelUnavailable) {
          unavailableModels.add(currentModelId);
          pIdx = 0;
          mIdx++;
          break;
        }
      } catch (err) {
        if (err.isAuthError) {
          throw err;
        }
        // Isolate error per pair
        results.push({
          modelId: currentModelId,
          promptId: promptItem.id,
          category: promptItem.category,
          ttfbMs: 0,
          totalLatencyMs: 0,
          tokensPerSec: 0,
          success: false,
          errorCode: "error",
          response: "",
          qualityScore: 0,
          judgeReasoning: err.message,
        });
      }

      pIdx++;
    }

    if (pIdx >= prompts.length) {
      pIdx = 0;
      mIdx++;
    }
  }

  return {
    results,
    cursor: null,
    status: "complete",
  };
}
