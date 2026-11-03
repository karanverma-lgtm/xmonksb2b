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
import { UserAccount, getCanonicalOwnerName, isSameOwner, canUserExport } from "@/constants/users";
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
  onReplyToAdminComment?: (clientId: string, commentId: string, replyText: string) => Promise<void>;
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

function isCallChannel(channel?: string): boolean {
  if (!channel) return false;
  const c = channel.toLowerCase();
  return c === "call" || c.includes("call") || c === "phone";
}

function isEmailChannel(channel?: string): boolean {
  if (!channel) return false;
  const c = channel.toLowerCase();
  return c === "email" || c.includes("email") || c === "mail";
}

function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isDateInRange(
  d: Date | null,
  filter: string,
  customFrom?: string,
  customTo?: string
): boolean {
  if (!d) return false;
  if (filter === "all") return true;

  const now = new Date();
  const targetDateStr = toLocalDateString(d);
  const todayStr = toLocalDateString(now);

  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = toLocalDateString(yesterdayDate);

  const dayOfWeek = now.getDay();
  const diffToMonday = (dayOfWeek + 6) % 7;
  const mondayThisWeek = new Date(now);
  mondayThisWeek.setDate(now.getDate() - diffToMonday);
  mondayThisWeek.setHours(0, 0, 0, 0);

  const sundayThisWeek = new Date(mondayThisWeek);
  sundayThisWeek.setDate(mondayThisWeek.getDate() + 6);
  sundayThisWeek.setHours(23, 59, 59, 999);

  const mondayLastWeek = new Date(mondayThisWeek);
  mondayLastWeek.setDate(mondayThisWeek.getDate() - 7);
  mondayLastWeek.setHours(0, 0, 0, 0);

  const sundayLastWeek = new Date(mondayLastWeek);
  sundayLastWeek.setDate(mondayLastWeek.getDate() + 6);
  sundayLastWeek.setHours(23, 59, 59, 999);

  const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const lastDayCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  switch (filter) {
    case "today":
      return targetDateStr === todayStr;
    case "yesterday":
      return targetDateStr === yesterdayStr;
    case "this_week":
      return d >= mondayThisWeek && d <= sundayThisWeek;
    case "last_week":
      return d >= mondayLastWeek && d <= sundayLastWeek;
    case "current_month":
      return d >= firstDayCurrentMonth && d <= lastDayCurrentMonth;
    case "previous_month":
      return d >= firstDayPrevMonth && d <= lastDayPrevMonth;
    case "custom": {
      if (customFrom && customTo) {
        return d >= new Date(customFrom + "T00:00:00") && d <= new Date(customTo + "T23:59:59.999");
      }
      if (customFrom) {
        return d >= new Date(customFrom + "T00:00:00");
      }
      if (customTo) {
        return d <= new Date(customTo + "T23:59:59.999");
      }
      return true;
    }
    default:
      return true;
  }
}

function leadHasChannelInRange(
  item: {
    client: ColdClient;
    latestDate: Date | null;
    latestTp: OutreachTouchpoint | null;
    allTouchpoints: OutreachTouchpoint[];
  },
  channelType: "call" | "email",
  filter: string,
  customFrom?: string,
  customTo?: string
): boolean {
  const matchesChannel = (channel?: string) => {
    if (!channel) return false;
    if (channelType === "call") return isCallChannel(channel);
    if (channelType === "email") return isEmailChannel(channel);
    return false;
  };

  if (filter === "all") {
    if (item.allTouchpoints.some((tp) => matchesChannel(tp.channel))) {
      return true;
    }
    if (item.latestTp && matchesChannel(item.latestTp.channel)) {
      return true;
    }
    return false;
  }

  // Filter is date range: check touchpoints within that date range
  const inRange = item.allTouchpoints.filter((tp) => {
    const d = getTouchpointDate(tp);
    return d ? isDateInRange(d, filter, customFrom, customTo) : false;
  });

  if (inRange.some((tp) => matchesChannel(tp.channel))) {
    return true;
  }

  // Fallback check on latest touchpoint if within range
  if (item.latestDate && isDateInRange(item.latestDate, filter, customFrom, customTo)) {
    if (item.latestTp && matchesChannel(item.latestTp.channel)) {
      return true;
    }
  }

  // Fallback for today if client.lastContactDate matches today
  if (filter === "today" && item.client.lastContactDate === toLocalDateString(new Date())) {
    if (item.latestTp && matchesChannel(item.latestTp.channel)) {
      return true;
    }
  }

  return false;
}

