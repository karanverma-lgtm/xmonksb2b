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
  FileSpreadsheet,
  CheckSquare,
  Trash2,
  Layers,
} from "lucide-react";
import { ColdClient, ColdClientStatus, ColdStatusConfig, OutreachChannel } from "@/types/outreach";
import { COLD_STATUS_CONFIG, OUTREACH_CHANNELS, OUTREACH_INDUSTRIES } from "@/constants/outreach";
import { UserAccount, VALID_USERS } from "@/constants/users";
import { formatINR } from "@/lib/formatters";
import { bulkUpdateColdClients, bulkDeleteColdClients } from "@/lib/outreachService";
import { AddColdClientModal } from "./AddColdClientModal";
import { ColdClientDetailModal } from "./ColdClientDetailModal";
import { GoogleSheetsSyncModal } from "./GoogleSheetsSyncModal";
import { BulkUpdateOutreachModal } from "./BulkUpdateOutreachModal";
import { BulkEmailOutreachModal } from "./BulkEmailOutreachModal";

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
  onBulkUpdateColdClients?: (
    ids: string[],
    updates: Partial<ColdClient>,
    touchpointNote?: string
  ) => Promise<void>;
  onBulkDeleteColdClients?: (ids: string[]) => Promise<void>;
  onLogTouchpoint: (
    clientId: string,
    touchpoint: {
      channel: OutreachChannel | "note";
      summary: string;
      author: string;
      nextStatus?: ColdClientStatus;
      nextFollowUpDate?: string;
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
  currentUser?: UserAccount | null;
  onNavigateToEmailTab?: (recipientEmail: string, recipientName: string, companyName: string) => void;
  onNavigateToBulkEmailTab?: (
    recipients: Array<{
      email: string;
      contactName: string;
      companyName: string;
      designation?: string;
      industry?: string;
      dealValue?: number;
    }>
  ) => void;
  onFilteredCountChange?: (count: number) => void;
}

export const OutreachTab: React.FC<OutreachTabProps> = ({
  coldClients,
  onAddColdClient,
  onBulkAddColdClients,
  onUpdateColdClient,
  onBulkUpdateColdClients,
  onBulkDeleteColdClients,
  onLogTouchpoint,
  onConvertToLead,
  onDeleteColdClient,
  currentUser,
  onNavigateToEmailTab,
  onNavigateToBulkEmailTab,
  onFilteredCountChange,
}) => {
  // Safe helper to resolve status config with rock-solid fallback
  const getStatusConfig = (status?: string): ColdStatusConfig => {
    if (status && status in COLD_STATUS_CONFIG) {
      return COLD_STATUS_CONFIG[status as ColdClientStatus];
    }
    return (
      COLD_STATUS_CONFIG.uncontacted || {
        id: "uncontacted" as ColdClientStatus,
        label: status || "Cold / Uncontacted",
        badgeBg: "bg-slate-100 dark:bg-slate-800/80",
        badgeText: "text-slate-700 dark:text-slate-300",
        borderColor: "border-slate-300 dark:border-slate-700",
        headerBg: "bg-slate-50 dark:bg-slate-900/50",
        iconName: "Snowflake",
        description: "Prospective corporate client identified.",
      }
    );
  };
  const [viewMode, setViewMode] = useState<"board" | "table">("board");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedOwner, setSelectedOwner] = useState<string>("all");
  const [selectedDataset, setSelectedDataset] = useState<string>("all");
  const [onlyDueToday, setOnlyDueToday] = useState(false);

  // Multi-selection state
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [isBulkEmailModalOpen, setIsBulkEmailModalOpen] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [sheetsModalInitialTab, setSheetsModalInitialTab] = useState<"script" | "template" | "test" | "dedup">("script");
  const [selectedClient, setSelectedClient] = useState<ColdClient | null>(null);

  // Check for duplicate leads across outreach prospects
  const duplicateLeadsCount = useMemo(() => {
    const seenEmails = new Set<string>();
    const seenSheetRows = new Set<string>();
    const seenCompanyContacts = new Set<string>();
    let dups = 0;

    for (const c of coldClients) {
      let isDup = false;
      const email = (c.email || "").toLowerCase().trim();
      const sheetRow = c.sourceSheet && c.sheetRowNumber ? `${c.sourceSheet}_${c.sheetRowNumber}`.toLowerCase() : "";
      const compCont =
        c.companyName && c.contactName && c.companyName !== "Unknown Organization" && c.contactName !== "Prospect Contact"
          ? `${c.companyName.toLowerCase().trim()}_${c.contactName.toLowerCase().trim()}`
          : "";

      if (email && email.includes("@")) {
        if (seenEmails.has(email)) isDup = true;
        seenEmails.add(email);
      }
      if (sheetRow) {
        if (seenSheetRows.has(sheetRow)) isDup = true;
        seenSheetRows.add(sheetRow);
      }
      if (compCont) {
        if (seenCompanyContacts.has(compCont)) isDup = true;
        seenCompanyContacts.add(compCont);
      }

      if (isDup) dups++;
    }
    return dups;
  }, [coldClients]);

  const todayStr = new Date().toISOString().split("T")[0];

  // Dynamic list of unique datasets present in cold clients
  const uniqueDatasets = useMemo(() => {
    const list = new Set<string>();
    coldClients.forEach((c) => {
      if (c.dataset && c.dataset.trim()) {
        list.add(c.dataset.trim());
      }
    });
    return Array.from(list).sort();
  }, [coldClients]);

  // Dynamic platform users list for Owner selection (including any custom owners)
  const platformOwners = useMemo(() => {
    const list = new Set<string>();
    VALID_USERS.forEach((u) => list.add(u.name));
    coldClients.forEach((c) => {
      if (c.owner && c.owner.trim()) {
        list.add(c.owner.trim());
      }
    });
    return Array.from(list);
  }, [coldClients]);

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    selectedStatus !== "all" ||
    selectedChannel !== "all" ||
    selectedOwner !== "all" ||
    selectedDataset !== "all" ||
    onlyDueToday
  );

  // 1. Scoped clients based on dimensional filters (Search, Channel, Owner, Dataset)
  const baseClients = useMemo(() => {
    return coldClients.filter((client) => {
      // 1. Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchCompany = client.companyName?.toLowerCase().includes(q) || false;
        const matchContact = client.contactName?.toLowerCase().includes(q) || false;
        const matchEmail = client.email?.toLowerCase().includes(q) || false;
        const matchRole = client.designation?.toLowerCase().includes(q) || false;
        const matchCity = client.city?.toLowerCase().includes(q) || false;
        const matchDataset = client.dataset?.toLowerCase().includes(q) || false;
        if (!matchCompany && !matchContact && !matchEmail && !matchRole && !matchCity && !matchDataset) {
          return false;
        }
      }

      // 2. Channel
      if (selectedChannel !== "all" && client.channel !== selectedChannel) {
        return false;
      }

      // 3. Owner filter (matching platform user name or username)
      if (selectedOwner !== "all") {
        const selClean = selectedOwner.toLowerCase().trim();
        const clientOwner = (client.owner || "").toLowerCase().trim();
        const matches =
          clientOwner === selClean ||
          clientOwner.includes(selClean) ||
          selClean.includes(clientOwner);
        if (!matches) {
          return false;
        }
      }

      // 4. Dataset filter
      if (selectedDataset !== "all") {
        if (selectedDataset === "__none__") {
          if (client.dataset && client.dataset.trim().length > 0) {
            return false;
          }
        } else {
          const selClean = selectedDataset.toLowerCase().trim();
          const clientDataset = (client.dataset || "").toLowerCase().trim();
          if (clientDataset !== selClean) {
            return false;
          }
        }
      }

      return true;
    });
  }, [coldClients, searchTerm, selectedChannel, selectedOwner, selectedDataset]);

  // 2. Filtered cold clients: applies stage and due date filters on top of base scope
  const filteredClients = useMemo(() => {
    return baseClients.filter((client) => {
      // Status
      if (selectedStatus !== "all") {
        if (selectedStatus === "in_motion") {
          if (!["email_sent", "follow_up_1", "follow_up_2"].includes(client.status)) {
            return false;
          }
        } else if (selectedStatus === "high_intent") {
          if (!["call_scheduled", "replied_interested"].includes(client.status)) {
            return false;
          }
        } else if (client.status !== selectedStatus) {
          return false;
        }
      }

      // Only Due Today / Overdue
      if (onlyDueToday) {
        if (client.status === "converted" || client.status === "not_interested") return false;
        if (!client.nextFollowUpDate || client.nextFollowUpDate > todayStr) return false;
      }

      return true;
    });
  }, [baseClients, selectedStatus, onlyDueToday, todayStr]);

  // Notify parent component of current filtered count
  React.useEffect(() => {
    onFilteredCountChange?.(filteredClients.length);
  }, [filteredClients.length, onFilteredCountChange]);

  // 3. KPI Metrics: Dynamically recalculates based on active filters
  const stats = useMemo(() => {
    const isStageFiltered = selectedStatus !== "all" || onlyDueToday;
    const total = isStageFiltered ? filteredClients.length : baseClients.length;

    const inProgress = baseClients.filter((c) =>
      ["interest", "outreach_sent", "follow_up_in_progress", "email_sent", "follow_up_1", "follow_up_2", "discussion_stakeholders"].includes(c.status)
    ).length;
    const highIntent = baseClients.filter((c) =>
      ["call_scheduled", "replied_interested", "share_commercial", "pricing_negotiations"].includes(c.status)
    ).length;
    const converted = baseClients.filter((c) => ["converted", "closure_won"].includes(c.status)).length;
    const dueCount = baseClients.filter(
      (c) =>
        c.status !== "converted" &&
        c.status !== "closure_won" &&
        c.status !== "not_interested" &&
        c.status !== "not_interested_lost" &&
        c.nextFollowUpDate &&
        c.nextFollowUpDate <= todayStr
    ).length;

    return { total, inProgress, highIntent, converted, dueCount };
  }, [baseClients, filteredClients, selectedStatus, onlyDueToday, todayStr]);

  // Selection helpers
  const toggleSelectClient = (id: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredClients.map((c) => c.id);
    const isAllSelected =
      allFilteredIds.length > 0 &&
      allFilteredIds.every((id) => selectedClientIds.includes(id));

    if (isAllSelected) {
      setSelectedClientIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedClientIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedClientIds([]);
  };

  const isAllFilteredSelected =
    filteredClients.length > 0 &&
    filteredClients.every((c) => selectedClientIds.includes(c.id));

  const isSomeFilteredSelected =
    filteredClients.some((c) => selectedClientIds.includes(c.id)) && !isAllFilteredSelected;

  const selectedClientsWithEmail = useMemo(() => {
    return coldClients.filter(
      (c) =>
        selectedClientIds.includes(c.id) &&
        Boolean(c.email && c.email.trim().includes("@"))
    );
  }, [coldClients, selectedClientIds]);

  const handleExecuteBulkUpdate = async (
    ids: string[],
    updates: Partial<ColdClient>,
    touchpointNote?: string
  ) => {
    if (onBulkUpdateColdClients) {
      await onBulkUpdateColdClients(ids, updates, touchpointNote);
    } else {
      await bulkUpdateColdClients(
        ids,
        updates,
        touchpointNote,
        currentUser?.name || "Sales Representative"
      );
    }
    setSelectedClientIds([]);
  };

  const handleExecuteBulkDelete = async () => {
    if (selectedClientIds.length === 0) return;
    const count = selectedClientIds.length;
    const confirmMsg = `Are you sure you want to delete ${count} selected lead${count > 1 ? "s" : ""}? This action cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    if (onBulkDeleteColdClients) {
      await onBulkDeleteColdClients(selectedClientIds);
    } else {
      await bulkDeleteColdClients(selectedClientIds);
    }
    setSelectedClientIds([]);
  };

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
      "Dataset",
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
      `"${(c.dataset || "").replace(/"/g, '""')}"`,
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

  // Grouped for Kanban Board (10 Outreach Statuses matching user workflow with Trigger & Next Step guidance)
  const boardColumns: {
    id: ColdClientStatus;
    title: string;
    triggerAction: string;
    nextStep: string;
    statusList: ColdClientStatus[];
    pillClass: string;
    accentBorder: string;
  }[] = [
    {
      id: "cold_no_answer",
      title: "Cold / No Answer",
      triggerAction: "Fresh import from sheet or uncontacted",
      nextStep: "Send 1st email / LinkedIn message",
      statusList: ["cold_no_answer", "uncontacted"],
      pillClass: "bg-[#FBC02D] text-[#3E2723]",
      accentBorder: "border-[#FBC02D]/40",
    },
    {
      id: "outreach_sent",
      title: "Outreach Sent",
      triggerAction: "1st touch delivered",
      nextStep: "Schedule Follow-Up date",
      statusList: ["outreach_sent", "email_sent"],
      pillClass: "bg-[#0288D1] text-white",
      accentBorder: "border-[#0288D1]/40",
    },
    {
      id: "follow_up_in_progress",
      title: "Follow-up in Progress",
      triggerAction: "2nd / 3rd touch delivered",
      nextStep: "Wait for response or call",
      statusList: ["follow_up_in_progress", "follow_up_1", "follow_up_2"],
      pillClass: "bg-[#E65100] text-white",
      accentBorder: "border-[#E65100]/40",
    },
    {
      id: "interest",
      title: "Interest",
      triggerAction: 'Prospect replies "Tell me more", asks for deck, or agrees to connect',
      nextStep: "Schedule discovery / stakeholder call",
      statusList: [
        "interest",
        "discussion_stakeholders",
        "call_scheduled",
        "replied_interested",
        "share_commercial",
        "pricing_negotiations",
        "closure_won",
        "converted",
      ],
      pillClass: "bg-[#6E3805] text-[#FFE8D6]",
      accentBorder: "border-[#8D4A09]/40",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Strip (Interactive & Dynamically Filtered) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {/* 1. Total / Filtered Accounts */}
        <div
          onClick={() => {
            setSelectedStatus("all");
            setOnlyDueToday(false);
          }}
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border shadow-xs flex items-center justify-between cursor-pointer transition-all ${
            selectedStatus === "all" && !onlyDueToday
              ? "border-blue-500/60 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20"
              : "border-slate-200 dark:border-slate-800 hover:border-blue-400"
          }`}
          title="Click to reset stage/due filters and view all matching accounts"
        >
          <div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {hasActiveFilters ? "Filtered Accounts" : "Total Cold Accounts"}
            </p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {stats.total}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {hasActiveFilters
                ? `Showing ${filteredClients.length} of ${coldClients.length} total`
                : "Prospects logged"}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* 2. Outreach In Motion */}
        <div
          onClick={() => {
            if (selectedStatus === "in_motion") {
              setSelectedStatus("all");
            } else {
              setSelectedStatus("in_motion");
              setOnlyDueToday(false);
            }
          }}
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border shadow-xs flex items-center justify-between cursor-pointer transition-all ${
            selectedStatus === "in_motion" || ["email_sent", "follow_up_1", "follow_up_2"].includes(selectedStatus)
              ? "border-indigo-500/60 ring-2 ring-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/20"
              : "border-slate-200 dark:border-slate-800 hover:border-indigo-400"
          }`}
          title="Click to filter by Outreach In Motion"
        >
          <div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Outreach In Motion
            </p>
            <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {stats.inProgress}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {selectedStatus === "in_motion" || ["email_sent", "follow_up_1", "follow_up_2"].includes(selectedStatus)
                ? "Active filter applied"
                : "Sent & follow-ups"}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
        </div>

        {/* 3. Engaged / Calls Booked */}
        <div
          onClick={() => {
            if (selectedStatus === "high_intent") {
              setSelectedStatus("all");
            } else {
              setSelectedStatus("high_intent");
              setOnlyDueToday(false);
            }
          }}
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border shadow-xs flex items-center justify-between cursor-pointer transition-all ${
            selectedStatus === "high_intent" || ["call_scheduled", "replied_interested"].includes(selectedStatus)
              ? "border-emerald-500/60 ring-2 ring-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20"
              : "border-slate-200 dark:border-slate-800 hover:border-emerald-400"
          }`}
          title="Click to filter by Engaged / Discovery Booked"
        >
          <div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Engaged / Calls
            </p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.highIntent}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {selectedStatus === "high_intent" || ["call_scheduled", "replied_interested"].includes(selectedStatus)
                ? "Active filter applied"
                : "Discovery booked"}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        {/* 4. Graduated to Pipeline Leads */}
        <div
          onClick={() => {
            if (selectedStatus === "converted") {
              setSelectedStatus("all");
            } else {
              setSelectedStatus("converted");
              setOnlyDueToday(false);
            }
          }}
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border shadow-xs flex items-center justify-between cursor-pointer transition-all ${
            selectedStatus === "converted"
              ? "border-cyan-500/60 ring-2 ring-cyan-500/20 bg-cyan-50/50 dark:bg-cyan-950/20"
              : "border-slate-200 dark:border-slate-800 hover:border-cyan-400"
          }`}
          title="Click to filter by Converted to Leads"
        >
          <div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Graduated to Leads
            </p>
            <h3 className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
              {stats.converted}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {selectedStatus === "converted" ? "Active filter applied" : "In CRM pipeline"}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <CheckCheck className="w-5 h-5" />
          </div>
        </div>

        {/* 5. Follow-ups Due Today */}
        <div
          onClick={() => setOnlyDueToday(!onlyDueToday)}
          className={`p-4 rounded-2xl border shadow-xs flex items-center justify-between cursor-pointer transition-all ${
            onlyDueToday
              ? "bg-amber-500/15 border-amber-500/60 ring-2 ring-amber-500/30"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400"
          }`}
          title="Click to toggle follow-ups due filter"
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
            <option value="in_motion">Outreach In Motion (All)</option>
            <option value="high_intent">High Intent / Calls Booked</option>
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
          <select
            value={selectedOwner}
            onChange={(e) => setSelectedOwner(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 focus:outline-none font-medium"
          >
            <option value="all">All Owners ({coldClients.length})</option>
            {platformOwners.map((name) => {
              const ownerAccountsCount = coldClients.filter((c) => {
                const o = (c.owner || "").toLowerCase().trim();
                const n = name.toLowerCase().trim();
                return o === n || o.includes(n) || n.includes(o);
              }).length;
              return (
                <option key={name} value={name}>
                  {name} {ownerAccountsCount > 0 ? `(${ownerAccountsCount})` : ""}
                </option>
              );
            })}
          </select>

          {/* Dataset Filter */}
          <select
            value={selectedDataset}
            onChange={(e) => setSelectedDataset(e.target.value)}
            className={`px-2.5 py-1.5 text-xs rounded-xl border transition-all focus:outline-none font-medium cursor-pointer ${
              selectedDataset !== "all"
                ? "border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-750 font-bold"
                : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300"
            }`}
            title="Filter outreach accounts by dataset / source cohort"
          >
            <option value="all">
              All Datasets ({uniqueDatasets.length})
            </option>
            {uniqueDatasets.map((ds) => {
              const count = coldClients.filter(
                (c) => (c.dataset || "").trim().toLowerCase() === ds.toLowerCase()
              ).length;
              return (
                <option key={ds} value={ds}>
                  🗂️ {ds} ({count})
                </option>
              );
            })}
            {coldClients.some((c) => !c.dataset || !c.dataset.trim()) && (
              <option value="__none__">
                ⚪ No Dataset ({coldClients.filter((c) => !c.dataset || !c.dataset.trim()).length})
              </option>
            )}
          </select>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedStatus("all");
                setSelectedChannel("all");
                setSelectedOwner("all");
                setSelectedDataset("all");
                setOnlyDueToday(false);
              }}
              className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition flex items-center space-x-1"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
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

          {/* Quick Clean Up Duplicates button if duplicates detected */}
          {duplicateLeadsCount > 0 && (
            <button
              onClick={() => {
                setSheetsModalInitialTab("dedup");
                setIsSheetsModalOpen(true);
              }}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-xs font-bold text-amber-800 dark:text-amber-300 transition-all flex items-center space-x-1.5 shadow-xs animate-in fade-in"
              title={`${duplicateLeadsCount} duplicate lead(s) detected. Click to clean up and merge.`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Clean Duplicates ({duplicateLeadsCount})</span>
            </button>
          )}

          {/* Google Sheets Live Sync */}
          <button
            onClick={() => {
              setSheetsModalInitialTab("script");
              setIsSheetsModalOpen(true);
            }}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700/80 bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-xs font-bold text-emerald-700 dark:text-emerald-300 transition-all flex items-center space-x-1.5 shadow-xs"
            title="Google Sheets Live Sync & Apps Script"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Sheets Sync</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </button>

          {/* Multi-Update Button when leads are selected */}
          {selectedClientIds.length > 0 && (
            <button
              onClick={() => setIsBulkUpdateModalOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-blue-500 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-xs font-bold text-blue-700 dark:text-blue-300 transition-all flex items-center space-x-1.5 shadow-xs animate-in fade-in"
              title="Multi-update selected leads"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Multi-Update ({selectedClientIds.length})</span>
            </button>
          )}

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
        <div className="w-full overflow-x-auto pb-6 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start min-w-[760px] xl:min-w-0">
          {boardColumns.map((col) => {
            const colClients = filteredClients.filter((c) => {
              if (col.id === "cold_no_answer") {
                return (
                  col.statusList.includes(c.status) ||
                  !c.status ||
                  !COLD_STATUS_CONFIG[c.status]
                );
              }
              return col.statusList.includes(c.status);
            });

            return (
              <div
                key={col.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  const clientId = e.dataTransfer.getData("text/plain");
                  if (clientId) {
                    await onUpdateColdClient(clientId, { status: col.id });
                  }
                }}
                className={`w-full bg-slate-100/70 dark:bg-slate-900/40 rounded-2xl p-3 border ${col.accentBorder} flex flex-col min-h-[550px] transition-all`}
              >
                {/* Column Header with status pill badge matching workflow */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold truncate shadow-xs ${col.pillClass}`}>
                      {col.title}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-xs">
                      {colClients.length}
                    </span>
                  </div>
                </div>

                {/* Stage Guidance Card: Trigger / Action & Next Step */}
                <div className="mb-2.5 px-2.5 py-2 rounded-xl bg-white/80 dark:bg-slate-850/80 border border-slate-200/80 dark:border-slate-800 text-[10px] space-y-1 shadow-2xs">
                  <div className="flex items-start gap-1 leading-snug">
                    <span className="font-bold text-slate-500 dark:text-slate-400 shrink-0">Trigger:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium leading-tight">{col.triggerAction}</span>
                  </div>
                  <div className="flex items-start gap-1 leading-snug text-blue-600 dark:text-blue-400">
                    <span className="font-bold shrink-0">Next:</span>
                    <span className="font-semibold leading-tight">{col.nextStep}</span>
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
                      const isSelected = selectedClientIds.includes(client.id);
                      const cfg = getStatusConfig(client.status);
                      const isDue = Boolean(
                        client.nextFollowUpDate &&
                        client.nextFollowUpDate <= todayStr &&
                        client.status !== "converted" &&
                        client.status !== "closure_won" &&
                        client.status !== "not_interested" &&
                        client.status !== "not_interested_lost"
                      );

                      return (
                        <div
                          key={client.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", client.id);
                          }}
                          onClick={() => setSelectedClient(client)}
                          className={`p-3.5 bg-white dark:bg-slate-850 rounded-xl border ${
                            isSelected
                              ? "border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/20 dark:bg-blue-950/20"
                              : "border-slate-200/80 dark:border-slate-750 hover:border-blue-400 dark:hover:border-blue-500"
                          } shadow-xs hover:shadow-md transition-all cursor-pointer group space-y-2.5 active:cursor-grabbing`}
                        >
                          {/* Card Top: Checkbox, Company & Channel */}
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              <div
                                className="pt-0.5 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleSelectClient(client.id);
                                  }}
                                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                                  title="Select lead for multi-update"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {client.companyName}
                                </h4>
                                <div className="flex items-center space-x-1.5 flex-wrap">
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    {client.contactName}
                                  </p>
                                  {client.additionalContacts && client.additionalContacts.length > 0 && (
                                    <span
                                      className="inline-flex items-center space-x-0.5 px-1 py-0.2 rounded-full text-[9px] font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60"
                                      title={`${client.additionalContacts.length} additional contact(s): ${client.additionalContacts.map((c) => c.name).join(", ")}`}
                                    >
                                      <Users className="w-2.5 h-2.5" />
                                      <span>+{client.additionalContacts.length}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1 shrink-0">
                              {client.dataset && (
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDataset(client.dataset!.trim());
                                  }}
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 max-w-[100px] truncate transition-colors cursor-pointer"
                                  title={`Dataset: ${client.dataset} (Click to filter)`}
                                >
                                  🗂️ {client.dataset}
                                </span>
                              )}
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider flex-shrink-0">
                                {client.channel}
                              </span>
                            </div>
                          </div>

                          {/* Role & Target Program */}
                          <div className="flex flex-wrap items-center gap-1">
                            {client.designation && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block max-w-full">
                                {client.designation}
                              </span>
                            )}
                            {client.companySize && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                {client.companySize}
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
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeFilteredSelected;
                      }}
                      onChange={handleSelectAllFiltered}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                      title={isAllFilteredSelected ? "Deselect all" : "Select all filtered"}
                    />
                  </th>
                  <th className="py-3 px-4">Company & Contact</th>
                  <th className="py-3 px-4">Dataset</th>
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
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      No cold prospects found matching the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => {
                    const isSelected = selectedClientIds.includes(client.id);
                    const cfg = getStatusConfig(client.status);
                    const isDue = Boolean(
                      client.nextFollowUpDate &&
                      client.nextFollowUpDate <= todayStr &&
                      client.status !== "converted" &&
                      client.status !== "not_interested"
                    );

                    return (
                      <tr
                        key={client.id || `${client.companyName}-${Math.random()}`}
                        className={`transition-colors cursor-pointer group ${
                          isSelected
                            ? "bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100/60 dark:hover:bg-blue-900/50"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                        onClick={() => setSelectedClient(client)}
                      >
                        {/* Row Selection Checkbox */}
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleSelectClient(client.id);
                            }}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                          />
                        </td>

                        {/* Company & Contact */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {client.companyName || "Unnamed Company"}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1.5 flex-wrap">
                            <span>{client.contactName || "No Contact"} {client.designation ? `• ${client.designation}` : ""}</span>
                            {client.additionalContacts && client.additionalContacts.length > 0 && (
                              <span
                                className="inline-flex items-center space-x-0.5 px-1 py-0.2 rounded-full text-[9px] font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60"
                                title={`${client.additionalContacts.length} additional contact(s): ${client.additionalContacts.map((c) => c.name).join(", ")}`}
                              >
                                <Users className="w-2.5 h-2.5" />
                                <span>+{client.additionalContacts.length}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Dataset */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {client.dataset ? (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDataset(client.dataset!.trim());
                              }}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 hover:bg-purple-100 transition-colors"
                              title={`Filter by dataset: ${client.dataset}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                              <span className="truncate max-w-[120px]">{client.dataset}</span>
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg?.badgeBg || "bg-slate-100"} ${cfg?.badgeText || "text-slate-700"} ${cfg?.borderColor || "border-slate-300"}`}
                          >
                            {cfg?.label || client.status || "Cold / Uncontacted"}
                          </span>
                        </td>

                        {/* Channel */}
                        <td className="py-3 px-4 uppercase text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                          {client.channel || "OUTREACH"}
                        </td>

                        {/* Target Offering */}
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                          {client.targetProgram || "Executive Coaching"}
                        </td>

                        {/* Potential Value */}
                        <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {formatINR(Number(client.estimatedPotentialValue) || 0)}
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
                          {client.owner || "Unassigned"}
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

      {/* Google Sheets Real-Time Sync Modal */}
      <GoogleSheetsSyncModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        currentUser={currentUser}
        initialTab={sheetsModalInitialTab}
      />

      {/* Multi-Update Leads Modal */}
      <BulkUpdateOutreachModal
        isOpen={isBulkUpdateModalOpen}
        onClose={() => setIsBulkUpdateModalOpen(false)}
        selectedIds={selectedClientIds}
        clients={coldClients}
        platformOwners={platformOwners}
        currentUser={currentUser}
        onConfirmBulkUpdate={handleExecuteBulkUpdate}
      />

      {/* Bulk Email Outreach Modal */}
      <BulkEmailOutreachModal
        isOpen={isBulkEmailModalOpen}
        onClose={() => setIsBulkEmailModalOpen(false)}
        selectedIds={selectedClientIds}
        clients={coldClients}
        currentUser={currentUser}
        onLogTouchpoint={onLogTouchpoint}
        onBulkUpdateClients={onBulkUpdateColdClients}
        onClearSelection={handleClearSelection}
        onNavigateToBulkEmailTab={onNavigateToBulkEmailTab}
      />

      {/* Sticky Multi-Action Bar for Selected Leads */}
      {selectedClientIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-auto max-w-[95vw] animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-900/95 dark:bg-slate-800/95 text-white rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md">
            {/* Selection count badge */}
            <div className="flex items-center space-x-2 pl-1 pr-2 border-r border-slate-700">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-xs font-bold whitespace-nowrap">
                {selectedClientIds.length} Selected
              </span>
            </div>

            {/* Select all filtered shortcut */}
            {!isAllFilteredSelected && filteredClients.length > selectedClientIds.length && (
              <button
                onClick={handleSelectAllFiltered}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2 whitespace-nowrap px-1 hidden sm:inline"
              >
                Select all {filteredClients.length}
              </button>
            )}

            {/* Bulk Email Button */}
            <button
              onClick={() => setIsBulkEmailModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-purple-600/30 transition-all hover:scale-102 active:scale-98 whitespace-nowrap cursor-pointer"
              title="Send Bulk Email to Selected Leads"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Bulk Email</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold">
                {selectedClientsWithEmail.length}
              </span>
            </button>

            {/* Multi-Update Button */}
            <button
              onClick={() => setIsBulkUpdateModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-blue-600/30 transition-all hover:scale-102 active:scale-98 whitespace-nowrap"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Multi-Update Leads</span>
            </button>

            {/* Delete Button */}
            <button
              onClick={handleExecuteBulkDelete}
              className="p-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 transition"
              title="Delete Selected Leads"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Clear selection */}
            <button
              onClick={handleClearSelection}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition whitespace-nowrap"
            >
              Deselect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
