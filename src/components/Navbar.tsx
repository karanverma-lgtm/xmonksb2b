"use client";

import React from "react";
import {
  Kanban,
  Table as TableIcon,
  PieChart,
  Plus,
  CloudCheck,
  HardDrive,
  Building2,
  LogOut,
  User,
  FileSpreadsheet,
  Mail,
  Code2,
} from "lucide-react";

import { formatINR } from "@/lib/formatters";
import { UserAccount } from "@/constants/users";

export type NavTab = "kanban" | "table" | "analytics" | "email" | "developer";

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenAddModal: () => void;
  onOpenBulkModal: () => void;
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
  onLogout,
  currentUser,
  isFirebaseSyncing,
  totalLeadsCount,
  totalWeightedPipeline,
}) => {
  const formattedWeightedVal = formatINR(totalWeightedPipeline);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 py-2.5">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* 1. Brand Logo */}
          <div className="flex items-center space-x-2.5 flex-shrink-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
                  xMonks B2B
                </span>
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 whitespace-nowrap">
                  v2.0
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden 2xl:block whitespace-nowrap">
                Stage Weightage CRM
              </p>
            </div>
          </div>

          {/* 2. Concise Center Navigation Pills */}
          <div className="hidden md:flex items-center space-x-1 p-1 bg-slate-100 dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-800 flex-shrink">
            <button
              onClick={() => setActiveTab("kanban")}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "kanban"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Pipeline</span>
            </button>

            <button
              onClick={() => setActiveTab("table")}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "table"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Directory</span>
            </button>

            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "analytics"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab("email")}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "email"
                  ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm border border-purple-200/50 dark:border-purple-700/50"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-purple-500" />
              <span>Emails</span>
            </button>

            <button
              onClick={() => setActiveTab("developer")}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "developer"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-200/50 dark:border-indigo-700/50"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Developer</span>
            </button>
          </div>

          {/* 3. Right Status Badges & Actions */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
            {/* Sync Badge */}
            <div
              className={`hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${
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
                  <CloudCheck className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  <span>Firebase</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-3.5 h-3.5 text-amber-500" />
                  <span>Local</span>
                </>
              )}
            </div>

            {/* Quick Weighted Stats Pill */}
            <div className="hidden 2xl:flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-900 rounded-xl text-[11px] border border-slate-200 dark:border-slate-800 whitespace-nowrap">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Weighted:</span>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs">
                {formattedWeightedVal}
              </span>
            </div>

            {/* Bulk Upload CSV Button */}
            <button
              onClick={onOpenBulkModal}
              className="hidden lg:flex items-center space-x-1 px-2.5 py-1.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-600 dark:text-purple-400 font-bold text-xs rounded-xl border border-purple-500/20 transition-all whitespace-nowrap"
              title="Bulk import leads from CSV file"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-purple-500" />
              <span>Import CSV</span>
            </button>

            {/* Add Lead Primary CTA Button */}
            <button
              onClick={onOpenAddModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Lead</span>
            </button>

            {/* Active User Badge */}
            {currentUser && (
              <div
                className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-semibold whitespace-nowrap"
                title={`${currentUser.name} (${currentUser.username.toLowerCase() === "admin" ? "All Leads" : "My Leads"})`}
              >
                <User className="w-3.5 h-3.5 text-indigo-500" />
                <span>{currentUser.name}</span>
              </div>
            )}

            {/* Logout Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-xl border border-transparent hover:border-rose-500/20 transition"
                title="Logout from CRM Portal"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-1">
        <button
          onClick={() => setActiveTab("kanban")}
          className={`flex-1 py-1.5 text-xs font-semibold text-center flex items-center justify-center space-x-1 rounded-lg ${
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
          className={`flex-1 py-1.5 text-xs font-semibold text-center flex items-center justify-center space-x-1 rounded-lg ${
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
          className={`flex-1 py-1.5 text-xs font-semibold text-center flex items-center justify-center space-x-1 rounded-lg ${
            activeTab === "analytics"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-500"
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab("email")}
          className={`flex-1 py-1.5 text-xs font-semibold text-center flex items-center justify-center space-x-1 rounded-lg ${
            activeTab === "email"
              ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm"
              : "text-slate-500"
          }`}
        >
          <Mail className="w-3.5 h-3.5 text-purple-500" />
          <span>Emails</span>
        </button>

        <button
          onClick={() => setActiveTab("developer")}
          className={`flex-1 py-1.5 text-xs font-semibold text-center flex items-center justify-center space-x-1 rounded-lg ${
            activeTab === "developer"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-500"
          }`}
        >
          <Code2 className="w-3.5 h-3.5 text-indigo-500" />
          <span>Dev</span>
        </button>
      </div>
    </header>
  );
};
