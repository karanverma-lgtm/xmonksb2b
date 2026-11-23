"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Lead, LeadInvoice, getLeadInvoices } from "@/types/lead";
import { updateLeadInvoiceDetails, updateLeadOwner, updateLeadSingleInvoice, deleteLeadInvoice } from "@/lib/leadsService";
import { formatINR, getDateComponents } from "@/lib/formatters";
import { UserAccount, isSameOwner, canUserExport } from "@/constants/users";
import { NavTab } from "@/components/Sidebar";
import { SpringCard, SpringButton } from "@/components/spring";
import {
  TrendingUp,
  Receipt,
  Calendar,
  User,
  Building2,
  Search,
  Filter,
  Download,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  Copy,
  Check,
  GraduationCap,
  Sparkles,
  ChevronRight,
  Pencil,
  X,
  AlertCircle,
  Kanban,
} from "lucide-react";

export interface PipelineInvoice {
  id: string; // unique item id
  invoiceId?: string; // invoice unique id
  leadId: string;
  invoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD
  monthKey: string; // e.g. "2026-10"
  monthLabel: string; // e.g. "Oct 2026"
  amount: number;
  billed?: boolean;
  companyName: string;
  companyLogo?: string;
  owner: string;
  program?: string;
  stage: string;
  notes?: string;
  rawLead: Lead;
}

interface ForecastTabProps {
  leads: Lead[];
  currentUser?: UserAccount | null;
  isAdmin?: boolean;
  onSelectLead?: (lead: Lead) => void;
  onNavigateToTab?: (tab: NavTab) => void;
  onUpdateInvoiceDetails?: (
    leadId: string,
    invoiceData: { invoiceNumber?: string; invoiceDate?: string; invoiceAmount?: number; invoices?: LeadInvoice[] }
  ) => void;
  onAddInvoice?: (
    leadId: string,
    invoiceData: { invoiceNumber: string; invoiceDate: string; invoiceAmount: number; notes?: string }
  ) => Promise<void> | void;
  onUpdateSingleInvoice?: (
    leadId: string,
    invoiceId: string,
    updates: Partial<LeadInvoice>
  ) => Promise<void> | void;
  onDeleteInvoice?: (
    leadId: string,
    invoiceId: string
  ) => Promise<void> | void;
  readOnly?: boolean;
}

