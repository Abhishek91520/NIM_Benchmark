import OpenAI from "openai";

const BASE_URL = "https://integrate.api.nvidia.com/v1";

export function isApiKeyConfigured() {
  const key = process.env.NVIDIA_API_KEY;
  return Boolean(key && key.trim().length > 0 && !key.includes("xxxxxxxx"));
}

export function getNimClient() {
  const apiKey = process.env.NVIDIA_API_KEY || "missing-nvidia-api-key";
  return new OpenAI({
    apiKey,
    baseURL: BASE_URL,
    timeout: 45_000,
  });
}

// Lazy getter proxy for nim so it doesn't throw at evaluation time
export const nim = new Proxy(
  {},
  {
    get(target, prop) {
      const client = getNimClient();
      return client[prop];
    },
  }
);

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
  const apiKey = process.env.NVIDIA_API_KEY;

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
