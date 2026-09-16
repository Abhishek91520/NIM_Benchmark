"use client";

import { useState, useEffect } from "react";
import Topbar from "./Topbar";
import LeftRail from "./LeftRail";
import BottomTabBar from "./BottomTabBar";
import CommandPalette from "./CommandPalette";

export default function AppShell({ children }) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-text-main font-sans">
      <Topbar onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />

      <div className="flex-1 flex min-w-0">
        <LeftRail />
        <main className="flex-1 min-w-0 max-w-[1440px] mx-auto px-4 sm:px-6 py-6 pb-20 md:pb-8 w-full">
          {children}
        </main>
      </div>

      <BottomTabBar />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
}
