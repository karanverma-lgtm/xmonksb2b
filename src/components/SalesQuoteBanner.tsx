"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sparkles, RefreshCw, Copy, Check } from "lucide-react";

interface QuoteData {
  quote: string;
  tag: string;
  timestamp: string;
}

const STORAGE_KEY = "xmonks_sales_quote_v1";
const ROTATION_INTERVAL_MS = 10 * 1000; // 10 seconds rotation

const DEFAULT_QUOTE: QuoteData = {
  quote: "May your coffee be strong and your pipeline follow-ups be warm today ☕",
  tag: "Morning Fuel",
  timestamp: new Date().toISOString(),
};

export const SalesQuoteBanner: React.FC = () => {
  const [quoteData, setQuoteData] = useState<QuoteData>(DEFAULT_QUOTE);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFading, setIsFading] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [timerKey, setTimerKey] = useState<number>(0);

  const fetchNewQuote = useCallback(async (isManual: boolean = false) => {
    setIsFading(true);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/quotes/random?force=${isManual ? "true" : "false"}&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.quote) {
          setTimeout(() => {
            const freshData: QuoteData = {
              quote: data.quote,
              tag: data.tag || "Sales Wisdom",
              timestamp: new Date().toISOString(),
            };
            setQuoteData(freshData);
            setIsFading(false);

            if (typeof window !== "undefined") {
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(freshData));
              } catch {}
            }
          }, 180);
          return;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch fresh quote:", err);
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsFading(false), 220);
    }
  }, []);

  // 10-second automatic rotation
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNewQuote(false);
    }, ROTATION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchNewQuote, timerKey]);

  const handleManualRefresh = () => {
    setTimerKey((prev) => prev + 1); // Reset the 10-second timer
    fetchNewQuote(true);
  };

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`"${quoteData.quote}" — ${quoteData.tag}`).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    }
  };

  return (
    <div
      className="relative flex items-center space-x-2.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl shadow-2xs w-full max-w-xl min-w-0 transition-all hover:border-amber-300 dark:hover:border-amber-700 group"
      title={`"${quoteData.quote}" — Click copy icon or refresh for a new one`}
    >
      {/* Icon Pill */}
      <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500/20 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
        <Sparkles className="w-3.5 h-3.5" />
      </div>

      {/* Quote Content with 10s Crossfade Transition */}
      <div className="flex items-center space-x-2 flex-1 min-w-0 overflow-hidden">
        <p
          className={`text-xs font-medium italic text-slate-800 dark:text-slate-200 truncate flex-1 min-w-0 transition-all duration-200 ${
            isFading ? "opacity-0 -translate-y-0.5" : "opacity-100 translate-y-0"
          }`}
        >
          &ldquo;{quoteData.quote}&rdquo;
        </p>

        {quoteData.tag && (
          <span
            className={`inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/80 shrink-0 transition-opacity duration-200 ${
              isFading ? "opacity-30" : "opacity-100"
            }`}
          >
            {quoteData.tag}
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-1 shrink-0">
        {/* Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          className="p-1 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 transition cursor-pointer"
          title={isCopied ? "Copied to clipboard!" : "Copy quote"}
        >
          {isCopied ? (
            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>

        {/* Get New One Button */}
        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={isLoading}
          className="flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/70 hover:bg-amber-200/80 dark:bg-amber-900/40 dark:hover:bg-amber-900/70 border border-amber-200/80 dark:border-amber-800/80 transition cursor-pointer disabled:opacity-50 active:scale-95 shadow-2xs"
          title="Get another motivational or funny quote"
        >
          <RefreshCw
            className={`w-3 h-3 ${isLoading ? "animate-spin text-amber-600 dark:text-amber-400" : ""}`}
          />
          <span className="hidden xl:inline">{isLoading ? "Rolling..." : "Get new one"}</span>
        </button>
      </div>
    </div>
  );
};
