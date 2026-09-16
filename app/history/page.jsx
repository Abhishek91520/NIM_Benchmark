"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Trash2, ChevronRight } from "lucide-react";
import { storage } from "@/lib/storage";
import ExportButton from "@/components/shared/ExportButton";

export default function HistoryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("benchmarks"); // 'benchmarks' | 'chats'
  const [search, setSearch] = useState("");
  const [benchmarkRuns, setBenchmarkRuns] = useState([]);
  const [chatSessions, setChatSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    setLoading(true);
    const runItems = await storage.list("benchmark:run:");
    const sessionItems = await storage.list("chat:session:");

    const runs = (runItems || [])
      .map((i) => i.value)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const sessions = (sessionItems || [])
      .map((i) => i.value)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    setBenchmarkRuns(runs);
    setChatSessions(sessions);
    setLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDeleteRun = async (e, runId) => {
    e.stopPropagation();
    if (confirm("Delete this benchmark run record?")) {
      await storage.remove(`benchmark:run:${runId}`);
      setBenchmarkRuns((prev) => prev.filter((r) => r.id !== runId));
    }
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (confirm("Delete this saved chat session?")) {
      await storage.remove(`chat:session:${sessionId}`);
      setChatSessions((prev) => prev.filter((s) => s.id !== sessionId));
    }
  };

  const handleClearAll = async () => {
    if (confirm("Delete all benchmark runs and saved chat history?")) {
      await storage.clearByPrefix("benchmark:run:");
      await storage.clearByPrefix("chat:session:");
      setBenchmarkRuns([]);
      setChatSessions([]);
    }
  };

  const filteredRuns = benchmarkRuns.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.name || "").toLowerCase().includes(q) ||
      (r.id || "").toLowerCase().includes(q) ||
      (r.modelIds || []).some((m) => m.toLowerCase().includes(q))
    );
  });

  const filteredSessions = chatSessions.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.title || "").toLowerCase().includes(q) ||
      (s.modelId || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-text-main">
            History
          </h1>
          <p className="text-xs text-text-muted mt-0.5 max-w-[68ch]">
            Review past benchmark runs, examine historical leaderboards, and resume saved chat sessions.
          </p>
        </div>

        {(benchmarkRuns.length > 0 || chatSessions.length > 0) && (
          <button
            type="button"
            onClick={handleClearAll}
            className="h-8 px-3 rounded-[6px] border text-xs font-medium transition-colors"
            style={{ borderColor: "var(--sig-fail)", color: "var(--sig-fail)" }}
          >
            Clear all history
          </button>
        )}
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("benchmarks")}
            className={`h-7 px-3 rounded-[4px] text-xs transition-colors ${
              activeTab === "benchmarks"
                ? "bg-text-main text-canvas font-medium"
                : "text-text-muted hover:text-text-main bg-surface border border-line"
            }`}
          >
            Benchmark runs ({benchmarkRuns.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("chats")}
            className={`h-7 px-3 rounded-[4px] text-xs transition-colors ${
              activeTab === "chats"
                ? "bg-text-main text-canvas font-medium"
                : "text-text-muted hover:text-text-main bg-surface border border-line"
            }`}
          >
            Saved chats ({chatSessions.length})
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-faint" />
          <input
            type="text"
            placeholder="Search records…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 bg-surface border border-line rounded-[6px] text-xs placeholder:text-text-faint focus:outline-none focus:border-[var(--focus)]"
          />
        </div>
      </div>

      {/* Benchmark Runs List */}
      {activeTab === "benchmarks" && (
        <div className="space-y-2">
          {loading ? (
            <div className="p-8 text-center text-xs text-text-faint">Loading history…</div>
          ) : filteredRuns.length === 0 ? (
            <div className="p-8 text-center border border-line rounded-[4px] bg-surface space-y-3">
              <p className="text-xs text-text-muted">No benchmark runs yet.</p>
              <button
                type="button"
                onClick={() => router.push("/benchmark")}
                className="h-8 px-4 rounded-[6px] bg-text-main text-canvas text-xs font-medium hover:opacity-90 transition-opacity"
              >
                Run benchmark
              </button>
            </div>
          ) : (
            filteredRuns.map((run) => {
              const topModel = run.leaderboard?.[0];
              const dateStr = run.createdAt ? new Date(run.createdAt).toLocaleString() : "-";

              return (
                <div
                  key={run.id}
                  onClick={() => router.push(`/benchmark/${run.id}`)}
                  className="group p-3.5 rounded-[4px] border border-line bg-surface hover:bg-surface-raised cursor-pointer transition-colors duration-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-text-main truncate">
                        {run.name || run.id}
                      </span>
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded-[4px] border border-line"
                        style={{
                          color:
                            run.status === "complete"
                              ? "var(--sig-ok)"
                              : run.status === "failed"
                              ? "var(--sig-fail)"
                              : "var(--sig-warn)",
                        }}
                      >
                        {run.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted font-mono">
                      <span>{dateStr}</span>
                      <span>{run.modelIds?.length || 0} models</span>
                      <span>{run.results?.length || 0} pairs</span>
                      {topModel && (
                        <span style={{ color: "var(--sig-ok)" }}>
                          Top: {topModel.modelId.split("/")[1] || topModel.modelId} ({topModel.compositeScore})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div onClick={(e) => e.stopPropagation()}>
                      <ExportButton run={run} />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteRun(e, run.id)}
                      className="p-1.5 text-text-faint hover:text-text-main transition-colors"
                      aria-label="Delete run"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <ChevronRight className="h-4 w-4 text-text-faint group-hover:text-text-main transition-colors" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Saved Chats List */}
      {activeTab === "chats" && (
        <div className="space-y-2">
          {loading ? (
            <div className="p-8 text-center text-xs text-text-faint">Loading history…</div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-8 text-center border border-line rounded-[4px] bg-surface space-y-3">
              <p className="text-xs text-text-muted">No saved chat sessions yet.</p>
              <button
                type="button"
                onClick={() => router.push("/playground")}
                className="h-8 px-4 rounded-[6px] bg-text-main text-canvas text-xs font-medium hover:opacity-90 transition-opacity"
              >
                Open playground
              </button>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const dateStr = session.createdAt ? new Date(session.createdAt).toLocaleString() : "-";
              return (
                <div
                  key={session.id}
                  onClick={() =>
                    router.push(`/playground?model=${encodeURIComponent(session.modelId || "")}`)
                  }
                  className="group p-3.5 rounded-[4px] border border-line bg-surface hover:bg-surface-raised cursor-pointer transition-colors duration-100 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="font-sans text-xs font-medium text-text-main truncate">
                      {session.title || "Chat session"}
                    </h4>
                    <div className="flex items-center gap-4 text-xs text-text-muted font-mono">
                      <span className="truncate">{session.modelId}</span>
                      <span>{session.messages?.length || 0} messages</span>
                      <span>{dateStr}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      className="p-1.5 text-text-faint hover:text-text-main transition-colors"
                      aria-label="Delete session"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <ChevronRight className="h-4 w-4 text-text-faint group-hover:text-text-main transition-colors" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
