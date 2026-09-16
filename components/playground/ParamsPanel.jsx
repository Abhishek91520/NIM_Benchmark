"use client";

import { RotateCcw } from "lucide-react";

export const DEFAULT_PARAMS = {
  temperature: 0.7,
  top_p: 1.0,
  max_tokens: 1024,
  frequency_penalty: 0.0,
  presence_penalty: 0.0,
  streaming: true,
  enableFunctionCalling: false,
};

export default function ParamsPanel({ params, onChange, onReset }) {
  const updateParam = (key, value) => {
    onChange({ ...params, [key]: value });
  };

  return (
    <div className="rounded-[4px] border border-line bg-surface p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-line pb-2.5">
        <h3 className="text-xs font-semibold text-text-main font-sans">Parameters</h3>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text-main transition-colors"
          title="Reset to defaults"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reset</span>
        </button>
      </div>

      <div className="space-y-3.5 text-xs">
        {/* Temperature */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-xs text-text-muted">Temperature</label>
            <input
              type="number"
              min="0"
              max="2"
              step="0.05"
              value={params.temperature}
              onChange={(e) => updateParam("temperature", parseFloat(e.target.value) || 0)}
              className="w-14 h-6 px-1.5 bg-canvas border border-line rounded-[4px] text-right font-mono text-xs tabular-nums text-text-main focus:outline-none focus:border-[var(--focus)] focus:ring-2 focus:ring-[var(--focus-soft)]"
            />
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={params.temperature}
            onChange={(e) => updateParam("temperature", parseFloat(e.target.value))}
            className="w-full accent-[var(--focus)] h-1 bg-line rounded-none cursor-pointer"
          />
        </div>

        {/* Top P */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-xs text-text-muted">Top P</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={params.top_p}
              onChange={(e) => updateParam("top_p", parseFloat(e.target.value) || 0)}
              className="w-14 h-6 px-1.5 bg-canvas border border-line rounded-[4px] text-right font-mono text-xs tabular-nums text-text-main focus:outline-none focus:border-[var(--focus)] focus:ring-2 focus:ring-[var(--focus-soft)]"
            />
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={params.top_p}
            onChange={(e) => updateParam("top_p", parseFloat(e.target.value))}
            className="w-full accent-[var(--focus)] h-1 bg-line rounded-none cursor-pointer"
          />
        </div>

        {/* Max Tokens */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-xs text-text-muted">Max tokens</label>
            <input
              type="number"
              min="1"
              max="4096"
              step="64"
              value={params.max_tokens}
              onChange={(e) => updateParam("max_tokens", parseInt(e.target.value, 10) || 64)}
              className="w-16 h-6 px-1.5 bg-canvas border border-line rounded-[4px] text-right font-mono text-xs tabular-nums text-text-main focus:outline-none focus:border-[var(--focus)] focus:ring-2 focus:ring-[var(--focus-soft)]"
            />
          </div>
          <input
            type="range"
            min="64"
            max="4096"
            step="64"
            value={params.max_tokens}
            onChange={(e) => updateParam("max_tokens", parseInt(e.target.value, 10))}
            className="w-full accent-[var(--focus)] h-1 bg-line rounded-none cursor-pointer"
          />
        </div>

        {/* Frequency Penalty */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-xs text-text-muted">Frequency penalty</label>
            <input
              type="number"
              min="-2"
              max="2"
              step="0.1"
              value={params.frequency_penalty}
              onChange={(e) => updateParam("frequency_penalty", parseFloat(e.target.value) || 0)}
              className="w-14 h-6 px-1.5 bg-canvas border border-line rounded-[4px] text-right font-mono text-xs tabular-nums text-text-main focus:outline-none focus:border-[var(--focus)] focus:ring-2 focus:ring-[var(--focus-soft)]"
            />
          </div>
          <input
            type="range"
            min="-2"
            max="2"
            step="0.1"
            value={params.frequency_penalty}
            onChange={(e) => updateParam("frequency_penalty", parseFloat(e.target.value))}
            className="w-full accent-[var(--focus)] h-1 bg-line rounded-none cursor-pointer"
          />
        </div>

        {/* Presence Penalty */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-xs text-text-muted">Presence penalty</label>
            <input
              type="number"
              min="-2"
              max="2"
              step="0.1"
              value={params.presence_penalty}
              onChange={(e) => updateParam("presence_penalty", parseFloat(e.target.value) || 0)}
              className="w-14 h-6 px-1.5 bg-canvas border border-line rounded-[4px] text-right font-mono text-xs tabular-nums text-text-main focus:outline-none focus:border-[var(--focus)] focus:ring-2 focus:ring-[var(--focus-soft)]"
            />
          </div>
          <input
            type="range"
            min="-2"
            max="2"
            step="0.1"
            value={params.presence_penalty}
            onChange={(e) => updateParam("presence_penalty", parseFloat(e.target.value))}
            className="w-full accent-[var(--focus)] h-1 bg-line rounded-none cursor-pointer"
          />
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="space-y-2.5 pt-3 border-t border-line text-xs">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-text-main">Token streaming</span>
          <input
            type="checkbox"
            checked={params.streaming}
            onChange={(e) => updateParam("streaming", e.target.checked)}
            className="h-3.5 w-3.5 rounded-[4px] accent-[var(--focus)] cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-text-main">Function calling probe</span>
          <input
            type="checkbox"
            checked={params.enableFunctionCalling}
            onChange={(e) => updateParam("enableFunctionCalling", e.target.checked)}
            className="h-3.5 w-3.5 rounded-[4px] accent-[var(--focus)] cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
}
