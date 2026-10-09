"use client";

import React, { useState, useMemo } from "react";
import {
  Clock,
  Search,
  Filter,
  Download,
  RotateCcw,
  User,
  Building2,
  Mail,
  Phone,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Calendar,
  Link2,
  Layers,
  CheckCircle2,
  ArrowUpRight,
  SendHorizontal,
  PhoneCall,
  FileText,
  Users,
} from "lucide-react";
import {
  ColdClient,
  ColdClientStatus,
  OutreachChannel,
  OutreachTouchpoint,
  AdminComment,
} from "@/types/outreach";
import { COLD_STATUS_CONFIG } from "@/constants/outreach";
import { UserAccount, getCanonicalOwnerName, isSameOwner } from "@/constants/users";
import { formatINR } from "@/lib/formatters";
import { ColdClientDetailModal } from "./ColdClientDetailModal";
import {
  getTouchpointDate,
  getLatestTouchpointDate,
  isLeadUpdatedInRange,
  getLeadLatestUpdateDisplay,
} from "./OutreachTab";
import { NavTab } from "./Sidebar";

interface TouchpointHistoryTabProps {
  coldClients: ColdClient[];
  currentUser?: UserAccount | null;
  isAdmin: boolean;
  onUpdateColdClient: (id: string, updates: Partial<ColdClient>) => Promise<void>;
  onLogTouchpoint: (
    clientId: string,
    touchpoint: {
      channel: OutreachChannel | "note";
      summary: string;
      author: string;
      nextStatus?: ColdClientStatus;
      nextFollowUpDate?: string;
      nextFollowUpTime?: string;
      activityDate?: string;
      activityTime?: string;
      time?: string;
      timestamp?: string;
    }
  ) => Promise<void>;
  onConvertToLead: (
    client: ColdClient,
    dealValue: number,
    author: string,
    targetClosureMonth?: string
  ) => Promise<void>;
  onDeleteColdClient: (id: string) => Promise<void>;
  onNavigateToTab?: (tab: NavTab) => void;
  onSelectOutreachClient?: (clientId: string) => void;
  onAddAdminComment?: (clientId: string, commentText: string) => Promise<void>;
  onMarkAdminCommentRead?: (clientId: string, commentId: string) => Promise<void>;
}

