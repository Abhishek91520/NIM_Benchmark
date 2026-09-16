"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Copy,
  Trash2,
  Edit2,
  ChevronRight,
} from "lucide-react";
import PromptEditor from "@/components/shared/PromptEditor";
import { DEFAULT_PROMPT_SUITE } from "@/lib/benchmark/default-suite";
import { storage } from "@/lib/storage";

export default function PromptsPage() {
  const [suites, setSuites] = useState([DEFAULT_PROMPT_SUITE]);
  const [activeSuiteId, setActiveSuiteId] = useState("default-suite-v1");
  const [editingPrompt, setEditingPrompt] = useState(null); // prompt object or 'new'
  const [isCreatingSuite, setIsCreatingSuite] = useState(false);
  const [newSuiteName, setNewSuiteName] = useState("");
  const [newSuiteDesc, setNewSuiteDesc] = useState("");

  useEffect(() => {
    async function loadCustomSuites() {
      const items = await storage.list("prompts:suite:");
      if (items && items.length > 0) {
        const custom = items.map((i) => i.value);
        setSuites([DEFAULT_PROMPT_SUITE, ...custom]);
      }
    }
    loadCustomSuites();
  }, []);

  const activeSuite = suites.find((s) => s.id === activeSuiteId) || suites[0];

  const handleDuplicateDefault = async () => {
    const newId = `suite_${Date.now()}`;
    const duplicated = {
      ...DEFAULT_PROMPT_SUITE,
      id: newId,
      name: `${DEFAULT_PROMPT_SUITE.name} (Custom copy)`,
      isDefault: false,
      prompts: DEFAULT_PROMPT_SUITE.prompts.map((p) => ({
        ...p,
        id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      })),
    };

    await storage.set(`prompts:suite:${newId}`, duplicated);
    setSuites((prev) => [...prev, duplicated]);
    setActiveSuiteId(newId);
  };

  const handleCreateSuite = async (e) => {
    e.preventDefault();
    if (!newSuiteName.trim()) return;

    const newId = `suite_${Date.now()}`;
    const newSuite = {
      id: newId,
      name: newSuiteName.trim(),
      description: newSuiteDesc.trim() || "Custom evaluation prompt suite",
      isDefault: false,
      prompts: [],
    };

    await storage.set(`prompts:suite:${newId}`, newSuite);
    setSuites((prev) => [...prev, newSuite]);
    setActiveSuiteId(newId);
    setNewSuiteName("");
    setNewSuiteDesc("");
    setIsCreatingSuite(false);
  };

  const handleDeleteSuite = async (suiteId) => {
    if (confirm("Delete this custom prompt suite?")) {
      await storage.remove(`prompts:suite:${suiteId}`);
      setSuites((prev) => prev.filter((s) => s.id !== suiteId));
      setActiveSuiteId("default-suite-v1");
    }
  };

  const handleSavePrompt = async (promptData) => {
    if (activeSuite.isDefault) {
      alert("Default suite is read-only. Duplicate it first to make modifications.");
      return;
    }

    let updatedPrompts = [...(activeSuite.prompts || [])];
    const existingIndex = updatedPrompts.findIndex((p) => p.id === promptData.id);

    if (existingIndex >= 0) {
      updatedPrompts[existingIndex] = promptData;
    } else {
      updatedPrompts.push(promptData);
    }

    const updatedSuite = { ...activeSuite, prompts: updatedPrompts };
    await storage.set(`prompts:suite:${activeSuite.id}`, updatedSuite);

    setSuites((prev) => prev.map((s) => (s.id === activeSuite.id ? updatedSuite : s)));
    setEditingPrompt(null);
  };

  const handleDeletePrompt = async (promptId) => {
    if (activeSuite.isDefault) {
      alert("Default suite is read-only. Duplicate it first to modify.");
      return;
    }

    const updatedPrompts = activeSuite.prompts.filter((p) => p.id !== promptId);
    const updatedSuite = { ...activeSuite, prompts: updatedPrompts };
    await storage.set(`prompts:suite:${activeSuite.id}`, updatedSuite);

    setSuites((prev) => prev.map((s) => (s.id === activeSuite.id ? updatedSuite : s)));
  };

  return (
    <div className="space-y-6 max-w-[1440px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-line-strong">
        <div>
          <h2 className="text-[26px] font-[550] text-text tracking-tight">Prompts</h2>
          <p className="text-xs text-text-muted mt-1 max-w-[68ch]">
            Benchmark prompt suites, test cases, and rubrics for automated LLM judging and deterministic assertions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDuplicateDefault}
            className="h-8 px-3 rounded-[6px] text-xs font-medium border border-line bg-transparent hover:bg-surface-raised text-text transition flex items-center gap-1.5"
          >
            <Copy className="h-3.5 w-3.5 text-text-muted" />
            <span>Duplicate default suite</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreatingSuite(true)}
            className="h-8 px-3 rounded-[6px] text-xs font-medium bg-text text-canvas hover:bg-white transition flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New suite</span>
          </button>
        </div>
      </div>

      {/* New Suite Drawer Form */}
      {isCreatingSuite && (
        <form
          onSubmit={handleCreateSuite}
          className="p-4 rounded-[4px] border border-line bg-surface space-y-3"
        >
          <div className="text-xs font-medium text-text">Create custom suite</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Suite name (e.g. Code reasoning suite)..."
              value={newSuiteName}
              onChange={(e) => setNewSuiteName(e.target.value)}
              className="px-3 h-8 bg-surface-raised border border-line rounded-[6px] text-xs text-text placeholder:text-text-faint focus:outline-none focus:border-focus focus:ring-1 focus:ring-focus font-sans"
              required
              autoFocus
            />
            <input
              type="text"
              placeholder="Description (optional)..."
              value={newSuiteDesc}
              onChange={(e) => setNewSuiteDesc(e.target.value)}
              className="px-3 h-8 bg-surface-raised border border-line rounded-[6px] text-xs text-text placeholder:text-text-faint focus:outline-none focus:border-focus focus:ring-1 focus:ring-focus font-sans"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsCreatingSuite(false)}
              className="h-8 px-3 rounded-[6px] text-xs text-text-muted hover:text-text hover:bg-surface-raised transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-8 px-4 rounded-[6px] bg-text text-canvas hover:bg-white text-xs font-medium transition"
            >
              Create suite
            </button>
          </div>
        </form>
      )}

      {/* Main Layout: Suites Sidebar + Prompts List */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Suites Sidebar */}
        <div className="lg:col-span-1 rounded-[4px] border border-line bg-surface p-3 space-y-2">
          <div className="text-xs text-text-muted px-2 py-1">
            Prompt suites ({suites.length})
          </div>
          <div className="space-y-1">
            {suites.map((s) => {
              const isActive = s.id === activeSuiteId;
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    setActiveSuiteId(s.id);
                    setEditingPrompt(null);
                  }}
                  className={`px-3 py-2.5 rounded-[4px] cursor-pointer transition flex items-center justify-between text-xs ${
                    isActive
                      ? "bg-surface-raised border-l-2 border-focus text-text font-medium"
                      : "hover:bg-surface-raised text-text-muted hover:text-text"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="truncate">{s.name}</div>
                    <div className="text-[11px] text-text-faint mt-0.5">
                      <span className="font-mono tabular-nums">{s.prompts?.length || 0}</span> prompts
                      {s.isDefault && " / built-in"}
                    </div>
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Suite Prompts View */}
        <div className="lg:col-span-3 space-y-4">
          {/* Suite Header Info */}
          <div className="p-4 rounded-[4px] border border-line bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-medium text-text">{activeSuite.name}</h3>
                {activeSuite.isDefault ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-[6px] bg-surface-raised border border-line text-text-muted">
                    Built-in suite (read-only)
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded-[6px] bg-surface-raised border border-line text-text">
                    Custom editable
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-1 max-w-[68ch]">
                {activeSuite.description}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!activeSuite.isDefault && (
                <>
                  <button
                    type="button"
                    onClick={() => setEditingPrompt("new")}
                    className="h-8 px-3 rounded-[6px] text-xs font-medium bg-text text-canvas hover:bg-white transition flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add prompt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSuite(activeSuite.id)}
                    className="h-8 px-3 rounded-[6px] text-xs font-medium border border-sig-fail text-sig-fail hover:bg-sig-fail/10 transition flex items-center gap-1.5"
                    title="Delete custom suite"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete suite</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Prompt Editor if active */}
          {editingPrompt && (
            <PromptEditor
              promptItem={editingPrompt === "new" ? null : editingPrompt}
              onSave={handleSavePrompt}
              onCancel={() => setEditingPrompt(null)}
            />
          )}

          {/* Prompts Cards Grid */}
          <div className="space-y-3">
            {(activeSuite.prompts || []).length === 0 ? (
              <div className="p-8 text-center border border-dashed border-line rounded-[4px] text-xs text-text-muted">
                No prompts in this suite yet. Click "Add prompt" to create one.
              </div>
            ) : (
              activeSuite.prompts.map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="p-4 rounded-[4px] border border-line bg-surface hover:bg-surface-raised transition space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-text tabular-nums">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-medium text-text">
                        {p.title || p.id}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-[6px] bg-surface-raised border border-line text-text-muted">
                        {p.category}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-[6px] bg-surface-raised border border-line text-text-muted">
                        {p.evalType}
                      </span>
                    </div>

                    {!activeSuite.isDefault && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingPrompt(p)}
                          className="h-7 w-7 flex items-center justify-center rounded-[4px] hover:bg-surface text-text-muted hover:text-text transition"
                          title="Edit prompt"
                          aria-label="Edit prompt"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePrompt(p.id)}
                          className="h-7 w-7 flex items-center justify-center rounded-[4px] hover:bg-surface text-text-muted hover:text-sig-fail transition"
                          title="Delete prompt"
                          aria-label="Delete prompt"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs font-mono text-text-muted line-clamp-3 bg-canvas p-3 rounded-[4px] border border-line select-text">
                    {p.prompt}
                  </p>

                  {p.rubric && (
                    <div className="text-[11px] text-text-muted">
                      <span className="text-text-faint">Rubric: </span>
                      <span>{p.rubric}</span>
                    </div>
                  )}

                  {p.expectedKeywords && p.expectedKeywords.length > 0 && (
                    <div className="text-[11px] text-text-muted font-mono">
                      <span className="text-text-faint font-sans">Keywords: </span>
                      <span>{p.expectedKeywords.slice(0, 5).join(", ")}</span>
                      {p.expectedKeywords.length > 5 && (
                        <span className="text-text-faint"> (+{p.expectedKeywords.length - 5} more)</span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
