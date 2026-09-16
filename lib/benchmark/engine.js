import {
  DEFAULT_CONCURRENCY,
  MAX_CONCURRENT_MODELS,
  PER_REQUEST_TIMEOUT_MS,
  MAX_RETRIES,
  BASE_BACKOFF_MS,
  TIME_BUDGET_MS,
  DEFAULT_SPEED_MAX_TOKENS,
} from "./config";
import { getNimClient, getNextApiKey, markKeyRateLimited, isApiKeyConfigured, getAllApiKeys } from "@/lib/nim-client";
import { evaluateSingleResponse } from "./scoring";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute one model on one prompt with retry, API key rotation, and TTFB measurement.
 * GUARANTEE: Never throws a fatal error that crashes the batch. Always returns a result object.
 */
export async function executePairWithRetry({
  modelId,
  promptItem,
  maxTokens = DEFAULT_SPEED_MAX_TOKENS,
  timeoutMs = PER_REQUEST_TIMEOUT_MS,
}) {
  const keys = getAllApiKeys();
  const maxAttempts = Math.max(MAX_RETRIES + 1, keys.length > 1 ? 2 : 1);
  let attempt = 0;
  let lastError = null;
  const startTime = Date.now();

  while (attempt < maxAttempts) {
    let firstTokenTime = null;
    const currentKey = getNextApiKey();

    try {
      const client = getNimClient({ apiKey: currentKey, timeout: timeoutMs });

      // Streaming call to capture exact TTFB and accurate tokens/sec
      const streamPromise = client.chat.completions.create({
        model: modelId,
        messages: [{ role: "user", content: promptItem.prompt }],
        temperature: 0.2,
        max_tokens: maxTokens,
        stream: true,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timeout exceeding ${timeoutMs}ms`)),
          timeoutMs
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

      const totalLatencyMs = Math.max(1, Date.now() - startTime);
      const ttfbMs = firstTokenTime ? firstTokenTime - startTime : totalLatencyMs;
      // Approximate token count: ~4 characters per token in English, min 1
      const approxTokens = Math.max(1, Math.ceil(fullText.length / 4));
      const tokensPerSec =
        totalLatencyMs > 0 ? (approxTokens / (totalLatencyMs / 1000)) : 0;

      // Deterministic initial scoring (keyword, json-valid, none)
      const initialEval = evaluateSingleResponse({
        evalType: promptItem.evalType || "none",
        response: fullText,
        expectedKeywords: promptItem.expectedKeywords,
        expectedSchemaKeys: promptItem.expectedSchemaKeys,
      });

      return {
        modelId,
        promptId: promptItem.id,
        category: promptItem.category || "chat",
        ttfbMs: Math.round(ttfbMs),
        totalLatencyMs: Math.round(totalLatencyMs),
        tokensPerSec: Math.round(tokensPerSec * 10) / 10,
        approxTokens,
        success: true,
        errorCode: null,
        response: fullText,
        qualityScore: initialEval.qualityScore,
        judgeReasoning: initialEval.reasoning,
        apiKeyUsed: currentKey ? `${currentKey.slice(0, 8)}...` : undefined,
      };
    } catch (err) {
      lastError = err;
      const status = err?.status || err?.statusCode || 500;
      const msg = err?.message || String(err);

      // 429 Rate Limit -> cooldown this key and rotate to another key
      if (status === 429) {
        markKeyRateLimited(currentKey, 15_000);
        attempt++;
        if (attempt < maxAttempts) {
          await sleep(BASE_BACKOFF_MS);
          continue; // Retry with next rotated key
        }
      }

      // 401 Unauthorized / 403 Forbidden -> Key lacks model permission or model is restricted
      // DO NOT THROW! Treat as clean failure for this specific model.
      if (status === 401 || status === 403) {
        return {
          modelId,
          promptId: promptItem.id,
          category: promptItem.category || "chat",
          ttfbMs: 0,
          totalLatencyMs: Date.now() - startTime,
          tokensPerSec: 0,
          approxTokens: 0,
          success: false,
          errorCode: "unauthorized",
          response: "",
          qualityScore: 0,
          judgeReasoning: `Restricted model access (${status}): ${msg}`,
          isModelUnavailable: true,
        };
      }

      // 404 Not Found / Unknown model
      if (status === 404 || (status === 400 && /not found|unknown model|deprecated/i.test(msg))) {
        return {
          modelId,
          promptId: promptItem.id,
          category: promptItem.category || "chat",
          ttfbMs: 0,
          totalLatencyMs: Date.now() - startTime,
          tokensPerSec: 0,
          approxTokens: 0,
          success: false,
          errorCode: "not_found",
          response: "",
          qualityScore: 0,
          judgeReasoning: `Model not available on NIM (${status}): ${msg}`,
          isModelUnavailable: true,
        };
      }

      // 400 Bad Request (e.g. model not a chat model, invalid prompt structure)
      if (status === 400) {
        return {
          modelId,
          promptId: promptItem.id,
          category: promptItem.category || "chat",
          ttfbMs: 0,
          totalLatencyMs: Date.now() - startTime,
          tokensPerSec: 0,
          approxTokens: 0,
          success: false,
          errorCode: "invalid_model",
          response: "",
          qualityScore: 0,
          judgeReasoning: `Incompatible model endpoint (${status}): ${msg}`,
          isModelUnavailable: true,
        };
      }

      // Timeout or 5xx error
      if (/timeout/i.test(msg) || status >= 500) {
        attempt++;
        if (attempt < maxAttempts) {
          await sleep(BASE_BACKOFF_MS * attempt);
          continue;
        }
      }

      // Non-retryable or max attempts exhausted
      const isTimeout = /timeout/i.test(msg);
      const errorCode = status === 429 ? "rate_limited" : isTimeout ? "timeout" : "error";

      return {
        modelId,
        promptId: promptItem.id,
        category: promptItem.category || "chat",
        ttfbMs: 0,
        totalLatencyMs: Date.now() - startTime,
        tokensPerSec: 0,
        approxTokens: 0,
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
    category: promptItem.category || "chat",
    ttfbMs: 0,
    totalLatencyMs: Date.now() - startTime,
    tokensPerSec: 0,
    approxTokens: 0,
    success: false,
    errorCode: "error",
    response: "",
    qualityScore: 0,
    judgeReasoning: lastError?.message || "Execution failed",
  };
}

/**
 * Run a time-budgeted batch across model×prompt matrix using bounded parallel concurrency.
 * Distributes requests across the 3 rotating API keys for maximum speed.
 */
export async function runBenchmarkBatch({
  modelIds = [],
  prompts = [],
  cursor = null,
  timeBudgetMs = TIME_BUDGET_MS,
  concurrency = DEFAULT_CONCURRENCY,
  maxTokens = DEFAULT_SPEED_MAX_TOKENS,
  timeoutMs = PER_REQUEST_TIMEOUT_MS,
}) {
  const batchStartTime = Date.now();
  const results = [];
  const unavailableModels = new Set();

  // Generate flat list of remaining (model, prompt) pairs starting from cursor
  const startIndex = cursor?.pairIndex ?? 0;
  const allPairs = [];

  for (let m = 0; m < modelIds.length; m++) {
    for (let p = 0; p < prompts.length; p++) {
      allPairs.push({
        modelIndex: m,
        promptIndex: p,
        modelId: modelIds[m],
        promptItem: prompts[p],
      });
    }
  }

  const remainingPairs = allPairs.slice(startIndex);
  const boundedConcurrency = Math.max(1, Math.min(concurrency, MAX_CONCURRENT_MODELS, remainingPairs.length));

  let currentPairOffset = 0;
  let hasHitTimeBudget = false;

  async function worker() {
    while (currentPairOffset < remainingPairs.length) {
      if (Date.now() - batchStartTime > timeBudgetMs && results.length > 0) {
        hasHitTimeBudget = true;
        break;
      }

      const currentIndex = currentPairOffset++;
      const pair = remainingPairs[currentIndex];

      if (!pair) break;

      // Skip if this model was already determined to be unavailable in this batch
      if (unavailableModels.has(pair.modelId)) {
        results.push({
          modelId: pair.modelId,
          promptId: pair.promptItem.id,
          category: pair.promptItem.category || "chat",
          ttfbMs: 0,
          totalLatencyMs: 0,
          tokensPerSec: 0,
          approxTokens: 0,
          success: false,
          errorCode: "unavailable",
          response: "",
          qualityScore: 0,
          judgeReasoning: "Skipped: model unavailable on previous prompt",
        });
        continue;
      }

      try {
        const pairResult = await executePairWithRetry({
          modelId: pair.modelId,
          promptItem: pair.promptItem,
          maxTokens,
          timeoutMs,
        });

        results.push(pairResult);

        if (pairResult.isModelUnavailable) {
          unavailableModels.add(pair.modelId);
        }
      } catch (err) {
        // Absolute safety catch: isolate error per pair
        results.push({
          modelId: pair.modelId,
          promptId: pair.promptItem.id,
          category: pair.promptItem.category || "chat",
          ttfbMs: 0,
          totalLatencyMs: 0,
          tokensPerSec: 0,
          approxTokens: 0,
          success: false,
          errorCode: "error",
          response: "",
          qualityScore: 0,
          judgeReasoning: err?.message || "Execution exception",
        });
      }
    }
  }

  const workers = Array.from({ length: boundedConcurrency }, () => worker());
  await Promise.all(workers);

  const processedCount = results.length;
  const nextPairIndex = startIndex + processedCount;
  const isComplete = nextPairIndex >= allPairs.length;

  return {
    results,
    cursor: isComplete ? null : { pairIndex: nextPairIndex },
    status: isComplete ? "complete" : "partial",
  };
}
