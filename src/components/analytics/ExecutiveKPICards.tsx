"use client";

import React from "react";
import { Lead } from "@/types/lead";
import { STAGES } from "@/constants/stages";
import { formatINR } from "@/lib/formatters";
import {
  TrendingUp,
  Target,
  Trophy,
  PieChart,
  CalendarCheck2,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";

interface ExecutiveKPICardsProps {
  leads: Lead[];
  onSelectLead?: (lead: Lead) => void;
}

export const ExecutiveKPICards: React.FC<ExecutiveKPICardsProps> = ({ leads }) => {
  // 1. Total Pipeline Value (Unweighted)
  const totalPipelineValue = leads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);
  const activeLeads = leads.filter((l) => l.stage !== "closed_lost");

  // 2. Weighted Forecast
  const totalWeightedValue = leads.reduce((acc, curr) => {
    const stageInfo = STAGES[curr.stage];
    const weight = stageInfo?.weightage ?? curr.weightage ?? 0;
    return acc + (curr.dealValue || 0) * (weight / 100);
  }, 0);

  const weightedPercentage =
    totalPipelineValue > 0 ? (totalWeightedValue / totalPipelineValue) * 100 : 0;

  // 3. Win Rate %
  const wonLeads = leads.filter((l) => l.stage === "closure");
  const lostLeads = leads.filter((l) => l.stage === "closed_lost");
  const totalClosed = wonLeads.length + lostLeads.length;
  const winRate =
    totalClosed > 0
      ? (wonLeads.length / totalClosed) * 100
      : leads.length > 0
      ? (wonLeads.length / leads.length) * 100
      : 0;

  const wonRevenue = wonLeads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);

  // 4. Average Deal Size (ACV)
  const avgDealSize = leads.length > 0 ? Math.round(totalPipelineValue / leads.length) : 0;
  const maxDealLead = leads.reduce<Lead | null>((max, curr) => {
    if (!max || (curr.dealValue || 0) > (max.dealValue || 0)) return curr;
    return max;
  }, null);

  // 5. Closing This Month
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`; // e.g. "2026-09"
  const currentMonthName = now.toLocaleString("en-US", { month: "short", year: "numeric" });

  const closingThisMonthLeads = leads.filter((l) => {
    if (l.stage === "closed_lost") return false;
    if (l.closureMonth && l.closureMonth === currentMonthStr) return true;
    if (l.expectedCloseDate && l.expectedCloseDate.startsWith(currentMonthStr)) return true;
    return false;
  });

  const closingThisMonthValue = closingThisMonthLeads.reduce(
    (acc, curr) => acc + (curr.dealValue || 0),
    0
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Total Pipeline Value */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-indigo-500/40 transition-all flex flex-col justify-between group">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Pipeline Value
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {formatINR(totalPipelineValue)}
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span>Active Accounts</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {activeLeads.length} deals
          </span>
        </div>
      </div>

      {/* 2. Weighted Forecast */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-indigo-500/40 transition-all flex flex-col justify-between group">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Weighted Forecast
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-xl sm:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight">
            {formatINR(totalWeightedValue)}
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span>Probability Adjusted</span>
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
            {weightedPercentage.toFixed(1)}% Realization
          </span>
        </div>
      </div>

      {/* 3. Win Rate % */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-emerald-500/40 transition-all flex flex-col justify-between group">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Win Rate %
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {winRate.toFixed(1)}%
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span className="truncate">{wonLeads.length} Won Deals</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
            {formatINR(wonRevenue)}
          </span>
        </div>
      </div>

      {/* 4. Average Deal Size (ACV) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-purple-500/40 transition-all flex flex-col justify-between group">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Avg Deal Size (ACV)
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {formatINR(avgDealSize)}
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span>Largest Deal</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono truncate max-w-[100px]">
            {maxDealLead ? formatINR(maxDealLead.dealValue || 0) : "₹0"}
          </span>
        </div>
      </div>

      {/* 5. Closing This Month */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-amber-500/40 transition-all flex flex-col justify-between group">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              Closing ({currentMonthName})
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <CalendarCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
            {formatINR(closingThisMonthValue)}
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span>Target Deadline</span>
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            {closingThisMonthLeads.length} deals targeted
          </span>
        </div>
      </div>
    </div>
  );
};
