"use client";

import React, { useState, useEffect } from "react";
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
  Download,
  KeyRound,
  SendHorizontal,
  Receipt,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  TrendingUp,
  Layers,
} from "lucide-react";

import { formatINR } from "@/lib/formatters";
import { UserAccount } from "@/constants/users";
import { ThemeToggle } from "./ThemeToggle";

export type NavTab =
  | "kanban"
  | "table"
  | "outreach"
  | "analytics"
  | "email"
  | "prospector"
  | "billing"
  | "developer";

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenAddModal: () => void;
  onOpenBulkModal: () => void;
  onOpenChangePassword?: () => void;
  onExportLeads?: () => void;
  onLogout?: () => void;
  currentUser?: UserAccount | null;
  isFirebaseSyncing: boolean;
  totalLeadsCount: number;
  totalWeightedPipeline: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddModal,
  onOpenBulkModal,
  onOpenChangePassword,
  onExportLeads,
  onLogout,
  currentUser,
  isFirebaseSyncing,
  totalLeadsCount,
  totalWeightedPipeline,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // Restore collapsed state preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("crm_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    }
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("crm_sidebar_collapsed", String(next));
      }
      return next;
    });
  };

  const formattedWeightedVal = formatINR(totalWeightedPipeline);
  const isAdmin = Boolean(
    currentUser?.username.toLowerCase() === "admin" ||
      currentUser?.role.toLowerCase().includes("admin")
  );
  const isAccounts = Boolean(
    currentUser?.username.toLowerCase() === "accounts" ||
      currentUser?.role.toLowerCase().includes("accounts")
  );

  const handleTabClick = (tab: NavTab) => {
    setActiveTab(tab);
    setIsMobileOpen(false);
  };

  interface NavItem {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    activeBg: string;
    badge?: string;
    hidden?: boolean;
  }

  // Nav item configuration
  const mainNavItems: NavItem[] = [
    {
      id: "kanban",
      label: "Pipeline",
      icon: Kanban,
      color: "text-indigo-600 dark:text-indigo-400",
      activeBg: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
      hidden: isAccounts,
    },
    {
      id: "table",
      label: "Clients",
      icon: TableIcon,
      color: "text-indigo-600 dark:text-indigo-400",
      activeBg: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
      hidden: isAccounts,
    },
    {
      id: "outreach",
      label: "Outreach",
      icon: SendHorizontal,
      color: "text-blue-600 dark:text-blue-400",
      activeBg: "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      hidden: isAccounts,
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: PieChart,
      color: "text-indigo-600 dark:text-indigo-400",
      activeBg: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
      hidden: isAccounts,
    },
  ];

  const growthNavItems: NavItem[] = [
    {
      id: "email",
      label: "Emails",
      icon: Mail,
      color: "text-purple-600 dark:text-purple-400",
      activeBg: "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
      hidden: isAccounts,
    },
    {
      id: "prospector",
      label: "Prospector",
      icon: Sparkles,
      color: "text-amber-600 dark:text-amber-400",
      activeBg: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      hidden: isAccounts,
    },
  ];

  const operationsNavItems: NavItem[] = [
    {
      id: "billing",
      label: "Billing",
      icon: Receipt,
      color: "text-emerald-600 dark:text-emerald-400",
      activeBg: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
      badge: isAccounts ? "Active" : undefined,
    },
    {
      id: "developer",
      label: "Developer",
      icon: Code2,
      color: "text-indigo-600 dark:text-indigo-400",
      activeBg: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
      hidden: !isAdmin || isAccounts,
    },
  ];

  // Helper to render navigation items
  const renderNavGroup = (title: string, items: NavItem[]) => {
    const visibleItems = items.filter((item) => !item.hidden);
    if (visibleItems.length === 0) return null;

    return (
      <div className="space-y-1">
        {!isCollapsed && (
          <p className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
            {title}
          </p>
        )}
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center ${
                isCollapsed ? "justify-center px-2" : "justify-between px-3"
              } py-2 rounded-xl text-xs font-bold transition-all border ${
                isActive
                  ? `${item.activeBg} shadow-sm font-extrabold`
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900"
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? item.color : "text-slate-400 group-hover:text-slate-600"
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!isCollapsed && item.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* ======================================================== */}
      {/* 1. Mobile Top Bar (<lg screens) */}
      {/* ======================================================== */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-xs flex-shrink-0 bg-white flex items-center justify-center p-0.5">
              <img
                src="/xmonksdotcom_logo.jpg"
                alt="xMonks"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div className="flex items-center space-x-1.5">
              <img
                src="/xMonks%20Logo-01%202%20(4).png"
                alt="xMonks"
                className="h-5 w-auto max-w-[95px] object-contain dark:bg-white/95 dark:px-1.5 dark:py-0.5 dark:rounded-md"
              />
              <span className="font-black text-xs text-slate-900 dark:text-white tracking-tight">
                B2B
              </span>
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                {isAccounts ? "Accounts" : "v2.0"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {!isAccounts && (
            <button
              onClick={onOpenAddModal}
              className="p-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Lead</span>
            </button>
          )}

          <ThemeToggle isCollapsed showLabel={false} className="shadow-none border-slate-200 dark:border-slate-800" />

          {currentUser && (
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700">
              {currentUser.name[0] || "U"}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ======================================================== */}
      {/* 2. Primary Sidebar (Desktop & Mobile Drawer) */}
      {/* ======================================================== */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen flex flex-col justify-between bg-white dark:bg-slate-950 border-r border-slate-200/90 dark:border-slate-800 transition-all duration-300 ease-in-out ${
          isCollapsed ? "lg:w-20" : "lg:w-64"
        } ${
          isMobileOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0"
        } shadow-xl lg:shadow-none`}
      >
        {/* TOP SECTION: Brand Header & CTA */}
        <div className="p-4 space-y-4 border-b border-slate-100 dark:border-slate-850">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="h-9 w-9 rounded-xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-xs flex-shrink-0 bg-white flex items-center justify-center p-0.5" title="xMonks">
                <img
                  src="/xmonksdotcom_logo.jpg"
                  alt="xMonks"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5">
                    <img
                      src="/xMonks%20Logo-01%202%20(4).png"
                      alt="xMonks"
                      className="h-5.5 w-auto max-w-[110px] object-contain dark:bg-white/95 dark:px-1.5 dark:py-0.5 dark:rounded-md"
                    />
                    <span className="font-black text-xs text-slate-900 dark:text-white tracking-tight">
                      B2B
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex-shrink-0">
                      {isAccounts ? "Accounts" : "v2.0"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5 font-medium">
                    {isAccounts ? "Finance & Invoicing" : "Stage Weightage CRM"}
                  </p>
                </div>
              )}
            </div>

            {/* Collapse Toggle Button (Desktop only) */}
            <button
              onClick={toggleCollapsed}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>

            {/* Close Button (Mobile drawer only) */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Actions Strip */}
          {!isAccounts && (
            <div className="space-y-1.5">
              <button
                onClick={() => {
                  onOpenAddModal();
                  setIsMobileOpen(false);
                }}
                className={`w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  isCollapsed ? "px-2" : "px-3"
                }`}
                title="Create New CRM Lead"
              >
                <Plus className="w-4 h-4 stroke-[2.5] flex-shrink-0" />
                {(!isCollapsed || isMobileOpen) && <span>Add Lead</span>}
              </button>

              {(!isCollapsed || isMobileOpen) && (
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      onOpenBulkModal();
                      setIsMobileOpen(false);
                    }}
                    className="flex items-center justify-center space-x-1.5 py-1.5 px-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold text-[11px] rounded-lg border border-purple-500/20 transition"
                    title="Import leads from CSV"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Import</span>
                  </button>

                  {isAdmin && onExportLeads && (
                    <button
                      onClick={() => {
                        onExportLeads();
                        setIsMobileOpen(false);
                      }}
                      className="flex items-center justify-center space-x-1.5 py-1.5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] rounded-lg border border-emerald-500/20 transition"
                      title="Export leads to CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MIDDLE SECTION: Navigation Links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5 scrollbar-thin">
          {renderNavGroup("Core Pipeline", mainNavItems)}
          {renderNavGroup("Growth Engine", growthNavItems)}
          {renderNavGroup("Operations", operationsNavItems)}
        </div>

        {/* BOTTOM SECTION: Live Health, Stats & User Capsule */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-850 space-y-3">
          {/* System Health & Live Weighted Stats */}
          {(!isCollapsed || isMobileOpen) ? (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Database</span>
                <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{isFirebaseSyncing ? "Firebase Live" : "Local Sync"}</span>
                </span>
              </div>

              {!isAccounts && (
                <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Pipeline Value</span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400 text-xs">
                      {formattedWeightedVal}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">Active Leads</span>
                    <span className="font-black text-slate-800 dark:text-slate-200 text-xs">
                      {totalLeadsCount}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className="flex justify-center p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-500"
              title={`Database: ${isFirebaseSyncing ? "Firebase Live" : "Local Sync"}\nLeads: ${totalLeadsCount}\nWeighted: ${formattedWeightedVal}`}
            >
              {isFirebaseSyncing ? (
                <CloudCheck className="w-4 h-4 text-emerald-500 animate-pulse" />
              ) : (
                <HardDrive className="w-4 h-4 text-amber-500" />
              )}
            </div>
          )}

          {/* Theme Mode Toggle (Dark & Normal Mode) */}
          <div className="pt-0.5">
            <ThemeToggle isCollapsed={isCollapsed && !isMobileOpen} showLabel={!isCollapsed || isMobileOpen} />
          </div>

          {/* User Profile Capsule */}
          {currentUser && (
            <div
              className={`flex items-center ${
                isCollapsed ? "justify-center p-1" : "justify-between p-2"
              } rounded-xl bg-slate-100/80 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-xs">
                  {currentUser.name[0] || "U"}
                </div>
                {(!isCollapsed || isMobileOpen) && (
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {isAccounts
                        ? "Accounts"
                        : currentUser.username.toLowerCase() === "admin"
                        ? "Administrator"
                        : "Client Partner"}
                    </p>
                  </div>
                )}
              </div>

              {(!isCollapsed || isMobileOpen) && (
                <div className="flex items-center space-x-0.5">
                  {onOpenChangePassword && (
                    <button
                      onClick={onOpenChangePassword}
                      className="p-1 rounded-md text-slate-400 hover:text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                      title="Change Password"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onLogout && (
                    <button
                      onClick={onLogout}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                      title="Logout"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