function isTpToday(tp: OutreachTouchpoint, todayStr: string): boolean {
  if (tp.activityDate && tp.activityDate === todayStr) return true;
  const d = getTouchpointDate(tp);
  if (!d) return false;
  return toLocalDateString(d) === todayStr;
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
  onReplyToAdminComment,
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
  const [viewMode, setViewMode] = useState<"latest_per_lead" | "all_feed" | "team_report">("latest_per_lead");
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
        const canonical = getCanonicalOwnerName(c.owner.trim());
        const lower = canonical.toLowerCase();
        if (!lower.includes("gaurav") && !lower.includes("preeti")) {
          set.add(canonical);
        }
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

  // Base Filtered Leads: Matches Date range, Dataset, Owner, and Search term
  const baseFilteredLeads = useMemo(() => {
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

      // 4. Search Term
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
    searchTerm,
  ]);

  // Channel-filtered Leads for the table views
  const filteredLeads = useMemo(() => {
    if (selectedChannel === "all") return baseFilteredLeads;

    return baseFilteredLeads.filter((item) => {
      if (selectedChannel === "call" || selectedChannel === "email") {
        return leadHasChannelInRange(item, selectedChannel, updateFilter, customFrom, customTo);
      }
      const matches = (ch?: string) => ch?.toLowerCase() === selectedChannel.toLowerCase();
      const inRange = updateFilter === "all"
        ? item.allTouchpoints
        : item.allTouchpoints.filter((tp) => isDateInRange(getTouchpointDate(tp), updateFilter, customFrom, customTo));
      return inRange.some((tp) => matches(tp.channel)) || (item.latestTp ? matches(item.latestTp.channel) : false);
    });
  }, [baseFilteredLeads, selectedChannel, updateFilter, customFrom, customTo]);

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

  // Statistics counters (calculated dynamically based on active filters)
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = toLocalDateString(now);

    // Monday this week
    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const mondayThisWeek = new Date(now);
    mondayThisWeek.setDate(now.getDate() - diffToMonday);
    mondayThisWeek.setHours(0, 0, 0, 0);

    let callCount = 0;
    let emailCount = 0;
    let updatedTodayCount = 0;
    let updatedTodayCallCount = 0;
    let updatedTodayEmailCount = 0;
    let todayCallsTotal = 0;
    let todayEmailsTotal = 0;
    let updatedThisWeekCount = 0;
    let totalTpLogged = 0;

    baseFilteredLeads.forEach((item) => {
      const { client, latestDate, latestTp, allTouchpoints, tpCount } = item;
      totalTpLogged += tpCount;

      // Unique leads contacted via Call or Email matching active filters
      if (leadHasChannelInRange(item, "call", updateFilter, customFrom, customTo)) {
        callCount++;
      }
      if (leadHasChannelInRange(item, "email", updateFilter, customFrom, customTo)) {
        emailCount++;
      }

      // Legacy/report counters for today and this week
      const todayTouchpoints = allTouchpoints.filter((tp) => isTpToday(tp, todayStr));
      const hasActivityToday =
        todayTouchpoints.length > 0 ||
        (latestDate && toLocalDateString(latestDate) === todayStr) ||
        client.lastContactDate === todayStr;

      if (hasActivityToday) {
        updatedTodayCount++;

        let leadHasCallToday = false;
        let leadHasEmailToday = false;

        todayTouchpoints.forEach((tp) => {
          if (isCallChannel(tp.channel)) {
            leadHasCallToday = true;
            todayCallsTotal++;
          }
          if (isEmailChannel(tp.channel)) {
            leadHasEmailToday = true;
            todayEmailsTotal++;
          }
        });

        // Fallback check on latestTp if touchpoints array didn't match channels explicitly
        if (!leadHasCallToday && !leadHasEmailToday && latestTp) {
          if (isCallChannel(latestTp.channel)) {
            leadHasCallToday = true;
            todayCallsTotal++;
          }
          if (isEmailChannel(latestTp.channel)) {
            leadHasEmailToday = true;
            todayEmailsTotal++;
          }
        }

        if (leadHasCallToday) updatedTodayCallCount++;
        if (leadHasEmailToday) updatedTodayEmailCount++;
      }

      if (latestDate && latestDate >= mondayThisWeek) {
        updatedThisWeekCount++;
      }
    });

    return {
      totalLeads: baseFilteredLeads.length,
      callCount,
      emailCount,
      updatedTodayCount,
      updatedTodayCallCount,
      updatedTodayEmailCount,
      todayCallsTotal,
      todayEmailsTotal,
      updatedThisWeekCount,
      totalTpLogged,
    };
  }, [baseFilteredLeads, updateFilter, customFrom, customTo]);

  // Team & Owner breakdown summary report
  const ownerSummary = useMemo(() => {
    const now = new Date();
    const todayStr = toLocalDateString(now);

    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const mondayThisWeek = new Date(now);
    mondayThisWeek.setDate(now.getDate() - diffToMonday);
    mondayThisWeek.setHours(0, 0, 0, 0);

    const map = new Map<
      string,
      {
        owner: string;
        filteredLeads: number;
        updatedToday: number;
        updatedTodayCall: number;
        updatedTodayEmail: number;
        todayCallsCount: number;
        todayEmailsCount: number;
        updatedThisWeek: number;
        totalTouchpoints: number;
      }
    >();

    sortedFilteredLeads.forEach(({ client, latestDate, latestTp, allTouchpoints, tpCount }) => {
      const rawOwner = client.owner?.trim() || "Unassigned";
      const ownerName = getCanonicalOwnerName(rawOwner);
      const lowerOwner = ownerName.toLowerCase();
      if (lowerOwner.includes("gaurav") || lowerOwner.includes("preeti")) {
        return;
      }

      if (!map.has(ownerName)) {
        map.set(ownerName, {
          owner: ownerName,
          filteredLeads: 0,
          updatedToday: 0,
          updatedTodayCall: 0,
          updatedTodayEmail: 0,
          todayCallsCount: 0,
          todayEmailsCount: 0,
          updatedThisWeek: 0,
          totalTouchpoints: 0,
        });
      }

      const item = map.get(ownerName)!;
      item.filteredLeads += 1;
      item.totalTouchpoints += tpCount;

      const todayTouchpoints = allTouchpoints.filter((tp) => isTpToday(tp, todayStr));
      const hasActivityToday =
        todayTouchpoints.length > 0 ||
        (latestDate && toLocalDateString(latestDate) === todayStr) ||
        client.lastContactDate === todayStr;

      if (hasActivityToday) {
        item.updatedToday += 1;

        let hasCall = false;
        let hasEmail = false;

        todayTouchpoints.forEach((tp) => {
          if (isCallChannel(tp.channel)) {
            hasCall = true;
            item.todayCallsCount++;
          }
          if (isEmailChannel(tp.channel)) {
            hasEmail = true;
            item.todayEmailsCount++;
          }
        });

        if (!hasCall && !hasEmail && latestTp) {
          if (isCallChannel(latestTp.channel)) {
            hasCall = true;
            item.todayCallsCount++;
          }
          if (isEmailChannel(latestTp.channel)) {
            hasEmail = true;
            item.todayEmailsCount++;
          }
        }

        if (hasCall) item.updatedTodayCall += 1;
        if (hasEmail) item.updatedTodayEmail += 1;
      }

      if (latestDate && latestDate >= mondayThisWeek) {
        item.updatedThisWeek += 1;
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => b.updatedToday - a.updatedToday || b.filteredLeads - a.filteredLeads
    );
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
    if (!canUserExport(currentUser)) {
      alert("Access Restricted: Only Administrator and Preeti are authorized to export data.");
      return;
    }
    if (viewMode === "team_report") {
      if (ownerSummary.length === 0) {
        alert("No team data found to export.");
        return;
      }

      const headers = [
        "Lead Owner",
        "Filtered Leads",
        "Updated Today",
        "Updated Today / Call",
        "Updated Today / Email",
        "Updated This Week",
        "Total Touchpoints",
      ];

      const rows = ownerSummary.map((item) => [
        escapeCSV(item.owner),
        escapeCSV(item.filteredLeads),
        escapeCSV(item.updatedToday),
        escapeCSV(item.updatedTodayCall),
        escapeCSV(item.updatedTodayEmail),
        escapeCSV(item.updatedThisWeek),
        escapeCSV(item.totalTouchpoints),
      ].join(","));

      // Summary totals row
      rows.push([
        escapeCSV("Total / Team Wide"),
        escapeCSV(stats.totalLeads),
        escapeCSV(stats.updatedTodayCount),
        escapeCSV(stats.updatedTodayCallCount),
        escapeCSV(stats.updatedTodayEmailCount),
        escapeCSV(stats.updatedThisWeekCount),
        escapeCSV(stats.totalTpLogged),
      ].join(","));

      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `xMonks_Touchpoint_Team_Summary_Report_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

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
            <button
              type="button"
              onClick={() => setViewMode("team_report")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "team_report"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Team Report
            </button>
          </div>

          {canUserExport(currentUser) && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Export filtered records to CSV"
            >
              <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Metric KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* 1. Total Leads */}
        <div
          onClick={() => {
            setSelectedChannel("all");
            setCurrentPage(1);
          }}
          className={`p-4 bg-white dark:bg-slate-900 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
            selectedChannel === "all"
              ? "border-blue-500/50 ring-2 ring-blue-500/10 shadow-xs"
              : "border-slate-200 dark:border-slate-800 hover:border-blue-300"
          }`}
          title="Click to view all leads"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-semibold">
            <span className="truncate">Total Leads</span>
            <Users className="w-4 h-4 text-blue-500 shrink-0" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats.totalLeads}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">Matching criteria</div>
        </div>

        {/* 2. Call */}
        <div
          onClick={() => {
            setSelectedChannel((prev) => (prev === "call" ? "all" : "call"));
            setCurrentPage(1);
          }}
          className={`p-4 bg-white dark:bg-slate-900 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
            selectedChannel === "call"
              ? "border-teal-500/50 ring-2 ring-teal-500/10 shadow-xs"
              : "border-slate-200 dark:border-slate-800 hover:border-teal-300"
          }`}
          title="Click to filter leads contacted via Call"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-semibold">
            <span className="truncate">Call</span>
            <PhoneCall className="w-4 h-4 text-teal-500 shrink-0" />
          </div>
          <div className="text-2xl font-black text-teal-600 dark:text-teal-400">
            {stats.callCount}
          </div>
          <div className="text-[11px] text-teal-600 dark:text-teal-400 font-medium mt-0.5 truncate">
            {stats.callCount > 0 ? `${stats.callCount} leads contacted` : "No calls in range"}
          </div>
        </div>

        {/* 3. Email */}
        <div
          onClick={() => {
            setSelectedChannel((prev) => (prev === "email" ? "all" : "email"));
            setCurrentPage(1);
          }}
          className={`p-4 bg-white dark:bg-slate-900 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
            selectedChannel === "email"
              ? "border-purple-500/50 ring-2 ring-purple-500/10 shadow-xs"
              : "border-slate-200 dark:border-slate-800 hover:border-purple-300"
          }`}
          title="Click to filter leads contacted via Email"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-semibold">
            <span className="truncate">Email</span>
            <Mail className="w-4 h-4 text-purple-500 shrink-0" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {stats.emailCount}
          </div>
          <div className="text-[11px] text-purple-600 dark:text-purple-400 font-medium mt-0.5 truncate">
            {stats.emailCount > 0 ? `${stats.emailCount} leads contacted` : "No emails in range"}
          </div>
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
              {owners
                .filter(
                  (owner) =>
                    !owner.toLowerCase().includes("gaurav") &&
                    !owner.toLowerCase().includes("preeti")
                )
                .map((owner) => (
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
      ) : viewMode === "all_feed" ? (
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
      ) : (
        /* ======================================================== */
        /* Table: Team Performance & Touchpoint Breakdown Report    */
        /* ======================================================== */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span>Team Touchpoint Performance Report</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Breakdown of leads updated today, calls vs emails, and total touchpoints across team members.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {ownerSummary.length} Active Owners
            </span>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Lead Owner</th>
                  <th className="py-3.5 px-4 text-center">Filtered Leads</th>
                  <th className="py-3.5 px-4 text-center">Updated Today</th>
                  <th className="py-3.5 px-4 text-center">Updated Today / Call</th>
                  <th className="py-3.5 px-4 text-center">Updated Today / Email</th>
                  <th className="py-3.5 px-4 text-center">Updated This Week</th>
                  <th className="py-3.5 px-4 text-center">Total Touchpoints</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {ownerSummary.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      No team members match current filter criteria.
                    </td>
                  </tr>
                ) : (
                  ownerSummary.map((item) => (
                    <tr
                      key={item.owner}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                            {(item.owner || "U")[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {item.owner}
                            </div>
                            <div className="text-[10px] text-slate-400">Sales Representative</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                          {item.filteredLeads}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          {item.updatedToday}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-300/40">
                          <PhoneCall className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                          {item.updatedTodayCall}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300/40">
                          <Mail className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                          {item.updatedTodayEmail}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300/40">
                          <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          {item.updatedThisWeek}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                          {item.totalTouchpoints}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOwner(item.owner);
                            setViewMode("latest_per_lead");
                            setCurrentPage(1);
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1"
                        >
                          View Leads →
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {ownerSummary.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100/80 dark:bg-slate-800/80 font-black border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                    <td className="py-3.5 px-4 text-xs uppercase tracking-wider">
                      Total / Team Wide
                    </td>
                    <td className="py-3.5 px-4 text-center text-sm">
                      {stats.totalLeads}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-200/80 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                        {stats.updatedTodayCount}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-teal-200/80 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                        {stats.updatedTodayCallCount}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-purple-200/80 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                        {stats.updatedTodayEmailCount}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-blue-200/80 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {stats.updatedThisWeekCount}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-sm">
                      {stats.totalTpLogged}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {selectedOwner !== "all" && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOwner("all");
                            setCurrentPage(1);
                          }}
                          className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                        >
                          Clear Owner Filter
                        </button>
                      )}
                    </td>
                  </tr>
                </tfoot>
              )}
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
        onReplyToAdminComment={onReplyToAdminComment}
      />
    </div>
  );
};
