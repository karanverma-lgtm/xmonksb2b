"use client";

import React from "react";
import { Filter, Calendar, Percent, RotateCcw, Search, UserCheck, Compass, GraduationCap } from "lucide-react";
import { STAGES, STAGE_ORDER } from "@/constants/stages";
import { VALID_USERS } from "@/constants/users";
import { LEAD_SOURCES } from "@/constants/leadSources";
import { PRESET_PROGRAMS } from "@/constants/programs";

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
  selectedLeadSource?: string;
  setSelectedLeadSource?: (source: string) => void;
  selectedProgram?: string;
  setSelectedProgram?: (program: string) => void;
  selectedPartner?: string;
  setSelectedPartner?: (partner: string) => void;
  isAdmin?: boolean;
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
  selectedLeadSource = "all",
  setSelectedLeadSource,
  selectedProgram = "all",
  setSelectedProgram,
  selectedPartner = "all",
  setSelectedPartner,
  isAdmin = false,
  onResetFilters,
  filteredCount,
  totalCount,
}) => {
  const hasActiveFilters =
    searchTerm ||
    fromDate ||
    toDate ||
    selectedWeightage !== "all" ||
    selectedStage !== "all" ||
    selectedLeadSource !== "all" ||
    selectedProgram !== "all" ||
    (isAdmin && selectedPartner !== "all");

  const partnerOptions = [
    { name: "Amit", role: "Sales Representative" },
    { name: "Gaurav", role: "Sales Representative" },
    { name: "Preeti", role: "Sales Representative" },
    { name: "Nikhil", role: "Sales Representative" },
    { name: "Ruby", role: "Sales Manager" },
    { name: "Admin User", role: "Administrator" },
  ];

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
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 ${
            isAdmin ? "xl:grid-cols-7" : "xl:grid-cols-6"
          } gap-2 items-center`}
        >
          {/* Client Partner Filter (Admin View) */}
          {isAdmin && setSelectedPartner && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-indigo-200/80 dark:border-indigo-900/50 rounded-xl text-xs">
              <UserCheck className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
              <span className="text-slate-400 font-medium whitespace-nowrap">Partner:</span>
              <select
                value={selectedPartner}
                onChange={(e) => setSelectedPartner(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none w-full text-xs font-bold cursor-pointer truncate"
              >
                <option value="all" className="bg-white dark:bg-slate-900">
                  All Partners
                </option>
                {partnerOptions.map((p) => (
                  <option key={p.name} value={p.name} className="bg-white dark:bg-slate-900">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Lead Source Filter */}
          {setSelectedLeadSource && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-sky-200/80 dark:border-sky-900/50 rounded-xl text-xs">
              <Compass className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
              <span className="text-slate-400 font-medium whitespace-nowrap">Source:</span>
              <select
                value={selectedLeadSource}
                onChange={(e) => setSelectedLeadSource(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none w-full text-xs font-bold cursor-pointer truncate"
              >
                <option value="all" className="bg-white dark:bg-slate-900">
                  All Sources
                </option>
                {LEAD_SOURCES.map((source) => (
                  <option key={source.id} value={source.name} className="bg-white dark:bg-slate-900">
                    {source.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Pitched Program Filter */}
          {setSelectedProgram && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-purple-200/80 dark:border-purple-900/50 rounded-xl text-xs">
              <GraduationCap className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
              <span className="text-slate-400 font-medium whitespace-nowrap">Program:</span>
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none w-full text-xs font-bold cursor-pointer truncate"
              >
                <option value="all" className="bg-white dark:bg-slate-900">
                  All Programs
                </option>
                {PRESET_PROGRAMS.map((prog) => (
                  <option key={prog.id} value={prog.name} className="bg-white dark:bg-slate-900">
                    {prog.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* From Date Filter */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
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
          <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
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
          <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
            <Percent className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <span className="text-slate-400 font-medium whitespace-nowrap">Weight:</span>
            <select
              value={selectedWeightage}
              onChange={(e) => setSelectedWeightage(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none w-full text-xs font-bold cursor-pointer truncate"
            >
              <option value="all" className="bg-white dark:bg-slate-900">All Weights</option>
              {STAGE_ORDER.map((stageKey) => (
                <option key={stageKey} value={String(STAGES[stageKey].weightage)} className="bg-white dark:bg-slate-900">
                  {STAGES[stageKey].weightage}% ({STAGES[stageKey].label})
                </option>
              ))}
            </select>
          </div>

          {/* Stage Filter */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none w-full text-xs font-bold cursor-pointer truncate"
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
        <div className="flex items-center space-x-2 text-slate-500 flex-wrap gap-y-1">
          <span>Showing <strong className="text-indigo-600 dark:text-indigo-400">{filteredCount}</strong> of {totalCount} leads</span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Filters Active
            </span>
          )}
          {isAdmin && selectedPartner && selectedPartner !== "all" && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center space-x-1">
              <UserCheck className="w-3 h-3" />
              <span>Partner: {selectedPartner}</span>
            </span>
          )}
          {selectedLeadSource && selectedLeadSource !== "all" && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20 flex items-center space-x-1">
              <Compass className="w-3 h-3" />
              <span>Source: {selectedLeadSource}</span>
            </span>
          )}
          {selectedProgram && selectedProgram !== "all" && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 flex items-center space-x-1">
              <GraduationCap className="w-3 h-3" />
              <span>Program: {selectedProgram}</span>
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
