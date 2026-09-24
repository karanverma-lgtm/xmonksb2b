"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  Search,
  Filter,
  Plus,
  Mail,
  Link2,
  Phone,
  Calendar,
  Sparkles,
  TrendingUp,
  Download,
  Clock,
  CheckCircle2,
  Kanban,
  Table as TableIcon,
  Flame,
  ArrowRight,
  MoreVertical,
  Edit3,
  ExternalLink,
  ChevronDown,
  Building2,
  CheckCheck,
  RotateCcw,
  Radio,
} from "lucide-react";
import { ColdClient, ColdClientStatus, OutreachChannel } from "@/types/outreach";
import { COLD_STATUS_CONFIG, OUTREACH_CHANNELS, OUTREACH_INDUSTRIES } from "@/constants/outreach";
import { UserAccount } from "@/constants/users";
import { formatINR } from "@/lib/formatters";
import { AddColdClientModal } from "./AddColdClientModal";
import { ColdClientDetailModal } from "./ColdClientDetailModal";

interface OutreachTabProps {
  coldClients: ColdClient[];
  onAddColdClient: (
    client: Omit<ColdClient, "id" | "createdAt" | "updatedAt" | "touchpoints"> & {
      initialNote?: string;
    }
  ) => Promise<void>;
  onBulkAddColdClients: (
    clients: Array<Omit<ColdClient, "id" | "createdAt" | "updatedAt" | "touchpoints">>
  ) => Promise<void>;
  onUpdateColdClient: (id: string, updates: Partial<ColdClient>) => Promise<void>;
  onLogTouchpoint: (
    clientId: string,
    touchpoint: {
      channel: OutreachChannel | "note";
      summary: string;
      author: string;
      nextStatus?: ColdClientStatus;
      nextFollowUpDate?: string;
    }
  ) => Promise<void>;
  onConvertToLead: (
    client: ColdClient,
    dealValue: number,
    author: string,
    targetClosureMonth?: string
  ) => Promise<void>;
  onDeleteColdClient: (id: string) => Promise<void>;
  currentUser?: UserAccount | null;
  onNavigateToEmailTab?: (recipientEmail: string, recipientName: string, companyName: string) => void;
}

