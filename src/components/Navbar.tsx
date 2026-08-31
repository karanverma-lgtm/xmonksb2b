"use client";

import React from "react";
import {
  Kanban,
  Table as TableIcon,
  PieChart,
  Plus,
  RotateCcw,
  CloudCheck,
  HardDrive,
  Building2,
  LogOut,
  User,
  FileSpreadsheet,
} from "lucide-react";

import { formatINR } from "@/lib/formatters";
import { UserAccount } from "@/constants/users";

interface NavbarProps {
  activeTab: "kanban" | "table" | "analytics";
  setActiveTab: (tab: "kanban" | "table" | "analytics") => void;
  onOpenAddModal: () => void;
  onOpenBulkModal: () => void;
  onResetDemoData: () => void;
  onLogout?: () => void;
  currentUser?: UserAccount | null;
  isFirebaseSyncing: boolean;
  totalLeadsCount: number;
  totalWeightedPipeline: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddModal,
  onOpenBulkModal,
  onResetDemoData,
  onLogout,
  currentUser,
  isFirebaseSyncing,
  totalLeadsCount,
  totalWeightedPipeline,
}) => {
  const formattedWeightedVal = formatINR(totalWeightedPipeline);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* 1. Brand Logo */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
                  xMonks B2B CRM
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 whitespace-nowrap">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden xl:block whitespace-nowrap">
                B2B Prospecting, Stage Weightage & Journey Logs
              </p>
            </div>
          </div>

          {/* 2. Navigation Pills (Un-congested, No Text Wrapping) */}
          <div className="hidden md:flex items-center space-x-1.5 p-1.5 bg-slate-100 dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex-shrink-0">
            <button
              onClick={() => setActiveTab("kanban")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === "kanban"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
              }`}
            >
              <Kanban className="w-4 h-4" />
              <span>Pipeline Board</span>
            </button>

            <button
              onClick={() => setActiveTab("table")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === "table"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
              }`}
            >
              <TableIcon className="w-4 h-4" />
              <span>Lead Directory</span>
            </button>

            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === "analytics"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>Analytics & Logs</span>
            </button>
          </div>

          {/* 3. Right Status Badges & Actions */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 flex-shrink-0">
            {/* Sync Badge */}
            <div
              className={`hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap ${
                isFirebaseSyncing
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
              }`}
              title={
                isFirebaseSyncing
                  ? "Connected to Firebase Firestore (xmonksb2b2)"
                  : "Offline mode / Local Storage backup active"
              }
            >
              {isFirebaseSyncing ? (
                <>
                  <CloudCheck className="w-4 h-4 text-emerald-500 animate-pulse" />
                  <span>Firebase Live</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-4 h-4 text-amber-500" />
                  <span>Local Storage</span>
                </>
              )}
            </div>

            {/* Quick Weighted Stats Pill */}
            <div className="hidden xl:flex items-center space-x-2 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs border border-slate-200 dark:border-slate-800 whitespace-nowrap">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Weighted Pipeline:</span>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
                {formattedWeightedVal}
              </span>
            </div>

            {/* Demo Reset Button */}
            <button
              onClick={onResetDemoData}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition"
              title="Reset Demo Data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Bulk Upload CSV Button */}
            <button
              onClick={onOpenBulkModal}
              className="hidden sm:flex items-center space-x-1.5 px-3.5 py-2 bg-purple-600/10 hover:bg-purple-600/20 text-purple-600 dark:text-purple-400 font-bold text-xs rounded-xl border border-purple-500/20 transition-all whitespace-nowrap"
              title="Bulk import leads from CSV file"
            >
              <FileSpreadsheet className="w-4 h-4 text-purple-500" />
              <span>Import CSV</span>
            </button>

            {/* Add Lead Primary CTA Button */}
            <button
              onClick={onOpenAddModal}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add B2B Lead</span>
            </button>

            {/* Active User Badge */}
            {currentUser && (
              <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-semibold whitespace-nowrap">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                <span>{currentUser.name}</span>
              </div>
            )}

            {/* Logout Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-xl border border-transparent hover:border-rose-500/20 transition"
                title="Logout from CRM Portal"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-1">
        <button
          onClick={() => setActiveTab("kanban")}
          className={`flex-1 py-2 text-xs font-semibold text-center flex items-center justify-center space-x-1.5 rounded-lg ${
            activeTab === "kanban"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-500"
          }`}
        >
          <Kanban className="w-3.5 h-3.5" />
          <span>Pipeline</span>
        </button>

        <button
          onClick={() => setActiveTab("table")}
          className={`flex-1 py-2 text-xs font-semibold text-center flex items-center justify-center space-x-1.5 rounded-lg ${
            activeTab === "table"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-500"
          }`}
        >
          <TableIcon className="w-3.5 h-3.5" />
          <span>Directory</span>
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex-1 py-2 text-xs font-semibold text-center flex items-center justify-center space-x-1.5 rounded-lg ${
            activeTab === "analytics"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-500"
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>Analytics</span>
        </button>
      </div>
    </header>
  );
};
