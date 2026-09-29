"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
  isCollapsed?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  showLabel = true,
  className = "",
  isCollapsed = false,
}) => {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const syncThemeFromDom = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    };

    // Initialize from localStorage or current class
    const saved = localStorage.getItem("crm_theme");
    if (saved === "light") {
      document.documentElement.classList.remove("dark");
      setTheme("light");
    } else {
      document.documentElement.classList.add("dark");
      setTheme("dark");
    }

    window.addEventListener("crm_theme_change", syncThemeFromDom);
    return () => window.removeEventListener("crm_theme_change", syncThemeFromDom);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("crm_theme", nextTheme);

    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Notify other toggle instances
    window.dispatchEvent(new Event("crm_theme_change"));
  };

  if (!mounted) {
    return (
      <div className={`p-2 rounded-xl border border-slate-200 dark:border-slate-800 ${className}`}>
        <div className="w-4 h-4" />
      </div>
    );
  }

  // Collapsed Sidebar View (compact icon button)
  if (isCollapsed) {
    return (
      <button
        onClick={toggleTheme}
        type="button"
        aria-label={`Switch to ${theme === "dark" ? "Normal (Light)" : "Dark"} Mode`}
        title={`Current: ${theme === "dark" ? "Dark Mode" : "Normal Mode"} (Click to switch)`}
        className={`w-full flex items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
          theme === "dark"
            ? "bg-slate-900 border-slate-800 text-indigo-400 hover:text-indigo-300 hover:bg-slate-850"
            : "bg-white border-slate-200 text-amber-500 hover:text-amber-600 hover:bg-slate-100 shadow-xs"
        } ${className}`}
      >
        {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={`Switch to ${theme === "dark" ? "Normal (Light)" : "Dark"} Mode`}
      title={`Current: ${theme === "dark" ? "Dark Mode" : "Normal Mode"} (Click to switch)`}
      className={`group w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl border transition-all cursor-pointer ${
        theme === "dark"
          ? "bg-slate-900/90 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-850"
          : "bg-white border-slate-200/90 text-slate-800 hover:border-slate-300 hover:bg-slate-50 shadow-xs"
      } ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`p-1 rounded-lg ${
            theme === "dark"
              ? "bg-indigo-950/70 text-indigo-400 border border-indigo-900/40"
              : "bg-amber-100 text-amber-600 border border-amber-200"
          }`}
        >
          {theme === "dark" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
        </div>
        {showLabel && (
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
            {theme === "dark" ? "Dark Mode" : "Normal Mode"}
          </span>
        )}
      </div>

      {/* Animated Pill Switch */}
      <div
        className={`w-9 h-5 rounded-full p-0.5 transition-colors relative flex items-center flex-shrink-0 ${
          theme === "dark" ? "bg-indigo-600" : "bg-amber-400"
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-out ${
            theme === "dark" ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </div>
    </button>
  );
};