function getChannelIcon(channel: string) {
  switch (channel?.toLowerCase()) {
    case "email":
      return <Mail className="w-3.5 h-3.5 text-purple-500" />;
    case "call":
      return <PhoneCall className="w-3.5 h-3.5 text-emerald-500" />;
    case "linkedin":
      return <Link2 className="w-3.5 h-3.5 text-blue-500" />;
    case "note":
      return <FileText className="w-3.5 h-3.5 text-amber-500" />;
    default:
      return <MessageSquare className="w-3.5 h-3.5 text-slate-500" />;
  }
}

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export const TouchpointHistoryTab: React.FC<TouchpointHistoryTabProps> = ({
  coldClients,
  currentUser,
  isAdmin,
  onUpdateColdClient,
  onLogTouchpoint,
  onConvertToLead,
  onDeleteColdClient,
  onNavigateToTab,
  onSelectOutreachClient,
  onAddAdminComment,
  onMarkAdminCommentRead,
}) => {
  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [updateFilter, setUpdateFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selectedDataset, setSelectedDataset] = useState("all");
  const [selectedOwner, setSelectedOwner] = useState("all");
  const [selectedChannel, setSelectedChannel] = useState("all");

  // View & UI states
  const [expandedClientIds, setExpandedClientIds] = useState<string[]>([]);
  const [selectedClientForModal, setSelectedClientForModal] = useState<ColdClient | null>(null);
  const [viewMode, setViewMode] = useState<"latest_per_lead" | "all_feed">("latest_per_lead");
  const [quickDirectiveClient, setQuickDirectiveClient] = useState<ColdClient | null>(null);
  const [quickDirectiveText, setQuickDirectiveText] = useState("");
  const [isPostingDirective, setIsPostingDirective] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Extract unique datasets & owners
  const datasets = useMemo(() => {
    const set = new Set<string>();
    coldClients.forEach((c) => {
      if (c.dataset && c.dataset.trim()) {
        set.add(c.dataset.trim());
      }
    });
    return Array.from(set).sort();
  }, [coldClients]);

  const owners = useMemo(() => {
    const set = new Set<string>();
    coldClients.forEach((c) => {
      if (c.owner && c.owner.trim()) {
        set.add(getCanonicalOwnerName(c.owner.trim()));
      }
    });
    return Array.from(set).sort();
  }, [coldClients]);

  // Lead rows with their latest touchpoint (only leads that have touchpoint history or match all)
  const leadsWithTouchpoint = useMemo(() => {
    return coldClients.map((client) => {
      const latestDate = getLatestTouchpointDate(client);
      const sortedTouchpoints = Array.isArray(client.touchpoints)
        ? [...client.touchpoints].sort((a, b) => {
            const timeA = new Date(a.timestamp || 0).getTime();
            const timeB = new Date(b.timestamp || 0).getTime();
            return timeB - timeA;
          })
        : [];
      const latestTp = sortedTouchpoints[0] || null;

      return {
        client,
        latestDate,
        latestTp,
        allTouchpoints: sortedTouchpoints,
        tpCount: sortedTouchpoints.length,
      };
    });
  }, [coldClients]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leadsWithTouchpoint.filter(({ client, latestDate, latestTp, allTouchpoints }) => {
      // 1. Lead Updated Filter (strict Touchpoint History check)
      if (updateFilter !== "all") {
        const matchesUpdate = isLeadUpdatedInRange(client, updateFilter, customFrom, customTo);
        if (!matchesUpdate) return false;
      }

      // 2. Dataset Filter
      if (selectedDataset !== "all") {
        if (!client.dataset || client.dataset.trim() !== selectedDataset) return false;
      }

      // 3. Lead Owner Filter (Contains & Canonical matching: "Amit" and "Amit Shelly" are same, "Ruby" and "Ruby Dayal" are same)
      if (selectedOwner !== "all") {
        if (!isSameOwner(client.owner, selectedOwner)) return false;
      }

      // 4. Channel Filter
      if (selectedChannel !== "all") {
        if (!latestTp || latestTp.channel?.toLowerCase() !== selectedChannel.toLowerCase()) {
          return false;
        }
      }

      // 5. Search Term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const compMatch = client.companyName?.toLowerCase().includes(term);
        const contactMatch = client.contactName?.toLowerCase().includes(term);
        const ownerMatch =
          isSameOwner(client.owner, term) ||
          client.owner?.toLowerCase().includes(term);
        const datasetMatch = client.dataset?.toLowerCase().includes(term);
        const noteMatch = allTouchpoints.some((tp) =>
          tp.summary?.toLowerCase().includes(term) || tp.author?.toLowerCase().includes(term)
        );
        if (!compMatch && !contactMatch && !ownerMatch && !datasetMatch && !noteMatch) {
          return false;
        }
      }

      return true;
    });
  }, [
    leadsWithTouchpoint,
    updateFilter,
    customFrom,
    customTo,
    selectedDataset,
    selectedOwner,
    selectedChannel,
    searchTerm,
  ]);

  // Sort filtered leads by latest touchpoint date descending (most recently updated first)
  const sortedFilteredLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      const timeA = a.latestDate ? a.latestDate.getTime() : 0;
      const timeB = b.latestDate ? b.latestDate.getTime() : 0;
      return timeB - timeA;
    });
  }, [filteredLeads]);

  // Flat Activity Feed View (one row per touchpoint entry)
  const flatActivityFeed = useMemo(() => {
    const list: Array<{
      client: ColdClient;
      touchpoint: OutreachTouchpoint;
      date: Date | null;
    }> = [];

    sortedFilteredLeads.forEach(({ client, allTouchpoints }) => {
      allTouchpoints.forEach((tp) => {
        const d = getTouchpointDate(tp);
        list.push({ client, touchpoint: tp, date: d });
      });
    });

    return list.sort((a, b) => {
      const timeA = a.date ? a.date.getTime() : 0;
      const timeB = b.date ? b.date.getTime() : 0;
      return timeB - timeA;
    });
  }, [sortedFilteredLeads]);

  // Statistics counters
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;

    // Monday this week
    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const mondayThisWeek = new Date(now);
    mondayThisWeek.setDate(now.getDate() - diffToMonday);
    mondayThisWeek.setHours(0, 0, 0, 0);

    let updatedTodayCount = 0;
    let updatedThisWeekCount = 0;
    let totalTpLogged = 0;

    sortedFilteredLeads.forEach(({ latestDate, tpCount }) => {
      totalTpLogged += tpCount;
      if (latestDate) {
        const dateStr = `${latestDate.getFullYear()}-${String(latestDate.getMonth() + 1).padStart(
          2,
          "0"
        )}-${String(latestDate.getDate()).padStart(2, "0")}`;
        if (dateStr === todayStr) updatedTodayCount++;
        if (latestDate >= mondayThisWeek) updatedThisWeekCount++;
      }
    });

    return {
      totalLeads: sortedFilteredLeads.length,
      updatedTodayCount,
      updatedThisWeekCount,
      totalTpLogged,
    };
  }, [sortedFilteredLeads]);

  // Pagination slice
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedFilteredLeads.slice(start, start + pageSize);
  }, [sortedFilteredLeads, currentPage]);

  const totalPages = Math.ceil(sortedFilteredLeads.length / pageSize) || 1;

  // Toggle row expansion
  const toggleExpand = (clientId: string) => {
    setExpandedClientIds((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
    );
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setUpdateFilter("all");
    setCustomFrom("");
    setCustomTo("");
    setSelectedDataset("all");
    setSelectedOwner("all");
    setSelectedChannel("all");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchTerm !== "" ||
    updateFilter !== "all" ||
    selectedDataset !== "all" ||
    selectedOwner !== "all" ||
    selectedChannel !== "all" ||
    customFrom !== "" ||
    customTo !== "";

  // Export CSV
  const handleExportCSV = () => {
    if (sortedFilteredLeads.length === 0) {
      alert("No leads found to export.");
      return;
    }

    const headers = [
      "Company Name",
      "Lead Owner",
      "Contact Person",
      "Designation",
      "Email",
      "Phone",
      "Dataset",
      "Status",
      "Latest Update Date",
      "Latest Update Time",
      "Latest Channel",
      "Latest Touchpoint Note",
      "Total Touchpoints Count",
    ];

    const rows = sortedFilteredLeads.map(({ client, latestDate, latestTp, tpCount }) => {
      const dateStr = latestDate
        ? latestDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "None";
      const timeStr = latestTp?.time || (latestDate ? latestDate.toLocaleTimeString("en-US") : "");
      return [
        escapeCSV(client.companyName),
        escapeCSV(client.owner || "Unassigned"),
        escapeCSV(client.contactName),
        escapeCSV(client.designation || ""),
        escapeCSV(client.email),
        escapeCSV(client.phone || ""),
        escapeCSV(client.dataset || "Unassigned"),
        escapeCSV(client.status),
        escapeCSV(dateStr),
        escapeCSV(timeStr),
        escapeCSV(latestTp?.channel || "none"),
        escapeCSV(latestTp?.summary || "No touchpoints logged"),
        escapeCSV(tpCount),
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `xMonks_Touchpoint_History_Report_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Header & Title Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-200/60 dark:border-blue-800/60">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Touchpoint History
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Global Feed
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Consolidated live stream of all lead updates, touchpoints, and activity notes across your team.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: Export CSV + View Mode */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode("latest_per_lead")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "latest_per_lead"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Latest per Lead
            </button>
            <button
              type="button"
              onClick={() => setViewMode("all_feed")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "all_feed"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All Activity Stream
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-semibold">
            <span>Filtered Leads</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats.totalLeads}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Matching criteria</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-semibold">
            <span>Updated Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.updatedTodayCount}
          </div>
          <div className="text-[11px] text-emerald-500 font-medium mt-0.5">Active today</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-semibold">
            <span>Updated This Week</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {stats.updatedThisWeekCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Mon - Sun activity</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-semibold">
            <span>Total Touchpoints</span>
            <MessageSquare className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {stats.totalTpLogged}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across matched leads</div>
        </div>
      </div>

      {/* 3. Filter Bar (Lead Updated, Dataset, Lead Owner, Search, Reset) */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search company, contact, note..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Lead Updated Filter Dropdown */}
          <div className="relative">
            <select
              value={updateFilter}
              onChange={(e) => {
                setUpdateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-3 pr-8 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none"
            >
              <option value="all">🕒 Lead Updated: All Time</option>
              <option value="today">⚡ Lead Updated: Today</option>
              <option value="yesterday">⏪ Lead Updated: Yesterday</option>
              <option value="this_week">📅 Lead Updated: This Week</option>
              <option value="last_week">🗓️ Lead Updated: Last Week</option>
              <option value="current_month">📆 Lead Updated: Current Month</option>
              <option value="previous_month">⏮️ Lead Updated: Previous Month</option>
              <option value="custom">🎯 Lead Updated: Custom Date Range</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Dataset Filter */}
          <div className="relative">
            <select
              value={selectedDataset}
              onChange={(e) => {
                setSelectedDataset(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-3 pr-8 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none"
            >
              <option value="all">🗂️ Dataset: All Datasets</option>
              {datasets.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Lead Owner Filter */}
          <div className="relative">
            <select
              value={selectedOwner}
              onChange={(e) => {
                setSelectedOwner(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-3 pr-8 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none"
            >
              <option value="all">👤 Owner: All Owners</option>
              {owners.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Channel Filter & Reset */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <select
                value={selectedChannel}
                onChange={(e) => {
                  setSelectedChannel(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-3 pr-8 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none"
              >
                <option value="all">📡 All Channels</option>
                <option value="email">Email</option>
                <option value="call">Call</option>
                <option value="linkedin">LinkedIn</option>
                <option value="note">Note</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer border border-transparent hover:border-rose-200 shrink-0"
                title="Reset all filters"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Range Picker when "custom" is active */}
        {updateFilter === "custom" && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in flex-wrap">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Custom Touchpoint Window:
            </span>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-400 font-semibold">From:</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => {
                  setCustomFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-400 font-semibold">To:</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => {
                  setCustomTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>
            {(customFrom || customTo) && (
              <button
                type="button"
                onClick={() => {
                  setCustomFrom("");
                  setCustomTo("");
                }}
                className="text-[11px] text-slate-400 hover:text-rose-500 underline ml-2 cursor-pointer font-medium"
              >
                Clear date range
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Tabular View */}
      {viewMode === "latest_per_lead" ? (
        /* ======================================================== */
        /* Table: Latest Update per Lead with Expandable Timeline   */
        /* ======================================================== */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="w-full">
            <table className="w-full table-fixed text-left text-xs border-collapse">
              <colgroup>
                <col className="w-8" />
                <col className="w-[14%]" />
                <col className="w-[12%]" />
                <col className="w-[16%]" />
                <col className="w-[15%]" />
                <col />
                <col className="w-[110px]" />
              </colgroup>
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-1 text-center"></th>
                  <th className="py-3 px-2.5">Last Updated Date</th>
                  <th className="py-3 px-2.5">Lead Owner</th>
                  <th className="py-3 px-2.5">Lead Name</th>
                  <th className="py-3 px-2.5">Company</th>
                  <th className="py-3 px-3">Touchpoint History Note</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {paginatedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-1" />
                        <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                          No leads matched the touchpoint filters.
                        </p>
                        <p className="text-xs text-slate-400 max-w-sm">
                          Try clearing your filters or selecting a wider date range to see recent updates.
                        </p>
                        {hasActiveFilters && (
                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="mt-3 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 rounded-xl font-bold text-xs cursor-pointer hover:bg-blue-100 transition"
                          >
                            Reset All Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedLeads.map(({ client, latestDate, latestTp, allTouchpoints, tpCount }) => {
                    const isExpanded = expandedClientIds.includes(client.id);
                    const cfg = COLD_STATUS_CONFIG[client.status as ColdClientStatus];
                    const upd = getLeadLatestUpdateDisplay(client);

                    const dateDisplay = latestDate
                      ? latestDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "No touchpoints";

                    const timeDisplay =
                      latestTp?.time ||
                      (latestDate
                        ? latestDate.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                        : "");

                    return (
                      <React.Fragment key={client.id}>
                        <tr
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group ${
                            isExpanded ? "bg-slate-50/60 dark:bg-slate-800/30" : ""
                          }`}
                        >
                          {/* 0. Expand Button */}
                          <td className="py-3 px-1 text-center">
                            {tpCount > 1 ? (
                              <button
                                type="button"
                                onClick={() => toggleExpand(client.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                title={isExpanded ? "Collapse history" : `Expand all ${tpCount} touchpoints`}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                              </button>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-700 text-xs">•</span>
                            )}
                          </td>

                          {/* 1. Last Updated Date */}
                          <td className="py-3 px-2.5 overflow-hidden">
                            <div className="flex items-center gap-1.5">
                              {latestTp && (
                                <div className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 shrink-0">
                                  {getChannelIcon(latestTp.channel)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1 flex-wrap">
                                  <span className="truncate">{dateDisplay}</span>
                                  {upd.isRecent && (
                                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40 shrink-0">
                                      {upd.label.replace("Updated ", "")}
                                    </span>
                                  )}
                                </div>
                                {timeDisplay && (
                                  <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 truncate">
                                    <Clock className="w-2.5 h-2.5 shrink-0" />
                                    <span>{timeDisplay}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. Lead Owner */}
                          <td className="py-3 px-2.5 overflow-hidden">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 text-white flex items-center justify-center font-bold text-[10px] shadow-xs shrink-0">
                                {(client.owner || "U")[0]?.toUpperCase()}
                              </div>
                              <div className="min-w-0 truncate">
                                <div className="font-bold text-slate-900 dark:text-white truncate">
                                  {client.owner || "Unassigned"}
                                </div>
                                <div className="text-[10px] text-slate-400">Owner</div>
                              </div>
                            </div>
                          </td>

                          {/* 3. Lead Name */}
                          <td className="py-3 px-2.5 overflow-hidden">
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 dark:text-white truncate">
                                {client.contactName || "No Contact"}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {client.designation || "Stakeholder"}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {client.email || client.phone || ""}
                              </div>
                            </div>
                          </td>

                          {/* 4. Company */}
                          <td className="py-3 px-2.5 overflow-hidden">
                            <div className="min-w-0">
                              <div
                                onClick={() => setSelectedClientForModal(client)}
                                className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer truncate flex items-center gap-0.5"
                              >
                                <span className="truncate">{client.companyName}</span>
                                <ArrowUpRight className="w-2.5 h-2.5 shrink-0 opacity-50" />
                              </div>
                              <div className="flex items-center gap-1 flex-wrap mt-0.5">
                                {client.dataset && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 truncate max-w-[110px]">
                                    🗂️ {client.dataset}
                                  </span>
                                )}
                                <span
                                  className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold border truncate max-w-[110px] ${
                                    cfg?.badgeBg || "bg-slate-100"
                                  } ${cfg?.badgeText || "text-slate-700"} ${
                                    cfg?.borderColor || "border-slate-300"
                                  }`}
                                >
                                  {cfg?.label || client.status}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 5. Touchpoint History Note */}
                          <td className="py-3 px-3 overflow-hidden">
                            {latestTp ? (
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                                    {latestTp.channel}
                                  </span>
                                  {tpCount > 1 && (
                                    <span
                                      onClick={() => toggleExpand(client.id)}
                                      className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100 transition shrink-0"
                                    >
                                      TP ({tpCount})
                                    </span>
                                  )}
                                  {client.adminComments && client.adminComments.length > 0 && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/60 flex items-center gap-0.5 shrink-0">
                                      <ShieldAlert className="w-2.5 h-2.5" />
                                      Directive ({client.adminComments.length})
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-800 dark:text-slate-200 leading-snug line-clamp-2 italic break-words">
                                  "{latestTp.summary}"
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium truncate">
                                  By: {latestTp.author || client.owner || "Sales Team"}
                                </p>
                              </div>
                            ) : (
                              <div className="text-slate-400 text-xs italic">
                                No touchpoint activity logged yet.
                              </div>
                            )}
                          </td>

                          {/* 6. Actions */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setQuickDirectiveClient(client)}
                                  className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition cursor-pointer shrink-0"
                                  title={`Post directive for ${client.owner || "owner"}`}
                                >
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedClientForModal(client)}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                              >
                                View Lead
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Full Chronological Touchpoint History Sub-Row */}
                        {isExpanded && (
                          <tr className="bg-slate-50/70 dark:bg-slate-950/40">
                            <td colSpan={7} className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                                    <span>Complete Touchpoint History for {client.companyName}</span>
                                    <span className="text-slate-400 font-normal">({tpCount} entries)</span>
                                  </h4>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedClientForModal(client)}
                                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                  >
                                    Open Full Lead Details Modal →
                                  </button>
                                </div>

                                <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                                  {allTouchpoints.map((tp, idx) => {
                                    const tpD = getTouchpointDate(tp);
                                    return (
                                      <div
                                        key={tp.id || idx}
                                        className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs flex items-start gap-3 shadow-2xs"
                                      >
                                        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 mt-0.5 shrink-0">
                                          {getChannelIcon(tp.channel)}
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                          <div className="flex items-center justify-between text-[11px]">
                                            <span className="font-extrabold uppercase text-slate-700 dark:text-slate-300">
                                              {tp.channel}
                                            </span>
                                            <span className="text-slate-400 font-medium">
                                              {tpD
                                                ? tpD.toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                  })
                                                : tp.activityDate || "Recent"}{" "}
                                              • {tp.time || "Logged"}
                                            </span>
                                          </div>
                                          <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                                            {tp.summary}
                                          </p>
                                          <div className="text-[10px] text-slate-400">
                                            Logged by: <span className="font-semibold text-slate-500 dark:text-slate-300">{tp.author}</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {sortedFilteredLeads.length > pageSize && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, sortedFilteredLeads.length)} of{" "}
                {sortedFilteredLeads.length} leads
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-bold disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Previous
                </button>
                <span className="px-2 font-bold text-slate-700 dark:text-slate-300">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-bold disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ======================================================== */
        /* Table: Flat Activity Stream (Every Touchpoint Entry)    */
        /* ======================================================== */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="w-full">
            <table className="w-full table-fixed text-left text-xs border-collapse">
              <colgroup>
                <col className="w-[14%]" />
                <col className="w-[10%]" />
                <col className="w-[16%]" />
                <col className="w-[15%]" />
                <col className="w-[13%]" />
                <col />
                <col className="w-[105px]" />
              </colgroup>
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-2">Channel</th>
                  <th className="py-3 px-2.5">Company</th>
                  <th className="py-3 px-2.5">Lead Contact</th>
                  <th className="py-3 px-2.5">Lead Owner</th>
                  <th className="py-3 px-3">Touchpoint Activity Note</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {flatActivityFeed.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      No activity stream records found.
                    </td>
                  </tr>
                ) : (
                  flatActivityFeed.slice(0, 100).map(({ client, touchpoint, date }, idx) => (
                    <tr
                      key={touchpoint.id || idx}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-3 overflow-hidden">
                        <div className="font-bold text-slate-900 dark:text-white truncate">
                          {date
                            ? date.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : touchpoint.activityDate || "Recent"}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {touchpoint.time || (date ? date.toLocaleTimeString("en-US") : "")}
                        </div>
                      </td>

                      <td className="py-3 px-2 overflow-hidden">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase truncate">
                          {getChannelIcon(touchpoint.channel)}
                          <span className="truncate">{touchpoint.channel}</span>
                        </span>
                      </td>

                      <td className="py-3 px-2.5 overflow-hidden">
                        <div
                          onClick={() => setSelectedClientForModal(client)}
                          className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer truncate"
                        >
                          {client.companyName}
                        </div>
                        {client.dataset && (
                          <div className="text-[10px] text-purple-600 truncate mt-0.5">
                            🗂️ {client.dataset}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-2.5 overflow-hidden">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {client.contactName}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{client.designation}</div>
                      </td>

                      <td className="py-3 px-2.5 overflow-hidden">
                        <div className="font-medium text-slate-700 dark:text-slate-300 truncate">
                          {client.owner || "Unassigned"}
                        </div>
                      </td>

                      <td className="py-3 px-3 overflow-hidden">
                        <p className="italic text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug">
                          "{touchpoint.summary}"
                        </p>
                        <div className="text-[10px] text-slate-400 not-italic mt-0.5 truncate">
                          Logged by: {touchpoint.author}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedClientForModal(client)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                        >
                          View Lead
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Quick Admin Directive Modal */}
      {quickDirectiveClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Post Admin Directive
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    For {quickDirectiveClient.owner || "Lead Owner"} on {quickDirectiveClient.companyName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setQuickDirectiveClient(null);
                  setQuickDirectiveText("");
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!quickDirectiveText.trim() || !quickDirectiveClient) return;
                try {
                  setIsPostingDirective(true);
                  if (onAddAdminComment) {
                    await onAddAdminComment(quickDirectiveClient.id, quickDirectiveText.trim());
                  }
                  setQuickDirectiveClient(null);
                  setQuickDirectiveText("");
                } catch (err) {
                  console.error(err);
                } finally {
                  setIsPostingDirective(false);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Instruction / Note for {quickDirectiveClient.owner || "Lead Owner"}
                </label>
                <textarea
                  rows={3}
                  required
                  value={quickDirectiveText}
                  onChange={(e) => setQuickDirectiveText(e.target.value)}
                  placeholder="e.g. Please prioritize checking the VP HR commercial proposal today..."
                  className="w-full p-3 text-xs rounded-xl border border-amber-300 dark:border-amber-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                  Will trigger immediate on-screen notification for owner
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickDirectiveClient(null);
                      setQuickDirectiveText("");
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPostingDirective || !quickDirectiveText.trim()}
                    className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <SendHorizontal className="w-3.5 h-3.5" />
                    <span>{isPostingDirective ? "Posting..." : "Post Directive"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Cold Client Detail Modal */}
      <ColdClientDetailModal
        client={selectedClientForModal}
        isOpen={Boolean(selectedClientForModal)}
        onClose={() => setSelectedClientForModal(null)}
        onUpdateClient={onUpdateColdClient}
        onLogTouchpoint={onLogTouchpoint}
        onConvertToLead={onConvertToLead}
        onDeleteClient={onDeleteColdClient}
        currentUser={currentUser}
        onAddAdminComment={onAddAdminComment}
        onMarkAdminCommentRead={onMarkAdminCommentRead}
      />
    </div>
  );
};
