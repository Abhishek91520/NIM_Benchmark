"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Cpu,
  PlayCircle,
  Columns2,
  Gauge,
  History,
  BookOpen,
  Settings,
  Sparkles,
  Binary,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Cpu },
  { href: "/playground", label: "Playground", icon: PlayCircle },
  { href: "/compare", label: "Compare", icon: Columns2 },
  { href: "/benchmark", label: "Benchmark", icon: Gauge },
  { href: "/embeddings", label: "Embeddings", icon: Binary },
  { href: "/history", label: "History", icon: History },
  { href: "/prompts", label: "Prompts", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Navbar() {
  const pathname = usePathname();
  const { apiKeyStatus, setApiKeyStatus } = useAppStore();

  const { data, error, isError, isLoading } = useQuery({
    queryKey: ["models-health-check-initial"],
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
        message: error?.message || "NVIDIA_API_KEY missing or invalid",
      });
    } else if (data) {
      setApiKeyStatus({
        checked: true,
        valid: true,
        message: `${data.models?.length || 0} models operational`,
      });
    }
  }, [data, isError, error, setApiKeyStatus]);

  const appName = process.env.NEXT_PUBLIC_APP_NAME || "NIM Console";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/90 backdrop-blur-md">
      {/* Persistent Missing/Invalid Key Banner */}
      {apiKeyStatus.checked && !apiKeyStatus.valid && (
        <div className="w-full bg-rose-950/80 border-b border-rose-800/80 px-4 py-2 text-rose-200 text-sm flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>
              <strong>NVIDIA_API_KEY missing or invalid</strong> — Add it to your <code>.env.local</code> (or Vercel
              environment variables) and reload.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="text-xs bg-rose-900/60 hover:bg-rose-800 text-rose-100 px-2.5 py-1 rounded border border-rose-700 transition"
            >
              Configure in Settings
            </Link>
            <a
              href="https://build.nvidia.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-rose-300 hover:text-rose-100 flex items-center gap-1 underline transition"
            >
              Get Key <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between">
        {/* Logo & Branding */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
              <Sparkles className="h-4 w-4 fill-current" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 font-bold tracking-tight text-foreground text-base">
                <span>{appName}</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  NIM
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground -mt-0.5 font-sans">
                NVIDIA Catalog & Benchmark
              </span>
            </div>
          </Link>

          {/* Nav items */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Status indicator & quick controls */}
        <div className="flex items-center gap-3">
          {/* Key status pill */}
          <div className="hidden sm:flex items-center text-xs">
            {isLoading ? (
              <span className="flex items-center gap-1.5 text-muted-foreground px-2.5 py-1 rounded-full bg-accent/40 border border-border/60">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                Connecting...
              </span>
            ) : apiKeyStatus.valid ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 font-mono text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{data?.models?.length || 0} Models Active</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 font-mono text-[11px]">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>No API Key</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Nav Bar */}
      <div className="md:hidden flex items-center overflow-x-auto px-4 py-2 border-t border-border/40 gap-1 bg-background">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs whitespace-nowrap transition ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
