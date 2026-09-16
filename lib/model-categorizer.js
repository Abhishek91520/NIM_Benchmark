export const CATEGORIES = {
  chat: { label: "Chat & Reasoning", id: "chat", color: "emerald" },
  "vision-language": { label: "Vision-Language", id: "vision-language", color: "blue" },
  embedding: { label: "Embedding", id: "embedding", color: "purple" },
  reranker: { label: "Reranker", id: "reranker", color: "amber" },
  "image-gen": { label: "Image Generation", id: "image-gen", color: "pink" },
  speech: { label: "Speech & Audio", id: "speech", color: "cyan" },
  other: { label: "Other", id: "other", color: "slate" },
};

export function categorize(modelId, overrideCategory = null) {
  if (overrideCategory && CATEGORIES[overrideCategory]) {
    return overrideCategory;
  }

  if (!modelId) return "other";
  const id = String(modelId).toLowerCase();

  if (/embed|bge-.*-en|nv-embed/i.test(id)) return "embedding";
  if (/rerank|bge-rerank/i.test(id)) return "reranker";
  if (/vision|-vl-|vl\d|vlm|neva|fuyu|kosmos|llava|paligemma/i.test(id)) return "vision-language";
  if (/image|diffusion|sdxl|flux|stable-diffusion|imagen/i.test(id)) return "image-gen";
  if (/reward|steerlm|guard/i.test(id)) return "other";
  if (/llama|mistral|mixtral|qwen|phi|nemotron|gemma|deepseek|claude|gpt|command|starcoder|codellama|yi-|solar|granite/i.test(id)) {
    return "chat";
  }

  return "chat"; // safe default per specification
}
