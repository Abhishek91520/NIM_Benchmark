export const DEFAULT_CONCURRENCY = 4;
export const MAX_CONCURRENT_MODELS = 6;
export const PER_REQUEST_TIMEOUT_MS = 15_000; // 15s per model timeout so dead models fail fast
export const MAX_RETRIES = 1; // 1 retry on another rotated key
export const BASE_BACKOFF_MS = 500;

export const DEFAULT_SPEED_MAX_TOKENS = 128; // Concise token budget for fast TPS & status measurement

export const DEFAULT_WEIGHTS = {
  quality: 0.55,
  speed: 0.25,
  reliability: 0.20,
};

export const TIME_BUDGET_MS = 50_000; // Safe budget for route execution
