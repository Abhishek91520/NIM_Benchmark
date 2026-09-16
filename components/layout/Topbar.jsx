"use client";

import Link from "next/link";
import { Search, Sun, Moon, Monitor, Key, MoreVertical } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export default function Topbar({ onOpenCommandPalette }) {
  const { theme, setTheme, apiKeyStatus, setApiKeyStatus } = useAppStore();
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const { data, isError, error } = useQuery({
    queryKey: ["models-health-initial"],
    queryFn: async () => {
      const res = await fetch("/api/models");
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message || `HTTP ${res.status}`);
      }
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (isError) {
      setApiKeyStatus({
        checked: true,
        valid: false,
        message: error?.message || "API key missing or invalid",
      });
    } else if (data) {
      setApiKeyStatus({
        checked: true,
        valid: true,
        message: `${data.models?.length || 0} models available`,
      });
    }
  }, [data, isError, error, setApiKeyStatus]);

  const toggleTheme = () => {
    if (theme === "dark") setTheme("light");
    else if (theme === "light") setTheme("system");
    else setTheme("dark");
  };

  return (
    <header className="h-12 w-full border-b border-line bg-surface px-4 flex items-center justify-between z-40 sticky top-0">
      {/* Product Name (Plain text, no logo lockup per Section 4) */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="font-medium text-sm text-text-main tracking-tight hover:text-text-muted transition-colors"
        >
          NIM Console
        </Link>
      </div>

      {/* Center ⌘K command palette trigger */}
      <div className="flex-1 max-w-sm mx-4 hidden sm:block">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="w-full h-7 px-2.5 bg-canvas hover:bg-surface-raised border border-line rounded-[6px] text-xs text-text-muted flex items-center justify-between transition-colors duration-100"
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-text-faint" />
            <span>Search models & views…</span>
          </div>
          <kbd className="font-mono text-[10px] text-text-faint px-1 bg-surface rounded-[4px] border border-line">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right status dot & controls */}
      <div className="flex items-center gap-3">
        {/* Mobile search icon */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="sm:hidden p-1.5 text-text-muted hover:text-text-main"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Key Status Dot */}
        <Link
          href="/settings"
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-main py-1 px-2 rounded-[6px] transition-colors"
          title={apiKeyStatus.valid ? "NVIDIA API key connected" : "NVIDIA API key missing/invalid"}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              backgroundColor: apiKeyStatus.valid ? "var(--sig-ok)" : "var(--sig-fail)",
            }}
          />
          <span className="hidden md:inline font-mono text-[11px] text-text-faint">
            {apiKeyStatus.valid ? "key:ok" : "key:missing"}
          </span>
        </Link>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-1.5 rounded-[6px] text-text-muted hover:text-text-main hover:bg-surface-raised transition-colors"
          title={`Theme: ${theme}`}
          aria-label="Toggle theme"
        >
          {theme === "light" ? (
            <Sun className="h-4 w-4" />
          ) : theme === "system" ? (
            <Monitor className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>
    </header>
  );
}
