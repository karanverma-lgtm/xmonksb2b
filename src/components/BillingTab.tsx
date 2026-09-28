"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Building2,
  DollarSign,
  Calendar,
  Clock,
  AlertTriangle,
  FileText,
  Search,
  Plus,
  Download,
  Filter,
  CheckCircle2,
  CreditCard,
  User,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Trash2,
  Edit,
  Eye,
  LayoutGrid,
  Table as TableIcon,
  ChevronRight,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import {
  BillingRecord,
  BillingPayment,
  BillingPaymentDefault,
  BillingDocument,
  BillingStatus,
} from "@/types/billing";
import { Lead } from "@/types/lead";
import {
  subscribeToBillingRecords,
  saveBillingRecord,
  deleteBillingRecord,
  addPaymentToBillingRecord,
  addDefaultToBillingRecord,
  resolveDefaultInBillingRecord,
  addDocumentToBillingRecord,
  removeDocumentFromBillingRecord,
  exportBillingRecordsToCSV,
} from "@/lib/billingService";
import { formatINR } from "@/lib/formatters";
import { AddBillingRecordModal } from "./AddBillingRecordModal";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { LogDefaultModal } from "./LogDefaultModal";
import { BillingDetailModal } from "./BillingDetailModal";

interface BillingTabProps {
  leads?: Lead[];
  currentUser?: { name?: string; username?: string } | null;
  isAdmin?: boolean;
}

