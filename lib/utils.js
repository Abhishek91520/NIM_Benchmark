import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num, decimals = 1) {
  if (num === null || num === undefined || isNaN(num)) return "-";
  return Number(num).toFixed(decimals);
}

export function formatLatency(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) return "-";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatTokensPerSec(tps) {
  if (tps === null || tps === undefined || isNaN(tps)) return "-";
  return `${Number(tps).toFixed(1)} t/s`;
}

export function formatPercent(val) {
  if (val === null || val === undefined || isNaN(val)) return "-";
  return `${Math.round(val)}%`;
}
