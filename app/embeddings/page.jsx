"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import ModelPicker from "@/components/shared/ModelPicker";
import { formatLatency } from "@/lib/utils";

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dot / denominator;
}

function getSignalColor(scorePercent) {
  if (scorePercent >= 70) return "bg-sig-ok";
  if (scorePercent >= 40) return "bg-sig-warn";
  return "bg-sig-fail";
}

function getSignalTextColor(scorePercent) {
  if (scorePercent >= 70) return "text-sig-ok";
  if (scorePercent >= 40) return "text-sig-warn";
  return "text-sig-fail";
}

export default function EmbeddingsPage() {
  const [modelId, setModelId] = useState("nvidia/nemotron-3-embed-1b");
  const [mode, setMode] = useState("pair"); // 'pair' | 'batch'
  const [loading, setLoading] = useState(false);
  const [latencyMs, setLatencyMs] = useState(null);
  const [dimension, setDimension] = useState(null);

  // Pair mode state
  const [textA, setTextA] = useState("Artificial intelligence accelerates modern scientific discovery.");
  const [textB, setTextB] = useState("Machine learning models help researchers uncover breakthroughs faster.");
  const [pairScore, setPairScore] = useState(null);

  // Batch mode state
  const [query, setQuery] = useState("What are the advantages of using GPU acceleration for LLM inference?");
  const [candidatesText, setCandidatesText] = useState(
    `GPUs deliver massive parallel floating-point throughput ideal for tensor multiplications.
The solar eclipse attracted millions of viewers across the continent yesterday.
TensorRT-LLM optimizes memory bandwidth and KV-cache utilization on modern NVIDIA architectures.
High-protein diets can support muscle hypertrophy when paired with resistance training.`
  );
  const [rankedResults, setRankedResults] = useState([]);

  // Calculate pair similarity
  const handleRunPair = async () => {
    if (!textA.trim() || !textB.trim() || !modelId) return;
    setLoading(true);
    setPairScore(null);

    try {
      const res = await fetch("/api/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId,
          input: [textA.trim(), textB.trim()],
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Embedding generation failed");

      const embeddings = json.data?.map((d) => d.embedding) || [];
      if (embeddings.length >= 2) {
        const sim = cosineSimilarity(embeddings[0], embeddings[1]);
        setPairScore(sim);
        setDimension(embeddings[0].length);
        setLatencyMs(json.latencyMs);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate batch ranking
  const handleRunBatch = async () => {
    if (!query.trim() || !candidatesText.trim() || !modelId) return;
    setLoading(true);
    setRankedResults([]);

    const candidates = candidatesText
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean);

    if (candidates.length === 0) return;

    try {
      const allInputs = [query.trim(), ...candidates];
      const res = await fetch("/api/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId,
          input: allInputs,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Embedding generation failed");

      const embeddings = json.data?.map((d) => d.embedding) || [];
      const queryEmbedding = embeddings[0];
      setDimension(queryEmbedding.length);
      setLatencyMs(json.latencyMs);

      const scored = candidates.map((cand, idx) => {
        const candEmbedding = embeddings[idx + 1];
        const sim = cosineSimilarity(queryEmbedding, candEmbedding);
        return {
          text: cand,
          score: sim,
        };
      });

      scored.sort((a, b) => b.score - a.score);
      setRankedResults(scored);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-4 border-b border-line-strong">
        <h2 className="text-[26px] font-[550] text-text tracking-tight">Embeddings</h2>
        <p className="text-xs text-text-muted mt-1 max-w-[68ch]">
          Compute dense vector representations, evaluate cosine similarity, and test semantic retrieval across candidate passages.
        </p>
      </div>

      {/* Controls Bar */}
      <div className="p-4 rounded-[4px] border border-line bg-surface space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs text-text-muted">
              Embedding model
            </label>
            <ModelPicker
              value={modelId}
              onChange={setModelId}
              filterCategory="embedding"
              placeholder="Select an embedding model..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-text-muted">
              Evaluation mode
            </label>
            <div className="flex rounded-[6px] border border-line bg-surface-raised p-0.5">
              <button
                type="button"
                onClick={() => setMode("pair")}
                className={`flex-1 py-1 text-xs rounded-[4px] font-medium transition ${
                  mode === "pair"
                    ? "bg-text text-canvas"
                    : "text-text-muted hover:text-text"
                }`}
              >
                Pair similarity
              </button>
              <button
                type="button"
                onClick={() => setMode("batch")}
                className={`flex-1 py-1 text-xs rounded-[4px] font-medium transition ${
                  mode === "batch"
                    ? "bg-text text-canvas"
                    : "text-text-muted hover:text-text"
                }`}
              >
                Batch ranking
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mode 1: Pair Similarity */}
      {mode === "pair" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-text-muted">Passage A</label>
              <textarea
                value={textA}
                onChange={(e) => setTextA(e.target.value)}
                rows={4}
                className="w-full p-3 bg-surface border border-line rounded-[6px] text-xs text-text placeholder:text-text-faint focus:outline-none focus:border-focus focus:ring-1 focus:ring-focus font-sans"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-text-muted">Passage B</label>
              <textarea
                value={textB}
                onChange={(e) => setTextB(e.target.value)}
                rows={4}
                className="w-full p-3 bg-surface border border-line rounded-[6px] text-xs text-text placeholder:text-text-faint focus:outline-none focus:border-focus focus:ring-1 focus:ring-focus font-sans"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs font-mono text-text-muted">
              {dimension && (
                <span>
                  <span className="text-text tabular-nums">{dimension}</span>{" "}
                  <span className="text-text-muted text-[11px]">dims</span>
                </span>
              )}
              {latencyMs && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-text-faint" />
                  <span>{formatLatency(latencyMs)}</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleRunPair}
              disabled={loading || !textA.trim() || !textB.trim()}
              className="h-8 px-4 rounded-[6px] bg-text text-canvas hover:bg-white text-xs font-medium transition disabled:opacity-30"
            >
              <span>{loading ? "Computing similarity..." : "Compute similarity"}</span>
            </button>
          </div>

          {/* Pair Similarity Score Result */}
          {pairScore !== null && (
            <div className="p-5 rounded-[4px] border border-line bg-surface space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-text-muted">
                    Cosine similarity score
                  </span>
                  <div className="text-[34px] font-[600] tracking-[-0.02em] font-mono text-text tabular-nums mt-0.5">
                    {pairScore.toFixed(4)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-text-muted">
                    Match confidence
                  </span>
                  <div
                    className={`text-xl font-mono font-medium tabular-nums mt-0.5 ${getSignalTextColor(
                      pairScore * 100
                    )}`}
                  >
                    {(pairScore * 100).toFixed(1)}{" "}
                    <span className="text-[11px] text-text-muted">%</span>
                  </div>
                </div>
              </div>

              {/* Visual Flat Meter Bar */}
              <div className="w-full h-2 bg-surface-raised rounded-[2px] overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${getSignalColor(
                    pairScore * 100
                  )}`}
                  style={{ width: `${Math.max(0, Math.min(100, pairScore * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Batch Ranking */}
      {mode === "batch" && (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-text-muted">
              Target query
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={2}
              className="w-full p-3 bg-surface border border-line rounded-[6px] text-xs text-text placeholder:text-text-faint focus:outline-none focus:border-focus focus:ring-1 focus:ring-focus font-sans"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-text-muted">
              Candidate passages (one per line)
            </label>
            <textarea
              value={candidatesText}
              onChange={(e) => setCandidatesText(e.target.value)}
              rows={5}
              className="w-full p-3 bg-surface border border-line rounded-[6px] text-xs text-text placeholder:text-text-faint focus:outline-none focus:border-focus focus:ring-1 focus:ring-focus font-sans"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs font-mono text-text-muted">
              {dimension && (
                <span>
                  <span className="text-text tabular-nums">{dimension}</span>{" "}
                  <span className="text-text-muted text-[11px]">dims</span>
                </span>
              )}
              {latencyMs && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-text-faint" />
                  <span>{formatLatency(latencyMs)}</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleRunBatch}
              disabled={loading || !query.trim() || !candidatesText.trim()}
              className="h-8 px-4 rounded-[6px] bg-text text-canvas hover:bg-white text-xs font-medium transition disabled:opacity-30"
            >
              <span>{loading ? "Ranking passages..." : "Rank candidates"}</span>
            </button>
          </div>

          {/* Ranked Results */}
          {rankedResults.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-medium text-text">
                Similarity ranking ({rankedResults.length} passages)
              </h3>
              <div className="space-y-1.5">
                {rankedResults.map((item, idx) => {
                  const scorePercent = item.score * 100;
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-[4px] border border-line bg-surface space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-medium text-text tabular-nums">
                          #{idx + 1}
                        </span>
                        <div className="font-mono text-xs tabular-nums flex items-center gap-1.5">
                          <span className="text-text-muted">Cosine:</span>
                          <span className="text-text">{item.score.toFixed(4)}</span>
                          <span
                            className={`font-medium ${getSignalTextColor(
                              scorePercent
                            )}`}
                          >
                            ({scorePercent.toFixed(1)}{" "}
                            <span className="text-[11px] text-text-muted">%</span>)
                          </span>
                        </div>
                      </div>
                      <p className="text-text font-sans select-text">{item.text}</p>
                      <div className="w-full h-1.5 bg-surface-raised rounded-[2px] overflow-hidden">
                        <div
                          className={`h-full ${getSignalColor(scorePercent)}`}
                          style={{ width: `${Math.max(0, Math.min(100, scorePercent))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
