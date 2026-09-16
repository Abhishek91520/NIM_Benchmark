import OpenAI from "openai";

const BASE_URL = "https://integrate.api.nvidia.com/v1";

// In-memory key pool state
let rotationCounter = 0;
const keyCooldowns = new Map(); // key -> timestamp ms when cooldown ends

/**
 * Collect all valid NVIDIA API keys configured in environment variables.
 * Supports:
 * - NVIDIA_API_KEYS (comma, newline, or space separated)
 * - NVIDIA_API_KEY (single or comma-separated)
 * - NVIDIA_API_KEY_1, NVIDIA_API_KEY_2, NVIDIA_API_KEY_3, etc.
 */
export function getAllApiKeys() {
  const rawKeys = [];

  if (process.env.NVIDIA_API_KEYS) {
    rawKeys.push(...process.env.NVIDIA_API_KEYS.split(/[,\n; ]+/));
  }

  if (process.env.NVIDIA_API_KEY) {
    rawKeys.push(...process.env.NVIDIA_API_KEY.split(/[,\n;]+/));
  }

  for (let i = 1; i <= 10; i++) {
    const k = process.env[`NVIDIA_API_KEY_${i}`];
    if (k) rawKeys.push(k);
  }

  const validKeys = Array.from(
    new Set(
      rawKeys
        .map((k) => (k || "").trim())
        .filter((k) => k.length > 5 && !k.includes("xxxxxxxx"))
    )
  );

  return validKeys;
}

export function isApiKeyConfigured() {
  return getAllApiKeys().length > 0;
}

/**
 * Returns summary of the key pool for UI and health diagnostics
 */
export function getKeyPoolStatus() {
  const keys = getAllApiKeys();
  const now = Date.now();

  return {
    totalKeys: keys.length,
    keys: keys.map((key, index) => {
      const cooldownUntil = keyCooldowns.get(key) || 0;
      const isRateLimited = cooldownUntil > now;
      const masked =
        key.length > 14
          ? `${key.slice(0, 8)}...${key.slice(-4)}`
          : "nvapi-***";
      return {
        index,
        keyNumber: index + 1,
        masked,
        isRateLimited,
        cooldownRemainingSec: isRateLimited ? Math.ceil((cooldownUntil - now) / 1000) : 0,
      };
    }),
  };
}

/**
 * Pick the next available key using round-robin rotation, prioritizing non-rate-limited keys
 */
export function getNextApiKey() {
  const keys = getAllApiKeys();
  if (keys.length === 0) return "missing-nvidia-api-key";
  if (keys.length === 1) return keys[0];

  const now = Date.now();

  // Try to find a key that is not in cooldown
  for (let i = 0; i < keys.length; i++) {
    const idx = (rotationCounter + i) % keys.length;
    const candidate = keys[idx];
    const cooldown = keyCooldowns.get(candidate) || 0;
    if (cooldown <= now) {
      rotationCounter = (idx + 1) % keys.length;
      return candidate;
    }
  }

  // If all are cooling down, just pick the round-robin key
  const chosen = keys[rotationCounter % keys.length];
  rotationCounter = (rotationCounter + 1) % keys.length;
  return chosen;
}

/**
 * Mark a key as rate-limited for a duration
 */
export function markKeyRateLimited(apiKey, cooldownMs = 15_000) {
  if (apiKey && apiKey !== "missing-nvidia-api-key") {
    keyCooldowns.set(apiKey, Date.now() + cooldownMs);
  }
}

/**
 * Get an OpenAI client instance with rotating or specified API key
 */
export function getNimClient(options = {}) {
  const apiKey =
    options.apiKey ||
    (options.keyIndex !== undefined && getAllApiKeys()[options.keyIndex]) ||
    getNextApiKey();

  return new OpenAI({
    apiKey,
    baseURL: BASE_URL,
    timeout: options.timeout || 30_000,
  });
}

/**
 * Execute an API operation with automatic key rotation and failover
 */