export const ForecastTab: React.FC<ForecastTabProps> = ({
  leads,
  currentUser,
  isAdmin = false,
  onSelectLead,
  onNavigateToTab,
  onUpdateInvoiceDetails,
  onAddInvoice,
  onUpdateSingleInvoice,
  onDeleteInvoice,
  readOnly = false,
}) => {
  const isReadOnly = Boolean(readOnly || currentUser?.readOnly);
  type DateFilterMode = "all" | "current_month" | "last_month" | "this_year" | "month" | "custom";

  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const [selectedOwner, setSelectedOwner] = useState<string>("all");
  const [selectedBilled, setSelectedBilled] = useState<"all" | "yes" | "no">("all");

  // Close calendar popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };
    if (isDatePickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDatePickerOpen]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [copiedInvoiceId, setCopiedInvoiceId] = useState<string | null>(null);

  // Edit Invoice Modal State
  const [editingInvoice, setEditingInvoice] = useState<PipelineInvoice | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Build Invoices List PURELY from Pipeline Leads (No delivery sync)
  const allInvoices: PipelineInvoice[] = useMemo(() => {
    const list: PipelineInvoice[] = [];

    leads.forEach((l) => {
      const leadInvs = getLeadInvoices(l);
      leadInvs.forEach((inv, idx) => {
        const invNo = inv.invoiceNumber?.trim() || `INV-${l.id.slice(-6).toUpperCase()}-${idx + 1}`;
        const invDate = inv.invoiceDate?.trim() || l.expectedCloseDate || l.updatedAt.split("T")[0];
        const comps = getDateComponents(invDate);
        const mKey = comps.isValid
          ? `${comps.year}-${String(comps.monthNum).padStart(2, "0")}`
          : "2026-10";

        let mLabel = mKey;
        if (comps.isValid) {
          const d = new Date(comps.year, comps.monthNum - 1, 1);
          mLabel = d.toLocaleString("en-US", { month: "short", year: "numeric" });
        }

        const invAmount =
          typeof inv.invoiceAmount === "number" && !isNaN(inv.invoiceAmount)
            ? inv.invoiceAmount
            : l.dealValue || 0;

        list.push({
          id: `${l.id}-${inv.id || idx}`,
          invoiceId: inv.id,
          leadId: l.id,
          invoiceNumber: invNo,
          invoiceDate: invDate,
          monthKey: mKey,
          monthLabel: mLabel,
          amount: invAmount,
          billed: inv.billed !== false,
          companyName: l.companyName,
          companyLogo: l.companyLogo,
          owner: l.owner?.trim() || "Unassigned",
          program: l.program || "Executive Development",
          stage: l.stage,
          notes: inv.notes,
          rawLead: l,
        });
      });
    });

    // Sort by invoiceDate descending (newest first)
    return list.sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
  }, [leads]);

  // 2. Discover Unique Months and Owners for Filters
  const availableMonths = useMemo(() => {
    const map = new Map<string, { monthKey: string; label: string; count: number; totalAmount: number }>();

    allInvoices.forEach((inv) => {
      if (!map.has(inv.monthKey)) {
        map.set(inv.monthKey, {
          monthKey: inv.monthKey,
          label: inv.monthLabel,
          count: 0,
          totalAmount: 0,
        });
      }
      const entry = map.get(inv.monthKey)!;
      entry.count += 1;
      entry.totalAmount += inv.amount;
    });

    // Ensure common active months exist
    const defaults = ["2026-10", "2026-11", "2026-12", "2026-09"];
    defaults.forEach((def) => {
      if (!map.has(def)) {
        const comps = getDateComponents(def + "-01");
        const d = new Date(comps.year, comps.monthNum - 1, 1);
        map.set(def, {
          monthKey: def,
          label: d.toLocaleString("en-US", { month: "short", year: "numeric" }),
          count: 0,
          totalAmount: 0,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [allInvoices]);

  const availableOwners = useMemo(() => {
    const set = new Set<string>();
    allInvoices.forEach((inv) => {
      if (inv.owner && inv.owner !== "Unassigned") set.add(inv.owner.trim());
    });
    // Add default sales team members
    ["Amit Shelly", "Ruby Dayal", "Gaurav", "Preeti", "Nikhil"].forEach((name) => set.add(name));
    return Array.from(set).sort();
  }, [allInvoices]);

  // Date Presets & Dynamic Labels
  const now = new Date();
  const currentYearNum = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;
  const currentMonthKey = `${currentYearNum}-${String(currentMonthNum).padStart(2, "0")}`;
  const currentMonthLabel = now.toLocaleString("en-US", { month: "short", year: "numeric" });

  const lastMonthDate = new Date(currentYearNum, now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthLabel = lastMonthDate.toLocaleString("en-US", { month: "short", year: "numeric" });

  const thisYearKey = String(currentYearNum);

  const currentMonthCount = useMemo(
    () => allInvoices.filter((inv) => inv.monthKey === currentMonthKey).length,
    [allInvoices, currentMonthKey]
  );
  const lastMonthCount = useMemo(
    () => allInvoices.filter((inv) => inv.monthKey === lastMonthKey).length,
    [allInvoices, lastMonthKey]
  );
  const thisYearCount = useMemo(
    () => allInvoices.filter((inv) => inv.invoiceDate.startsWith(thisYearKey)).length,
    [allInvoices, thisYearKey]
  );

  const activeDateLabel = useMemo(() => {
    if (dateFilterMode === "current_month") return `Current Month (${currentMonthLabel})`;
    if (dateFilterMode === "last_month") return `Last Month (${lastMonthLabel})`;
    if (dateFilterMode === "this_year") return `This Year (${thisYearKey})`;
    if (dateFilterMode === "month") {
      const match = availableMonths.find((m) => m.monthKey === selectedMonth);
      return match ? match.label : selectedMonth;
    }
    if (dateFilterMode === "custom") {
      if (customStartDate && customEndDate) return `${customStartDate} → ${customEndDate}`;
      if (customStartDate) return `From ${customStartDate}`;
      if (customEndDate) return `Until ${customEndDate}`;
      return "Custom Range";
    }
    return "All Time";
  }, [dateFilterMode, currentMonthLabel, lastMonthLabel, thisYearKey, selectedMonth, availableMonths, customStartDate, customEndDate]);

  // 3. Filter Invoices
  const filteredInvoices = useMemo(() => {
    return allInvoices.filter((inv) => {
      // Date filter
      if (dateFilterMode === "current_month") {
        if (inv.monthKey !== currentMonthKey) return false;
      } else if (dateFilterMode === "last_month") {
        if (inv.monthKey !== lastMonthKey) return false;
      } else if (dateFilterMode === "this_year") {
        if (!inv.invoiceDate.startsWith(thisYearKey)) return false;
      } else if (dateFilterMode === "month") {
        if (selectedMonth !== "all" && inv.monthKey !== selectedMonth) return false;
      } else if (dateFilterMode === "custom") {
        if (customStartDate && inv.invoiceDate < customStartDate) return false;
        if (customEndDate && inv.invoiceDate > customEndDate) return false;
      }

      // Owner filter
      if (selectedOwner !== "all") {
        if (!isSameOwner(inv.owner, selectedOwner)) {
          return false;
        }
      }

      // Billed filter
      if (selectedBilled !== "all") {
        const isBilled = inv.billed !== false;
        if (selectedBilled === "yes" && !isBilled) {
          return false;
        }
        if (selectedBilled === "no" && isBilled) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNo = inv.invoiceNumber.toLowerCase().includes(q);
        const matchComp = inv.companyName.toLowerCase().includes(q);
        const matchOwner = inv.owner.toLowerCase().includes(q);
        const matchProg = (inv.program || "").toLowerCase().includes(q);
        if (!matchNo && !matchComp && !matchOwner && !matchProg) {
          return false;
        }
      }
      return true;
    });
  }, [
    allInvoices,
    dateFilterMode,
    selectedMonth,
    currentMonthKey,
    lastMonthKey,
    thisYearKey,
    customStartDate,
    customEndDate,
    selectedOwner,
    selectedBilled,
    searchQuery,
  ]);

  // 4. Financial Aggregate Metrics
  const metrics = useMemo(() => {
    let totalInvoiced = 0;
    const ownerTotals = new Map<string, number>();

    filteredInvoices.forEach((inv) => {
      totalInvoiced += inv.amount;
      const current = ownerTotals.get(inv.owner) || 0;
      ownerTotals.set(inv.owner, current + inv.amount);
    });

    let topOwner = "N/A";
    let topOwnerVal = 0;
    ownerTotals.forEach((val, owner) => {
      if (val > topOwnerVal) {
        topOwnerVal = val;
        topOwner = owner;
      }
    });

    const avgInvoice =
      filteredInvoices.length > 0 ? Math.round(totalInvoiced / filteredInvoices.length) : 0;

    return {
      totalInvoiced,
      count: filteredInvoices.length,
      avgInvoice,
      topOwner,
      topOwnerVal,
      ownerTotals: Array.from(ownerTotals.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [filteredInvoices]);

  // Copy invoice number
  const handleCopyInvoiceNumber = (invNo: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(invNo);
      setCopiedInvoiceId(id);
      setTimeout(() => setCopiedInvoiceId(null), 2000);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!canUserExport(currentUser)) {
      alert("Access Restricted: Only Administrator and Preeti are authorized to export data.");
      return;
    }
    if (filteredInvoices.length === 0) return;
    const headers = [
      "Invoice Number",
      "Billed",
      "Invoice Date",
      "Month",
      "Client Company",
      "Lead Owner",
      "Program",
      "Amount (INR)",
      "Pipeline Stage",
    ];

    const rows = filteredInvoices.map((inv) => [
      `"${inv.invoiceNumber}"`,
      `"${inv.billed !== false ? "Yes" : "No"}"`,
      `"${inv.invoiceDate}"`,
      `"${inv.monthLabel}"`,
      `"${inv.companyName}"`,
      `"${inv.owner}"`,
      `"${inv.program || ""}"`,
      inv.amount,
      `"${inv.stage}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Pipeline_Invoice_Forecast_${activeDateLabel.replace(/[^a-zA-Z0-9_-]/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Save from Edit Modal (Updates Lead in Pipeline)
  const handleSaveEditedInvoice = async (updated: {
    invoiceNumber: string;
    invoiceDate: string;
    amount: number;
    billed?: boolean;
    owner: string;
    notes?: string;
  }) => {
    if (!editingInvoice) return;

    const author = currentUser?.name || "Client Partner";

    if (editingInvoice.invoiceId && onUpdateSingleInvoice) {
      await onUpdateSingleInvoice(editingInvoice.leadId, editingInvoice.invoiceId, {
        invoiceNumber: updated.invoiceNumber,
        invoiceDate: updated.invoiceDate,
        invoiceAmount: updated.amount,
        billed: updated.billed,
        notes: updated.notes,
      });
    } else if (editingInvoice.invoiceId) {
      await updateLeadSingleInvoice(
        editingInvoice.leadId,
        editingInvoice.invoiceId,
        {
          invoiceNumber: updated.invoiceNumber,
          invoiceDate: updated.invoiceDate,
          invoiceAmount: updated.amount,
          billed: updated.billed,
          notes: updated.notes,
        },
        author
      );
    } else {
      await updateLeadInvoiceDetails(
        editingInvoice.leadId,
        {
          invoiceNumber: updated.invoiceNumber,
          invoiceDate: updated.invoiceDate,
          invoiceAmount: updated.amount,
        },
        author
      );
    }

    if (updated.owner && updated.owner !== editingInvoice.owner) {
      await updateLeadOwner(editingInvoice.leadId, updated.owner, author);
    }

    onUpdateInvoiceDetails?.(editingInvoice.leadId, {
      invoiceNumber: updated.invoiceNumber,
      invoiceDate: updated.invoiceDate,
      invoiceAmount: updated.amount,
    });

    setToastMessage(`Pipeline Invoice #${updated.invoiceNumber} updated & synced!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center space-x-3 animate-slideUp">
          <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <span className="text-xs font-black">{toastMessage}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* TOP CONTROLS & FILTER BAR */}
      {/* ========================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
        {/* Row 1: Title, Search, View Toggle, and Export */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/25">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Pipeline Invoice Forecast
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/80">
                  {metrics.count} {metrics.count === 1 ? "Invoice" : "Invoices"}
                </span>
                {isReadOnly && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>View Only</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Live forecast synchronized directly with Pipeline lead invoices (date, number & amount).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invoice #, client, owner..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === "cards"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                }`}
                title="Card View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                }`}
                title="Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>

            {/* Export CSV Button */}
            {canUserExport(currentUser) && (
              <SpringButton
                variant="secondary"
                size="sm"
                onClick={handleExportCSV}
                disabled={filteredInvoices.length === 0}
                className="flex items-center space-x-1.5 font-bold"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Export CSV</span>
              </SpringButton>
            )}
          </div>
        </div>

        {/* Row 2: Date Filters & Lead Owner Dropdown */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Date Filter Controls */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center space-x-1 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              <span>Date:</span>
            </span>

            {/* 1. All Months */}
            <button
              type="button"
              onClick={() => {
                setDateFilterMode("all");
                setSelectedMonth("all");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                dateFilterMode === "all"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300"
              }`}
            >
              All Months ({allInvoices.length})
            </button>

            {/* 2. Current Month */}
            <button
              type="button"
              onClick={() => {
                setDateFilterMode("current_month");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border flex items-center space-x-1.5 ${
                dateFilterMode === "current_month"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300"
              }`}
            >
              <span>Current Month</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  dateFilterMode === "current_month"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {currentMonthCount}
              </span>
            </button>

            {/* 3. Last Month */}
            <button
              type="button"
              onClick={() => {
                setDateFilterMode("last_month");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border flex items-center space-x-1.5 ${
                dateFilterMode === "last_month"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300"
              }`}
            >
              <span>Last Month</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  dateFilterMode === "last_month"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {lastMonthCount}
              </span>
            </button>

            {/* 4. This Year */}
            <button
              type="button"
              onClick={() => {
                setDateFilterMode("this_year");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border flex items-center space-x-1.5 ${
                dateFilterMode === "this_year"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300"
              }`}
            >
              <span>This Year ({thisYearKey})</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  dateFilterMode === "this_year"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {thisYearCount}
              </span>
            </button>

            {/* 5. Month Select Dropdown */}
            <select
              value={dateFilterMode === "month" ? selectedMonth : ""}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedMonth(e.target.value);
                  setDateFilterMode("month");
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                dateFilterMode === "month"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300"
              }`}
            >
              <option value="" disabled={dateFilterMode === "month"}>
                {dateFilterMode === "month"
                  ? availableMonths.find((m) => m.monthKey === selectedMonth)?.label || "Selected Month"
                  : "Specific Month..."}
              </option>
              {availableMonths.map((m) => (
                <option
                  key={m.monthKey}
                  value={m.monthKey}
                  className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                >
                  {m.label} ({m.count})
                </option>
              ))}
            </select>

            {/* 6. Calendar Date Picker Dropdown Popover */}
            <div className="relative" ref={datePickerRef}>
              <button
                type="button"
                onClick={() => setIsDatePickerOpen((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border flex items-center space-x-1.5 ${
                  dateFilterMode === "custom"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300"
                }`}
                title="Filter by custom date range"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {dateFilterMode === "custom" && (customStartDate || customEndDate)
                    ? `${customStartDate || "Start"} → ${customEndDate || "End"}`
                    : "Calendar Date Picker"}
                </span>
                {dateFilterMode === "custom" && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomStartDate("");
                      setCustomEndDate("");
                      setDateFilterMode("all");
                    }}
                    className="p-0.5 rounded-full hover:bg-emerald-700 transition"
                    title="Clear date range"
                  >
                    <X className="w-3 h-3 text-white" />
                  </span>
                )}
              </button>

              {/* Popover */}
              {isDatePickerOpen && (
                <div className="absolute left-0 mt-2 z-50 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-black text-slate-900 dark:text-white flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Calendar Date Picker</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsDatePickerOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* From & To Date Inputs */}
                  <div className="space-y-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        From Date
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        To Date
                      </label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>

                  {/* Quick Helper Shortcuts */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Quick Shortcuts
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date().toISOString().split("T")[0];
                          setCustomStartDate(today);
                          setCustomEndDate(today);
                          setDateFilterMode("custom");
                          setIsDatePickerOpen(false);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/60 font-semibold text-left transition cursor-pointer"
                      >
                        ⚡ Today
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          const past30 = new Date(d.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                          const today = d.toISOString().split("T")[0];
                          setCustomStartDate(past30);
                          setCustomEndDate(today);
                          setDateFilterMode("custom");
                          setIsDatePickerOpen(false);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/60 font-semibold text-left transition cursor-pointer"
                      >
                        ⚡ Last 30 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          const past90 = new Date(d.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                          const today = d.toISOString().split("T")[0];
                          setCustomStartDate(past90);
                          setCustomEndDate(today);
                          setDateFilterMode("custom");
                          setIsDatePickerOpen(false);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/60 font-semibold text-left transition cursor-pointer"
                      >
                        ⚡ Last 90 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          const next90 = new Date(d.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                          const today = d.toISOString().split("T")[0];
                          setCustomStartDate(today);
                          setCustomEndDate(next90);
                          setDateFilterMode("custom");
                          setIsDatePickerOpen(false);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/60 font-semibold text-left transition cursor-pointer"
                      >
                        ⚡ Next 90 Days
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomStartDate("");
                        setCustomEndDate("");
                        setDateFilterMode("all");
                        setIsDatePickerOpen(false);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition cursor-pointer"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (customStartDate || customEndDate) {
                          setDateFilterMode("custom");
                        }
                        setIsDatePickerOpen(false);
                      }}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
                    >
                      Apply Range
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-3 shrink-0">
            {/* Billed Filter */}
            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Billed:</span>
              <select
                value={selectedBilled}
                onChange={(e) => setSelectedBilled(e.target.value as "all" | "yes" | "no")}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                <option value="all">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            {/* Lead Owner Filter */}
            <div className="flex items-center space-x-2 shrink-0">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Lead Owner:</span>
              <select
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                <option value="all">All Lead Owners</option>
                {availableOwners.map((owner) => (
                  <option key={owner} value={owner}>
                    {owner}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* EXECUTIVE KPI SUMMARY CARDS */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Invoiced */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <span className="flex items-center space-x-1.5">
              <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Total Pipeline Invoiced</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-extrabold uppercase">
              {activeDateLabel}
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {formatINR(metrics.totalInvoiced)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Across {metrics.count} pipeline invoices
          </div>
        </div>

        {/* Card 2: Invoices Count */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
            <span className="flex items-center space-x-1.5">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span>Invoices Raised</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
              Rate Realization
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {metrics.count}
          </div>
        </div>

        {/* Card 3: Top Lead Owner */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
            <span className="flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Top Invoicing Owner</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
              Leader
            </span>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white truncate">
            {metrics.topOwner}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Raised: <strong className="text-emerald-600 dark:text-emerald-400">{formatINR(metrics.topOwnerVal)}</strong>
          </div>
        </div>

        {/* Card 4: Owner Distribution breakdown */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center space-x-1.5">
            <User className="w-4 h-4 text-blue-500" />
            <span>Owner Distribution</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-14 overflow-y-auto pt-1">
            {metrics.ownerTotals.slice(0, 4).map(([owner, amt]) => (
              <span
                key={owner}
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300"
                title={`${owner}: ${formatINR(amt)}`}
              >
                <span>{owner.split(" ")[0]}:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black">
                  {formatINR(amt)}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* INVOICES DISPLAY: CARDS VIEW VS TABLE VIEW */}
      {/* ========================================================= */}
      {filteredInvoices.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <Receipt className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              No Pipeline Invoices Forecasted
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              In the <strong>Pipeline</strong> tab, enter the <strong>Invoice Date</strong>,{" "}
              <strong>Invoice Number</strong>, and <strong>Amount</strong> on any lead card to forecast it here.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2">
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab("kanban")}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center space-x-1.5"
              >
                <Kanban className="w-4 h-4" />
                <span>Go to Pipeline Kanban</span>
              </button>
            )}
            {leads.length > 0 && onSelectLead && (
              <button
                type="button"
                onClick={() => onSelectLead(leads[0])}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Open First Lead
              </button>
            )}
          </div>
        </div>
      ) : viewMode === "cards" ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInvoices.map((inv) => {
            const isCopied = copiedInvoiceId === inv.id;
            return (
              <SpringCard
                key={inv.id}
                onClick={() => onSelectLead?.(inv.rawLead)}
                className="p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 group hover:shadow-md bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700"
              >
                {/* Card Top: Invoice Number & Edit Icon */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Receipt className="w-4 h-4" />
                    </span>
                    <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                      #{inv.invoiceNumber}
                    </span>
                    {inv.notes && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                        {inv.notes}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleCopyInvoiceNumber(inv.invoiceNumber, inv.id, e)}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      title="Copy Invoice Number"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {!isReadOnly && onUpdateInvoiceDetails && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingInvoice(inv);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition"
                        title="Edit this invoice"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      Pipeline Invoiced
                    </span>

                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        inv.billed !== false
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                      }`}
                    >
                      Billed: {inv.billed !== false ? "Yes" : "No"}
                    </span>
                  </div>
                </div>

                {/* Card Middle: Company Name & Program */}
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2.5">
                    {inv.companyLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={inv.companyLogo}
                        alt={inv.companyName}
                        className="w-8 h-8 rounded-lg object-contain bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {inv.companyName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4
                        className="font-black text-sm text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition"
                        title={inv.companyName}
                      >
                        {inv.companyName}
                      </h4>
                      {inv.program && (
                        <span className="inline-flex items-center space-x-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          <GraduationCap className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span className="truncate">{inv.program}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Financials Highlight: Rate & Date */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Invoice Amount
                    </span>
                    <span className="text-base font-black text-emerald-700 dark:text-emerald-400">
                      {formatINR(inv.amount)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Invoice Date
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1 justify-end">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{inv.invoiceDate}</span>
                    </span>
                  </div>
                </div>

                {/* Card Footer: Lead Owner & Edit / Action Buttons */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                      {inv.owner.charAt(0)}
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      {inv.owner}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {!isReadOnly && onUpdateInvoiceDetails && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingInvoice(inv);
                        }}
                        className="px-2 py-0.5 rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 font-bold text-[11px] flex items-center space-x-1 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    )}

                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center space-x-0.5 group-hover:translate-x-0.5 transition-transform">
                      <span>Card</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </SpringCard>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4 text-center">Billed</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Month</th>
                  <th className="py-3.5 px-4">Client Company</th>
                  <th className="py-3.5 px-4">Lead Owner</th>
                  <th className="py-3.5 px-4">Program</th>
                  <th className="py-3.5 px-4 text-right">Invoice Amount</th>
                  <th className="py-3.5 px-4 text-center">Pipeline Stage</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => onSelectLead?.(inv.rawLead)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      <span>#{inv.invoiceNumber}</span>
                      {inv.notes && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                          {inv.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          inv.billed !== false
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                        }`}
                      >
                        {inv.billed !== false ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {inv.invoiceDate}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-[10px]">
                        {inv.monthLabel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {inv.companyName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                      {inv.owner}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {inv.program || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {formatINR(inv.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase">
                        {inv.stage}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        {!isReadOnly && onUpdateInvoiceDetails && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingInvoice(inv);
                            }}
                            className="px-2 py-1 rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 font-bold text-xs flex items-center space-x-1 border border-emerald-200 dark:border-emerald-800 transition"
                            title="Edit invoice details"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLead?.(inv.rawLead);
                          }}
                          className="px-2 py-1 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-bold text-xs"
                        >
                          Lead Card
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-800/80 font-black text-xs border-t-2 border-slate-200 dark:border-slate-700">
                  <td colSpan={7} className="py-3.5 px-4 text-slate-600 dark:text-slate-300 uppercase">
                    Total Filtered ({filteredInvoices.length} Invoices)
                  </td>
                  <td className="py-3.5 px-4 text-right text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatINR(metrics.totalInvoiced)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EDIT INVOICE MODAL (UPDATES PIPELINE LEAD) */}
      {/* ========================================================= */}
      {editingInvoice && (
        <EditInvoiceModal
          isOpen={Boolean(editingInvoice)}
          onClose={() => setEditingInvoice(null)}
          invoice={editingInvoice}
          availableOwners={availableOwners}
          onSave={handleSaveEditedInvoice}
        />
      )}
    </div>
  );
};

interface EditInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: PipelineInvoice | null;
  availableOwners: string[];
  onSave: (updated: {
    invoiceNumber: string;
    invoiceDate: string;
    amount: number;
    billed?: boolean;
    owner: string;
    notes?: string;
  }) => Promise<void>;
}

const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
  availableOwners,
  onSave,
}) => {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [amount, setAmount] = useState("");
  const [billed, setBilled] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>("");
  const [owner, setOwner] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invoice) {
      setInvoiceNumber(invoice.invoiceNumber || "");
      setInvoiceDate(invoice.invoiceDate || "");
      setAmount(String(invoice.amount || 0));
      setBilled(invoice.billed !== false);
      setNotes(invoice.notes || "");
      setOwner(invoice.owner || "");
      setError(null);
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim()) {
      setError("Please enter an invoice number.");
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      setError("Please enter a valid invoice amount.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate: invoiceDate.trim() || new Date().toISOString().split("T")[0],
        amount: numAmount,
        billed,
        owner: owner.trim() || invoice.owner,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update invoice.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                Edit Pipeline Invoice
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {invoice.companyName} • Updates Pipeline Lead & Live Forecast
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Invoice Number */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Invoice Number *
              </label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-XM-2026-001"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
              />
            </div>

            {/* Invoice Date */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Invoice Issue Date *
              </label>
              <input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Invoice Amount */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Invoice Amount (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 500000"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
              />
              {amount && !isNaN(parseFloat(amount)) && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1">
                  Formatted: {formatINR(parseFloat(amount))}
                </span>
              )}
            </div>

            {/* Lead Owner */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Assigned Lead Owner
              </label>
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
              >
                {availableOwners.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Billed */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Billed *
              </label>
              <select
                value={billed ? "yes" : "no"}
                onChange={(e) => setBilled(e.target.value === "yes")}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs cursor-pointer"
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            {/* Invoice Note / Milestone */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Invoice Note / Milestone (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Tranche 1, Advance 50%"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <SpringButton
              type="submit"
              variant="gradient"
              size="sm"
              disabled={isSaving}
              className="flex items-center space-x-1.5 font-bold shadow-md cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? "Saving & Syncing..." : "Save & Sync to Forecast"}</span>
            </SpringButton>
          </div>
        </form>
      </div>
    </div>
  );
};
