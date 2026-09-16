"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Cpu,
  PlayCircle,
  Columns2,
  Gauge,
  History,
  BookOpen,
  Binary,
  Settings,
  X,
} from "lucide-react";

const PAGES = [
  { href: "/", label: "Dashboard", icon: Cpu, type: "Page" },
  { href: "/playground", label: "Playground", icon: PlayCircle, type: "Page" },
  { href: "/compare", label: "Compare", icon: Columns2, type: "Page" },
  { href: "/benchmark", label: "Benchmark", icon: Gauge, type: "Page" },
  { href: "/embeddings", label: "Embeddings", icon: Binary, type: "Page" },
  { href: "/history", label: "History", icon: History, type: "Page" },
  { href: "/prompts", label: "Prompts", icon: BookOpen, type: "Page" },
  { href: "/settings", label: "Settings", icon: Settings, type: "Page" },
];

export default function CommandPalette({ isOpen, onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const { data } = useQuery({
    queryKey: ["models"],
    queryFn: async () => {
      const res = await fetch("/api/models");
      if (!res.ok) return { models: [] };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const models = data?.models || [];

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Combined searchable items
  const items = [];
  const q = query.toLowerCase().trim();

  // Filter pages
  for (const page of PAGES) {
    if (!q || page.label.toLowerCase().includes(q)) {
      items.push({
        id: `page-${page.href}`,
        title: page.label,
        subtitle: page.href,
        icon: page.icon,
        action: () => {
          router.push(page.href);
          onClose();
        },
      });
    }
  }

  // Filter models
  for (const model of models) {
    if (
      !q ||
      model.id.toLowerCase().includes(q) ||
      (model.owned_by || "").toLowerCase().includes(q)
    ) {
      items.push({
        id: `model-${model.id}`,
        title: model.id,
        subtitle: `${model.owned_by} • ${model.category}`,
        isModel: true,
        action: () => {
          router.push(`/playground?model=${encodeURIComponent(model.id)}`);
          onClose();
        },
      });
      if (items.length >= 25) break; // Limit list size
    }
  }

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (items.length > 0 ? (prev - 1 + items.length) % items.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[selectedIndex]) {
        items[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-[4px] border border-line-strong bg-surface text-text-main shadow-[0_8px_24px_rgba(0,0,0,0.45)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center px-3.5 py-3 border-b border-line">
          <Search className="h-4 w-4 text-text-muted shrink-0 mr-2.5" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search models..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm placeholder:text-text-faint focus:outline-none font-sans"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-text-faint bg-surface-raised rounded-[4px] border border-line">
            Esc
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-1.5 space-y-0.5">
          {items.length === 0 ? (
            <div className="p-6 text-center text-xs text-text-muted">
              No results found for "{query}"
            </div>
          ) : (
            items.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon || Cpu;

              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-[4px] cursor-pointer text-xs transition-colors duration-100 ${
                    isSelected ? "bg-surface-raised text-text-main" : "text-text-muted"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className={`truncate ${item.isModel ? "font-mono" : "font-sans font-medium"}`}>
                      {item.title}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-text-faint shrink-0 pl-2">
                    {item.subtitle}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
