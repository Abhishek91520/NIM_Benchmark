"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Copy, Check } from "lucide-react";
import ModelPicker from "@/components/shared/ModelPicker";
import ResponseDiff from "./ResponseDiff";
import { formatLatency } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

export default function CompareGrid({ initialModels = [] }) {
  const router = useRouter();
  const { setSelectedModels } = useAppStore();

  const [models, setModels] = useState(
    initialModels.length >= 2
      ? initialModels.slice(0, 4)
      : [
          "meta/llama-3.2-11b-vision-instruct",
          "openai/gpt-oss-20b",
        ]
  );

  const [prompt, setPrompt] = useState(
    "Compare the performance characteristics of WebAssembly vs native JavaScript for dense floating-point operations in 3 bullet points."
  );
  const [systemPrompt, setSystemPrompt] = useState("You are an expert technical advisor.");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(512);

  const [responses, setResponses] = useState({});
  const [isRunning, setIsRunning] = useState(false);

  // Diff mode states
  const [diffMode, setDiffMode] = useState(false);
  const [diffModelA, setDiffModelA] = useState(0);
  const [diffModelB, setDiffModelB] = useState(1);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Mobile carousel active tab
  const [mobileActiveIndex, setMobileActiveIndex] = useState(0);

  const handleModelChange = (idx, newModelId) => {
    const updated = [...models];
    updated[idx] = newModelId;
    setModels(updated);
  };

  const handleAddModel = () => {
    if (models.length < 4) {
      setModels([...models, "nvidia/llama-3.1-nemotron-70b-instruct"]);
    }
  };

  const handleRemoveModel = (idx) => {
    if (models.length > 2) {
      const updated = models.filter((_, i) => i !== idx);
      setModels(updated);
      if (mobileActiveIndex >= updated.length) {
        setMobileActiveIndex(updated.length - 1);
      }
    }
  };

  const handleRunAll = async () => {
    if (!prompt.trim() || isRunning) return;

    setIsRunning(true);
    const initialResp = {};
    models.forEach((m, idx) => {
      initialResp[idx] = {
        modelId: m,
        content: "",
        latencyMs: 0,
        tokensPerSec: 0,
        status: "running",
        error: null,
      };
    });
    setResponses(initialResp);

    const promises = models.map(async (modelId, idx) => {
      const startTime = Date.now();
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelId,
            messages: [
              ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
              { role: "user", content: prompt },
            ],
            params: { temperature, max_tokens: maxTokens },
            stream: false,
          }),
        });

        const json = await res.json();
        const latencyMs = Date.now() - startTime;

        if (!res.ok) {
          throw json.error || new Error(`HTTP ${res.status}`);
        }

        const text = json.message?.content || "";
        const tokenCount = json.usage?.completion_tokens || Math.ceil(text.length / 4);
        const tps = latencyMs > 0 ? tokenCount / (latencyMs / 1000) : 0;

        setResponses((prev) => ({
          ...prev,
          [idx]: {
            modelId,
            content: text,
            latencyMs,
            tokensPerSec: Math.round(tps * 10) / 10,
            tokenCount,
            status: "success",
            error: null,
          },
        }));
      } catch (err) {
        const latencyMs = Date.now() - startTime;
        setResponses((prev) => ({
          ...prev,
          [idx]: {
            modelId,
            content: "",
            latencyMs,
            tokensPerSec: 0,
            status: "failed",
            error: err.message || "Failed to generate response",
          },
        }));
      }
    });

    await Promise.allSettled(promises);
    setIsRunning(false);
  };

  const handleSendToBenchmark = () => {
    setSelectedModels(models);
    router.push(`/benchmark?preselect=${encodeURIComponent(models.join(","))}`);
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Control Panel: hairline borders, no shadows per Section 4 */}
      <div className="rounded-[4px] border border-line bg-surface p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
          <div>
            <h2 className="text-sm font-semibold text-text-main font-sans">
              Parallel evaluation ({models.length}/4)
            </h2>
            <p className="text-xs text-text-muted mt-0.5 max-w-[68ch]">
              Compare identical inputs side by side across multiple models.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {models.length < 4 && (
              <button
                type="button"
                onClick={handleAddModel}
                disabled={isRunning}
                className="h-8 px-3 rounded-[6px] border border-line text-xs text-text-main hover:bg-surface-raised transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add model</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setDiffMode(!diffMode)}
              className={`h-8 px-3 rounded-[6px] text-xs border transition-colors ${
                diffMode
                  ? "bg-surface-raised border-line-strong text-text-main font-medium"
                  : "border-line text-text-muted hover:text-text-main hover:bg-surface-raised"
              }`}
            >
              Diff mode
            </button>

            <button
              type="button"
              onClick={handleSendToBenchmark}
              className="h-8 px-3 rounded-[6px] border border-line text-xs text-text-main hover:bg-surface-raised transition-colors"
            >
              Send to benchmark
            </button>
          </div>
        </div>

        {/* Prompt Composer */}
        <div className="space-y-2.5">
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-text-muted uppercase">
              Evaluation prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter prompt to evaluate across all models…"
              rows={2}
              className="w-full p-2.5 bg-canvas border border-line rounded-[6px] text-xs text-text-main placeholder:text-text-faint focus:outline-none focus:border-[var(--focus)] font-sans resize-y"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-text-muted">Temperature</span>
                <input
                  type="number"
                  min="0"
                  max="1.5"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value) || 0.7)}
                  className="w-14 h-6 px-1.5 bg-canvas border border-line rounded-[4px] text-xs font-mono tabular-nums text-text-main text-right"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-text-muted">Max tokens</span>
                <input
                  type="number"
                  min="64"
                  max="2048"
                  step="64"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 512)}
                  className="w-16 h-6 px-1.5 bg-canvas border border-line rounded-[4px] text-xs font-mono tabular-nums text-text-main text-right"
                />
              </div>
            </div>

            {/* Primary outcome button: Inverted neutral per Section 6 */}
            <button
              type="button"
              onClick={handleRunAll}
              disabled={isRunning || !prompt.trim()}
              className="h-8 px-5 rounded-[6px] bg-text-main text-canvas text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isRunning ? "Running comparison…" : "Run comparison"}
            </button>
          </div>
        </div>
      </div>

      {/* Diff Mode Selector */}
      {diffMode && (
        <div className="p-3 bg-surface rounded-[4px] border border-line flex flex-wrap items-center gap-3 text-xs">
          <span className="text-text-muted">Diff comparison between:</span>
          <select
            value={diffModelA}
            onChange={(e) => setDiffModelA(parseInt(e.target.value, 10))}
            className="h-7 px-2 bg-canvas border border-line rounded-[4px] text-xs font-mono text-text-main"
          >
            {models.map((m, idx) => (
              <option key={idx} value={idx}>
                {m}
              </option>
            ))}
          </select>
          <span className="text-text-faint">and</span>
          <select
            value={diffModelB}
            onChange={(e) => setDiffModelB(parseInt(e.target.value, 10))}
            className="h-7 px-2 bg-canvas border border-line rounded-[4px] text-xs font-mono text-text-main"
          >
            {models.map((m, idx) => (
              <option key={idx} value={idx}>
                {m}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Diff View */}
      {diffMode && (
        <ResponseDiff
          modelA={models[diffModelA]}
          textA={responses[diffModelA]?.content || ""}
          modelB={models[diffModelB]}
          textB={responses[diffModelB]?.content || ""}
        />
      )}

      {/* Mobile Tab/Carousel Indicator (<768px per Section 8) */}
      <div className="md:hidden flex items-center justify-between border-b border-line pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {models.map((m, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setMobileActiveIndex(idx)}
              className={`h-7 px-2.5 rounded-[4px] text-xs font-mono transition-colors ${
                mobileActiveIndex === idx
                  ? "bg-text-main text-canvas font-medium"
                  : "bg-surface border border-line text-text-muted"
              }`}
            >
              {m.split("/")[1] || m}
            </button>
          ))}
        </div>
      </div>

      {/* Multi-Column Grid on Desktop/Tablet; Single Swipe/Tab Column on Mobile */}
      <div className="hidden md:grid grid-cols-2 xl:grid-cols-4 gap-3">
        {models.map((modelId, idx) => {
          const resp = responses[idx];
          return (
            <CompareColumn
              key={idx}
              modelId={modelId}
              index={idx}
              canRemove={models.length > 2}
              isRunning={isRunning}
              response={resp}
              onModelChange={(newId) => handleModelChange(idx, newId)}
              onRemove={() => handleRemoveModel(idx)}
              onCopy={(text) => handleCopy(text, idx)}
              copied={copiedIndex === idx}
            />
          );
        })}
      </div>

      {/* Mobile Single Active Panel View */}
      <div className="md:hidden">
        {models[mobileActiveIndex] && (
          <CompareColumn
            modelId={models[mobileActiveIndex]}
            index={mobileActiveIndex}
            canRemove={models.length > 2}
            isRunning={isRunning}
            response={responses[mobileActiveIndex]}
            onModelChange={(newId) => handleModelChange(mobileActiveIndex, newId)}
            onRemove={() => handleRemoveModel(mobileActiveIndex)}
            onCopy={(text) => handleCopy(text, mobileActiveIndex)}
            copied={copiedIndex === mobileActiveIndex}
          />
        )}
      </div>
    </div>
  );
}

