"use client";

import { useState, useRef, useEffect } from "react";
import {
  RotateCcw,
  Copy,
  Check,
  Bookmark,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";

export default function ChatPanel({
  modelId,
  params,
  systemPrompt,
  setSystemPrompt,
  onSaveSession,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const handleSend = async (customInput = null) => {
    const textToSend = customInput !== null ? customInput : input.trim();
    if (!textToSend || !modelId || isGenerating) return;

    const userMessage = {
      role: "user",
      content: textToSend,
      ts: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    if (customInput === null) setInput("");
    setIsGenerating(true);

    const startTime = Date.now();
    const assistantIndex = newMessages.length;
    const assistantMessage = {
      role: "assistant",
      content: "",
      ts: Date.now(),
      modelId,
      latencyMs: 0,
      tokensPerSec: 0,
      tokenCount: 0,
      toolCalls: null,
      error: null,
    };

    setMessages([...newMessages, assistantMessage]);

    const apiMessages = [];
    if (systemPrompt && systemPrompt.trim()) {
      apiMessages.push({ role: "system", content: systemPrompt.trim() });
    }
    for (const m of newMessages) {
      if (!m.error) {
        apiMessages.push({ role: m.role, content: m.content });
      }
    }

    try {
      if (params.streaming) {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelId,
            messages: apiMessages,
            params,
            stream: true,
          }),
        });

        if (!response.ok) {
          const jsonErr = await response.json().catch(() => ({}));
          throw jsonErr.error || new Error(`HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";
        let accumulatedToolCalls = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) throw parsed.error;

              if (parsed.content) {
                accumulatedText += parsed.content;
              }
              if (parsed.tool_calls) {
                accumulatedToolCalls = [...accumulatedToolCalls, ...parsed.tool_calls];
              }

              const elapsedSec = (Date.now() - startTime) / 1000;
              const approxTokens = Math.max(1, Math.ceil(accumulatedText.length / 4));
              const tps = elapsedSec > 0 ? approxTokens / elapsedSec : 0;

              setMessages((prev) => {
                const copy = [...prev];
                copy[assistantIndex] = {
                  ...copy[assistantIndex],
                  content: accumulatedText,
                  toolCalls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : null,
                  tokenCount: approxTokens,
                  tokensPerSec: Math.round(tps * 10) / 10,
                  latencyMs: Date.now() - startTime,
                };
                return copy;
              });
            } catch (pErr) {
              if (pErr?.code || pErr?.message) throw pErr;
            }
          }
        }

        const totalLatency = Date.now() - startTime;
        const totalTokens = Math.max(1, Math.ceil(accumulatedText.length / 4));
        const finalTps = totalLatency > 0 ? totalTokens / (totalLatency / 1000) : 0;

        setMessages((prev) => {
          const copy = [...prev];
          copy[assistantIndex] = {
            ...copy[assistantIndex],
            latencyMs: totalLatency,
            tokenCount: totalTokens,
            tokensPerSec: Math.round(finalTps * 10) / 10,
          };
          return copy;
        });
      } else {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelId,
            messages: apiMessages,
            params,
            stream: false,
          }),
        });

        const json = await res.json();
        if (!res.ok) throw json.error || new Error(`HTTP ${res.status}`);

        const totalLatency = Date.now() - startTime;
        const text = json.message?.content || "";
        const toolCalls = json.message?.tool_calls || null;
        const totalTokens = json.usage?.completion_tokens || Math.ceil(text.length / 4);
        const finalTps = totalLatency > 0 ? totalTokens / (totalLatency / 1000) : 0;

        setMessages((prev) => {
          const copy = [...prev];
          copy[assistantIndex] = {
            ...copy[assistantIndex],
            content: text,
            toolCalls,
            latencyMs: totalLatency,
            tokenCount: totalTokens,
            tokensPerSec: Math.round(finalTps * 10) / 10,
          };
          return copy;
        });
      }
    } catch (err) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[assistantIndex] = {
          ...copy[assistantIndex],
          error: {
            code: err?.code || "unknown",
            message: err?.message || "Failed to generate completion",
            retryPrompt: textToSend,
          },
        };
        return copy;
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex flex-col h-[700px] rounded-[4px] border border-line bg-surface overflow-hidden">
      {/* Top Header: System Prompt Drawer Toggle & Controls */}
      <div className="h-10 px-4 border-b border-line flex items-center justify-between bg-surface select-none">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSystemPrompt(!showSystemPrompt)}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-main transition-colors"
          >
            <span>System prompt</span>
            {showSystemPrompt ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {systemPrompt && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--sig-ok)" }} />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSaveSession({ messages, params, systemPrompt })}
            disabled={messages.length === 0}
            className="h-7 px-2.5 rounded-[4px] border border-line text-xs text-text-muted hover:text-text-main hover:bg-surface-raised transition-colors disabled:opacity-50"
          >
            Save session
          </button>

          <button
            type="button"
            onClick={() => setMessages([])}
            disabled={messages.length === 0 || isGenerating}
            className="h-7 px-2.5 rounded-[4px] text-xs text-text-muted hover:text-text-main transition-colors disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      {/* System Prompt Collapsible Header */}
      {showSystemPrompt && (
        <div className="p-3 bg-surface-raised border-b border-line space-y-1">
          <label className="text-[11px] font-mono text-text-muted">System instructions</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={2}
            placeholder="Set instructions for model behaviour…"
            className="w-full p-2 bg-canvas border border-line rounded-[4px] text-xs font-mono text-text-main placeholder:text-text-faint focus:outline-none focus:border-[var(--focus)] resize-y"
          />
        </div>
      )}

      {/* Transcript Layout per Section 6: Role in gutter, message in column, 1px line between turns */}
      <div
        className="flex-1 overflow-y-auto divide-y divide-line p-0"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-xs text-text-muted">
            <p className="max-w-[68ch]">
              Select a model and enter a prompt to observe live token streaming, latency, and throughput.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isUser = msg.role === "user";

          return (
            <div key={idx} className="p-4 flex items-start gap-4 hover:bg-surface-raised/30 transition-colors">
              {/* Left Gutter: Role label at 12px text-muted per Section 6 */}
              <div className="w-16 shrink-0 text-xs font-mono text-text-muted select-none pt-0.5 capitalize">
                {msg.role}
              </div>

              {/* Message Body Content Column */}
              <div className="flex-1 min-w-0 space-y-2">
                {msg.error ? (
                  <div className="space-y-1 font-mono text-xs" style={{ color: "var(--sig-fail)" }}>
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>{msg.error.code.toUpperCase()}</span>
                    </div>
                    <p className="text-text-muted">{msg.error.message}</p>
                    {msg.error.retryPrompt && (
                      <button
                        type="button"
                        onClick={() => handleSend(msg.error.retryPrompt)}
                        className="mt-2 h-7 px-2.5 rounded-[4px] border border-line text-xs text-text-main hover:bg-surface-raised transition-colors"
                      >
                        Retry request
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="text-sm font-sans whitespace-pre-wrap leading-relaxed select-text text-text-main">
                      {msg.content || (isGenerating && idx === messages.length - 1 ? (
                        <span className="text-text-faint font-mono text-xs">Streaming…</span>
                      ) : null)}
                    </div>

                    {/* Tool call display */}
                    {msg.toolCalls && (
                      <div className="p-2 rounded-[4px] bg-canvas border border-line text-xs font-mono space-y-1 my-1">
                        <span className="text-text-muted text-[11px]">Tool call:</span>
                        {msg.toolCalls.map((tc, tcIdx) => (
                          <div key={tcIdx} className="text-text-main">
                            {tc.function?.name}({tc.function?.arguments})
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Assistant Metadata Line per Section 6: 11px mono, text-faint, wide spacing */}
                    {!isUser && (
                      <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-text-faint select-none">
                        <div className="flex items-center gap-8 tabular-nums">
                          {msg.latencyMs > 0 && <span>{msg.latencyMs} ms</span>}
                          {msg.tokenCount > 0 && <span>{msg.tokenCount} tokens</span>}
                          {msg.tokensPerSec > 0 && <span>{msg.tokensPerSec} tok/s</span>}
                        </div>

                        {msg.content && (
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.content, idx)}
                            className="p-1 text-text-faint hover:text-text-main transition-colors"
                            aria-label="Copy message"
                          >
                            {copiedIndex === idx ? (
                              <Check className="h-3 w-3" style={{ color: "var(--sig-ok)" }} />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer: Docks to bottom, max 6 lines per Section 8 */}
      <div className="p-3 border-t border-line bg-surface">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              modelId
                ? "Enter message… (Cmd/Ctrl + Enter to send)"
                : "Select a model to begin…"
            }
            disabled={!modelId || isGenerating}
            className="flex-1 p-2.5 bg-canvas border border-line rounded-[6px] text-sm text-text-main placeholder:text-text-faint focus:outline-none focus:border-[var(--focus)] resize-none max-h-36 overflow-y-auto"
          />

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || !modelId || isGenerating}
            className="h-9 px-4 rounded-[6px] bg-text-main text-canvas font-medium text-xs hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
          >
            {isGenerating ? "Streaming…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
