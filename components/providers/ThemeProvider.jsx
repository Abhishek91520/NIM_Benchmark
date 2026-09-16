"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

export default function ThemeProvider({ children }) {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.setAttribute("data-theme", "light");
      root.classList.add("light");
      root.classList.remove("dark");
    } else if (theme === "dark") {
      root.removeAttribute("data-theme");
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      // system
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (systemDark) {
        root.removeAttribute("data-theme");
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.setAttribute("data-theme", "light");
        root.classList.add("light");
        root.classList.remove("dark");
      }
    }
  }, [theme]);

  return <>{children}</>;
}
