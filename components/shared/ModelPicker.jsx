"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Search, Check, Star } from "lucide-react";
import { CATEGORIES } from "@/lib/model-categorizer";
import { useAppStore } from "@/store/useAppStore";

export default function ModelPicker({
  value,
  onChange,
  filterCategory = null,
  disabled = false,
  placeholder = "Select an NVIDIA model...",
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(filterCategory || "all");
  const containerRef = useRef(null);

  const { favorites, toggleFavorite, categoryOverrides } = useAppStore();

  const { data, isLoading } = useQuery({
    queryKey: ["models"],
    queryFn: async () => {
      const res = await fetch("/api/models");
      if (!res.ok) throw new Error("Failed to load models");
      return res.json();
    },
  });

  const models = data?.models || [];

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      const cat = categoryOverrides[m.id] || m.category || "chat";
      if (activeCategory !== "all" && cat !== activeCategory) {
        return false;
      }
      if (filterCategory && cat !== filterCategory) {
        return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return m.id.toLowerCase().includes(q) || (m.owned_by || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [models, activeCategory, filterCategory, search, categoryOverrides]);

  const selectedModel = models.find((m) => m.id === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 h-8 bg-surface hover:bg-surface-raised border border-line rounded-[6px] text-left text-xs transition disabled:opacity-40"
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedModel ? (
            <>
              <span className="font-mono text-text truncate">
                {selectedModel.id}
              </span>
              <span className="text-[11px] text-text-muted px-1.5 py-0.2 bg-surface-raised border border-line rounded-[4px] shrink-0">
                {selectedModel.owned_by}
              </span>
            </>
          ) : (
            <span className="text-text-muted">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-text-muted shrink-0 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-[4px] border border-line bg-surface shadow-2xl p-2 min-w-[320px] max-w-lg">
          {/* Search box */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="Search model by name or publisher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 h-8 bg-surface-raised border border-line rounded-[6px] text-xs text-text placeholder:text-text-faint focus:outline-none focus:border-focus focus:ring-1 focus:ring-focus font-sans"
              autoFocus
            />
          </div>

          {/* Category tabs if not pre-filtered */}
          {!filterCategory && (
            <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 border-b border-line scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium whitespace-nowrap transition ${
                  activeCategory === "all"
                    ? "bg-text text-canvas"
                    : "text-text-muted hover:text-text hover:bg-surface-raised"
                }`}
              >
                All
              </button>
              {Object.entries(CATEGORIES).map(([catKey, catInfo]) => (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setActiveCategory(catKey)}
                  className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium whitespace-nowrap transition ${
                    activeCategory === catKey
                      ? "bg-text text-canvas"
                      : "text-text-muted hover:text-text hover:bg-surface-raised"
                  }`}
                >
                  {catInfo.label}
                </button>
              ))}
            </div>
          )}

          {/* Model list */}
          <div className="max-h-64 overflow-y-auto space-y-0.5 pr-1">
            {isLoading ? (
              <div className="p-4 text-center text-xs text-text-muted">Loading models...</div>
            ) : filteredModels.length === 0 ? (
              <div className="p-4 text-center text-xs text-text-muted">
                No matching models found
              </div>
            ) : (
              filteredModels.map((model) => {
                const isSelected = model.id === value;
                const isFav = favorites.includes(model.id);
                return (
                  <div
                    key={model.id}
                    onClick={() => {
                      onChange(model.id);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-[4px] cursor-pointer transition text-xs ${
                      isSelected
                        ? "bg-focus-soft border-l-2 border-focus text-text"
                        : "hover:bg-surface-raised text-text"
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono truncate">{model.id}</span>
                        {isSelected && <Check className="h-3 w-3 text-focus shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-text-muted">
                        <span>{model.owned_by}</span>
                        <span className="text-text-faint">/</span>
                        <span>{CATEGORIES[model.category]?.label || model.category}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(model.id);
                      }}
                      className="p-1 text-text-faint hover:text-sig-warn transition"
                      aria-label="Favorite model"
                    >
                      <Star className={`h-3.5 w-3.5 ${isFav ? "fill-sig-warn text-sig-warn" : ""}`} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
