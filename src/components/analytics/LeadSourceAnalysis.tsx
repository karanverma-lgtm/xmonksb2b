"use client";

import React, { useMemo } from "react";
import { Lead } from "@/types/lead";
import { LEAD_SOURCES, getLeadSourceBadgeStyle } from "@/constants/leadSources";
import { formatINR } from "@/lib/formatters";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Target, Trophy, Flame, Zap, Award } from "lucide-react";

interface LeadSourceAnalysisProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

const SOURCE_COLORS: Record<string, string> = {
  "Event Based": "#0284c7",
  "Self Created": "#10b981",
  "Marketing": "#a855f7",
  "TASC Upselling": "#f59e0b",
};

export const LeadSourceAnalysis: React.FC<LeadSourceAnalysisProps> = ({
  leads,
}) => {
  const sourceStats = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        totalValue: number;
        leads: Lead[];
        count: number;
        wonCount: number;
        wonValue: number;
      }
    >();

    LEAD_SOURCES.forEach((s) => {
      map.set(s.name, {
        name: s.name,
        totalValue: 0,
        leads: [],
        count: 0,
        wonCount: 0,
        wonValue: 0,
      });
    });

    leads.forEach((l) => {
      const srcName = l.leadSource?.trim() || "Self Created";
      let existing = map.get(srcName);
      if (!existing) {
        existing = {
          name: srcName,
          totalValue: 0,
          leads: [],
          count: 0,
          wonCount: 0,
          wonValue: 0,
        };
        map.set(srcName, existing);
      }

      const val = l.dealValue || 0;
      existing.totalValue += val;
      existing.count += 1;
      existing.leads.push(l);

      if (l.stage === "closure") {
        existing.wonCount += 1;
        existing.wonValue += val;
      }
    });

    const results = Array.from(map.values())
      .filter((s) => s.count > 0)
      .map((s) => {
        const winRate = s.count > 0 ? (s.wonCount / s.count) * 100 : 0;
        const avgDealSize = s.count > 0 ? Math.round(s.totalValue / s.count) : 0;
        return {
          ...s,
          winRate,
          avgDealSize,
          chartValue: s.totalValue,
        };
      });

    results.sort((a, b) => b.totalValue - a.totalValue);
    return results;
  }, [leads]);

  // Find top channels by metrics
  const topRevenueSource = sourceStats[0];
  const topWinRateSource = [...sourceStats].sort((a, b) => b.winRate - a.winRate)[0];
  const topTicketSource = [...sourceStats].sort((a, b) => b.avgDealSize - a.avgDealSize)[0];

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <Target className="w-5 h-5 text-emerald-500" />
              <span>Lead Source & Acquisition ROI</span>
            </h3>
            <p className="text-xs text-slate-500">
              Evaluating channel quality, conversion win rates, and pipeline generation
            </p>
          </div>
        </div>

        {/* Highlights Banner */}
        {sourceStats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
            {topRevenueSource && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Award className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Top Pipeline Generator</div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {topRevenueSource.name}
                  </div>
                  <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                    {formatINR(topRevenueSource.totalValue)}
                  </div>
                </div>
              </div>
            )}

            {topWinRateSource && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Highest Win Rate</div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {topWinRateSource.name}
                  </div>
                  <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                    {topWinRateSource.winRate.toFixed(1)}% Conversion
                  </div>
                </div>
              </div>
            )}

            {topTicketSource && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Flame className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Largest Ticket Size</div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {topTicketSource.name}
                  </div>
                  <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                    {formatINR(topTicketSource.avgDealSize)} avg
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Source Breakdown Table / Cards */}
        <div className="space-y-2.5">
          {sourceStats.map((src) => {
            const badge = getLeadSourceBadgeStyle(src.name);
            return (
              <div
                key={src.name}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${badge.dotColor}`} />
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center space-x-1.5">
                      <span>{src.name}</span>
                      <span className="text-[10px] font-normal text-slate-400">
                        ({src.count} {src.count === 1 ? "lead" : "leads"})
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center space-x-2 mt-0.5">
                      <span>Win Rate: <strong className="text-slate-700 dark:text-slate-300">{src.winRate.toFixed(1)}%</strong> ({src.wonCount} won)</span>
                      <span>•</span>
                      <span>Avg Ticket: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatINR(src.avgDealSize)}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                    {formatINR(src.totalValue)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Pipeline Value
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