export async function executeWithKeyRotation(operationFn, maxAttempts = null) {
  const keys = getAllApiKeys();
  const attemptsLimit = maxAttempts ?? Math.max(1, keys.length);
  let lastErr = null;

  for (let attempt = 0; attempt < attemptsLimit; attempt++) {
    const currentKey = getNextApiKey();
    const client = getNimClient({ apiKey: currentKey });

    try {
      return await operationFn(client, currentKey);
    } catch (err) {
      lastErr = err;
      const status = err?.status || err?.statusCode;

      // 429 Rate Limit -> cooldown this key and try the next key immediately
      if (status === 429) {
        const retryAfterSec = err?.headers?.["retry-after"]
          ? parseInt(err.headers["retry-after"], 10)
          : 15;
        markKeyRateLimited(currentKey, retryAfterSec * 1000);

        if (keys.length > 1 && attempt < attemptsLimit - 1) {
          continue; // Try next key
        }
      }

      throw err;
    }
  }

  throw lastErr;
}

/**
 * List all models available to the API key
 */
export async function listModels() {
  if (!isApiKeyConfigured()) {
    throw new Error("NVIDIA_API_KEY is not configured or is invalid.");
  }
  const client = getNimClient();
  const response = await client.models.list();
  return response?.data || [];
}

/**
 * Get details for a single model
 */
export async function getModel(modelId) {
  if (!isApiKeyConfigured()) {
    throw new Error("NVIDIA_API_KEY is not configured.");
  }
  const client = getNimClient();
  return await client.models.retrieve(modelId);
}

/**
 * Run chat completion (handles fallback to legacy completion if needed)
 */
export async function chatCompletion({
  model,
  messages,
  temperature = 0.7,
  top_p = 1.0,
  max_tokens = 1024,
  frequency_penalty = 0,
  presence_penalty = 0,
  stream = false,
  tools = undefined,
  tool_choice = undefined,
}) {
  if (!isApiKeyConfigured()) {
    throw new Error("NVIDIA_API_KEY is not configured.");
  }
  const client = getNimClient();

  const payload = {
    model,
    messages,
    temperature: Number(temperature),
    top_p: Number(top_p),
    max_tokens: Number(max_tokens),
    frequency_penalty: Number(frequency_penalty),
    presence_penalty: Number(presence_penalty),
    stream: Boolean(stream),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
    if (tool_choice) payload.tool_choice = tool_choice;
  }

  try {
    return await client.chat.completions.create(payload);
  } catch (err) {
    // If it's a 400 saying model is not a chat model, attempt legacy completions if non-streamed
    const errMsg = err?.message || "";
    if (err?.status === 400 && /not a chat|use \/completions/i.test(errMsg) && !stream) {
      const prompt = messages.map((m) => `${m.role}: ${m.content}`).join("\n\n");
      return await client.completions.create({
        model,
        prompt,
        temperature: Number(temperature),
        max_tokens: Number(max_tokens),
      });
    }
    throw err;
  }
}

/**
 * Create text embeddings
 */
export async function createEmbedding({ model, input }) {
  if (!isApiKeyConfigured()) {
    throw new Error("NVIDIA_API_KEY is not configured.");
  }
  const client = getNimClient();
  return await client.embeddings.create({
    model,
    input,
  });
}

/**
 * Image generation wrapper
 * For NVIDIA NIM, image models typically live at https://integrate.api.nvidia.com/v1/genai/{publisher}/{model}
 * or standard OpenAI-compatible /v1/images/generations
 */
export async function generateImage({ model, prompt, size = "1024x1024", ...rest }) {
  if (!isApiKeyConfigured()) {
    throw new Error("NVIDIA_API_KEY is not configured.");
  }
  const apiKey = getNextApiKey();

  // Try standard OpenAI images endpoint first
  try {
    const client = getNimClient();
    const res = await client.images.generate({
      model,
      prompt,
      size,
      n: 1,
      response_format: "b64_json",
      ...rest,
    });
    return res;
  } catch (err) {
    // Fallback: If custom path like publisher/model
    const parts = model.split("/");
    if (parts.length === 2) {
      const [publisher, name] = parts;
      const directUrl = `${BASE_URL}/genai/${publisher}/${name}`;
      const resp = await fetch(directUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ prompt, ...rest }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Image generation failed (${resp.status}): ${text}`);
      }
      return await resp.json();
    }
    throw err;
  }
}
