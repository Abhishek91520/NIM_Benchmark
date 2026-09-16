export const MAX_CONCURRENT_MODELS = 4;
export const PER_REQUEST_TIMEOUT_MS = 45_000;
export const MAX_RETRIES = 2;
export const BASE_BACKOFF_MS = 1000;

export const DEFAULT_WEIGHTS = {
  quality: 0.55,
  speed: 0.25,
  reliability: 0.20,
};

export const TIME_BUDGET_MS = 38_000; // 38s budget to safely stay below Vercel's 60s limit
