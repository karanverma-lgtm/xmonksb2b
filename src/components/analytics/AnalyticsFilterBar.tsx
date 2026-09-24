"use client";

import React from "react";
import { Filter, Calendar, RotateCcw, Download, Printer, User, Briefcase, Building2 } from "lucide-react";
import { PRESET_PROGRAMS } from "@/constants/programs";

export type DateRangePreset = "all" | "this_month" | "this_quarter" | "fy26_27" | "next_90_days";

export interface AnalyticsFilterState {
  dateRange: DateRangePreset;
  program: string;
  owner: string;
  industry: string;
}

interface AnalyticsFilterBarProps {
  filters: AnalyticsFilterState;
  onFilterChange: (newFilters: AnalyticsFilterState) => void;
  onResetFilters: () => void;
  onExportCSV: () => void;
  onPrintReport: () => void;
  availableOwners: string[];
  availableIndustries: string[];
}

export const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  onExportCSV,
  onPrintReport,
  availableOwners,
  availableIndustries,
}) => {
  const activeCount =
    (filters.dateRange !== "all" ? 1 : 0) +
    (filters.program !== "all" ? 1 : 0) +
    (filters.owner !== "all" ? 1 : 0) +
    (filters.industry !== "all" ? 1 : 0);

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      {/* Filters Group */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mr-1">
          <Filter className="w-4 h-4 text-indigo-500" />
          <span>Analytics Filter:</span>
        </div>

        {/* Date Range Preset */}
        <div className="relative">
          <select
            value={filters.dateRange}
            onChange={(e) =>
              onFilterChange({ ...filters, dateRange: e.target.value as DateRangePreset })
            }
            className="text-xs py-1.5 pl-3 pr-7 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="all">📅 All Time Horizon</option>
            <option value="this_month">📅 This Month Target</option>
            <option value="this_quarter">📅 This Quarter (Q3 2026)</option>
            <option value="fy26_27">📅 FY 2026-27 Full Year</option>
            <option value="next_90_days">📅 Next 90 Days Closing</option>
          </select>
        </div>

        {/* Program Filter */}
        <div className="relative">
          <select
            value={filters.program}
            onChange={(e) => onFilterChange({ ...filters, program: e.target.value })}
            className="text-xs py-1.5 pl-3 pr-7 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="all">💼 All Programs</option>
            {PRESET_PROGRAMS.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Owner Filter */}
        <div className="relative">
          <select
            value={filters.owner}
            onChange={(e) => onFilterChange({ ...filters, owner: e.target.value })}
            className="text-xs py-1.5 pl-3 pr-7 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="all">👤 All Deal Owners</option>
            {availableOwners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
        </div>

        {/* Industry Filter */}
        <div className="relative">
          <select
            value={filters.industry}
            onChange={(e) => onFilterChange({ ...filters, industry: e.target.value })}
            className="text-xs py-1.5 pl-3 pr-7 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="all">🏢 All Industries</option>
            {availableIndustries.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Button */}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset ({activeCount})</span>
          </button>
        )}
      </div>

      {/* Action / Export Buttons */}
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={onPrintReport}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 transition-colors shadow-xs"
        >
          <Printer className="w-3.5 h-3.5 text-indigo-500" />
          <span>Executive Briefing</span>
        </button>

        <button
          type="button"
          onClick={onExportCSV}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV Report</span>
        </button>
      </div>
    </div>
  );
};