function CompareColumn({
  modelId,
  index,
  canRemove,
  isRunning,
  response,
  onModelChange,
  onRemove,
  onCopy,
  copied,
}) {
  const isSuccess = response?.status === "success";
  const isFailed = response?.status === "failed";
  const isRunningCol = response?.status === "running";

  return (
    <div className="flex flex-col h-[500px] rounded-[4px] border border-line bg-surface overflow-hidden">
      {/* Pinned Model Header per Section 8 */}
      <div className="p-3 border-b border-line bg-surface space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
          <span>Model #{index + 1}</span>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-0.5 text-text-faint hover:text-text-main transition-colors"
              aria-label="Remove model"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <ModelPicker
          value={modelId}
          onChange={onModelChange}
          disabled={isRunning}
          filterCategory="chat"
        />
      </div>

      {/* Content Body */}
      <div className="flex-1 p-3.5 overflow-y-auto text-xs font-sans leading-relaxed select-text text-text-main">
        {isRunningCol ? (
          <div className="h-full flex flex-col items-center justify-center text-text-muted font-mono text-xs gap-2">
            <span>Generating…</span>
          </div>
        ) : isFailed ? (
          <div className="p-3 rounded-[4px] bg-canvas border border-line space-y-1 font-mono text-xs" style={{ color: "var(--sig-fail)" }}>
            <div className="font-semibold">Failed</div>
            <p className="text-text-muted">{response.error}</p>
          </div>
        ) : response?.content ? (
          <div className="whitespace-pre-wrap">{response.content}</div>
        ) : (
          <div className="h-full flex items-center justify-center text-center text-text-faint text-xs">
            Response will appear here
          </div>
        )}
      </div>

      {/* Footer Metrics Line */}
      <div className="p-2 px-3 border-t border-line bg-surface flex items-center justify-between text-[11px] font-mono text-text-faint">
        <div className="flex items-center gap-4 tabular-nums">
          {response?.latencyMs > 0 && <span>{response.latencyMs} ms</span>}
          {response?.tokensPerSec > 0 && <span>{response.tokensPerSec} tok/s</span>}
        </div>

        {response?.content && (
          <button
            type="button"
            onClick={() => onCopy(response.content)}
            className="p-1 text-text-faint hover:text-text-main transition-colors"
            aria-label="Copy response"
          >
            {copied ? (
              <Check className="h-3 w-3" style={{ color: "var(--sig-ok)" }} />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
