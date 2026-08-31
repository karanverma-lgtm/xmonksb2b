"use client";

import React from "react";
import { Lead } from "@/types/lead";
import { IndianRupee, TrendingUp, CheckCircle, Target, Award } from "lucide-react";

import { formatINR } from "@/lib/formatters";

interface DashboardStatsProps {
  leads: Lead[];
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ leads }) => {
  // 1. Total Unweighted Pipeline Value (excluding Closed Lost)
  const activeLeads = leads.filter((l) => l.stage !== "closed_lost");
  const totalPipeline = activeLeads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);

  // 2. Weighted Forecasted Value = sum(dealValue * (weightage / 100))
  const weightedPipeline = activeLeads.reduce(
    (acc, curr) => acc + (curr.dealValue || 0) * ((curr.weightage || 0) / 100),
    0
  );

  // 3. Closed Won Revenue
  const closedWonLeads = leads.filter((l) => l.stage === "closure");
  const closedWonRevenue = closedWonLeads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);

  // 4. Avg Weightage % across active pipeline
  const avgWeightage =
    activeLeads.length > 0
      ? Math.round(
          activeLeads.reduce((acc, curr) => acc + (curr.weightage || 0), 0) / activeLeads.length
        )
      : 0;

  const formatCurrency = (amount: number) => formatINR(amount);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Total Pipeline */}
      <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Unweighted Pipeline
            </p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {formatCurrency(totalPipeline)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Across <span className="font-semibold text-slate-700 dark:text-slate-300">{activeLeads.length}</span> active B2B opportunities
            </p>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/10 to-transparent pointer-events-none rounded-full blur-xl" />
      </div>

      {/* 2. Weighted Forecasted Revenue (Key Highlight) */}
      <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-white border border-indigo-500/30 shadow-lg shadow-indigo-950/20">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                Weighted Revenue Forecast
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Probability Adjusted
              </span>
            </div>
            <h3 className="text-2xl font-black text-white mt-1">
              {formatCurrency(weightedPipeline)}
            </h3>
            <p className="text-xs text-indigo-200/80 mt-1">
              Based on stage weightage (10% - 100%)
            </p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
        <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* 3. Closed Won Revenue */}
      <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Closed Won Revenue
            </p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(closedWonRevenue)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">100% Weightage</span> Achieved ({closedWonLeads.length} deals)
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Award className="w-6 h-6" />
          </div>
        </div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/10 to-transparent pointer-events-none rounded-full blur-xl" />
      </div>

      {/* 4. Average Pipeline Velocity / Weightage */}
      <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Avg Deal Weightage
            </p>
            <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
              {avgWeightage}%
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Average probability across active leads
            </p>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Target className="w-6 h-6" />
          </div>
        </div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-500/10 to-transparent pointer-events-none rounded-full blur-xl" />
      </div>
    </div>
  );
};
