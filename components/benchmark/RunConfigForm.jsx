"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { DEFAULT_PROMPT_SUITE } from "@/lib/benchmark/default-suite";
import { storage } from "@/lib/storage";

export default function RunConfigForm({
  availableModels = [],
  preselectedModelIds = [],
  onLaunch,
}) {
  const [selectedModels, setSelectedModels] = useState(
    preselectedModelIds.length > 0
      ? preselectedModelIds
      : availableModels
          .filter((m) => (m.category || "chat") === "chat")
          .slice(0, 4)
          .map((m) => m.id)
  );

  const [search, setSearch] = useState("");
  const [suiteId, setSuiteId] = useState("default");
  const [customSuites, setCustomSuites] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced settings
  const [timeBudgetSeconds, setTimeBudgetSeconds] = useState(38);
  const [judgeScoringEnabled, setJudgeScoringEnabled] = useState(true);

  // Selected prompt IDs (allows user to select between 1 and 8 prompts)
  const [selectedPromptIds, setSelectedPromptIds] = useState(() =>
    DEFAULT_PROMPT_SUITE.prompts.slice(0, 8).map((p) => p.id)
  );

  useEffect(() => {
    async function loadSuites() {
      const items = await storage.list("prompts:suite:");
      if (items && items.length > 0) {
        setCustomSuites(items.map((i) => i.value));
      }
    }
    loadSuites();
  }, []);

  useEffect(() => {
    if (selectedModels.length === 0 && availableModels.length > 0) {
      if (preselectedModelIds.length > 0) {
        setSelectedModels(preselectedModelIds);
      } else {
        const defaults = availableModels
          .filter((m) => (m.category || "chat") === "chat")
          .slice(0, 4)
          .map((m) => m.id);
        setSelectedModels(defaults);
      }
    }
  }, [availableModels, preselectedModelIds]);

  const activeSuite = useMemo(() => {
    if (suiteId === "default") return DEFAULT_PROMPT_SUITE;
    const found = customSuites.find((s) => s.id === suiteId);
    return found || DEFAULT_PROMPT_SUITE;
  }, [suiteId, customSuites]);

  // Sync selected prompt IDs when active suite changes
  useEffect(() => {
    if (activeSuite?.prompts) {
      setSelectedPromptIds(activeSuite.prompts.slice(0, 8).map((p) => p.id));
    }
  }, [suiteId]);

  const filteredModels = useMemo(() => {
    return availableModels.filter((m) => {
      if (search) {
        const q = search.toLowerCase();
        return m.id.toLowerCase().includes(q) || (m.owned_by || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [availableModels, search]);

  const toggleModel = (id) => {
    if (selectedModels.includes(id)) {
      setSelectedModels(selectedModels.filter((m) => m !== id));
    } else {
      setSelectedModels([...selectedModels, id]);
    }
  };

  const selectAll = () => {
    setSelectedModels(filteredModels.map((m) => m.id));
  };

  const deselectAll = () => {
    setSelectedModels([]);
  };

  // Selected prompts list derived from active suite & user selection
  const selectedPrompts = useMemo(() => {
    const list = (activeSuite.prompts || []).filter((p) => selectedPromptIds.includes(p.id));
    if (list.length === 0 && (activeSuite.prompts || []).length > 0) {
      return [activeSuite.prompts[0]];
    }
    return list;
  }, [activeSuite, selectedPromptIds]);

  // Set count between 1 and 8
  const handleSetPromptCount = (count) => {
    const clamped = Math.max(1, Math.min(count, Math.min(8, activeSuite.prompts?.length || 8)));
    const newIds = (activeSuite.prompts || []).slice(0, clamped).map((p) => p.id);
    setSelectedPromptIds(newIds);
  };

  // Toggle individual prompt in/out of selection (must keep at least 1, max 8)
  const handleTogglePrompt = (id) => {
    if (selectedPromptIds.includes(id)) {
      if (selectedPromptIds.length <= 1) return; // Keep at least 1 prompt
      setSelectedPromptIds(selectedPromptIds.filter((pId) => pId !== id));
    } else {
      if (selectedPromptIds.length >= 8) return; // Max 8 prompts
      setSelectedPromptIds([...selectedPromptIds, id]);
    }
  };

  const totalPairs = selectedModels.length * selectedPrompts.length;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedModels.length === 0 || selectedPrompts.length === 0) return;

    onLaunch({
      modelIds: selectedModels,
      promptSuite: {
        ...activeSuite,
        prompts: selectedPrompts,
      },
      judgeScoring: judgeScoringEnabled,
      timeBudgetMs: timeBudgetSeconds * 1000,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Step 1: Select Models Panel */}
      <div className="rounded-[4px] border border-line bg-surface p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-2.5">
          <div>
            <h3 className="text-xs font-semibold text-text font-sans">
              Candidate models ({selectedModels.length} selected)
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5 max-w-[68ch]">
              Select models to benchmark across test prompts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-[11px] text-text-muted hover:text-text px-2 py-0.5 rounded-[4px] hover:bg-surface-raised transition-colors"
            >
              Select visible
            </button>
            <button
              type="button"
              onClick={deselectAll}
              className="text-[11px] text-text-muted hover:text-text px-2 py-0.5 rounded-[4px] hover:bg-surface-raised transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-faint" />
          <input
            type="text"
            placeholder="Filter models…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 bg-canvas border border-line rounded-[6px] text-xs text-text placeholder:text-text-faint focus:outline-none focus:border-focus font-sans"
          />
        </div>

        {/* Model rows */}
        <div className="max-h-60 overflow-y-auto space-y-0.5 border border-line rounded-[4px] p-1 bg-canvas">
          {filteredModels.length === 0 ? (
            <div className="p-4 text-center text-xs text-text-faint">No models available</div>
          ) : (
            filteredModels.map((model) => {
              const isChecked = selectedModels.includes(model.id);
              return (
                <div
                  key={model.id}
                  onClick={() => toggleModel(model.id)}
                  className={`flex items-center justify-between p-2 rounded-[4px] cursor-pointer text-xs transition-colors duration-100 ${
                    isChecked
                      ? "bg-surface-raised text-text font-medium"
                      : "hover:bg-surface-raised/50 text-text-muted"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="h-3.5 w-3.5 rounded-[3px] accent-focus cursor-pointer"
                    />
                    <span className="font-mono text-xs truncate">{model.id}</span>
                  </div>
                  <span className="text-[11px] font-mono text-text-faint shrink-0 pl-2">
                    {model.owned_by}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Step 2: Prompt Suite & Prompts Count Selection (Option between 1 to 8 prompts/pairs) */}
      <div className="rounded-[4px] border border-line bg-surface p-4 space-y-3">
        <div className="border-b border-line pb-2">
          <h3 className="text-xs font-semibold text-text font-sans">Prompt suite</h3>
          <p className="text-[11px] text-text-muted mt-0.5 max-w-[68ch]">
            Select prompt suite and configure how many test prompts (between 1 to 8) to benchmark.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div
            onClick={() => setSuiteId("default")}
            className={`p-3 rounded-[4px] border cursor-pointer transition-colors duration-100 ${
              suiteId === "default"
                ? "bg-surface-raised border-line-strong text-text"
                : "border-line text-text-muted hover:text-text"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{DEFAULT_PROMPT_SUITE.name}</span>
              <span className="text-[10px] font-mono text-text-faint">Standard</span>
            </div>
            <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
              {DEFAULT_PROMPT_SUITE.description}
            </p>
            <div className="mt-2 text-[11px] font-mono text-text-faint">
              {DEFAULT_PROMPT_SUITE.prompts.length} total prompts available
            </div>
          </div>

          {customSuites.map((cs) => (
            <div
              key={cs.id}
              onClick={() => setSuiteId(cs.id)}
              className={`p-3 rounded-[4px] border cursor-pointer transition-colors duration-100 ${
                suiteId === cs.id
                  ? "bg-surface-raised border-line-strong text-text"
                  : "border-line text-text-muted hover:text-text"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{cs.name}</span>
                <span className="text-[10px] font-mono text-text-faint">Custom</span>
              </div>
              <p className="text-[11px] text-text-muted mt-1">
                {cs.description || "Custom prompt suite"}
              </p>
              <div className="mt-2 text-[11px] font-mono text-text-faint">
                {cs.prompts?.length || 0} prompts available
              </div>
            </div>
          ))}
        </div>

        {/* Option to select between 1 to 8 prompts/pairs */}
        <div className="space-y-2.5 pt-3 border-t border-line">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-xs font-medium text-text flex items-center gap-2">
                <span>Select test prompts ({selectedPrompts.length} of {Math.min(8, activeSuite.prompts?.length || 8)} selected)</span>
                <span className="font-mono text-[11px] text-text-muted">
                  ({selectedPrompts.length} pair{selectedPrompts.length > 1 ? "s" : ""} per model)
                </span>
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">
                Choose between 1 to 8 prompts to run. Select a quick preset or toggle individual test cases below.
              </p>
            </div>

            {/* Quick 1 to 8 count selector */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-text-muted mr-1">Count:</span>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
                const isSelected = selectedPrompts.length === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleSetPromptCount(num)}
                    className={`h-6 w-6 rounded-[4px] text-xs font-mono tabular-nums transition ${
                      isSelected
                        ? "bg-text text-canvas font-medium"
                        : "bg-surface-raised border border-line text-text-muted hover:text-text hover:bg-line"
                    }`}
                    title={`Select first ${num} prompt${num > 1 ? "s" : ""}`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prompt list with individual checkboxes */}
          <div className="max-h-56 overflow-y-auto space-y-1 border border-line rounded-[4px] p-1.5 bg-canvas">
            {(activeSuite.prompts || []).slice(0, 8).map((p, idx) => {
              const isChecked = selectedPromptIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => handleTogglePrompt(p.id)}
                  className={`flex items-center justify-between p-2 rounded-[4px] cursor-pointer text-xs transition-colors duration-100 ${
                    isChecked
                      ? "bg-surface-raised text-text font-medium"
                      : "hover:bg-surface-raised/50 text-text-muted"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="h-3.5 w-3.5 rounded-[3px] accent-focus cursor-pointer"
                    />
                    <span className="font-mono text-[11px] text-text-faint tabular-nums shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="truncate">{p.title || p.id}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 pl-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-surface border border-line text-text-muted font-sans">
                      {p.category}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-surface border border-line text-text-muted font-sans">
                      {p.evalType}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Advanced Settings Collapsible */}
      <div className="rounded-[4px] border border-line bg-surface p-3.5">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between text-xs text-text-muted hover:text-text transition-colors"
        >
          <span>Advanced settings</span>
          {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {showAdvanced && (
          <div className="mt-3 pt-3 border-t border-line grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <span className="text-text-muted">Batch time budget</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="15"
                  max="55"
                  value={timeBudgetSeconds}
                  onChange={(e) => setTimeBudgetSeconds(parseInt(e.target.value, 10) || 38)}
                  className="w-16 h-6 px-1.5 bg-canvas border border-line rounded-[4px] font-mono text-xs tabular-nums text-right text-text"
                />
                <span className="text-[11px] text-text-faint">seconds per batch</span>
              </div>
            </div>

            <label className="flex items-center justify-between cursor-pointer pt-2">
              <span className="text-text">Automated judge grading</span>
              <input
                type="checkbox"
                checked={judgeScoringEnabled}
                onChange={(e) => setJudgeScoringEnabled(e.target.checked)}
                className="h-3.5 w-3.5 rounded-[3px] accent-focus cursor-pointer"
              />
            </label>
          </div>
        )}
      </div>

      {/* Action Bar with Outcome-Naming Button */}
      <div className="p-3.5 rounded-[4px] border border-line bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs font-mono text-text-muted">
          <span>
            {selectedModels.length} models × {selectedPrompts.length} prompt{selectedPrompts.length > 1 ? "s" : ""} ={" "}
            <span className="text-text font-medium">{totalPairs} pairs</span>
          </span>
        </div>

        <button
          type="submit"
          disabled={selectedModels.length === 0 || selectedPrompts.length === 0}
          className="h-8 px-5 rounded-[6px] bg-text text-canvas font-medium text-xs hover:bg-white transition-opacity disabled:opacity-50"
        >
          Run benchmark ({totalPairs} pairs)
        </button>
      </div>
    </form>
  );
}
