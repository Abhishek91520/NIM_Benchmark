"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

export default function PromptEditor({
  promptItem,
  onSave,
  onCancel,
}) {
  const [title, setTitle] = useState(promptItem?.title || "");
  const [category, setCategory] = useState(promptItem?.category || "reasoning");
  const [prompt, setPrompt] = useState(promptItem?.prompt || "");
  const [evalType, setEvalType] = useState(promptItem?.evalType || "judge");
  const [rubric, setRubric] = useState(promptItem?.rubric || "");
  const [keywords, setKeywords] = useState(
    promptItem?.expectedKeywords ? promptItem.expectedKeywords.join(", ") : ""
  );
  const [schemaKeys, setSchemaKeys] = useState(
    promptItem?.expectedSchemaKeys ? promptItem.expectedSchemaKeys.join(", ") : ""
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const updated = {
      id: promptItem?.id || `custom-prompt-${Date.now()}`,
      title: title.trim() || "Untitled prompt",
      category,
      prompt: prompt.trim(),
      evalType,
      rubric: evalType === "judge" ? rubric.trim() : undefined,
      expectedKeywords:
        evalType === "keyword"
          ? keywords
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean)
          : undefined,
      expectedSchemaKeys:
        evalType === "json-valid"
          ? schemaKeys
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean)
          : undefined,
    };

    onSave(updated);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 rounded-[4px] border border-line bg-surface space-y-4 text-xs"
    >
      <div className="flex items-center justify-between border-b border-line pb-2.5">
        <h4 className="text-sm font-medium text-text">
          {promptItem ? "Edit benchmark prompt" : "Create benchmark prompt"}
        </h4>
        <button
          type="button"
          onClick={onCancel}
          className="text-text-muted hover:text-text p-1"
          aria-label="Close editor"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-text-muted">
            Prompt title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Quicksort implementation in Python"
            className="w-full px-3 h-8 bg-surface-raised border border-line rounded-[6px] text-xs text-text placeholder:text-text-faint focus:outline-none focus:border-focus focus:ring-1 focus:ring-focus font-sans"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-text-muted">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 h-8 bg-surface-raised border border-line rounded-[6px] text-xs text-text focus:outline-none focus:border-focus focus:ring-1 focus:ring-focus font-sans"
          >
            <option value="reasoning">Reasoning & logic</option>
            <option value="coding">Coding & algorithms</option>
            <option value="instruction">Instruction following</option>
            <option value="summarization">Summarization</option>
            <option value="structured">Structured output (JSON)</option>
            <option value="creative">Creative writing</option>
            <option value="long-context">Long context retrieval</option>
            <option value="speed-probe">Speed / latency probe</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-text-muted">
          Prompt instruction
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="Enter the prompt given to candidate models..."
          className="w-full p-3 bg-surface-raised border border-line rounded-[6px] text-xs font-mono text-text placeholder:text-text-faint focus:outline-none focus:border-focus focus:ring-1 focus:ring-focus"
          required
        />
      </div>

      {/* Evaluation Type */}
      <div className="space-y-2">
        <label className="text-xs text-text-muted">
          Evaluation method
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: "judge", label: "LLM judge", desc: "Automated scoring via rubric" },
            { id: "keyword", label: "Keyword match", desc: "Checks for required terms" },
            { id: "json-valid", label: "Valid JSON", desc: "Validates JSON structure" },
            { id: "none", label: "Speed probe", desc: "Excluded from quality score" },
          ].map((type) => {
            const isSelected = evalType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setEvalType(type.id)}
                className={`p-2.5 rounded-[4px] border text-left transition ${
                  isSelected
                    ? "bg-surface-raised border-text text-text"
                    : "bg-surface border-line text-text-muted hover:border-line-strong hover:text-text"
                }`}
              >
                <div className="text-xs font-medium">{type.label}</div>
                <div className="text-[11px] text-text-muted mt-0.5">{type.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conditional eval fields */}
      {evalType === "judge" && (
        <div className="space-y-1">
          <label className="text-xs text-text-muted">
            Judge grading rubric
          </label>
          <textarea
            value={rubric}
            onChange={(e) => setRubric(e.target.value)}
            rows={3}
            placeholder="Specify scoring criteria for the automated LLM judge..."
            className="w-full p-3 bg-surface-raised border border-line rounded-[6px] text-xs text-text placeholder:text-text-faint focus:outline-none focus:border-focus focus:ring-1 focus:ring-focus"
          />
        </div>
      )}

      {evalType === "keyword" && (
        <div className="space-y-1">
          <label className="text-xs text-text-muted">
            Expected keywords (comma-separated)
          </label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="e.g. O(n log n), pivot, partitioning, recursion"
            className="w-full px-3 h-8 bg-surface-raised border border-line rounded-[6px] text-xs font-mono text-text placeholder:text-text-faint focus:outline-none focus:border-focus focus:ring-1 focus:ring-focus"
          />
        </div>
      )}

      {evalType === "json-valid" && (
        <div className="space-y-1">
          <label className="text-xs text-text-muted">
            Required schema keys (comma-separated)
          </label>
          <input
            type="text"
            value={schemaKeys}
            onChange={(e) => setSchemaKeys(e.target.value)}
            placeholder="e.g. name, count, items, status"
            className="w-full px-3 h-8 bg-surface-raised border border-line rounded-[6px] text-xs font-mono text-text placeholder:text-text-faint focus:outline-none focus:border-focus focus:ring-1 focus:ring-focus"
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
        <button
          type="button"
          onClick={onCancel}
          className="h-8 px-3 rounded-[6px] border border-line bg-transparent hover:bg-surface-raised text-text transition text-xs"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="h-8 px-4 rounded-[6px] bg-text text-canvas hover:bg-white transition text-xs font-medium flex items-center gap-1.5"
        >
          <Check className="h-3.5 w-3.5" />
          <span>Save prompt</span>
        </button>
      </div>
    </form>
  );
}
