"use client";

import React from "react";
import { Filter, Calendar, Percent, RotateCcw, Search } from "lucide-react";
import { STAGES, STAGE_ORDER } from "@/constants/stages";

interface FilterBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  fromDate: string;
  setFromDate: (date: string) => void;
  toDate: string;
  setToDate: (date: string) => void;
  selectedWeightage: string;
  setSelectedWeightage: (weightage: string) => void;
  selectedStage: string;
  setSelectedStage: (stage: string) => void;
  onResetFilters: () => void;
  filteredCount: number;
  totalCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchTerm,
  setSearchTerm,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  selectedWeightage,
  setSelectedWeightage,
  selectedStage,
  setSelectedStage,
  onResetFilters,
  filteredCount,
  totalCount,
}) => {
  const hasActiveFilters =
    searchTerm || fromDate || toDate || selectedWeightage !== "all" || selectedStage !== "all";

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm mb-6 space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search company, contact, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
          />
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 items-center">
          {/* From Date Filter */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
            <span className="text-slate-400 font-medium whitespace-nowrap">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none w-full text-xs font-semibold"
            />
          </div>

          {/* To Date Filter */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
            <span className="text-slate-400 font-medium whitespace-nowrap">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none w-full text-xs font-semibold"
            />
          </div>

          {/* Weightage Filter */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
            <Percent className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <span className="text-slate-400 font-medium whitespace-nowrap">Weightage:</span>
            <select
              value={selectedWeightage}
              onChange={(e) => setSelectedWeightage(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none w-full text-xs font-bold cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-slate-900">All Weightages</option>
              <option value="10" className="bg-white dark:bg-slate-900">10% (Interest)</option>
              <option value="25" className="bg-white dark:bg-slate-900">25% (Proposal)</option>
              <option value="50" className="bg-white dark:bg-slate-900">50% (Discussion)</option>
              <option value="75" className="bg-white dark:bg-slate-900">75% (Negotiations)</option>
              <option value="100" className="bg-white dark:bg-slate-900">100% (Closure)</option>
              <option value="0" className="bg-white dark:bg-slate-900">0% (Closed Lost)</option>
            </select>
          </div>

          {/* Stage Filter */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none w-full text-xs font-bold cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-slate-900">All Stages</option>
              {STAGE_ORDER.map((stageKey) => (
                <option key={stageKey} value={stageKey} className="bg-white dark:bg-slate-900">
                  {STAGES[stageKey].label} ({STAGES[stageKey].weightage}%)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Active Filter Indicators & Reset CTA */}
      <div className="flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
        <div className="flex items-center space-x-2 text-slate-500">
          <span>Showing <strong className="text-indigo-600 dark:text-indigo-400">{filteredCount}</strong> of {totalCount} leads</span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Filters Active
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="flex items-center space-x-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-medium transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Filters</span>
          </button>
        )}
      </div>
    </div>
  );
};
