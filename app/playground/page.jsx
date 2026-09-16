"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Sliders, X } from "lucide-react";
import ModelPicker from "@/components/shared/ModelPicker";
import ParamsPanel, { DEFAULT_PARAMS } from "@/components/playground/ParamsPanel";
import ChatPanel from "@/components/playground/ChatPanel";
import { storage } from "@/lib/storage";

function PlaygroundContent() {
  const searchParams = useSearchParams();
  const queryModel = searchParams.get("model");

  const [selectedModelId, setSelectedModelId] = useState(
    queryModel || "meta/llama-3.2-11b-vision-instruct"
  );
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful, precise AI assistant hosted on NVIDIA NIM."
  );
  const [savedNotification, setSavedNotification] = useState("");
  const [showMobileParams, setShowMobileParams] = useState(false);

  useEffect(() => {
    if (queryModel) {
      setSelectedModelId(queryModel);
    }
  }, [queryModel]);

  const handleSaveSession = async ({ messages, params, systemPrompt }) => {
    if (!messages || messages.length === 0) return;

    const sessionId = `session_${Date.now()}`;
    const firstUserMsg = messages.find((m) => m.role === "user")?.content || "Chat session";
    const title = firstUserMsg.slice(0, 45) + (firstUserMsg.length > 45 ? "…" : "");

    const sessionData = {
      id: sessionId,
      modelId: selectedModelId,
      title,
      params,
      systemPrompt,
      messages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await storage.set(`chat:session:${sessionId}`, sessionData);
      setSavedNotification(`Session saved: "${title}"`);
      setTimeout(() => setSavedNotification(""), 4000);
    } catch (err) {
      setSavedNotification(`Failed to save: ${err.message}`);
      setTimeout(() => setSavedNotification(""), 4000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header: Plain text heading per Section 3 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-text-main">
            Playground
          </h1>
          <p className="text-xs text-text-muted mt-0.5 max-w-[68ch]">
            Interactive testing environment with live token streaming and parameter adjustment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedNotification && (
            <span className="text-xs font-mono text-text-muted px-2 py-1 bg-surface border border-line rounded-[4px]">
              {savedNotification}
            </span>
          )}

          {/* Toggle button for parameters below xl */}
          <button
            type="button"
            onClick={() => setShowMobileParams(true)}
            className="xl:hidden h-8 px-3 rounded-[6px] border border-line text-xs text-text-main flex items-center gap-1.5 hover:bg-surface-raised transition-colors"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Parameters</span>
          </button>
        </div>
      </div>

      {/* Model Selection Bar */}
      <div className="p-3 rounded-[4px] border border-line bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-xs text-text-muted shrink-0 font-sans">Model:</span>
          <div className="flex-1 max-w-lg">
            <ModelPicker
              value={selectedModelId}
              onChange={setSelectedModelId}
              filterCategory="chat"
              placeholder="Select model…"
            />
          </div>
        </div>
      </div>

      {/* Main Layout: Transcript + 280px sidebar at xl per Section 8 */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4 items-start">
        {/* Full-width Chat Transcript */}
        <div className="w-full">
          <ChatPanel
            modelId={selectedModelId}
            params={params}
            systemPrompt={systemPrompt}
            setSystemPrompt={setSystemPrompt}
            onSaveSession={handleSaveSession}
          />
        </div>

        {/* 280px Sidebar on xl screens */}
        <div className="hidden xl:block w-[280px] shrink-0">
          <ParamsPanel
            params={params}
            onChange={setParams}
            onReset={() => setParams(DEFAULT_PARAMS)}
          />
        </div>
      </div>

      {/* Bottom Sheet for parameters below xl screens */}
      {showMobileParams && (
        <div
          className="xl:hidden fixed inset-0 z-50 bg-black/60 flex flex-col justify-end"
          onClick={() => setShowMobileParams(false)}
        >
          <div
            className="bg-surface border-t border-line-strong p-4 rounded-t-[4px] max-h-[80vh] overflow-y-auto space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <span className="text-xs font-semibold text-text-muted">Inference parameters</span>
              <button
                type="button"
                onClick={() => setShowMobileParams(false)}
                className="p-1 text-text-muted hover:text-text-main"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ParamsPanel
              params={params}
              onChange={setParams}
              onReset={() => setParams(DEFAULT_PARAMS)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-text-muted">Loading Playground…</div>}>
      <PlaygroundContent />
    </Suspense>
  );
}
