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
  Zap,
  GraduationCap,
  Compass,
  Link2,
  Sparkles,
  X,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  Briefcase,
  Layers,
  ArrowUpRight,
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
  migrateLeadToBilling,
  syncBillingWithLeads,
} from "@/lib/billingService";
import { formatINR, formatClosureMonth } from "@/lib/formatters";
import { getLeadSourceBadgeStyle } from "@/constants/leadSources";
import { AddBillingRecordModal } from "./AddBillingRecordModal";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { LogDefaultModal } from "./LogDefaultModal";
import { BillingDetailModal } from "./BillingDetailModal";
import { MigratePipelineLeadModal } from "./MigratePipelineLeadModal";
import { MonthlyCollectionsLedgerModal } from "./MonthlyCollectionsLedgerModal";

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

  // View & Primary Filter States
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tenureFilter, setTenureFilter] = useState<string>("all");
  const [showOnlyDefaults, setShowOnlyDefaults] = useState<boolean>(false);

  // 1. Month-Wise Payment Received Filter (e.g. "2026-09", "2026-10", or "all")
  const [paymentMonthFilter, setPaymentMonthFilter] = useState<string>("all");

  // 2. Additional Specialized Accounts & Finance Filters
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [dealSizeFilter, setDealSizeFilter] = useState<string>("all");
  const [pendingFilter, setPendingFilter] = useState<string>("all");
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [complianceFilter, setComplianceFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState<boolean>(false);

  // Modals States
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isMigrateModalOpen, setIsMigrateModalOpen] = useState<boolean>(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<BillingRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<BillingRecord | null>(null);
  const [recordingPaymentRecord, setRecordingPaymentRecord] = useState<BillingRecord | null>(null);
  const [loggingDefaultRecord, setLoggingDefaultRecord] = useState<BillingRecord | null>(null);

  // Real-time Firestore Subscription & Auto-Sync with CRM Leads
  useEffect(() => {
    const unsub = subscribeToBillingRecords((data, isSyncing) => {
      const synced = syncBillingWithLeads(data, leads);
      setRecords(synced);
      setIsFirebaseSyncing(isSyncing);

      // Keep viewing record fresh if updated
      setViewingRecord((prev) => {
        if (!prev) return null;
        return synced.find((r) => r.id === prev.id) || null;
      });
    });
    return () => unsub();
  }, [leads]);

  // Aggregate monthly collection inflow across all records
  const monthlyCollectionStats = useMemo(() => {
    const map = new Map<
      string,
      {
        monthKey: string;
        monthLabel: string;
        totalAmount: number;
        paymentCount: number;
        projectCount: number;
      }
    >();

    records.forEach((r) => {
      const projectMonths = new Set<string>();
      (r.paymentHistory || []).forEach((p) => {
        if (!p.date) return;
        const monthKey = p.date.slice(0, 7); // e.g. "2026-09"
        if (!map.has(monthKey)) {
          let label = monthKey;
          if (monthKey.includes("-")) {
            const [y, m] = monthKey.split("-");
            const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
            label = d.toLocaleString("en-US", { month: "short", year: "numeric" });
          }
          map.set(monthKey, {
            monthKey,
            monthLabel: label,
            totalAmount: 0,
            paymentCount: 0,
            projectCount: 0,
          });
        }

        const item = map.get(monthKey)!;
        item.totalAmount += p.amount || 0;
        item.paymentCount += 1;
        projectMonths.add(monthKey);
      });

      projectMonths.forEach((mKey) => {
        const item = map.get(mKey);
        if (item) item.projectCount += 1;
      });
    });

    return Array.from(map.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [records]);

  // Available unique Owners & Programs for filters
  const availableOwners = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.owner) set.add(r.owner.trim());
      if (r.createdBy) set.add(r.createdBy.trim());
    });
    return Array.from(set).sort();
  }, [records]);

  const availablePrograms = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.program) set.add(r.program.trim());
      if (r.vendor?.program) set.add(r.vendor.program.trim());
    });
    return Array.from(set).sort();
  }, [records]);

  // Identify Closure/Won pipeline deals that haven't been migrated to billing yet
  const unmigratedClosureLeads = useMemo(() => {
    const billingLeadIds = new Set(records.map((r) => r.leadId).filter(Boolean));
    const billingCompanyNames = new Set(
      records.map((r) => r.vendor?.companyName?.toLowerCase().trim()).filter(Boolean)
    );
    return leads.filter(
      (l) =>
        l.stage === "closure" &&
        !billingLeadIds.has(l.id) &&
        !billingCompanyNames.has(l.companyName.toLowerCase().trim())
    );
  }, [leads, records]);

  // Handle 1-Click Migration from Pipeline Lead into Billing
  const handleMigrateLead = (
    lead: Lead,
    options?: {
      tenureMonths?: number;
      billingFrequency?: BillingRecord["billingFrequency"];
      startDate?: string;
    }
  ) => {
    const created = migrateLeadToBilling(lead, options);
    setViewingRecord(created);
  };

  // Filtered & Sorted Billing Records
  const filteredRecords = useMemo(() => {
    const result = records.filter((r) => {
      // 1. Show only defaults filter
      if (showOnlyDefaults && !r.hasDefaults) return false;

      // 2. Status filter
      if (statusFilter !== "all" && r.status !== statusFilter) return false;

      // 3. Month-Wise Payment Received Filter
      if (paymentMonthFilter !== "all") {
        const hasPaymentInMonth = (r.paymentHistory || []).some(
          (p) => p.date && p.date.startsWith(paymentMonthFilter)
        );
        if (!hasPaymentInMonth) return false;
      }

      // 4. Payment Collection Status filter
      if (paymentStatusFilter === "fully_paid") {
        if ((r.amountReceived || 0) < (r.projectAmount || 0) || r.projectAmount === 0) return false;
      } else if (paymentStatusFilter === "partially_paid") {
        if ((r.amountReceived || 0) <= 0 || (r.amountReceived || 0) >= (r.projectAmount || 0)) return false;
      } else if (paymentStatusFilter === "unpaid") {
        if ((r.amountReceived || 0) > 0) return false;
      } else if (paymentStatusFilter === "defaulted") {
        if (!r.hasDefaults) return false;
      }

      // 5. Tenure filter
      if (tenureFilter === "short" && r.tenureMonths > 6) return false;
      if (tenureFilter === "medium" && (r.tenureMonths <= 6 || r.tenureMonths > 12)) return false;
      if (tenureFilter === "long" && r.tenureMonths <= 12) return false;

      // 6. Deal Size Tier filter
      if (dealSizeFilter === "tier_small" && r.projectAmount >= 500000) return false;
      if (dealSizeFilter === "tier_medium" && (r.projectAmount < 500000 || r.projectAmount >= 1500000)) return false;
      if (dealSizeFilter === "tier_large" && (r.projectAmount < 1500000 || r.projectAmount >= 5000000)) return false;
      if (dealSizeFilter === "tier_enterprise" && r.projectAmount < 5000000) return false;

      // 7. Pending Balance filter
      if (pendingFilter === "has_pending" && (r.pendingAmount || 0) <= 0) return false;
      if (pendingFilter === "pending_above_5l" && (r.pendingAmount || 0) < 500000) return false;
      if (pendingFilter === "pending_above_10l" && (r.pendingAmount || 0) < 1000000) return false;
      if (pendingFilter === "cleared" && (r.pendingAmount || 0) > 0) return false;

      // 8. Billing Frequency filter
      if (frequencyFilter !== "all" && r.billingFrequency !== frequencyFilter) return false;

      // 9. Payment Method filter
      if (paymentMethodFilter !== "all") {
        const hasMethod = (r.paymentHistory || []).some(
          (p) => p.paymentMethod === paymentMethodFilter
        );
        if (!hasMethod) return false;
      }

      // 10. Owner filter
      if (ownerFilter !== "all") {
        const matchOwner =
          (r.owner?.toLowerCase() === ownerFilter.toLowerCase()) ||
          (r.createdBy?.toLowerCase() === ownerFilter.toLowerCase());
        if (!matchOwner) return false;
      }

      // 11. Program filter
      if (programFilter !== "all") {
        const matchProg = (r.program === programFilter) || (r.vendor?.program === programFilter);
        if (!matchProg) return false;
      }

      // 12. Document Compliance filter
      if (complianceFilter === "has_docs" && (r.documents?.length || 0) < 2) return false;
      if (complianceFilter === "missing_docs" && (r.documents?.length || 0) >= 2) return false;
      if (complianceFilter === "has_contract") {
        const hasContract = (r.documents || []).some((d) => d.category === "contract");
        if (!hasContract) return false;
      }

      // 13. Search query
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

    // Sorting
    return [...result].sort((a, b) => {
      if (sortBy === "amount_high") return (b.projectAmount || 0) - (a.projectAmount || 0);
      if (sortBy === "amount_low") return (a.projectAmount || 0) - (b.projectAmount || 0);
      if (sortBy === "received_high") return (b.amountReceived || 0) - (a.amountReceived || 0);
      if (sortBy === "pending_high") return (b.pendingAmount || 0) - (a.pendingAmount || 0);
      if (sortBy === "tenure_longest") return (b.tenureMonths || 0) - (a.tenureMonths || 0);
      if (sortBy === "company_asc") return (a.vendor?.companyName || "").localeCompare(b.vendor?.companyName || "");
      if (sortBy === "payment_recent") {
        const latestA = (a.paymentHistory || []).map((p) => p.date).sort().pop() || "";
        const latestB = (b.paymentHistory || []).map((p) => p.date).sort().pop() || "";
        return latestB.localeCompare(latestA);
      }
      // Default: newest by creation time
      return (b.createdAtMs || 0) - (a.createdAtMs || 0);
    });
  }, [
    records,
    searchTerm,
    statusFilter,
    paymentMonthFilter,
    paymentStatusFilter,
    tenureFilter,
    dealSizeFilter,
    pendingFilter,
    frequencyFilter,
    paymentMethodFilter,
    ownerFilter,
    programFilter,
    complianceFilter,
    showOnlyDefaults,
    sortBy,
  ]);

  // Financial calculations for filtered subset
  const filteredMetrics = useMemo(() => {
    const totalContract = filteredRecords.reduce((acc, r) => acc + (r.projectAmount || 0), 0);
    const totalCollected = filteredRecords.reduce((acc, r) => acc + (r.amountReceived || 0), 0);
    const totalPending = filteredRecords.reduce((acc, r) => acc + (r.pendingAmount || 0), 0);

    // If month filter is active, calculate collections realized in that specific month
    let monthSpecificReceived = 0;
    let monthPaymentsCount = 0;
    if (paymentMonthFilter !== "all") {
      filteredRecords.forEach((r) => {
        (r.paymentHistory || []).forEach((p) => {
          if (p.date && p.date.startsWith(paymentMonthFilter)) {
            monthSpecificReceived += p.amount || 0;
            monthPaymentsCount += 1;
          }
        });
      });
    }

    return {
      totalContract,
      totalCollected,
      totalPending,
      monthSpecificReceived,
      monthPaymentsCount,
    };
  }, [filteredRecords, paymentMonthFilter]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (statusFilter !== "all") count++;
    if (paymentMonthFilter !== "all") count++;
    if (paymentStatusFilter !== "all") count++;
    if (tenureFilter !== "all") count++;
    if (dealSizeFilter !== "all") count++;
    if (pendingFilter !== "all") count++;
    if (frequencyFilter !== "all") count++;
    if (paymentMethodFilter !== "all") count++;
    if (ownerFilter !== "all") count++;
    if (programFilter !== "all") count++;
    if (complianceFilter !== "all") count++;
    if (showOnlyDefaults) count++;
    if (sortBy !== "newest") count++;
    return count;
  }, [
    searchTerm,
    statusFilter,
    paymentMonthFilter,
    paymentStatusFilter,
    tenureFilter,
    dealSizeFilter,
    pendingFilter,
    frequencyFilter,
    paymentMethodFilter,
    ownerFilter,
    programFilter,
    complianceFilter,
    showOnlyDefaults,
    sortBy,
  ]);

  // Reset all filters to default
  const handleResetAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPaymentMonthFilter("all");
    setPaymentStatusFilter("all");
    setTenureFilter("all");
    setDealSizeFilter("all");
    setPendingFilter("all");
    setFrequencyFilter("all");
    setPaymentMethodFilter("all");
    setOwnerFilter("all");
    setProgramFilter("all");
    setComplianceFilter("all");
    setShowOnlyDefaults(false);
    setSortBy("newest");
  };

  // Label for active month
  const activeMonthLabel = useMemo(() => {
    if (paymentMonthFilter === "all") return "";
    const found = monthlyCollectionStats.find((m) => m.monthKey === paymentMonthFilter);
    if (found) return found.monthLabel;
    if (paymentMonthFilter.includes("-")) {
      const [y, m] = paymentMonthFilter.split("-");
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      return d.toLocaleString("en-US", { month: "short", year: "numeric" });
    }
    return paymentMonthFilter;
  }, [paymentMonthFilter, monthlyCollectionStats]);

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

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsLedgerModalOpen(true)}
            className="flex items-center space-x-2 px-3.5 py-2.5 bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md border border-emerald-400/30 transition transform hover:scale-[1.02]"
            title="Open month-wise collections and payment cashflow ledger"
          >
            <Calendar className="w-4 h-4 text-emerald-300" />
            <span>Monthly Cashflow Ledger</span>
          </button>

          <button
            onClick={() => setIsMigrateModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 via-emerald-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-teal-500/20 transition transform hover:scale-[1.02]"
            title="Migrate Closed Won deals from CRM Pipeline into Billing"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Migrate Pipeline Deals</span>
            {unmigratedClosureLeads.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                {unmigratedClosureLeads.length} Won
              </span>
            )}
          </button>

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

      {/* Month-Wise Collections Quick-Select Strip */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Payment Inflow Month-Wise
            </h3>
            <span className="text-[10px] font-semibold text-slate-400">
              (Click a month to filter clients who paid in that month)
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsLedgerModalOpen(true)}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
            >
              <span>View Full Cashflow Ledger</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Month Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1.5 scrollbar-thin">
          {/* All Time Pill */}
          <button
            type="button"
            onClick={() => setPaymentMonthFilter("all")}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 transition flex items-center space-x-2 border ${
              paymentMonthFilter === "all"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm"
                : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-emerald-400"
            }`}
          >
            <span>All Collections</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              {formatINR(kpis.totalCollected)}
            </span>
          </button>

          {/* Month Pills */}
          {monthlyCollectionStats.map((m) => {
            const isSelected = paymentMonthFilter === m.monthKey;
            return (
              <button
                key={m.monthKey}
                type="button"
                onClick={() => setPaymentMonthFilter(isSelected ? "all" : m.monthKey)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 transition flex items-center space-x-2 border ${
                  isSelected
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20"
                    : "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400"
                }`}
              >
                <Calendar className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-emerald-500"}`} />
                <span>{m.monthLabel}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black ${
                  isSelected ? "bg-white/20 text-white" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                }`}>
                  {formatINR(m.totalAmount)}
                </span>
                <span className={`text-[10px] ${isSelected ? "text-emerald-100" : "text-slate-400"}`}>
                  ({m.paymentCount} {m.paymentCount === 1 ? "pmt" : "pmts"})
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Month Indicator Banner */}
        {paymentMonthFilter !== "all" && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                <Receipt className="w-4 h-4" />
              </div>
              <span className="text-xs text-slate-700 dark:text-slate-200 font-medium">
                Filtering by Payments Received in <strong className="text-emerald-700 dark:text-emerald-300 font-extrabold">{activeMonthLabel}</strong>:{" "}
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatINR(filteredMetrics.monthSpecificReceived)}
                </span>{" "}
                received across <strong className="text-slate-900 dark:text-white">{filteredMetrics.monthPaymentsCount}</strong> transactions in <strong className="text-slate-900 dark:text-white">{filteredRecords.length}</strong> client projects.
              </span>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => setIsLedgerModalOpen(true)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1"
              >
                <span>View Month Ledger</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => setPaymentMonthFilter("all")}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-800 transition flex items-center space-x-1"
              >
                <X className="w-3 h-3" />
                <span>Clear Month Filter</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Primary & Advanced Filter Controls Container */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Top Controls Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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

          {/* Quick Dropdowns & Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 1. Payment Received Month Dropdown */}
            <select
              value={paymentMonthFilter}
              onChange={(e) => setPaymentMonthFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              title="Filter by month payments were received"
            >
              <option value="all">📅 All Payment Months</option>
              {monthlyCollectionStats.map((m) => (
                <option key={m.monthKey} value={m.monthKey}>
                  {m.monthLabel} ({formatINR(m.totalAmount)})
                </option>
              ))}
            </select>

            {/* 2. Collection / Payment Status Filter */}
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">💰 All Payment Statuses</option>
              <option value="fully_paid">Fully Paid (100%)</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="unpaid">Zero Received (Unpaid)</option>
              <option value="defaulted">Overdue / Defaulted</option>
            </select>

            {/* 3. Project Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Project Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="defaulted">Defaulted</option>
              <option value="on_hold">On Hold</option>
            </select>

            {/* Advanced Filters Drawer Button */}
            <button
              type="button"
              onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border ${
                isAdvancedFiltersOpen || activeFilterCount > 0
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-400/50"
                  : "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>More Filters</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-600 text-white">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={`w-3 h-3 transition transform ${isAdvancedFiltersOpen ? "rotate-180" : ""}`} />
            </button>

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

            {/* Reset All Filters Button */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="flex items-center space-x-1 px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold transition border border-rose-200 dark:border-rose-900/50"
                title="Reset all search queries and filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset ({activeFilterCount})</span>
              </button>
            )}

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

        {/* Collapsible Advanced Filters Tray */}
        {isAdvancedFiltersOpen && (
          <div className="p-4 bg-slate-50/80 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 animate-fadeIn text-xs">
            {/* Filter 1: Deal Size Tier */}
            <div>
              <label className="font-bold text-slate-500 block mb-1">Contract / Deal Size</label>
              <select
                value={dealSizeFilter}
                onChange={(e) => setDealSizeFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Deal Sizes</option>
                <option value="tier_small">&lt; ₹5 Lakhs (Small)</option>
                <option value="tier_medium">₹5L - ₹15 Lakhs (Mid)</option>
                <option value="tier_large">₹15L - ₹50 Lakhs (Large)</option>
                <option value="tier_enterprise">₹50 Lakhs+ (Enterprise)</option>
              </select>
            </div>

            {/* Filter 2: Outstanding Pending Balance */}
            <div>
              <label className="font-bold text-slate-500 block mb-1">Pending Balance</label>
              <select
                value={pendingFilter}
                onChange={(e) => setPendingFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Balances</option>
                <option value="has_pending">Has Pending Balance (&gt; ₹0)</option>
                <option value="pending_above_5l">High Pending (&gt; ₹5L)</option>
                <option value="pending_above_10l">Critical Pending (&gt; ₹10L)</option>
                <option value="cleared">Zero Pending (Settled)</option>
              </select>
            </div>

            {/* Filter 3: Contract Tenure */}
            <div>
              <label className="font-bold text-slate-500 block mb-1">Contract Tenure</label>
              <select
                value={tenureFilter}
                onChange={(e) => setTenureFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Tenures</option>
                <option value="short">1 - 6 Months</option>
                <option value="medium">6 - 12 Months</option>
                <option value="long">12+ Months</option>
              </select>
            </div>

            {/* Filter 4: Billing Frequency */}
            <div>
              <label className="font-bold text-slate-500 block mb-1">Billing Frequency</label>
              <select
                value={frequencyFilter}
                onChange={(e) => setFrequencyFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Frequencies</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="milestone">Milestone Based</option>
                <option value="one_time">One-Time</option>
                <option value="annual">Annual</option>
              </select>
            </div>

            {/* Filter 5: Payment Method */}
            <div>
              <label className="font-bold text-slate-500 block mb-1">Payment Method Used</label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Payment Methods</option>
                <option value="neft_rtgs">NEFT / RTGS</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>
            </div>

            {/* Filter 6: Account Owner / Partner */}
            <div>
              <label className="font-bold text-slate-500 block mb-1">Account Partner / Owner</label>
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Owners</option>
                {availableOwners.map((own) => (
                  <option key={own} value={own}>
                    {own}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 7: Program / Offering */}
            <div>
              <label className="font-bold text-slate-500 block mb-1">Program / Offering</label>
              <select
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Programs</option>
                {availablePrograms.map((prog) => (
                  <option key={prog} value={prog}>
                    {prog}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 8: Document Compliance */}
            <div>
              <label className="font-bold text-slate-500 block mb-1">Compliance &amp; Documents</label>
              <select
                value={complianceFilter}
                onChange={(e) => setComplianceFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Compliance Statuses</option>
                <option value="has_docs">Complete (2+ Documents)</option>
                <option value="missing_docs">Incomplete (&lt; 2 Documents)</option>
                <option value="has_contract">Executed Contract on File</option>
              </select>
            </div>

            {/* Filter 9: Sort Order */}
            <div className="sm:col-span-2 md:col-span-3 lg:col-span-4 pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-500">Sort By:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-800 dark:text-slate-200"
                >
                  <option value="newest">Recently Added / Updated</option>
                  <option value="payment_recent">Latest Payment Received Date</option>
                  <option value="amount_high">Contract Value: High to Low</option>
                  <option value="amount_low">Contract Value: Low to High</option>
                  <option value="received_high">Amount Received: High to Low</option>
                  <option value="pending_high">Pending Balance: High to Low</option>
                  <option value="tenure_longest">Tenure: Longest First</option>
                  <option value="company_asc">Company Name: A to Z</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleResetAllFilters}
                className="text-xs font-bold text-rose-600 hover:underline flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All Advanced Filters</span>
              </button>
            </div>
          </div>
        )}

        {/* Active Filter Chips Strip */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Active:</span>

            {paymentMonthFilter !== "all" && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-bold border border-emerald-300 dark:border-emerald-800 text-[11px]">
                <Calendar className="w-3 h-3 text-emerald-600" />
                <span>Month: {activeMonthLabel}</span>
                <button onClick={() => setPaymentMonthFilter("all")} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {paymentStatusFilter !== "all" && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 font-bold border border-blue-300 dark:border-blue-800 text-[11px]">
                <span>Status: {paymentStatusFilter.replace("_", " ")}</span>
                <button onClick={() => setPaymentStatusFilter("all")} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {statusFilter !== "all" && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border border-slate-300 dark:border-slate-700 text-[11px]">
                <span>Project: {statusFilter}</span>
                <button onClick={() => setStatusFilter("all")} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {dealSizeFilter !== "all" && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 font-bold border border-purple-300 dark:border-purple-800 text-[11px]">
                <span>Deal Size: {dealSizeFilter.replace("tier_", "")}</span>
                <button onClick={() => setDealSizeFilter("all")} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {pendingFilter !== "all" && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-bold border border-amber-300 dark:border-amber-800 text-[11px]">
                <span>Pending: {pendingFilter.replace("_", " ")}</span>
                <button onClick={() => setPendingFilter("all")} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {tenureFilter !== "all" && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                <span>Tenure: {tenureFilter}</span>
                <button onClick={() => setTenureFilter("all")} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {frequencyFilter !== "all" && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                <span>Frequency: {frequencyFilter}</span>
                <button onClick={() => setFrequencyFilter("all")} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {paymentMethodFilter !== "all" && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-bold text-[11px]">
                <span>Method: {paymentMethodFilter.replace("_", " ")}</span>
                <button onClick={() => setPaymentMethodFilter("all")} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {ownerFilter !== "all" && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                <span>Owner: {ownerFilter}</span>
                <button onClick={() => setOwnerFilter("all")} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {programFilter !== "all" && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 font-bold text-[11px]">
                <span>Program: {programFilter}</span>
                <button onClick={() => setProgramFilter("all")} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {complianceFilter !== "all" && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 font-bold text-[11px]">
                <span>Compliance: {complianceFilter}</span>
                <button onClick={() => setComplianceFilter("all")} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {showOnlyDefaults && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 font-bold text-[11px]">
                <span>Defaults Only</span>
                <button onClick={() => setShowOnlyDefaults(false)} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              onClick={handleResetAllFilters}
              className="text-[11px] font-black text-rose-600 hover:underline ml-1"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Real-time Filtered Financial Metrics Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-slate-700 dark:text-slate-300">
              Showing {filteredRecords.length} of {records.length} Billing Projects
            </span>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                Filtered View
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <div>
              <span className="text-slate-400">Total Filtered Value: </span>
              <strong className="font-mono text-slate-800 dark:text-slate-200">
                {formatINR(filteredMetrics.totalContract)}
              </strong>
            </div>

            {paymentMonthFilter !== "all" ? (
              <div>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {activeMonthLabel} Inflow:{" "}
                </span>
                <strong className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                  {formatINR(filteredMetrics.monthSpecificReceived)}
                </strong>
              </div>
            ) : (
              <div>
                <span className="text-slate-400">Total Collected: </span>
                <strong className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                  {formatINR(filteredMetrics.totalCollected)}
                </strong>
              </div>
            )}

            <div>
              <span className="text-slate-400">Pending Balance: </span>
              <strong className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {formatINR(filteredMetrics.totalPending)}
              </strong>
            </div>
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
                  {/* Pipeline Badges: Industry, City & Sync Tag */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {(record.industry || v.industry) && (
                      <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-800/50 truncate max-w-[130px]" title={record.industry || v.industry}>
                        {record.industry || v.industry}
                      </span>
                    )}

                    {(record.city || v.city) && (
                      <span className="inline-flex items-center space-x-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                        <MapPin className="w-2.5 h-2.5 text-indigo-500" />
                        <span className="truncate max-w-[80px]">{record.city || v.city}</span>
                      </span>
                    )}

                    {record.leadId && (
                      <span
                        className="inline-flex items-center space-x-1 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60 ml-auto"
                        title={`Synced with CRM Pipeline Deal ID: ${record.leadId}`}
                      >
                        <Link2 className="w-2.5 h-2.5 text-emerald-500" />
                        <span>Pipeline #{record.leadId.slice(-4)}</span>
                      </span>
                    )}
                  </div>

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
                          {v.designation || record.designation || "Contact Person"}
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

                  {/* Pipeline Metadata Badges: Program, Lead Source, Closure Month, Approach Note */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {(record.program || v.program) && (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200/60">
                        <GraduationCap className="w-3 h-3 text-teal-500 shrink-0" />
                        <span className="truncate max-w-[140px]">{record.program || v.program}</span>
                      </span>
                    )}

                    {(record.leadSource || v.leadSource) && (() => {
                      const srcStyle = getLeadSourceBadgeStyle(record.leadSource || v.leadSource);
                      return (
                        <span
                          className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${srcStyle.badgeBg} ${srcStyle.badgeText} ${srcStyle.borderColor}`}
                        >
                          <Compass className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[120px]">{record.leadSource || v.leadSource}</span>
                        </span>
                      );
                    })()}

                    {record.closureMonth && (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200">
                        <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
                        <span>Target: {formatClosureMonth(record.closureMonth, "short")}</span>
                      </span>
                    )}

                    {record.approachNote && (
                      <a
                        href={record.approachNote.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200 hover:underline"
                        title="View pipeline approach note"
                      >
                        <FileText className="w-3 h-3 text-rose-500 shrink-0" />
                        <span>Approach Note</span>
                      </a>
                    )}

                    {record.owner && (
                      <span className="text-[10px] text-slate-400">
                        Owner: <span className="font-semibold text-slate-600 dark:text-slate-300">{record.owner}</span>
                      </span>
                    )}
                  </div>

                    {/* Financial Meters */}
                    <div className="space-y-2 pt-1">
                      {paymentMonthFilter !== "all" && (() => {
                        const mPayments = (record.paymentHistory || []).filter(
                          (p) => p.date && p.date.startsWith(paymentMonthFilter)
                        );
                        const mTotal = mPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
                        if (mTotal <= 0) return null;
                        return (
                          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/40 rounded-2xl flex items-center justify-between text-xs animate-fadeIn">
                            <div className="flex items-center space-x-2">
                              <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <div>
                                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold uppercase block tracking-wider">
                                  Received in {activeMonthLabel}
                                </span>
                                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                  {formatINR(mTotal)}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500">
                              {mPayments.length} payment{mPayments.length === 1 ? "" : "s"}
                            </span>
                          </div>
                        );
                      })()}

                      <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          {record.pipelineDealValue ? "Contract / Deal" : "Contract Value"}
                        </span>
                        <div className="flex items-baseline space-x-1.5">
                          <span className="font-mono font-black text-slate-900 dark:text-white text-sm">
                            {formatINR(record.projectAmount)}
                          </span>
                          {record.pipelineDealValue && record.pipelineDealValue !== record.projectAmount && (
                            <span className="text-[10px] text-slate-400 font-mono" title="Original Pipeline Deal Value">
                              (Deal: {formatINR(record.pipelineDealValue)})
                            </span>
                          )}
                        </div>
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
                  <th className="p-4 text-right">
                    {paymentMonthFilter !== "all" ? `${activeMonthLabel} Inflow` : "Received"}
                  </th>
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
                        {paymentMonthFilter !== "all" ? (() => {
                          const mPayments = (r.paymentHistory || []).filter(
                            (p) => p.date && p.date.startsWith(paymentMonthFilter)
                          );
                          const mTotal = mPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
                          return (
                            <div>
                              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 block">
                                {formatINR(mTotal)}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                Total: {formatINR(r.amountReceived)}
                              </span>
                            </div>
                          );
                        })() : (
                          <div>
                            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 block">
                              {formatINR(r.amountReceived)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {r.projectAmount > 0
                                ? `${Math.round(((r.amountReceived || 0) / r.projectAmount) * 100)}%`
                                : "0%"}
                            </span>
                          </div>
                        )}
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

      {/* 5. Migrate Pipeline Closure Lead Modal */}
      <MigratePipelineLeadModal
        isOpen={isMigrateModalOpen}
        onClose={() => setIsMigrateModalOpen(false)}
        leads={leads}
        existingBillingRecords={records}
        onMigrateLead={handleMigrateLead}
        onViewBillingRecord={(rec) => {
          setViewingRecord(rec);
        }}
      />

      {/* 6. Month-Wise Cashflow & Collections Ledger Modal */}
      <MonthlyCollectionsLedgerModal
        isOpen={isLedgerModalOpen}
        onClose={() => setIsLedgerModalOpen(false)}
        records={records}
        onSelectMonthFilter={(mKey) => {
          setPaymentMonthFilter(mKey);
        }}
      />
    </div>
  );
};