export const OutreachTab: React.FC<OutreachTabProps> = ({
  coldClients,
  onAddColdClient,
  onBulkAddColdClients,
  onUpdateColdClient,
  onLogTouchpoint,
  onConvertToLead,
  onDeleteColdClient,
  currentUser,
  onNavigateToEmailTab,
}) => {
  const [viewMode, setViewMode] = useState<"board" | "table">("board");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedOwner, setSelectedOwner] = useState<string>("all");
  const [onlyDueToday, setOnlyDueToday] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ColdClient | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  // Distinct owners
  const ownersList = useMemo(() => {
    const set = new Set<string>();
    coldClients.forEach((c) => {
      if (c.owner) set.add(c.owner);
    });
    return Array.from(set);
  }, [coldClients]);

  // Filtered cold clients
  const filteredClients = useMemo(() => {
    return coldClients.filter((client) => {
      // 1. Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchCompany = client.companyName.toLowerCase().includes(q);
        const matchContact = client.contactName.toLowerCase().includes(q);
        const matchEmail = client.email.toLowerCase().includes(q);
        const matchRole = client.designation?.toLowerCase().includes(q) || false;
        const matchCity = client.city?.toLowerCase().includes(q) || false;
        if (!matchCompany && !matchContact && !matchEmail && !matchRole && !matchCity) {
          return false;
        }
      }

      // 2. Status
      if (selectedStatus !== "all" && client.status !== selectedStatus) {
        return false;
      }

      // 3. Channel
      if (selectedChannel !== "all" && client.channel !== selectedChannel) {
        return false;
      }

      // 4. Owner
      if (selectedOwner !== "all" && client.owner !== selectedOwner) {
        return false;
      }

      // 5. Only Due Today / Overdue
      if (onlyDueToday) {
        if (client.status === "converted" || client.status === "not_interested") return false;
        if (!client.nextFollowUpDate || client.nextFollowUpDate > todayStr) return false;
      }

      return true;
    });
  }, [coldClients, searchTerm, selectedStatus, selectedChannel, selectedOwner, onlyDueToday, todayStr]);

  // KPI Metrics
  const stats = useMemo(() => {
    const total = coldClients.length;
    const inProgress = coldClients.filter((c) =>
      ["email_sent", "follow_up_1", "follow_up_2"].includes(c.status)
    ).length;
    const highIntent = coldClients.filter((c) =>
      ["call_scheduled", "replied_interested"].includes(c.status)
    ).length;
    const converted = coldClients.filter((c) => c.status === "converted").length;
    const dueCount = coldClients.filter(
      (c) =>
        c.status !== "converted" &&
        c.status !== "not_interested" &&
        c.nextFollowUpDate &&
        c.nextFollowUpDate <= todayStr
    ).length;

    return { total, inProgress, highIntent, converted, dueCount };
  }, [coldClients, todayStr]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredClients.length === 0) return;
    const headers = [
      "ID",
      "Company Name",
      "Contact Person",
      "Designation",
      "Email",
      "Phone",
      "Status",
      "Channel",
      "Target Program",
      "Estimated Value",
      "Owner",
      "Next Follow-Up",
      "Last Contact",
      "City",
    ];

    const rows = filteredClients.map((c) => [
      c.id,
      `"${c.companyName.replace(/"/g, '""')}"`,
      `"${c.contactName.replace(/"/g, '""')}"`,
      `"${(c.designation || "").replace(/"/g, '""')}"`,
      c.email,
      c.phone || "",
      COLD_STATUS_CONFIG[c.status]?.label || c.status,
      c.channel,
      c.targetProgram || "",
      c.estimatedPotentialValue || 0,
      c.owner,
      c.nextFollowUpDate || "",
      c.lastContactDate || "",
      c.city || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cold_outreach_prospects_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Grouped for Kanban Board
  const boardColumns: {
    id: string;
    title: string;
    statusList: ColdClientStatus[];
    color: string;
    badgeBg: string;
  }[] = [
    {
      id: "cold",
      title: "Cold / Uncontacted",
      statusList: ["uncontacted"],
      color: "border-slate-300 dark:border-slate-700",
      badgeBg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    },
    {
      id: "initial_outreach",
      title: "1st Outreach Sent",
      statusList: ["email_sent"],
      color: "border-blue-400 dark:border-blue-600",
      badgeBg: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    },
    {
      id: "followups",
      title: "Follow-Ups in Motion",
      statusList: ["follow_up_1", "follow_up_2"],
      color: "border-purple-400 dark:border-purple-600",
      badgeBg: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    },
    {
      id: "engaged",
      title: "High Intent / Calls Booked",
      statusList: ["call_scheduled", "replied_interested"],
      color: "border-emerald-400 dark:border-emerald-600",
      badgeBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    },
    {
      id: "converted",
      title: "Converted to Pipeline",
      statusList: ["converted"],
      color: "border-cyan-400 dark:border-cyan-600",
      badgeBg: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
    },
    {
      id: "dormant",
      title: "Unresponsive / Passed",
      statusList: ["unresponsive", "not_interested"],
      color: "border-rose-300 dark:border-rose-800",
      badgeBg: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Cold Accounts
            </p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {stats.total}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Prospects logged</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Outreach In Motion
            </p>
            <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {stats.inProgress}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Sent & follow-ups</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Engaged / Calls
            </p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.highIntent}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Discovery booked</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Graduated to Leads
            </p>
            <h3 className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
              {stats.converted}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">In CRM pipeline</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <CheckCheck className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setOnlyDueToday(!onlyDueToday)}
          className={`p-4 rounded-2xl border shadow-xs flex items-center justify-between cursor-pointer transition-all ${
            onlyDueToday
              ? "bg-amber-500/15 border-amber-500/50 ring-2 ring-amber-500/30"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400"
          }`}
        >
          <div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Follow-ups Due
            </p>
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {stats.dueCount}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {onlyDueToday ? "Active filter applied" : "Click to filter due"}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control / Filter Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Search & Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search company, contact, email..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Outreach Stages</option>
            {Object.entries(COLD_STATUS_CONFIG).map(([k, cfg]) => (
              <option key={k} value={k}>
                {cfg.label}
              </option>
            ))}
          </select>

          {/* Channel Filter */}
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Channels</option>
            {OUTREACH_CHANNELS.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.label}
              </option>
            ))}
          </select>

          {/* Owner Filter */}
          {ownersList.length > 1 && (
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">All Owners</option>
              {ownersList.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          )}

          {onlyDueToday && (
            <button
              onClick={() => setOnlyDueToday(false)}
              className="px-2.5 py-1 text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-xl flex items-center space-x-1"
            >
              <span>Due Today</span>
              <RotateCcw className="w-3 h-3 ml-1" />
            </button>
          )}
        </div>

        {/* Right View Switch & Action Buttons */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode("board")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                viewMode === "board"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Board View"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Board</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                viewMode === "table"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center space-x-1"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* + Add Cold Prospect Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Prospect</span>
          </button>
        </div>
      </div>

      {/* Main View: Board or Table */}
      {viewMode === "board" ? (
        /* Board View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4 items-start">
          {boardColumns.map((col) => {
            const colClients = filteredClients.filter((c) => col.statusList.includes(c.status));

            return (
              <div
                key={col.id}
                className="bg-slate-100/70 dark:bg-slate-900/40 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 flex flex-col min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {col.title}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${col.badgeBg}`}>
                      {colClients.length}
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[70vh] pr-0.5">
                  {colClients.length === 0 ? (
                    <div className="p-4 text-center text-[11px] text-slate-400 italic">
                      No accounts in this stage
                    </div>
                  ) : (
                    colClients.map((client) => {
                      const cfg = COLD_STATUS_CONFIG[client.status];
                      const isDue =
                        client.nextFollowUpDate &&
                        client.nextFollowUpDate <= todayStr &&
                        client.status !== "converted" &&
                        client.status !== "not_interested";

                      return (
                        <div
                          key={client.id}
                          onClick={() => setSelectedClient(client)}
                          className="p-3.5 bg-white dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-750 hover:border-blue-400 dark:hover:border-blue-500 shadow-xs hover:shadow-md transition-all cursor-pointer group space-y-2.5"
                        >
                          {/* Card Top: Company & Channel */}
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {client.companyName}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {client.contactName}
                              </p>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider flex-shrink-0">
                              {client.channel}
                            </span>
                          </div>

                          {/* Role & Target Program */}
                          <div className="flex flex-wrap gap-1">
                            {client.designation && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block max-w-full">
                                {client.designation}
                              </span>
                            )}
                          </div>

                          {/* Est Value & Next Date */}
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {formatINR(client.estimatedPotentialValue || 0)}
                            </span>

                            {client.nextFollowUpDate ? (
                              <span
                                className={`text-[10px] font-semibold flex items-center space-x-1 ${
                                  isDue
                                    ? "text-amber-600 dark:text-amber-400 font-bold"
                                    : "text-slate-400"
                                }`}
                              >
                                <Calendar className="w-3 h-3" />
                                <span>{client.nextFollowUpDate}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Owner: {client.owner}</span>
                            )}
                          </div>

                          {/* Follow-up Due Alert Badge */}
                          {isDue && (
                            <div className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-md text-[10px] font-bold flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Follow-up Due
                              </span>
                              <span>Today</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Company & Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Target Offering</th>
                  <th className="py-3 px-4">Potential Value</th>
                  <th className="py-3 px-4">Next Follow-Up</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No cold prospects found matching the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => {
                    const cfg = COLD_STATUS_CONFIG[client.status];
                    const isDue =
                      client.nextFollowUpDate &&
                      client.nextFollowUpDate <= todayStr &&
                      client.status !== "converted" &&
                      client.status !== "not_interested";

                    return (
                      <tr
                        key={client.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                        onClick={() => setSelectedClient(client)}
                      >
                        {/* Company & Contact */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {client.companyName}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {client.contactName} {client.designation ? `• ${client.designation}` : ""}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.badgeBg} ${cfg.badgeText} ${cfg.borderColor}`}
                          >
                            {cfg.label}
                          </span>
                        </td>

                        {/* Channel */}
                        <td className="py-3 px-4 uppercase text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                          {client.channel}
                        </td>

                        {/* Target Offering */}
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                          {client.targetProgram || "Executive Coaching"}
                        </td>

                        {/* Potential Value */}
                        <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {formatINR(client.estimatedPotentialValue || 0)}
                        </td>

                        {/* Next Follow-Up */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {client.nextFollowUpDate ? (
                            <span
                              className={`text-[11px] font-semibold flex items-center space-x-1 ${
                                isDue
                                  ? "text-amber-600 dark:text-amber-400 font-bold"
                                  : "text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{client.nextFollowUpDate}</span>
                              {isDue && (
                                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500/10 border border-amber-500/20">
                                  Due
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Owner */}
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">
                          {client.owner}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div
                            className="flex items-center justify-end space-x-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => setSelectedClient(client)}
                              className="px-2.5 py-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors"
                            >
                              Details
                            </button>
                            {client.status !== "converted" && (
                              <button
                                onClick={() => setSelectedClient(client)}
                                className="px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition-colors flex items-center space-x-1"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>Convert</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Cold Client Modal */}
      <AddColdClientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddClient={onAddColdClient}
        onBulkAdd={onBulkAddColdClients}
        currentUser={currentUser}
      />

      {/* Detail & Touchpoint Modal */}
      <ColdClientDetailModal
        client={selectedClient}
        isOpen={Boolean(selectedClient)}
        onClose={() => setSelectedClient(null)}
        onUpdateClient={onUpdateColdClient}
        onLogTouchpoint={onLogTouchpoint}
        onConvertToLead={onConvertToLead}
        onDeleteClient={onDeleteColdClient}
        currentUser={currentUser}
        onNavigateToEmail={onNavigateToEmailTab}
      />
    </div>
  );
};