export const BillingTab: React.FC<BillingTabProps> = ({
  leads = [],
  currentUser,
  isAdmin = false,
}) => {
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [isFirebaseSyncing, setIsFirebaseSyncing] = useState<boolean>(true);

  // View & Filter States
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tenureFilter, setTenureFilter] = useState<string>("all");
  const [showOnlyDefaults, setShowOnlyDefaults] = useState<boolean>(false);

  // Modals States
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<BillingRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<BillingRecord | null>(null);
  const [recordingPaymentRecord, setRecordingPaymentRecord] = useState<BillingRecord | null>(null);
  const [loggingDefaultRecord, setLoggingDefaultRecord] = useState<BillingRecord | null>(null);

  // Real-time Firestore Subscription
  useEffect(() => {
    const unsub = subscribeToBillingRecords((data, isSyncing) => {
      setRecords(data);
      setIsFirebaseSyncing(isSyncing);

      // Keep viewing record fresh if updated
      setViewingRecord((prev) => {
        if (!prev) return null;
        return data.find((r) => r.id === prev.id) || null;
      });
    });
    return () => unsub();
  }, []);

  // Filtered Billing Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Show only defaults filter
      if (showOnlyDefaults && !r.hasDefaults) return false;

      // 2. Status filter
      if (statusFilter !== "all" && r.status !== statusFilter) return false;

      // 3. Tenure filter
      if (tenureFilter === "short" && r.tenureMonths > 6) return false;
      if (tenureFilter === "medium" && (r.tenureMonths <= 6 || r.tenureMonths > 12)) return false;
      if (tenureFilter === "long" && r.tenureMonths <= 12) return false;

      // 4. Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const comp = (r.vendor?.companyName || "").toLowerCase();
        const proj = (r.projectName || "").toLowerCase();
        const person = (r.vendor?.contactPerson || "").toLowerCase();
        const ref = (r.contractNumber || "").toLowerCase();
        const email = (r.vendor?.contactPersonEmail || "").toLowerCase();
        const match =
          comp.includes(q) ||
          proj.includes(q) ||
          person.includes(q) ||
          ref.includes(q) ||
          email.includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [records, searchTerm, statusFilter, tenureFilter, showOnlyDefaults]);

  // Executive KPI Calculations
  const kpis = useMemo(() => {
    const totalContractValue = records.reduce((acc, curr) => acc + (curr.projectAmount || 0), 0);
    const totalCollected = records.reduce((acc, curr) => acc + (curr.amountReceived || 0), 0);
    const totalPending = records.reduce((acc, curr) => acc + (curr.pendingAmount || 0), 0);
    const defaultedProjects = records.filter((r) => r.hasDefaults);
    const totalDefaultedAmount = defaultedProjects.reduce((acc, curr) => acc + (curr.defaultedAmount || 0), 0);
    const avgTenure = records.length > 0
      ? (records.reduce((acc, curr) => acc + (curr.tenureMonths || 0), 0) / records.length).toFixed(1)
      : "0";
    const collectionPercentage = totalContractValue > 0
      ? Math.round((totalCollected / totalContractValue) * 100)
      : 0;

    return {
      totalContractValue,
      totalCollected,
      totalPending,
      defaultedCount: defaultedProjects.length,
      totalDefaultedAmount,
      avgTenure,
      collectionPercentage,
    };
  }, [records]);

  // Handlers
  const handleSaveRecord = (
    data: Parameters<typeof import("@/lib/billingService").saveBillingRecord>[0]
  ) => {
    saveBillingRecord(data);
    setEditingRecord(null);
  };

  const handleDeleteRecord = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the billing project "${name}"? This action cannot be undone.`)) {
      deleteBillingRecord(id);
      if (viewingRecord?.id === id) setViewingRecord(null);
    }
  };

  const handleSavePayment = (
    recordId: string,
    payment: Omit<BillingPayment, "id" | "createdAt">
  ) => {
    addPaymentToBillingRecord(recordId, payment);
    setRecordingPaymentRecord(null);
  };

  const handleSaveDefault = (
    recordId: string,
    defaultItem: Omit<BillingPaymentDefault, "id" | "createdAt">
  ) => {
    addDefaultToBillingRecord(recordId, defaultItem);
    setLoggingDefaultRecord(null);
  };

  const handleResolveDefault = (recordId: string, defaultId: string, notes?: string) => {
    resolveDefaultInBillingRecord(recordId, defaultId, notes);
  };

  const handleAddDocument = (recordId: string, docItem: BillingDocument) => {
    addDocumentToBillingRecord(recordId, docItem);
  };

  const handleRemoveDocument = (recordId: string, documentId: string) => {
    removeDocumentFromBillingRecord(recordId, documentId);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Executive Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 rounded-3xl border border-emerald-500/20 text-white shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 bg-emerald-500/20 rounded-2xl border border-emerald-400/30 text-emerald-300">
            <Receipt className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black tracking-tight">Billing & Vendor Financials</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {isFirebaseSyncing ? "Live Firestore Connected" : "Local Storage Mode"}
              </span>
            </div>
            <p className="text-xs text-emerald-200/80 mt-1 max-w-2xl leading-relaxed">
              Track project values, contract tenures, received collections, payment defaults, vendor contact dossiers with logos/photos, and company compliance documents.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => exportBillingRecordsToCSV(records)}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition shadow-sm"
            title="Export all billing projects to CSV"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={() => {
              setEditingRecord(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-500/30 transition transform hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>New Billing Project</span>
          </button>
        </div>
      </div>

      {/* 5 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Total Contract Value */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Contract Value
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
              {formatINR(kpis.totalContractValue)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Across {records.length} project commitments
            </span>
          </div>
        </div>

        {/* KPI 2: Total Collected */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Received Till Now
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {formatINR(kpis.totalCollected)}
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
              {kpis.collectionPercentage}% collected to date
            </span>
          </div>
        </div>

        {/* KPI 3: Pending Balance */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pending Balance
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
              {formatINR(kpis.totalPending)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Remaining pipeline to realize
            </span>
          </div>
        </div>

        {/* KPI 4: Payment Defaults */}
        <div className={`p-4 rounded-3xl border shadow-sm relative overflow-hidden transition ${
          kpis.defaultedCount > 0
            ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-500/30"
            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Payment Defaults
            </span>
            <div className={`p-2 rounded-xl ${
              kpis.defaultedCount > 0 ? "bg-rose-500/20 text-rose-600" : "bg-slate-100 text-slate-400"
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline space-x-1.5">
              <span className={`text-xl sm:text-2xl font-black font-mono ${
                kpis.defaultedCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
              }`}>
                {kpis.defaultedCount}
              </span>
              <span className="text-xs font-bold text-slate-500">Accounts Flagged</span>
            </div>
            <span className={`text-[11px] font-bold block mt-0.5 ${
              kpis.defaultedCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400"
            }`}>
              {kpis.defaultedCount > 0
                ? `${formatINR(kpis.totalDefaultedAmount)} overdue`
                : "All accounts healthy"}
            </span>
          </div>
        </div>

        {/* KPI 5: Avg Tenure */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Avg Contract Tenure
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline space-x-1">
              <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                {kpis.avgTenure}
              </span>
              <span className="text-xs font-bold text-slate-500">Months</span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Average engagement lifespan
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search company, project title, contact, or ref..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>

        {/* Dropdown Filters & Toggles */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="defaulted">Defaulted</option>
            <option value="on_hold">On Hold</option>
          </select>

          {/* Tenure Filter */}
          <select
            value={tenureFilter}
            onChange={(e) => setTenureFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Tenures</option>
            <option value="short">1 - 6 Months</option>
            <option value="medium">6 - 12 Months</option>
            <option value="long">12+ Months</option>
          </select>

          {/* Defaults Only Quick Button */}
          <button
            type="button"
            onClick={() => setShowOnlyDefaults(!showOnlyDefaults)}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border ${
              showOnlyDefaults
                ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                : "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-rose-400"
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${showOnlyDefaults ? "text-white" : "text-rose-500"}`} />
            <span>Defaults Only</span>
            {kpis.defaultedCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                showOnlyDefaults ? "bg-white text-rose-600" : "bg-rose-500 text-white"
              }`}>
                {kpis.defaultedCount}
              </span>
            )}
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "grid"
                  ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-xs"
                  : "text-slate-400 hover:text-slate-600"
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "table"
                  ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-xs"
                  : "text-slate-400 hover:text-slate-600"
              }`}
              title="Finance Ledger Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredRecords.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 space-y-3 shadow-sm">
          <Receipt className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No Billing Projects Found
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchTerm || statusFilter !== "all" || showOnlyDefaults
              ? "No billing records match your current filter parameters. Try clearing filters."
              : "Start by creating your first vendor billing project with contract value, tenure, and compliance documents."}
          </p>
          <button
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setTenureFilter("all");
              setShowOnlyDefaults(false);
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition inline-flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Project</span>
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredRecords.map((record) => {
            const v = record.vendor || {};
            const percentCollected = record.projectAmount > 0
              ? Math.min(100, Math.round(((record.amountReceived || 0) / record.projectAmount) * 100))
              : 0;

            return (
              <div
                key={record.id}
                className="group relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 hover:border-emerald-500/50 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between"
              >
                {/* Status colored accent top bar */}
                <div
                  className={`h-1.5 w-full ${
                    record.status === "completed"
                      ? "bg-emerald-500"
                      : record.status === "defaulted"
                      ? "bg-rose-500"
                      : record.status === "on_hold"
                      ? "bg-amber-500"
                      : "bg-indigo-500"
                  }`}
                />

                <div className="p-5 space-y-4">
                  {/* Company & Status Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        {v.companyLogoUrl ? (
                          <img
                            src={v.companyLogoUrl}
                            alt={v.companyName}
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4
                          className="font-extrabold text-sm text-slate-900 dark:text-white truncate cursor-pointer hover:text-emerald-600 transition"
                          title={v.companyName}
                          onClick={() => setViewingRecord(record)}
                        >
                          {v.companyName}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-semibold truncate" title={record.projectName}>
                          {record.projectName}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                        record.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : record.status === "defaulted"
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          : record.status === "on_hold"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                      }`}
                    >
                      {record.status}
                    </span>
                  </div>

                  {/* Vendor Contact Person Mini-Card */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full border border-emerald-500/30 overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                        {v.profilePictureUrl ? (
                          <img
                            src={v.profilePictureUrl}
                            alt={v.contactPerson}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                          {v.contactPerson}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {v.designation || "Contact Person"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      {v.contactPersonPhone && (
                        <a
                          href={`tel:${v.contactPersonPhone}`}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition"
                          title={`Call ${v.contactPersonPhone}`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {v.contactPersonEmail && (
                        <a
                          href={`mailto:${v.contactPersonEmail}`}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition"
                          title={`Email ${v.contactPersonEmail}`}
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Financial Meters */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Contract</span>
                        <span className="font-mono font-black text-slate-900 dark:text-white text-sm">
                          {formatINR(record.projectAmount)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Received</span>
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatINR(record.amountReceived)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                        style={{ width: `${percentCollected}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{percentCollected}% Collected</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        Pending: {formatINR(record.pendingAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Tenure & Frequency Ribbon */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs">
                    <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{record.tenureMonths} Months Tenure</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">
                      {record.billingFrequency}
                    </span>
                  </div>

                  {/* Payment Defaults Pill Indicator */}
                  {record.hasDefaults ? (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                        <span className="font-bold truncate">
                          Overdue: {formatINR(record.defaultedAmount || 0)}
                        </span>
                      </div>
                      <button
                        onClick={() => setViewingRecord(record)}
                        className="text-[11px] font-black text-rose-600 dark:text-rose-400 hover:underline shrink-0"
                      >
                        Resolve
                      </button>
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center space-x-1.5 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Clean Track Record • No Defaults</span>
                    </div>
                  )}

                  {/* Documents & Contract Counter */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center space-x-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>{record.documents?.length || 0} Documents on file</span>
                    </span>
                    <span className="font-mono text-[10px]">
                      {record.startDate} - {record.endDate}
                    </span>
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setRecordingPaymentRecord(record)}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition shadow-xs flex items-center space-x-1"
                      title="Record payment for this project"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Record Payment</span>
                    </button>

                    <button
                      onClick={() => setLoggingDefaultRecord(record)}
                      className="px-2 py-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-[11px] font-bold transition flex items-center space-x-1"
                      title="Flag default"
                    >
                      <AlertTriangle className="w-3 h-3 text-rose-500" />
                      <span>Default</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setViewingRecord(record)}
                      className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition"
                      title="View Full Dossier"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        setEditingRecord(record);
                        setIsAddModalOpen(true);
                      }}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition"
                      title="Edit Project"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteRecord(record.id, record.projectName)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                      title="Delete Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Vendor / Company</th>
                  <th className="p-4">Project & Ref</th>
                  <th className="p-4 text-right">Project Amount</th>
                  <th className="p-4">Tenure & Dates</th>
                  <th className="p-4 text-right">Received</th>
                  <th className="p-4 text-right">Pending</th>
                  <th className="p-4">Defaults Status</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredRecords.map((r) => {
                  const v = r.vendor || {};
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-950 flex items-center justify-center shrink-0">
                            {v.companyLogoUrl ? (
                              <img
                                src={v.companyLogoUrl}
                                alt={v.companyName}
                                className="w-full h-full object-contain p-1"
                              />
                            ) : (
                              <Building2 className="w-4 h-4 text-emerald-500" />
                            )}
                          </div>
                          <div>
                            <span
                              onClick={() => setViewingRecord(r)}
                              className="font-bold text-slate-900 dark:text-white hover:text-emerald-600 cursor-pointer block truncate max-w-[180px]"
                            >
                              {v.companyName}
                            </span>
                            <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                              <span>{v.contactPerson}</span>
                              {v.contactPersonPhone && <span>• {v.contactPersonPhone}</span>}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate max-w-[200px]" title={r.projectName}>
                          {r.projectName}
                        </span>
                        {r.contractNumber && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {r.contractNumber}
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right font-mono font-black text-slate-900 dark:text-white">
                        {formatINR(r.projectAmount)}
                      </td>

                      <td className="p-4">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block">
                          {r.tenureMonths} Months
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {r.startDate} to {r.endDate}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 block">
                          {formatINR(r.amountReceived)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {r.projectAmount > 0
                            ? `${Math.round(((r.amountReceived || 0) / r.projectAmount) * 100)}%`
                            : "0%"}
                        </span>
                      </td>

                      <td className="p-4 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {formatINR(r.pendingAmount)}
                      </td>

                      <td className="p-4">
                        {r.hasDefaults ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                            <span>Overdue: {formatINR(r.defaultedAmount || 0)}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>Clean</span>
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            r.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : r.status === "defaulted"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : r.status === "on_hold"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => setRecordingPaymentRecord(r)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Record Payment"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setViewingRecord(r)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 rounded-lg transition"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingRecord(r);
                              setIsAddModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(r.id, r.projectName)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* 1. Add / Edit Billing Project Modal */}
      <AddBillingRecordModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveRecord}
        existingRecord={editingRecord}
        leads={leads}
        currentUser={currentUser}
      />

      {/* 2. Record Payment Modal */}
      <RecordPaymentModal
        isOpen={Boolean(recordingPaymentRecord)}
        onClose={() => setRecordingPaymentRecord(null)}
        record={recordingPaymentRecord}
        onSavePayment={handleSavePayment}
        recordedBy={currentUser?.name || "Finance Admin"}
      />

      {/* 3. Log Default Modal */}
      <LogDefaultModal
        isOpen={Boolean(loggingDefaultRecord)}
        onClose={() => setLoggingDefaultRecord(null)}
        record={loggingDefaultRecord}
        onSaveDefault={handleSaveDefault}
        flaggedBy={currentUser?.name || "Finance Admin"}
      />

      {/* 4. Full Detail Dossier Modal */}
      <BillingDetailModal
        isOpen={Boolean(viewingRecord)}
        onClose={() => setViewingRecord(null)}
        record={viewingRecord}
        onEdit={(rec) => {
          setViewingRecord(null);
          setEditingRecord(rec);
          setIsAddModalOpen(true);
        }}
        onOpenRecordPayment={(rec) => {
          setRecordingPaymentRecord(rec);
        }}
        onOpenLogDefault={(rec) => {
          setLoggingDefaultRecord(rec);
        }}
        onResolveDefault={handleResolveDefault}
        onAddDocument={handleAddDocument}
        onRemoveDocument={handleRemoveDocument}
        currentUser={currentUser}
      />
    </div>
  );
};
