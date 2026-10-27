"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Truck,
  PackageCheck,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
  Search,
  SlidersHorizontal,
  FileText,
  Building2,
  Percent,
  RefreshCw,
  X,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Receipt,
  Users,
  ShieldCheck,
  Check,
  ChevronDown,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Paperclip,
  Download,
  History,
  Sparkles,
  FolderOpen,
  FileCheck,
  Eye,
  MessageSquare,
  ArrowUpRight,
  Tag,
  BarChart3,
  PieChart,
  Filter,
  Wallet,
  CalendarDays,
  UserCheck,
  ArrowUpDown,
  CreditCard,
  Layers,
  ChevronUp,
  Lock,
  FileSpreadsheet,
  Share2,
  Award,
  AlertTriangle,
  Star,
  FileCheck2,
  Printer,
  Copy,
  LayoutGrid,
  CalendarRange,
} from "lucide-react";
import { formatINR, formatClosureMonth, getDateComponents } from "@/lib/formatters";
import { UserAccount, getUserProfile, VALID_USERS, isSameOwner, getCanonicalOwnerName } from "@/constants/users";
import { Lead, ApproachNote, FinancialDocument, ContactPerson, JourneyLog } from "@/types/lead";
import { getProgramBadgeStyle } from "@/constants/programs";
import { getLeadSourceBadgeStyle } from "@/constants/leadSources";
import { STAGES } from "@/constants/stages";
import {
  DeliveryRecord,
  DeliveryMilestoneTranche,
  PaymentTermTranche,
  TenureType,
  DeliveryOverallStatus,
  MilestoneCompletionStatus,
  TranchePaymentStatus,
  CoachAssignment,
  ClientSignoff,
  ProjectHealthStatus,
  DeliveryLog,
  getSimpleDeliveryStatus,
  getSimpleBillingStatus,
  SimpleDeliveryStatus,
  SimpleBillingStatus,
} from "@/types/delivery";
import { SpringButton, SpringWidget, SpringCounter } from "@/components/spring";
import {
  subscribeToDeliveryRecords,
  createDeliveryRecordFromLead,
  updateDeliveryRecord,
  deleteDeliveryRecord,
  createDefaultDeliveryMilestones,
  createDefaultPaymentTerms,
  createMilestonesFromPreset,
  createPaymentTermsFromPreset,
  MILESTONE_PRESETS,
  MilestonePresetType,
} from "@/lib/deliveryService";
import { DeliveryNextActionCard } from "@/components/DeliveryNextActionCard";
import { DeliveryPhaseStepper } from "@/components/DeliveryPhaseStepper";
import { ProjectProgressBar } from "@/components/ProjectProgressBar";
import { DeliveryRiskRadar } from "@/components/DeliveryRiskRadar";
import { DeliveryInvoiceModal } from "@/components/DeliveryInvoiceModal";
import { CoachAllocationDrawer } from "@/components/CoachAllocationDrawer";
import { DeliveryTimelineView } from "@/components/DeliveryTimelineView";
import { ClientSignoffModal } from "@/components/ClientSignoffModal";
import { ClientShareablePortalModal } from "@/components/ClientShareablePortalModal";
import { DeliveryAiImportModal, ExtractedDeliveryData } from "@/components/DeliveryAiImportModal";
import { DeliveryFinancialRealizationTable } from "@/components/DeliveryFinancialRealizationTable";
import {
  calculateAgingReceivables,
  calculateDeliveryHealth,
  generateDeliveryPortfolioCSV,
  generateExecutiveMatrixCSV,
  downloadCSV,
} from "@/lib/deliveryAnalytics";
import confetti from "canvas-confetti";

interface DeliveryTabProps {
  leads: Lead[];
  allLeads: Lead[];
  currentUser?: UserAccount | null;
  isAdmin: boolean;
  onSelectLead?: (lead: Lead) => void;
}

export const DeliveryTab: React.FC<DeliveryTabProps> = ({
  leads,
  allLeads,
  currentUser,
  isAdmin,
  onSelectLead,
}) => {
  const [deliveryRecords, setDeliveryRecords] = useState<DeliveryRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [projectSubTab, setProjectSubTab] = useState<
    "delivery_coaching" | "billing_invoices" | "dossier" | "tenure" | "pipeline_data" | "coaches" | "signoff"
  >("delivery_coaching");

  // Delivery View Mode Switcher: Operations Table vs Interactive Gantt Timeline View
  const [deliveryViewMode, setDeliveryViewMode] = useState<"table" | "timeline">("table");

  // Contract Sub-View Switcher (when tenure is contract)
  const [contractSubView, setContractSubView] = useState<"all" | "milestones" | "terms">("all");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTenureFilter, setSelectedTenureFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [selectedOwnerFilter, setSelectedOwnerFilter] = useState<string>("all");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("all");

  // Executive Header Analytics Controls
  const [headerAnalyticsTab, setHeaderAnalyticsTab] = useState<
    "realization_report" | "owner_matrix" | "month_wise" | "payment_insights" | "risk_radar"
  >("realization_report");
  const [isAnalyticsExpanded, setIsAnalyticsExpanded] = useState<boolean>(false);

  // Modals & Drawers
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<DeliveryRecord | null>(null);

  // Invoice / UTR Tracking Modal
  const [invoiceModalState, setInvoiceModalState] = useState<{
    isOpen: boolean;
    record: DeliveryRecord | null;
    item: DeliveryMilestoneTranche | PaymentTermTranche | null;
    itemType: "milestone" | "payment_term";
  }>({
    isOpen: false,
    record: null,
    item: null,
    itemType: "milestone",
  });

  // Client Sign-off Modal
  const [isSignoffModalOpen, setIsSignoffModalOpen] = useState(false);

  // Client Shareable Portal Modal
  const [isSharePortalModalOpen, setIsSharePortalModalOpen] = useState(false);

  // AI Proposal Document Import Modal
  const [isAiImportModalOpen, setIsAiImportModalOpen] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({
    companyName: "",
    dealValue: 1500000,
    program: "Executive Coaching",
    clientPartner: currentUser?.name || "Sales Lead",
    deliveryLead: "Delivery Team",
    tenureType: "delivery" as TenureType,
    milestonePreset: "three_stage" as MilestonePresetType,
  });

  // Helper to compute payment realization for any record
  const getRecordFinancials = (r: DeliveryRecord) => {
    let received = 0;
    let invoiced = 0;
    if (r.tenureType === "delivery") {
      (r.deliveryMilestones || []).forEach((m) => {
        if (m.paymentStatus === "received") {
          received += m.amount || 0;
          invoiced += m.amount || 0;
        } else if (m.paymentStatus === "invoiced" || m.invoiceNumber) {
          invoiced += m.amount || 0;
        }
      });
    } else if (r.tenureType === "payment_terms") {
      (r.paymentTerms || []).forEach((t) => {
        if (t.paymentStatus === "received") {
          received += t.amount || 0;
          invoiced += t.amount || 0;
        } else if (t.paymentStatus === "invoiced" || t.invoiceNumber) {
          invoiced += t.amount || 0;
        }
      });
    } else {
      // Contract: Combination of Delivery Milestones and Payment Terms
      (r.deliveryMilestones || []).forEach((m) => {
        if (m.paymentStatus === "received") {
          received += m.amount || 0;
          invoiced += m.amount || 0;
        } else if (m.paymentStatus === "invoiced" || m.invoiceNumber) {
          invoiced += m.amount || 0;
        }
      });
      (r.paymentTerms || []).forEach((t) => {
        if (t.paymentStatus === "received") {
          received += t.amount || 0;
          invoiced += t.amount || 0;
        } else if (t.paymentStatus === "invoiced" || t.invoiceNumber) {
          invoiced += t.amount || 0;
        }
      });
    }
    const total = r.dealValue || 0;
    const remaining = Math.max(0, total - invoiced);
    const invoicedPending = Math.max(0, invoiced - received);
    const unbilled = Math.max(0, total - invoiced);
    const realizationRate = total > 0 ? (invoiced / total) * 100 : 0;
    const invoicedRate = total > 0 ? (invoiced / total) * 100 : 0;
    return { total, received, invoiced, invoicedPending, unbilled, remaining, realizationRate, invoicedRate };
  };

  // Subscribe to real-time Delivery records
  useEffect(() => {
    const unsubscribe = subscribeToDeliveryRecords((records, syncing) => {
      setDeliveryRecords(records);
      setIsSyncing(syncing);
    });
    return () => unsubscribe();
  }, []);

  // Helper to determine if a record belongs to the current user (Client Partner)
  const isRecordOwnedByUser = useCallback(
    (r: DeliveryRecord, user: UserAccount): boolean => {
      if (!user) return false;
      const uName = user.name || "";
      const uUser = user.username || "";

      // 1. Direct match on clientPartner
      if (r.clientPartner) {
        if (isSameOwner(r.clientPartner, uName) || isSameOwner(r.clientPartner, uUser)) {
          return true;
        }
      }

      // 2. Match via matching lead in pipeline
      const rowMatchingLead =
        allLeads.find((l) => l.id === r.leadId) ||
        leads.find((l) => l.id === r.leadId) ||
        allLeads.find(
          (l) => l.companyName.trim().toLowerCase() === r.companyName.trim().toLowerCase()
        ) ||
        leads.find(
          (l) => l.companyName.trim().toLowerCase() === r.companyName.trim().toLowerCase()
        );

      if (rowMatchingLead?.owner) {
        if (isSameOwner(rowMatchingLead.owner, uName) || isSameOwner(rowMatchingLead.owner, uUser)) {
          return true;
        }
      }

      // 3. Fallback check on deliveryLogs author
      if (Array.isArray(r.deliveryLogs) && r.deliveryLogs.length > 0) {
        const firstLog = r.deliveryLogs[0];
        if (
          firstLog?.author &&
          (isSameOwner(firstLog.author, uName) || isSameOwner(firstLog.author, uUser))
        ) {
          return true;
        }
      }

      return false;
    },
    [allLeads, leads]
  );

  // Role-Based Access Control:
  // Admin and Delivery Operations users (e.g. Vikram) can view and access delivery records of ALL client partners.
  // Regular Client Partners can ONLY view and access their own delivery records.
  const isDeliveryCoordinator = Boolean(
    currentUser?.username.toLowerCase() === "vikram" ||
    currentUser?.role.toLowerCase().includes("delivery") ||
    currentUser?.username.toLowerCase() === "accounts" ||
    currentUser?.role.toLowerCase().includes("accounts")
  );

  const accessibleDeliveryRecords = useMemo(() => {
    if (isAdmin || isDeliveryCoordinator) {
      return deliveryRecords;
    }
    if (!currentUser) return [];
    return deliveryRecords.filter((r) => isRecordOwnedByUser(r, currentUser));
  }, [deliveryRecords, isAdmin, isDeliveryCoordinator, currentUser, isRecordOwnedByUser]);

  // Guard: if current selectedRecordId is not in accessible records, clear selection
  useEffect(() => {
    if (selectedRecordId && !accessibleDeliveryRecords.some((r) => r.id === selectedRecordId)) {
      setSelectedRecordId(null);
    }
  }, [selectedRecordId, accessibleDeliveryRecords]);

  // Filter won closure leads from pipeline that can be imported to Delivery
  // Admin & Delivery Coordinators can import won deals from all leads; Client Partners can ONLY import their own closure deals
  const closureLeads = useMemo(() => {
    const source = (isAdmin || isDeliveryCoordinator) ? allLeads : leads;
    return source.filter((l) => l.stage === "closure");
  }, [isAdmin, isDeliveryCoordinator, allLeads, leads]);

  // Record currently selected for viewing/editing (strictly scoped to accessible records)
  const selectedRecord = useMemo(() => {
    if (!selectedRecordId) return null;
    return accessibleDeliveryRecords.find((r) => r.id === selectedRecordId) || null;
  }, [accessibleDeliveryRecords, selectedRecordId]);

  // Find preexisting pipeline lead matching the selected delivery project
  const matchingLead = useMemo(() => {
    if (!selectedRecord) return null;
    return (
      allLeads.find((l) => l.id === selectedRecord.leadId) ||
      leads.find((l) => l.id === selectedRecord.leadId) ||
      allLeads.find(
        (l) => l.companyName.trim().toLowerCase() === selectedRecord.companyName.trim().toLowerCase()
      ) ||
      leads.find(
        (l) => l.companyName.trim().toLowerCase() === selectedRecord.companyName.trim().toLowerCase()
      ) ||
      null
    );
  }, [selectedRecord, allLeads, leads]);

  // Comprehensive merged pipeline dossier from lead snapshot + delivery record
  const effectivePipelineData = useMemo(() => {
    if (!selectedRecord) return null;
    return {
      companyName: selectedRecord.companyName,
      companyLogo: matchingLead?.companyLogo || selectedRecord.companyLogo,
      contactName: matchingLead?.contactName || selectedRecord.contactName || "Contact Person",
      designation: matchingLead?.designation || selectedRecord.designation || "Primary Decision Maker",
      contactEmail: matchingLead?.contactEmail || selectedRecord.contactEmail,
      contactPhone: matchingLead?.contactPhone || selectedRecord.contactPhone,
      city: matchingLead?.city || selectedRecord.city,
      industry: matchingLead?.industry || selectedRecord.industry,
      program: matchingLead?.program || selectedRecord.program || "Enterprise Program",
      leadSource: matchingLead?.leadSource || selectedRecord.leadSource || "Direct Outreach",
      dealValue: selectedRecord.dealValue || matchingLead?.dealValue || 0,
      stage: matchingLead?.stage || selectedRecord.stage || "closure",
      weightage: matchingLead?.weightage ?? selectedRecord.weightage ?? 100,
      expectedCloseDate: matchingLead?.expectedCloseDate || selectedRecord.expectedCloseDate,
      closureMonth: matchingLead?.closureMonth || selectedRecord.closureMonth,
      pipelineNotes: matchingLead?.notes || selectedRecord.pipelineNotes || selectedRecord.notes,
      additionalContacts: matchingLead?.additionalContacts || selectedRecord.additionalContacts || [],
      approachNotes: matchingLead?.approachNotes || (matchingLead?.approachNote ? [matchingLead.approachNote] : []) || selectedRecord.approachNotes || [],
      financialDocuments: matchingLead?.financialDocuments || selectedRecord.financialDocuments || [],
      journeyLogs: matchingLead?.journeyLogs || selectedRecord.journeyLogs || [],
      owner: matchingLead?.owner || selectedRecord.clientPartner || "Sales Lead",
      createdAt: matchingLead?.createdAt || selectedRecord.createdAt,
    };
  }, [selectedRecord, matchingLead]);

  // Overall KPI Metrics (Computed on accessible records: All for Admin, Own for Client Partner)
  const metrics = useMemo(() => {
    let totalPortfolio = 0;
    let totalInvoiced = 0;
    let invoicedThisMonth = 0;
    let activeCount = 0;
    let deliveredCount = 0;
    let onTrackCount = 0;
    let pendingSignoffs = 0;

    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    accessibleDeliveryRecords.forEach((r) => {
      totalPortfolio += r.dealValue || 0;
      if (r.deliveryStatus === "in_progress" || r.deliveryStatus === "not_started") {
        activeCount++;
      } else if (r.deliveryStatus === "delivered") {
        deliveredCount++;
      }

      const health = r.projectHealth || "on_track";
      if (health === "on_track") {
        onTrackCount++;
      }

      const isNearlyDone =
        (r.overallCompletionPercent || 0) >= 80 || r.deliveryStatus === "delivered";
      if (isNearlyDone && !r.clientSignoff) {
        pendingSignoffs++;
      }

      const fin = getRecordFinancials(r);
      totalInvoiced += fin.invoiced;

      // Invoiced in current calendar month
      (r.deliveryMilestones || []).forEach((m) => {
        if ((m.paymentStatus === "invoiced" || m.paymentStatus === "received") && m.invoiceDate) {
          if (m.invoiceDate.startsWith(currentYearMonth)) {
            invoicedThisMonth += m.amount || 0;
          }
        }
      });
      (r.paymentTerms || []).forEach((t) => {
        if ((t.paymentStatus === "invoiced" || t.paymentStatus === "received") && t.invoiceDate) {
          if (t.invoiceDate.startsWith(currentYearMonth)) {
            invoicedThisMonth += t.amount || 0;
          }
        }
      });
    });

    const pendingInvoicing = Math.max(0, totalPortfolio - totalInvoiced);
    const invoicingRate = totalPortfolio > 0 ? (totalInvoiced / totalPortfolio) * 100 : 0;
    const onTrackPercent =
      accessibleDeliveryRecords.length > 0
        ? Math.round((onTrackCount / accessibleDeliveryRecords.length) * 100)
        : 100;

    return {
      totalPortfolio,
      totalInvoiced,
      invoicedThisMonth,
      pendingInvoicing,
      activeCount,
      deliveredCount,
      onTrackCount,
      onTrackPercent,
      pendingSignoffs,
      invoicingRate,
      totalProjects: accessibleDeliveryRecords.length,
    };
  }, [accessibleDeliveryRecords]);

  // Helper to extract month representation for any delivery record
  const getRecordMonthInfo = useCallback(
    (r: DeliveryRecord) => {
      const rowMatchingLead =
        allLeads.find((l) => l.id === r.leadId) ||
        leads.find((l) => l.id === r.leadId) ||
        allLeads.find(
          (l) => l.companyName.trim().toLowerCase() === r.companyName.trim().toLowerCase()
        ) ||
        leads.find(
          (l) => l.companyName.trim().toLowerCase() === r.companyName.trim().toLowerCase()
        );

      // Prioritize actual operational input dates (invoice date, completion signoff, or closure/start date)
      // Never fall back to CRM database row creation date (createdAt)
      const opDate =
        r.paymentTerms?.find((t) => (t.paymentStatus === "invoiced" || t.paymentStatus === "received") && (t.invoiceDate || t.paymentReceivedDate))?.invoiceDate ||
        r.deliveryMilestones?.find((m) => (m.paymentStatus === "invoiced" || m.paymentStatus === "received") && (m.invoiceDate || m.paymentReceivedDate))?.invoiceDate ||
        r.paymentTerms?.find((t) => t.paymentStatus === "received" && t.paymentReceivedDate)?.paymentReceivedDate ||
        r.deliveryMilestones?.find((m) => m.paymentStatus === "received" && m.paymentReceivedDate)?.paymentReceivedDate;

      const rawDate =
        opDate ||
        r.clientSignoff?.signoffDate ||
        r.closureMonth ||
        rowMatchingLead?.closureMonth ||
        r.startDate ||
        rowMatchingLead?.expectedCloseDate;

      const comps = getDateComponents(rawDate);
      const monthKey = comps.isValid
        ? `${comps.monthLong} ${comps.year}`
        : "Unscheduled / Ongoing";
      const monthSortKey = comps.isValid
        ? `${comps.year}-${String(comps.monthNum).padStart(2, "0")}`
        : "9999-99";

      return { monthKey, monthSortKey, rawDate };
    },
    [allLeads, leads]
  );

  // Aggregated Month-Wise Revenue & Invoicing (Across all accessible records)
  const monthWiseRevenueList = useMemo(() => {
    const map = new Map<
      string,
      {
        monthKey: string;
        monthSortKey: string;
        accountsCount: number;
        totalMoney: number;
        invoicedMoney: number;
        remainingMoney: number;
      }
    >();

    accessibleDeliveryRecords.forEach((r) => {
      const { monthKey, monthSortKey } = getRecordMonthInfo(r);

      if (!map.has(monthKey)) {
        map.set(monthKey, {
          monthKey,
          monthSortKey,
          accountsCount: 0,
          totalMoney: 0,
          invoicedMoney: 0,
          remainingMoney: 0,
        });
      }

      const item = map.get(monthKey)!;
      item.accountsCount += 1;
      const fin = getRecordFinancials(r);
      item.totalMoney += fin.total;
      item.invoicedMoney += fin.invoiced;
      item.remainingMoney += fin.unbilled;
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        invoicingRate: item.totalMoney > 0 ? (item.invoicedMoney / item.totalMoney) * 100 : 0,
      }))
      .sort((a, b) => a.monthSortKey.localeCompare(b.monthSortKey));
  }, [accessibleDeliveryRecords, getRecordMonthInfo]);

  // List of all unique lead owners (across all accessible records)
  const allLeadOwnersList = useMemo(() => {
    const map = new Map<string, { owner: string; accountsCount: number }>();
    accessibleDeliveryRecords.forEach((r) => {
      const rowMatchingLead =
        allLeads.find((l) => l.id === r.leadId) ||
        leads.find((l) => l.id === r.leadId) ||
        allLeads.find(
          (l) => l.companyName.trim().toLowerCase() === r.companyName.trim().toLowerCase()
        ) ||
        leads.find(
          (l) => l.companyName.trim().toLowerCase() === r.companyName.trim().toLowerCase()
        );
      const ownerName = r.clientPartner || rowMatchingLead?.owner || "Unassigned";
      const existing = map.get(ownerName);
      if (!existing) {
        map.set(ownerName, { owner: ownerName, accountsCount: 1 });
      } else {
        existing.accountsCount += 1;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.accountsCount - a.accountsCount);
  }, [accessibleDeliveryRecords, allLeads, leads]);

  // Accessible records scoped by selectedMonthFilter (used for Owner Performance Matrix & trajectory)
  const recordsForAnalytics = useMemo(() => {
    if (selectedMonthFilter === "all") return accessibleDeliveryRecords;
    return accessibleDeliveryRecords.filter((r) => {
      const { monthKey } = getRecordMonthInfo(r);
      return monthKey.toLowerCase() === selectedMonthFilter.toLowerCase();
    });
  }, [accessibleDeliveryRecords, selectedMonthFilter, getRecordMonthInfo]);

  // Accessible records scoped by BOTH selectedMonthFilter AND selectedOwnerFilter
  const realizationRecords = useMemo(() => {
    return recordsForAnalytics.filter((r) => {
      if (!isAdmin || selectedOwnerFilter === "all") return true;
      const rowMatchingLead =
        allLeads.find((l) => l.id === r.leadId) ||
        leads.find((l) => l.id === r.leadId) ||
        allLeads.find(
          (l) => l.companyName.trim().toLowerCase() === r.companyName.trim().toLowerCase()
        ) ||
        leads.find(
          (l) => l.companyName.trim().toLowerCase() === r.companyName.trim().toLowerCase()
        );
      const effectiveOwner = r.clientPartner || rowMatchingLead?.owner || "Unassigned";
      return (
        effectiveOwner.toLowerCase() === selectedOwnerFilter.toLowerCase() ||
        (r.clientPartner && r.clientPartner.toLowerCase() === selectedOwnerFilter.toLowerCase())
      );
    });
  }, [recordsForAnalytics, isAdmin, selectedOwnerFilter, allLeads, leads]);

  // Aggregated Lead Owner Performance Matrix (Tabular Data, respects active month filter)
  const ownerPerformanceList = useMemo(() => {
    const map = new Map<
      string,
      {
        owner: string;
        accountsCount: number;
        notStartedCount: number;
        inProgressCount: number;
        deliveredCount: number;
        totalMoney: number;
        invoicedMoney: number;
        remainingMoney: number;
        deliveryTenureCount: number;
        paymentTermsTenureCount: number;
        contractTenureCount: number;
      }
    >();

    recordsForAnalytics.forEach((r) => {
      const rowMatchingLead =
        allLeads.find((l) => l.id === r.leadId) ||
        leads.find((l) => l.id === r.leadId) ||
        allLeads.find(
          (l) => l.companyName.trim().toLowerCase() === r.companyName.trim().toLowerCase()
        ) ||
        leads.find(
          (l) => l.companyName.trim().toLowerCase() === r.companyName.trim().toLowerCase()
        );

      const ownerName = r.clientPartner || rowMatchingLead?.owner || "Unassigned";

      if (!map.has(ownerName)) {
        map.set(ownerName, {
          owner: ownerName,
          accountsCount: 0,
          notStartedCount: 0,
          inProgressCount: 0,
          deliveredCount: 0,
          totalMoney: 0,
          invoicedMoney: 0,
          remainingMoney: 0,
          deliveryTenureCount: 0,
          paymentTermsTenureCount: 0,
          contractTenureCount: 0,
        });
      }

      const item = map.get(ownerName)!;
      item.accountsCount += 1;
      if (r.deliveryStatus === "delivered") item.deliveredCount += 1;
      else if (r.deliveryStatus === "in_progress") item.inProgressCount += 1;
      else item.notStartedCount += 1;

      if (r.tenureType === "delivery") item.deliveryTenureCount += 1;
      else if (r.tenureType === "contract") item.contractTenureCount += 1;
      else item.paymentTermsTenureCount += 1;

      const fin = getRecordFinancials(r);
      item.totalMoney += fin.total;
      item.invoicedMoney += fin.invoiced;
      item.remainingMoney += fin.unbilled;
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        invoicingRate: item.totalMoney > 0 ? (item.invoicedMoney / item.totalMoney) * 100 : 0,
        avgDealSize: item.accountsCount > 0 ? item.totalMoney / item.accountsCount : 0,
      }))
      .sort((a, b) => b.totalMoney - a.totalMoney);
  }, [recordsForAnalytics, allLeads, leads]);

  // Aggregated totals for the current owner matrix view (matching active month filter)
  const ownerPerformanceTotals = useMemo(() => {
    let accounts = 0;
    let totalMoney = 0;
    let invoicedMoney = 0;
    let remainingMoney = 0;

    ownerPerformanceList.forEach((item) => {
      accounts += item.accountsCount;
      totalMoney += item.totalMoney;
      invoicedMoney += item.invoicedMoney;
      remainingMoney += item.remainingMoney;
    });

    const invoicingRate = totalMoney > 0 ? (invoicedMoney / totalMoney) * 100 : 0;
    const avgDealSize = accounts > 0 ? totalMoney / accounts : 0;

    return { accounts, totalMoney, invoicedMoney, remainingMoney, invoicingRate, avgDealSize };
  }, [ownerPerformanceList]);

  // Tenure Model Comparison Insights (scoped to month and owner filter if active)
  const tenureModelInsights = useMemo(() => {
    let deliveryModelAccounts = 0;
    let deliveryModelMoney = 0;
    let deliveryModelInvoiced = 0;

    let paymentTermsAccounts = 0;
    let paymentTermsMoney = 0;
    let paymentTermsInvoiced = 0;

    let contractAccounts = 0;
    let contractMoney = 0;
    let contractInvoiced = 0;

    realizationRecords.forEach((r) => {
      const fin = getRecordFinancials(r);
      if (r.tenureType === "delivery") {
        deliveryModelAccounts += 1;
        deliveryModelMoney += fin.total;
        deliveryModelInvoiced += fin.invoiced;
      } else if (r.tenureType === "contract") {
        contractAccounts += 1;
        contractMoney += fin.total;
        contractInvoiced += fin.invoiced;
      } else {
        paymentTermsAccounts += 1;
        paymentTermsMoney += fin.total;
        paymentTermsInvoiced += fin.invoiced;
      }
    });

    return {
      delivery: {
        accounts: deliveryModelAccounts,
        totalMoney: deliveryModelMoney,
        invoicedMoney: deliveryModelInvoiced,
        unbilledMoney: Math.max(0, deliveryModelMoney - deliveryModelInvoiced),
        rate: deliveryModelMoney > 0 ? (deliveryModelInvoiced / deliveryModelMoney) * 100 : 0,
      },
      paymentTerms: {
        accounts: paymentTermsAccounts,
        totalMoney: paymentTermsMoney,
        invoicedMoney: paymentTermsInvoiced,
        unbilledMoney: Math.max(0, paymentTermsMoney - paymentTermsInvoiced),
        rate: paymentTermsMoney > 0 ? (paymentTermsInvoiced / paymentTermsMoney) * 100 : 0,
      },
      contract: {
        accounts: contractAccounts,
        totalMoney: contractMoney,
        invoicedMoney: contractInvoiced,
        unbilledMoney: Math.max(0, contractMoney - contractInvoiced),
        rate: contractMoney > 0 ? (contractInvoiced / contractMoney) * 100 : 0,
      },
    };
  }, [realizationRecords]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return accessibleDeliveryRecords.filter((r) => {
      const matchesSearch =
        searchQuery === "" ||
        r.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.clientPartner && r.clientPartner.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.program && r.program.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.contactName && r.contactName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTenure =
        selectedTenureFilter === "all" || r.tenureType === selectedTenureFilter;

      const matchesStatus =
        selectedStatusFilter === "all" || r.deliveryStatus === selectedStatusFilter;

      const rowMatchingLead =
        allLeads.find((l) => l.id === r.leadId) ||
        leads.find((l) => l.id === r.leadId) ||
        allLeads.find(
          (l) => l.companyName.trim().toLowerCase() === r.companyName.trim().toLowerCase()
        ) ||
        leads.find(
          (l) => l.companyName.trim().toLowerCase() === r.companyName.trim().toLowerCase()
        );

      const effectiveOwner = r.clientPartner || rowMatchingLead?.owner || "Unassigned";

      const matchesOwner =
        !isAdmin ||
        selectedOwnerFilter === "all" ||
        effectiveOwner.toLowerCase() === selectedOwnerFilter.toLowerCase() ||
        (r.clientPartner && r.clientPartner.toLowerCase() === selectedOwnerFilter.toLowerCase());

      const { monthKey: recordMonth } = getRecordMonthInfo(r);
      const matchesMonth =
        selectedMonthFilter === "all" ||
        recordMonth.toLowerCase() === selectedMonthFilter.toLowerCase();

      return matchesSearch && matchesTenure && matchesStatus && matchesOwner && matchesMonth;
    });
  }, [
    accessibleDeliveryRecords,
    searchQuery,
    selectedTenureFilter,
    selectedStatusFilter,
    selectedOwnerFilter,
    selectedMonthFilter,
    getRecordMonthInfo,
    allLeads,
    leads,
    isAdmin,
  ]);

  // Aging Receivables and Health Summaries
  const agingReceivablesSummary = useMemo(
    () => calculateAgingReceivables(recordsForAnalytics),
    [recordsForAnalytics]
  );

  const deliveryHealthSummary = useMemo(
    () => calculateDeliveryHealth(recordsForAnalytics),
    [recordsForAnalytics]
  );

  // Update Project Health & Blocker
  const handleUpdateProjectHealth = async (
    health: ProjectHealthStatus,
    blocker?: string
  ) => {
    if (!selectedRecord) return;
    try {
      const updated = await updateDeliveryRecord(
        selectedRecord.id,
        {
          projectHealth: health,
          healthBlocker: blocker !== undefined ? blocker : selectedRecord.healthBlocker,
        },
        currentUser?.name || "User"
      );
      if (updated) {
        setDeliveryRecords((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        );
      }
    } catch (e) {
      console.error("Error updating project health", e);
    }
  };

  // Update Coaches & Faculty allocation
  const handleUpdateCoaches = async (
    coaches: CoachAssignment[],
    coachingSessionsTotal: number,
    coachingSessionsCompleted: number,
    totalFacultyCost: number
  ) => {
    if (!selectedRecord) return;
    try {
      const updated = await updateDeliveryRecord(
        selectedRecord.id,
        {
          coaches,
          coachingSessionsTotal,
          coachingSessionsCompleted,
          totalFacultyCost,
        },
        currentUser?.name || "User"
      );
      if (updated) {
        setDeliveryRecords((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        );
      }
    } catch (e) {
      console.error("Error updating coaches", e);
    }
  };

  // Save Client Formal Sign-off
  const handleSaveSignoff = async (signoff: ClientSignoff) => {
    if (!selectedRecord) return;
    try {
      const updated = await updateDeliveryRecord(
        selectedRecord.id,
        {
          clientSignoff: signoff,
          deliveryStatus: "delivered",
          overallCompletionPercent: 100,
        },
        currentUser?.name || "Client Partner"
      );
      if (updated) {
        setDeliveryRecords((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        );
        try {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } catch {}
      }
    } catch (e) {
      console.error("Error saving client sign-off", e);
    }
  };

  // Save Invoice Details
  const handleSaveInvoiceDetails = async (
    itemId: string,
    itemType: "milestone" | "payment_term",
    invoiceNumber: string,
    invoiceDate: string,
    clientGst?: string,
    clientAddress?: string
  ) => {
    if (!selectedRecord) return;
    try {
      let updatedMilestones = selectedRecord.deliveryMilestones;
      let updatedTerms = selectedRecord.paymentTerms;

      if (itemType === "milestone") {
        updatedMilestones = (selectedRecord.deliveryMilestones || []).map((m) =>
          m.id === itemId
            ? {
                ...m,
                invoiceNumber,
                invoiceDate: invoiceDate || m.invoiceDate || new Date().toISOString().split("T")[0],
                paymentStatus: "invoiced" as const,
              }
            : m
        );
      } else {
        updatedTerms = (selectedRecord.paymentTerms || []).map((t) =>
          t.id === itemId
            ? {
                ...t,
                invoiceNumber,
                invoiceDate: invoiceDate || t.invoiceDate || new Date().toISOString().split("T")[0],
                paymentStatus: "invoiced" as const,
              }
            : t
        );
      }

      const updated = await updateDeliveryRecord(
        selectedRecord.id,
        {
          deliveryMilestones: updatedMilestones,
          paymentTerms: updatedTerms,
          ...(clientGst ? { gstNumber: clientGst } : {}),
          ...(clientAddress ? { clientBillingAddress: clientAddress } : {}),
        },
        currentUser?.name || "User"
      );
      if (updated) {
        setDeliveryRecords((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        );
      }
    } catch (e) {
      console.error("Error saving invoice details", e);
    }
  };

  // Backwards compatibility alias for modal
  const handleSaveUTR = async (
    itemId: string,
    itemType: "milestone" | "payment_term",
    invoiceNumber: string,
    _utrNumber: string,
    _bankReference: string,
    paymentDate: string
  ) => {
    await handleSaveInvoiceDetails(itemId, itemType, invoiceNumber, paymentDate);
  };

  // CSV Exporters
  const handleExportPortfolioCSV = () => {
    const csv = generateDeliveryPortfolioCSV(accessibleDeliveryRecords);
    const dateStr = new Date().toISOString().split("T")[0];
    downloadCSV(`xmonks-delivery-portfolio-${dateStr}.csv`, csv);
  };

  const handleExportMatrixCSV = () => {
    const csv = generateExecutiveMatrixCSV(accessibleDeliveryRecords, ownerPerformanceList);
    const dateStr = new Date().toISOString().split("T")[0];
    downloadCSV(`xmonks-executive-revenue-matrix-${dateStr}.csv`, csv);
  };

  // Handle Overwrite & Apply AI Extracted Schedule
  const handleApplyAiSchedule = async (extracted: ExtractedDeliveryData) => {
    if (!selectedRecord) return;
    try {
      const updated = await updateDeliveryRecord(
        selectedRecord.id,
        {
          tenureType: extracted.tenureType,
          dealValue: extracted.dealValue > 0 ? extracted.dealValue : selectedRecord.dealValue,
          deliveryMilestones:
            extracted.tenureType === "payment_terms" ? [] : extracted.deliveryMilestones,
          paymentTerms:
            extracted.tenureType === "delivery" ? [] : extracted.paymentTerms,
          coachingSessionsTotal:
            extracted.coachingSessionsTotal || selectedRecord.coachingSessionsTotal || 8,
          coachingSessionsCompleted: 0,
          coaches:
            extracted.coaches && extracted.coaches.length > 0
              ? extracted.coaches
              : selectedRecord.coaches,
        },
        currentUser?.name || "AI Assistant"
      );

      if (updated) {
        setDeliveryRecords((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        );
        try {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        } catch {}
      }
    } catch (err) {
      console.error("Error applying AI schedule", err);
    }
  };

  // Handlers
  const handleSelectRecord = (id: string) => {
    setSelectedRecordId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleImportLead = async (lead: Lead, tenure: TenureType) => {
    try {
      const created = await createDeliveryRecordFromLead(lead, tenure, currentUser?.name || "Delivery Lead");
      setIsImportModalOpen(false);
      setSelectedRecordId(created.id);
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch {}
    } catch (e) {
      console.error("Error importing lead to delivery", e);
    }
  };

  const handleCreateNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectForm.companyName.trim()) return;

    const assignedPartner = isAdmin
      ? newProjectForm.clientPartner || currentUser?.name || "Sales Lead"
      : currentUser?.name || "Client Partner";

    const mockLead: Partial<Lead> = {
      id: `custom-proj-${Date.now()}`,
      companyName: newProjectForm.companyName.trim(),
      dealValue: Number(newProjectForm.dealValue) || 1000000,
      program: newProjectForm.program,
      owner: assignedPartner,
      stage: "closure",
      contactName: "Lead Stakeholder",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = await createDeliveryRecordFromLead(
      mockLead as Lead,
      newProjectForm.tenureType,
      newProjectForm.deliveryLead
    );

    // Auto-apply selected 1-click milestone preset
    const dealVal = Number(newProjectForm.dealValue) || 1000000;
    const initialMilestones = createMilestonesFromPreset(newProjectForm.milestonePreset, dealVal);
    const initialTerms = createPaymentTermsFromPreset(newProjectForm.milestonePreset, dealVal);
    await updateDeliveryRecord(
      created.id,
      {
        deliveryMilestones: initialMilestones,
        paymentTerms: initialTerms,
      },
      currentUser?.name || "User"
    );

    setIsNewProjectModalOpen(false);
    setSelectedRecordId(created.id);
    setNewProjectForm({
      companyName: "",
      dealValue: 1500000,
      program: "Executive Coaching",
      clientPartner: currentUser?.name || "Sales Lead",
      deliveryLead: "Delivery Team",
      tenureType: "delivery",
      milestonePreset: "three_stage",
    });
  };

  const handleApplyMilestonePreset = async (preset: MilestonePresetType) => {
    if (!selectedRecord) return;
    const newMilestones = createMilestonesFromPreset(
      preset,
      selectedRecord.dealValue,
      selectedRecord.startDate
    );
    const newTerms = createPaymentTermsFromPreset(
      preset,
      selectedRecord.dealValue,
      selectedRecord.startDate
    );

    await updateDeliveryRecord(
      selectedRecord.id,
      {
        deliveryMilestones: newMilestones,
        paymentTerms: newTerms,
      },
      currentUser?.name || "User"
    );
    try {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    } catch {}
  };

  const handleQuickCompleteMilestone = async (milestoneId: string) => {
    if (!selectedRecord) return;
    const currentList = [...selectedRecord.deliveryMilestones];
    const idx = currentList.findIndex((m) => m.id === milestoneId);
    if (idx === -1) return;

    const m = currentList[idx];
    const newStatus: MilestoneCompletionStatus =
      m.milestoneStatus === "completed" ? "in_progress" : "completed";
    const completionDate =
      newStatus === "completed" ? new Date().toISOString().split("T")[0] : undefined;

    currentList[idx] = {
      ...m,
      milestoneStatus: newStatus,
      completionDate,
    };

    let maxCompleted = 0;
    currentList.forEach((item) => {
      if (item.milestoneStatus === "completed") {
        maxCompleted = Math.max(maxCompleted, item.projectCompletionPercent);
      }
    });

    const updates: Partial<DeliveryRecord> = {
      deliveryMilestones: currentList,
      overallCompletionPercent: maxCompleted,
    };

    if (maxCompleted === 100) {
      updates.deliveryStatus = "delivered";
      try {
        confetti({ particleCount: 100, spread: 75, origin: { y: 0.6 } });
      } catch {}
    } else if (maxCompleted > 0 && selectedRecord.deliveryStatus === "not_started") {
      updates.deliveryStatus = "in_progress";
    }

    await updateDeliveryRecord(selectedRecord.id, updates, currentUser?.name || "User");
  };

  const handleRescheduleMilestone = async (milestoneId: string, newDate: string) => {
    if (!selectedRecord || !newDate) return;
    const currentList = [...selectedRecord.deliveryMilestones];
    const idx = currentList.findIndex((m) => m.id === milestoneId);
    if (idx === -1) return;

    currentList[idx] = {
      ...currentList[idx],
      targetDate: newDate,
    };

    await updateDeliveryRecord(
      selectedRecord.id,
      { deliveryMilestones: currentList },
      currentUser?.name || "User"
    );
  };

  const handleUpdateTenureType = async (newType: TenureType) => {
    if (!selectedRecord) return;
    await updateDeliveryRecord(
      selectedRecord.id,
      { tenureType: newType },
      currentUser?.name || "User"
    );
  };

  const handleUpdateDeliveryStatus = async (status: DeliveryOverallStatus) => {
    if (!selectedRecord) return;
    const updates: Partial<DeliveryRecord> = { deliveryStatus: status };
    if (status === "delivered") {
      updates.overallCompletionPercent = 100;
    }
    await updateDeliveryRecord(selectedRecord.id, updates, currentUser?.name || "User");
  };

  const handleUpdateCompletionPercent = async (percent: number) => {
    if (!selectedRecord) return;
    const clamped = Math.max(0, Math.min(100, percent));
    const updates: Partial<DeliveryRecord> = { overallCompletionPercent: clamped };
    if (clamped === 100 && selectedRecord.deliveryStatus !== "delivered") {
      updates.deliveryStatus = "delivered";
    } else if (clamped > 0 && selectedRecord.deliveryStatus === "not_started") {
      updates.deliveryStatus = "in_progress";
    }
    await updateDeliveryRecord(selectedRecord.id, updates, currentUser?.name || "User");
  };

  // Milestone actions for "Delivery" option
  const handleUpdateMilestone = async (
    milestoneId: string,
    updates: Partial<DeliveryMilestoneTranche>
  ) => {
    if (!selectedRecord) return;
    const currentList = [...selectedRecord.deliveryMilestones];
    const idx = currentList.findIndex((m) => m.id === milestoneId);
    if (idx === -1) return;

    const prevMilestone = currentList[idx];
    const updatedMilestone = { ...prevMilestone, ...updates };

    // Strict bidirectional synchronization between status and received date
    if (updates.paymentStatus === "received") {
      if (!updatedMilestone.paymentReceivedDate) {
        updatedMilestone.paymentReceivedDate = updatedMilestone.targetDate || new Date().toISOString().split("T")[0];
      }
    } else if (updates.paymentStatus) {
      delete updatedMilestone.paymentReceivedDate;
      delete updatedMilestone.utrNumber;
    }

    if (updates.paymentReceivedDate) {
      updatedMilestone.paymentStatus = "received";
    }

    // If payment percent changed, recompute amount
    if (updates.paymentPercent !== undefined) {
      updatedMilestone.amount = Math.round(
        selectedRecord.dealValue * (updatedMilestone.paymentPercent / 100)
      );
    }

    currentList[idx] = updatedMilestone;

    // Auto-update overall completion if milestones are completed
    let completedPercent = 0;
    currentList.forEach((m) => {
      if (m.milestoneStatus === "completed") {
        completedPercent = Math.max(completedPercent, m.projectCompletionPercent);
      }
    });

    let deliveryLogs = selectedRecord.deliveryLogs || [];
    if (updates.paymentStatus === "received" && prevMilestone.paymentStatus !== "received") {
      const newLog: DeliveryLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        formattedDate: "Today",
        author: currentUser?.name || "Delivery Lead",
        type: "payment_received",
        message: `${updatedMilestone.milestoneTitle} payment of ${formatINR(updatedMilestone.amount)} received and cleared into bank account.`,
      };
      deliveryLogs = [newLog, ...deliveryLogs];
    }

    const updated = await updateDeliveryRecord(
      selectedRecord.id,
      {
        deliveryMilestones: currentList,
        overallCompletionPercent: Math.max(
          selectedRecord.overallCompletionPercent,
          completedPercent
        ),
        deliveryLogs,
      },
      currentUser?.name || "User"
    );
    if (updated) {
      setDeliveryRecords((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
    }
  };

  const handleAddMilestone = async () => {
    if (!selectedRecord) return;
    const currentList = [...selectedRecord.deliveryMilestones];
    const newMilestone: DeliveryMilestoneTranche = {
      id: `milestone-${Date.now()}`,
      milestoneTitle: `Milestone ${currentList.length + 1}`,
      projectCompletionPercent: Math.min(100, (currentList.length + 1) * 25),
      paymentPercent: 20,
      amount: Math.round(selectedRecord.dealValue * 0.2),
      milestoneStatus: "pending",
      paymentStatus: "pending",
      targetDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      notes: "",
    };

    await updateDeliveryRecord(
      selectedRecord.id,
      { deliveryMilestones: [...currentList, newMilestone] },
      currentUser?.name || "User"
    );
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!selectedRecord) return;
    const filtered = selectedRecord.deliveryMilestones.filter((m) => m.id !== milestoneId);
    await updateDeliveryRecord(
      selectedRecord.id,
      { deliveryMilestones: filtered },
      currentUser?.name || "User"
    );
  };

  // Payment Term actions for "Payment Terms" option
  const handleUpdatePaymentTerm = async (
    termId: string,
    updates: Partial<PaymentTermTranche>
  ) => {
    if (!selectedRecord) return;
    const currentList = [...selectedRecord.paymentTerms];
    const idx = currentList.findIndex((t) => t.id === termId);
    if (idx === -1) return;

    const prevTerm = currentList[idx];
    const updatedTerm = { ...prevTerm, ...updates };

    // Strict bidirectional synchronization between status and received date
    if (updates.paymentStatus === "received") {
      if (!updatedTerm.paymentReceivedDate) {
        updatedTerm.paymentReceivedDate = updatedTerm.dueDate || new Date().toISOString().split("T")[0];
      }
    } else if (updates.paymentStatus) {
      delete updatedTerm.paymentReceivedDate;
      delete updatedTerm.utrNumber;
    }

    if (updates.paymentReceivedDate) {
      updatedTerm.paymentStatus = "received";
    }

    // If payment percent changed, recompute amount
    if (updates.paymentPercent !== undefined) {
      updatedTerm.amount = Math.round(
        selectedRecord.dealValue * (updatedTerm.paymentPercent / 100)
      );
    }

    currentList[idx] = updatedTerm;

    let deliveryLogs = selectedRecord.deliveryLogs || [];
    if (updates.paymentStatus === "received" && prevTerm.paymentStatus !== "received") {
      const newLog: DeliveryLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        formattedDate: "Today",
        author: currentUser?.name || "Client Partner",
        type: "payment_received",
        message: `${updatedTerm.termLabel} payment of ${formatINR(updatedTerm.amount)} received and cleared into bank account.`,
      };
      deliveryLogs = [newLog, ...deliveryLogs];
    }

    const updated = await updateDeliveryRecord(
      selectedRecord.id,
      { paymentTerms: currentList, deliveryLogs },
      currentUser?.name || "User"
    );
    if (updated) {
      setDeliveryRecords((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
    }
  };

  const handleAddPaymentTerm = async () => {
    if (!selectedRecord) return;
    const currentList = [...selectedRecord.paymentTerms];
    const newTerm: PaymentTermTranche = {
      id: `term-${Date.now()}`,
      termLabel: `Installment ${currentList.length}`,
      isAdvance: false,
      timeframe: `After ${(currentList.length) * 3} Months`,
      paymentPercent: 20,
      amount: Math.round(selectedRecord.dealValue * 0.2),
      dueDate: new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0],
      paymentStatus: "pending",
      notes: "",
    };

    await updateDeliveryRecord(
      selectedRecord.id,
      { paymentTerms: [...currentList, newTerm] },
      currentUser?.name || "User"
    );
  };

  const handleDeletePaymentTerm = async (termId: string) => {
    if (!selectedRecord) return;
    const filtered = selectedRecord.paymentTerms.filter((t) => t.id !== termId);
    await updateDeliveryRecord(
      selectedRecord.id,
      { paymentTerms: filtered },
      currentUser?.name || "User"
    );
  };

  const handleRequestDelete = (record: DeliveryRecord) => {
    if (!isAdmin && currentUser && !isRecordOwnedByUser(record, currentUser)) {
      return;
    }
    setProjectToDelete(record);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    if (!isAdmin && currentUser && !isRecordOwnedByUser(projectToDelete, currentUser)) {
      setProjectToDelete(null);
      return;
    }
    const targetId = projectToDelete.id;

    // Immediately update local state for instantaneous feedback
    setDeliveryRecords((prev) => prev.filter((r) => r.id !== targetId));
    if (selectedRecordId === targetId) {
      setSelectedRecordId(null);
    }
    setProjectToDelete(null);

    // Persist to storage & Firestore
    await deleteDeliveryRecord(targetId);
  };

  // Compute selected project's milestone / tenure summaries
  const selectedRecordStats = useMemo(() => {
    if (!selectedRecord) return null;

    let totalAllocatedPercent = 0;
    let totalAllocatedAmount = 0;
    let totalReceivedAmount = 0;
    let totalInvoicedAmount = 0;
    let completedMilestonesCount = 0;

    const processMilestone = (m: DeliveryMilestoneTranche) => {
      totalAllocatedPercent += m.paymentPercent || 0;
      totalAllocatedAmount += m.amount || 0;
      if (m.paymentStatus === "received") {
        totalReceivedAmount += m.amount || 0;
        totalInvoicedAmount += m.amount || 0;
      } else if (m.paymentStatus === "invoiced" || m.invoiceNumber) {
        totalInvoicedAmount += m.amount || 0;
      }
      if (m.milestoneStatus === "completed") {
        completedMilestonesCount++;
      }
    };

    const processTerm = (t: PaymentTermTranche) => {
      totalAllocatedPercent += t.paymentPercent || 0;
      totalAllocatedAmount += t.amount || 0;
      if (t.paymentStatus === "received") {
        totalReceivedAmount += t.amount || 0;
        totalInvoicedAmount += t.amount || 0;
      } else if (t.paymentStatus === "invoiced" || t.invoiceNumber) {
        totalInvoicedAmount += t.amount || 0;
      }
    };

    if (selectedRecord.tenureType === "delivery") {
      (selectedRecord.deliveryMilestones || []).forEach(processMilestone);
    } else if (selectedRecord.tenureType === "payment_terms") {
      (selectedRecord.paymentTerms || []).forEach(processTerm);
    } else {
      // Contract: Combination of Delivery Milestones and Payment Terms
      (selectedRecord.deliveryMilestones || []).forEach(processMilestone);
      (selectedRecord.paymentTerms || []).forEach(processTerm);
    }

    const pendingAmount = Math.max(0, selectedRecord.dealValue - totalReceivedAmount);
    const invoicedPendingAmount = Math.max(0, totalInvoicedAmount - totalReceivedAmount);
    const unbilledAmount = Math.max(0, selectedRecord.dealValue - totalInvoicedAmount);
    const percentReceived =
      selectedRecord.dealValue > 0
        ? Math.round((totalReceivedAmount / selectedRecord.dealValue) * 100)
        : 0;
    const percentInvoiced =
      selectedRecord.dealValue > 0
        ? Math.round((totalInvoicedAmount / selectedRecord.dealValue) * 100)
        : 0;

    return {
      totalAllocatedPercent,
      totalAllocatedAmount,
      totalReceivedAmount,
      totalInvoicedAmount,
      invoicedPendingAmount,
      unbilledAmount,
      pendingAmount,
      percentReceived,
      percentInvoiced,
      completedMilestonesCount,
    };
  }, [selectedRecord]);

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Top Banner & Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-xl text-white shadow-md shadow-indigo-500/20">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2 flex-wrap gap-y-1">
                  <span>Delivery & Execution Hub</span>
                  {isAdmin ? (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center space-x-1 shadow-2xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>Executive Admin • All Client Partners ({accessibleDeliveryRecords.length})</span>
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center space-x-1 shadow-2xs">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Client Partner: {currentUser?.name || "My Deliveries"} ({accessibleDeliveryRecords.length})</span>
                    </span>
                  )}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  {isAdmin
                    ? "Admin overview: Full visibility and control across all client partner delivery projects, milestone payouts, and financial terms."
                    : `Client partner view for ${currentUser?.name || "you"}: Track and fulfill your assigned delivery projects, completion milestones, and payment terms.`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <SpringButton
              variant="gradient"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center space-x-2 shadow-md shadow-indigo-500/20"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Import Won Deal from Closure</span>
              <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-md text-[10px]">
                {closureLeads.length} Available
              </span>
            </SpringButton>

            <SpringButton
              variant="secondary"
              onClick={() => setIsNewProjectModalOpen(true)}
              className="flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </SpringButton>
          </div>
        </div>

        {/* Clean 4 Top-Level KPI Pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <SpringWidget
            delay={0}
            className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200/60 dark:border-indigo-900/50"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">
                Active Deliveries
              </span>
              <Truck className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
              <span>{metrics.activeCount}</span>
              <span className="text-xs font-bold text-slate-400 ml-1.5">projects</span>
            </div>
            <div className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80 mt-0.5">
              {formatINR(metrics.totalPortfolio)} Total Portfolio
            </div>
          </SpringWidget>

          <SpringWidget
            delay={70}
            className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/60 dark:border-emerald-900/50"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                On Track %
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
              <span>{metrics.onTrackPercent}%</span>
            </div>
            <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
              {metrics.onTrackCount} on schedule execution
            </div>
          </SpringWidget>

          <SpringWidget
            delay={140}
            className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 dark:border-blue-900/50"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider block">
                Invoiced This Month
              </span>
              <Receipt className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-xl font-black text-blue-700 dark:text-blue-300 mt-1">
              <SpringCounter
                value={metrics.invoicedThisMonth > 0 ? metrics.invoicedThisMonth : metrics.totalInvoiced}
                isCurrency
              />
            </div>
            <div className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">
              {metrics.invoicingRate.toFixed(1)}% total portfolio realization
            </div>
          </SpringWidget>

          <SpringWidget
            delay={210}
            className="p-3.5 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-900/50"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                Pending Sign-offs
              </span>
              <Award className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-black text-amber-700 dark:text-amber-300 mt-1">
              <span>{metrics.pendingSignoffs}</span>
              <span className="text-xs font-bold text-slate-400 ml-1.5">awaiting pulse</span>
            </div>
            <div className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
              {metrics.deliveredCount} delivered engagements
            </div>
          </SpringWidget>
        </div>

        {/* Admin Collapsible Executive CFO Analytics Trigger Bar */}
        {isAdmin && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsAnalyticsExpanded(!isAnalyticsExpanded)}
              className="flex items-center space-x-2.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-750 text-xs font-bold text-slate-700 dark:text-slate-200 transition shadow-2xs cursor-pointer self-start sm:self-center"
            >
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              <span>Executive CFO Analytics & Risk Radar</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-black transition ${
                  isAnalyticsExpanded
                    ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                {isAnalyticsExpanded ? "Hide Reports ▲" : "Expand 5 Reports ▼"}
              </span>
            </button>
            <span className="text-[11px] text-slate-400">
              {isAnalyticsExpanded
                ? "Full revenue realization, owner matrix, month-wise trends, and delivery radar"
                : "Progressive disclosure • Collapsed by default to keep the workspace clean"}
            </span>
          </div>
        )}

        {/* ========================================================= */}
        {/* EXECUTIVE PAYMENTS & REVENUE ANALYTICS PANEL (COLLAPSED BY DEFAULT) */}
        {/* ========================================================= */}
        {isAdmin && isAnalyticsExpanded && (
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400 shadow-sm">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center flex-wrap gap-1.5">
                  <span>
                    {isAdmin
                      ? "Executive Revenue Insights & Portfolio Matrix"
                      : "My Delivery Revenue & Portfolio Matrix"}
                  </span>
                  {isAdmin && selectedOwnerFilter !== "all" && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 inline-flex items-center space-x-1">
                      <span>Owner: {selectedOwnerFilter}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedOwnerFilter("all")}
                        className="hover:text-rose-600 transition cursor-pointer"
                        title="Clear owner filter"
                      >
                        <X className="w-2.5 h-2.5 ml-0.5" />
                      </button>
                    </span>
                  )}
                  {selectedMonthFilter !== "all" && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 inline-flex items-center space-x-1">
                      <span>Month: {selectedMonthFilter}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedMonthFilter("all")}
                        className="hover:text-rose-600 transition cursor-pointer"
                        title="Clear month filter"
                      >
                        <X className="w-2.5 h-2.5 ml-0.5" />
                      </button>
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isAdmin
                    ? "Comprehensive lead owner portfolio breakdown across all client partners, invoiced & unbilled portfolio, and month-wise revenue trajectory."
                    : "Performance breakdown of your assigned accounts, invoiced milestones, and pending completion milestones."}
                </p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              {/* Admin Month Filter Dropdown in Executive Analytics Header */}
              {isAdmin && (
                <div
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                    selectedMonthFilter !== "all"
                      ? "bg-indigo-50 dark:bg-indigo-950/70 border-indigo-400 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Month:</span>
                  <select
                    value={selectedMonthFilter}
                    onChange={(e) => setSelectedMonthFilter(e.target.value)}
                    className="bg-transparent font-black outline-none cursor-pointer text-xs"
                    title="Filter revenue analytics & projects by Month"
                  >
                    <option value="all">All Months ({monthWiseRevenueList.length})</option>
                    {monthWiseRevenueList.map((m) => (
                      <option key={m.monthKey} value={m.monthKey} className="text-slate-900 bg-white dark:bg-slate-900">
                        {m.monthKey} ({m.accountsCount} {m.accountsCount === 1 ? "project" : "projects"})
                      </option>
                    ))}
                  </select>
                  {selectedMonthFilter !== "all" && (
                    <button
                      type="button"
                      onClick={() => setSelectedMonthFilter("all")}
                      className="p-0.5 text-slate-400 hover:text-rose-500 rounded transition cursor-pointer"
                      title="Clear month filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Admin Lead Owner Filter Dropdown in Executive Analytics Header */}
              {isAdmin && (
                <div
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                    selectedOwnerFilter !== "all"
                      ? "bg-indigo-50 dark:bg-indigo-950/70 border-indigo-400 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Lead Owner:</span>
                  <select
                    value={selectedOwnerFilter}
                    onChange={(e) => setSelectedOwnerFilter(e.target.value)}
                    className="bg-transparent font-black outline-none cursor-pointer text-xs"
                    title="Filter revenue analytics & projects by Lead Owner"
                  >
                    <option value="all">All Lead Owners ({allLeadOwnersList.length})</option>
                    {allLeadOwnersList.map((o) => (
                      <option key={o.owner} value={o.owner} className="text-slate-900 bg-white dark:bg-slate-900">
                        {o.owner} ({o.accountsCount} {o.accountsCount === 1 ? "project" : "projects"})
                      </option>
                    ))}
                  </select>
                  {selectedOwnerFilter !== "all" && (
                    <button
                      type="button"
                      onClick={() => setSelectedOwnerFilter("all")}
                      className="p-0.5 text-slate-400 hover:text-rose-500 rounded transition cursor-pointer"
                      title="Clear lead owner filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Tab Selector Buttons */}
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs font-bold overflow-x-auto scrollbar-thin">
                <button
                  type="button"
                  onClick={() => {
                    setHeaderAnalyticsTab("realization_report");
                    setIsAnalyticsExpanded(true);
                  }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                    headerAnalyticsTab === "realization_report" && isAnalyticsExpanded
                      ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Invoicing Report</span>
                  <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                    {realizationRecords.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHeaderAnalyticsTab("owner_matrix");
                    setIsAnalyticsExpanded(true);
                  }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                    headerAnalyticsTab === "owner_matrix" && isAnalyticsExpanded
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{isAdmin ? "Lead Owner Matrix" : "My Portfolio Matrix"}</span>
                  <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700">
                    {ownerPerformanceList.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHeaderAnalyticsTab("month_wise");
                    setIsAnalyticsExpanded(true);
                  }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    headerAnalyticsTab === "month_wise" && isAnalyticsExpanded
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Month-Wise Revenue</span>
                  <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700">
                    {monthWiseRevenueList.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHeaderAnalyticsTab("payment_insights");
                    setIsAnalyticsExpanded(true);
                  }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    headerAnalyticsTab === "payment_insights" && isAnalyticsExpanded
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Payment Insights</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHeaderAnalyticsTab("risk_radar");
                    setIsAnalyticsExpanded(true);
                  }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    headerAnalyticsTab === "risk_radar" && isAnalyticsExpanded
                      ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Risk & Aging Radar</span>
                  {agingReceivablesSummary.totalOverdueAmount > 0 && (
                    <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                      {agingReceivablesSummary.under30Days.count +
                        agingReceivablesSummary.days30to60.count +
                        agingReceivablesSummary.days60Plus.count}
                    </span>
                  )}
                </button>
              </div>

              {/* CSV Export Actions */}
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={handleExportPortfolioCSV}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                  title="Export complete delivery portfolio dataset to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="hidden sm:inline">Export Portfolio</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportMatrixCSV}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                  title="Export executive revenue matrix to CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="hidden sm:inline">Export Matrix</span>
                </button>
              </div>

              {/* Collapse / Expand Toggle */}
              <button
                type="button"
                onClick={() => setIsAnalyticsExpanded(!isAnalyticsExpanded)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:bg-slate-800 rounded-lg transition cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                title={isAnalyticsExpanded ? "Collapse Analytics Panel" : "Expand Analytics Panel"}
              >
                {isAnalyticsExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Collapsible Content Panels */}
          {isAnalyticsExpanded && (
            <div className="pt-2">
              {/* TAB 0: FINANCIAL REALIZATION REPORT TABLE */}
              {headerAnalyticsTab === "realization_report" && (
                <div className="space-y-3">
                  <DeliveryFinancialRealizationTable
                    records={realizationRecords}
                    allLeads={allLeads}
                    onSelectRecord={handleSelectRecord}
                    title={
                      selectedMonthFilter !== "all" && selectedOwnerFilter !== "all"
                        ? `DELIVERY ACCOUNTS & INVOICING TABLE (${selectedMonthFilter.toUpperCase()} • ${selectedOwnerFilter.toUpperCase()})`
                        : selectedMonthFilter !== "all"
                        ? `DELIVERY ACCOUNTS & INVOICING TABLE (${selectedMonthFilter.toUpperCase()})`
                        : selectedOwnerFilter !== "all"
                        ? `DELIVERY ACCOUNTS & INVOICING TABLE (${selectedOwnerFilter.toUpperCase()})`
                        : "DELIVERY ACCOUNTS & INVOICING TABLE"
                    }
                    activeRecordId={selectedRecordId}
                    selectedMonthFilter={selectedMonthFilter}
                  />
                </div>
              )}

              {/* TAB 1: LEAD OWNER PERFORMANCE MATRIX (TABULAR DATA) */}
              {headerAnalyticsTab === "owner_matrix" && (
                <div className="space-y-3">
                  {selectedMonthFilter !== "all" && (
                    <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-xs shadow-2xs">
                      <div className="flex items-center space-x-2 text-indigo-800 dark:text-indigo-300">
                        <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span>
                          Showing lead owner breakdown for <strong>{selectedMonthFilter}</strong> ({recordsForAnalytics.length} accounts, {formatINR(ownerPerformanceTotals.totalMoney)} contracted)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedMonthFilter("all")}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer"
                      >
                        <span>Show All Months</span>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <th className="py-3 px-4">Lead Owner</th>
                          <th className="py-3 px-4">Accounts Under Owner</th>
                          <th className="py-3 px-4">Project Cost</th>
                          <th className="py-3 px-4">Total Invoiced</th>
                          <th className="py-3 px-4">Unbilled Book</th>
                          <th className="py-3 px-4">Invoicing Rate</th>
                          <th className="py-3 px-4">Avg Deal Size</th>
                          <th className="py-3 px-4">Tenure Mix</th>
                          <th className="py-3 px-4 text-right">Filter Projects</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {ownerPerformanceList.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-slate-400">
                              No delivery accounts found for {selectedMonthFilter !== "all" ? selectedMonthFilter : "assigned lead owners"}.
                              {selectedMonthFilter !== "all" && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedMonthFilter("all")}
                                  className="ml-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                >
                                  View all months
                                </button>
                              )}
                            </td>
                          </tr>
                        ) : (
                          ownerPerformanceList.map((item) => {
                            const profile = getUserProfile(item.owner);
                            const isCurrentFilter =
                              selectedOwnerFilter.toLowerCase() === item.owner.toLowerCase();

                            return (
                              <tr
                                key={item.owner}
                                className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition ${
                                  isCurrentFilter ? "bg-indigo-50/70 dark:bg-indigo-950/40" : ""
                                }`}
                              >
                                {/* Lead Owner */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center space-x-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                                      {item.owner.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="font-black text-slate-900 dark:text-white text-xs">
                                        {item.owner}
                                      </div>
                                      <div className="text-[10px] text-slate-400">
                                        {profile.designation || profile.role || "Client Partner"}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Accounts Under Owner */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center space-x-1.5">
                                    <span className="font-black text-slate-900 dark:text-white">
                                      {item.accountsCount}
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                      account{item.accountsCount !== 1 ? "s" : ""}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5 space-x-1">
                                    {item.inProgressCount > 0 && (
                                      <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                        {item.inProgressCount} active
                                      </span>
                                    )}
                                    {item.deliveredCount > 0 && (
                                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                        • {item.deliveredCount} delivered
                                      </span>
                                    )}
                                    {item.notStartedCount > 0 && (
                                      <span className="text-slate-400">
                                        • {item.notStartedCount} queued
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Project Cost */}
                                <td className="py-3 px-4 font-black text-slate-900 dark:text-white whitespace-nowrap">
                                  {formatINR(item.totalMoney)}
                                </td>

                                {/* Total Invoiced */}
                                <td className="py-3 px-4 font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                                  {formatINR(item.invoicedMoney)}
                                </td>

                                {/* Unbilled Book */}
                                <td className="py-3 px-4 font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                  {formatINR(item.remainingMoney)}
                                </td>

                                {/* Invoicing Rate */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden shrink-0">
                                      <div
                                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
                                        style={{ width: `${Math.min(100, item.invoicingRate)}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                                      {item.invoicingRate.toFixed(0)}%
                                    </span>
                                  </div>
                                </td>

                                {/* Avg Deal Size */}
                                <td className="py-3 px-4 font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                  {formatINR(item.avgDealSize)}
                                </td>

                                {/* Tenure Mix */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {item.deliveryTenureCount > 0 && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                                        {item.deliveryTenureCount} Milestone
                                      </span>
                                    )}
                                    {item.contractTenureCount > 0 && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                                        {item.contractTenureCount} Contract
                                      </span>
                                    )}
                                    {item.paymentTermsTenureCount > 0 && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/60">
                                        {item.paymentTermsTenureCount} Schedule
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Filter Projects Action */}
                                <td className="py-3 px-4 text-right">
                                  {isCurrentFilter ? (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedOwnerFilter("all")}
                                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition cursor-pointer inline-flex items-center space-x-1"
                                      title="Currently active filter. Click to reset."
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>Active Filter</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedOwnerFilter(item.owner);
                                        const tableElement = document.getElementById("delivery-projects-table");
                                        if (tableElement) {
                                          tableElement.scrollIntoView({ behavior: "smooth" });
                                        }
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950 text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 font-bold text-xs transition cursor-pointer"
                                      title={`Filter delivery table to show accounts under ${item.owner}`}
                                    >
                                      Filter Table
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {/* Summary Totals Row */}
                      {ownerPerformanceList.length > 0 && (
                        <tfoot>
                          <tr className="border-t-2 border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-800/90 font-black text-slate-900 dark:text-white">
                            <td className="py-3 px-4 text-xs">
                              TOTAL ({ownerPerformanceList.length} Owners)
                              {selectedMonthFilter !== "all" && (
                                <span className="block text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                                  {selectedMonthFilter}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs">
                              {ownerPerformanceTotals.accounts} Accounts
                            </td>
                            <td className="py-3 px-4 text-xs whitespace-nowrap">
                              {formatINR(ownerPerformanceTotals.totalMoney)}
                            </td>
                            <td className="py-3 px-4 text-xs text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                              {formatINR(ownerPerformanceTotals.invoicedMoney)}
                            </td>
                            <td className="py-3 px-4 text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap">
                              {formatINR(ownerPerformanceTotals.remainingMoney)}
                            </td>
                            <td className="py-3 px-4 text-xs">
                              {ownerPerformanceTotals.invoicingRate.toFixed(1)}% Invoiced
                            </td>
                            <td className="py-3 px-4 text-xs whitespace-nowrap">
                              {formatINR(ownerPerformanceTotals.avgDealSize)}
                            </td>
                            <td className="py-3 px-4 text-[10px] text-slate-500 dark:text-slate-400">
                              {selectedMonthFilter !== "all" ? selectedMonthFilter : "Team Portfolio"}
                            </td>
                            <td className="py-3 px-4 text-right space-x-2">
                              {selectedOwnerFilter !== "all" && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedOwnerFilter("all")}
                                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
                                >
                                  Reset Owner
                                </button>
                              )}
                              {selectedMonthFilter !== "all" && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedMonthFilter("all")}
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                                >
                                  Reset Month
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

              {/* TAB 2: MONTH-WISE REVENUE & INFLOW */}
              {headerAnalyticsTab === "month_wise" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                    {monthWiseRevenueList.length === 0 ? (
                      <div className="col-span-full py-8 text-center text-slate-400">
                        No monthly revenue data available.
                      </div>
                    ) : (
                      monthWiseRevenueList.map((m) => {
                        const isCurrentMonthFilter =
                          selectedMonthFilter.toLowerCase() === m.monthKey.toLowerCase();

                        return (
                          <div
                            key={m.monthKey}
                            className={`p-4 rounded-xl border transition shadow-sm space-y-3 ${
                              isCurrentMonthFilter
                                ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20"
                                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-slate-300 dark:hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-indigo-500" />
                                <h5 className="font-black text-slate-900 dark:text-white text-sm">
                                  {m.monthKey}
                                </h5>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {m.accountsCount} project{m.accountsCount !== 1 ? "s" : ""}
                              </span>
                            </div>

                            <div className="space-y-1.5 text-xs">
                              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                                <span>Total Contracted:</span>
                                <strong className="text-slate-900 dark:text-white">
                                  {formatINR(m.totalMoney)}
                                </strong>
                              </div>
                              <div className="flex justify-between items-center text-indigo-600 dark:text-indigo-400">
                                <span>Invoiced Amount:</span>
                                <strong>{formatINR(m.invoicedMoney)}</strong>
                              </div>
                              <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
                                <span>Unbilled Book:</span>
                                <strong>{formatINR(m.remainingMoney)}</strong>
                              </div>
                            </div>

                            <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-slate-400">Invoicing Rate</span>
                                <strong className="text-slate-700 dark:text-slate-300">
                                  {m.invoicingRate.toFixed(0)}%
                                </strong>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400"
                                  style={{ width: `${Math.min(100, m.invoicingRate)}%` }}
                                />
                              </div>
                            </div>

                            {/* Action Button: Filter Table by this Month */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                              {isCurrentMonthFilter ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedMonthFilter("all")}
                                  className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
                                  title="Active month filter. Click to show all months."
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Active Month Filter</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedMonthFilter(m.monthKey);
                                    const tableElement = document.getElementById("delivery-projects-table");
                                    if (tableElement) {
                                      tableElement.scrollIntoView({ behavior: "smooth" });
                                    }
                                  }}
                                  className="w-full py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950 text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 font-bold text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
                                  title={`Filter table and matrix for ${m.monthKey}`}
                                >
                                  <Filter className="w-3.5 h-3.5" />
                                  <span>Filter by this Month</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: INVOICING INSIGHTS & TENURE MODELS */}
              {headerAnalyticsTab === "payment_insights" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Delivery Milestone Model Card */}
                  <div className="p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Truck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <h4 className="font-black text-slate-900 dark:text-white text-sm">
                          Delivery (Milestones)
                        </h4>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                        {tenureModelInsights.delivery.accounts} projects
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Payment tranches triggered strictly when operational milestones (20%, 50%, 100%) reach completion.
                    </p>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/50 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Portfolio</span>
                        <strong className="text-slate-900 dark:text-white">
                          {formatINR(tenureModelInsights.delivery.totalMoney)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block">Invoiced Book</span>
                        <strong className="text-indigo-600 dark:text-indigo-400">
                          {formatINR(tenureModelInsights.delivery.invoicedMoney)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-600 block">Unbilled Balance</span>
                        <strong className="text-amber-600 dark:text-amber-400">
                          {formatINR(tenureModelInsights.delivery.unbilledMoney)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Payment Terms Schedule Model Card */}
                  <div className="p-4 rounded-xl border border-purple-200/80 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <h4 className="font-black text-slate-900 dark:text-white text-sm">
                          Payment Terms (Schedule)
                        </h4>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                        {tenureModelInsights.paymentTerms.accounts} projects
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Scheduled calendar milestones with advance signing deposits (e.g., 30% upfront, remaining quarterly).
                    </p>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-purple-100 dark:border-purple-900/50 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Portfolio</span>
                        <strong className="text-slate-900 dark:text-white">
                          {formatINR(tenureModelInsights.paymentTerms.totalMoney)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block">Invoiced Book</span>
                        <strong className="text-indigo-600 dark:text-indigo-400">
                          {formatINR(tenureModelInsights.paymentTerms.invoicedMoney)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-600 block">Unbilled Balance</span>
                        <strong className="text-amber-600 dark:text-amber-400">
                          {formatINR(tenureModelInsights.paymentTerms.unbilledMoney)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Contract Hybrid Model Card */}
                  <div className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <h4 className="font-black text-slate-900 dark:text-white text-sm">
                          Contract (Hybrid Model)
                        </h4>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                        {tenureModelInsights.contract.accounts} projects
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Master contract combining advance mobilization deposits with progress-linked delivery milestone payouts.
                    </p>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-100 dark:border-emerald-900/50 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Portfolio</span>
                        <strong className="text-slate-900 dark:text-white">
                          {formatINR(tenureModelInsights.contract.totalMoney)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block">Invoiced Book</span>
                        <strong className="text-indigo-600 dark:text-indigo-400">
                          {formatINR(tenureModelInsights.contract.invoicedMoney)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-600 block">Unbilled Balance</span>
                        <strong className="text-amber-600 dark:text-amber-400">
                          {formatINR(tenureModelInsights.contract.unbilledMoney)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: AGING RECEIVABLES & DELIVERY RISK RADAR */}
              {headerAnalyticsTab === "risk_radar" && (
                <DeliveryRiskRadar
                  records={realizationRecords}
                  agingSummary={agingReceivablesSummary}
                  healthSummary={deliveryHealthSummary}
                  onSelectRecord={handleSelectRecord}
                  selectedMonthFilter={selectedMonthFilter}
                />
              )}
            </div>
          )}
        </div>
        )}
      </div>

      {/* DETAILED PROJECT DELIVERY & TENURE MANAGER (When a project is selected) */}
      {selectedRecord && (
        <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500/40 dark:border-indigo-500/30 rounded-2xl p-6 shadow-xl space-y-6 relative">
          {/* Top banner of selected project */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-200 dark:border-slate-800 gap-4">
            <div className="flex items-start space-x-3.5">
              {effectivePipelineData?.companyLogo ? (
                <img
                  src={effectivePipelineData.companyLogo}
                  alt={selectedRecord.companyName}
                  className="w-14 h-14 rounded-2xl object-contain bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-800/60 p-1 shadow-sm shrink-0 mt-1"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border-2 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-black text-xl flex items-center justify-center shadow-sm shrink-0 mt-1">
                  {selectedRecord.companyName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setSelectedRecordId(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition"
                    title="Close project view"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-md">
                    Active Delivery Management
                  </span>
                  <span className="text-xs text-slate-400">• ID: {selectedRecord.id}</span>
                  {matchingLead && (
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>Synced with Pipeline Lead</span>
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1 flex items-center space-x-2">
                  <span>{selectedRecord.companyName}</span>
                  <span className="text-sm font-bold text-slate-400">({selectedRecord.program})</span>
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span>Owner: <strong className="text-slate-700 dark:text-slate-200">{selectedRecord.clientPartner}</strong></span>
                  <span>Delivery Lead: <strong className="text-slate-700 dark:text-slate-200">{selectedRecord.deliveryLead || "Unassigned"}</strong></span>
                  <span>Value: <strong className="text-indigo-600 dark:text-indigo-400">{formatINR(selectedRecord.dealValue)}</strong></span>
                  {effectivePipelineData?.contactName && (
                    <span>Primary Contact: <strong className="text-slate-700 dark:text-slate-200">{effectivePipelineData.contactName} ({effectivePipelineData.designation})</strong></span>
                  )}
                </div>
              </div>
            </div>

            {/* Delivery Status, Project Health & Progress Controls */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Delivery Status
                </label>
                <select
                  value={selectedRecord.deliveryStatus}
                  onChange={(e) => handleUpdateDeliveryStatus(e.target.value as DeliveryOverallStatus)}
                  className="mt-1 text-xs font-black rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="not_started">⚪ Not Started</option>
                  <option value="in_progress">🔵 In Progress</option>
                  <option value="delivered">🟢 Delivered (Done)</option>
                  <option value="on_hold">🟡 On Hold</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Health & Radar
                </label>
                <select
                  value={selectedRecord.projectHealth || "on_track"}
                  onChange={(e) => handleUpdateProjectHealth(e.target.value as ProjectHealthStatus)}
                  className="mt-1 text-xs font-black rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="on_track">🟢 On Track</option>
                  <option value="at_risk">🟡 At Risk</option>
                  <option value="stalled">🔴 Stalled / Blocked</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Project Completion
                </label>
                <div className="flex items-center space-x-2 mt-1">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={selectedRecord.overallCompletionPercent}
                    onChange={(e) => handleUpdateCompletionPercent(Number(e.target.value))}
                    className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 w-10 text-right">
                    {selectedRecord.overallCompletionPercent}%
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleRequestDelete(selectedRecord)}
                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition ml-2 cursor-pointer"
                title="Delete this delivery project"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Blockers alert if project is At Risk or Stalled */}
          {(selectedRecord.projectHealth === "at_risk" ||
            selectedRecord.projectHealth === "stalled" ||
            selectedRecord.healthBlocker) && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-xl flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Delivery Blocker Log:</span>
              </div>
              <input
                type="text"
                defaultValue={selectedRecord.healthBlocker || ""}
                placeholder="Log blocker details (e.g., Awaiting cohort availability, pending sign-off)..."
                onBlur={(e) =>
                  handleUpdateProjectHealth(
                    selectedRecord.projectHealth || "at_risk",
                    e.target.value
                  )
                }
                className="flex-1 px-3 py-1 text-xs rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}

          {/* Project Work Completion Currency Note Progress Bar */}
          <ProjectProgressBar
            percent={selectedRecord.overallCompletionPercent}
            onPercentChange={handleUpdateCompletionPercent}
            title={`${selectedRecord.companyName} — Execution Progress`}
            subtitle="Interactive delivery progress bar featuring project milestone runway & deliverable completion"
            showControls={true}
            editable={true}
          />

          {/* Executive Financial Parameters Strip */}
          {selectedRecordStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gradient-to-r from-slate-50 via-emerald-50/20 to-indigo-50/20 dark:from-slate-800/40 dark:via-emerald-950/20 dark:to-indigo-950/20 rounded-xl border border-indigo-200/50 dark:border-indigo-900/50 shadow-2xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                  Contract Value
                </span>
                <div className="text-base font-black text-slate-900 dark:text-white">
                  {formatINR(selectedRecord.dealValue)}
                </div>
                <span className="text-[10px] text-slate-500 font-medium">Total Deal Size</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400 block tracking-wider">
                  Total Invoiced
                </span>
                <div className="text-base font-black text-indigo-700 dark:text-indigo-300">
                  {formatINR(selectedRecordStats.totalInvoicedAmount)}
                </div>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedRecordStats.percentInvoiced}% Invoiced of Contract
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 block tracking-wider">
                  Unbilled / Scheduled
                </span>
                <div className="text-base font-black text-amber-700 dark:text-amber-300">
                  {formatINR(selectedRecordStats.unbilledAmount)}
                </div>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  {formatINR(selectedRecordStats.unbilledAmount)} Remaining to Invoice
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block tracking-wider">
                  Milestone Progress
                </span>
                <div className="text-base font-black text-emerald-700 dark:text-emerald-300">
                  {selectedRecord.overallCompletionPercent}% Delivered
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {selectedRecordStats.completedMilestonesCount} Milestones Completed
                </span>
              </div>
            </div>
          )}

          {/* Sub-navigation: 2 Main Operational Views + Dossier */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 pb-1 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setProjectSubTab("delivery_coaching")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
                  projectSubTab === "delivery_coaching" || projectSubTab === "tenure"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Truck className="w-4 h-4 text-indigo-500" />
                <span>🎯 Delivery & Coaching</span>
              </button>

              <button
                type="button"
                onClick={() => setProjectSubTab("billing_invoices")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
                  projectSubTab === "billing_invoices"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Receipt className="w-4 h-4 text-indigo-500" />
                <span>💳 Billing & Invoices</span>
              </button>

              <button
                type="button"
                onClick={() => setProjectSubTab("dossier")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
                  projectSubTab === "dossier" ||
                  projectSubTab === "pipeline_data" ||
                  projectSubTab === "coaches" ||
                  projectSubTab === "signoff"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <FolderOpen className="w-4 h-4 text-indigo-500" />
                <span>📋 Dossier & Details</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAiImportModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/20 transition cursor-pointer"
                title="Add & generate tenure schedule via Gemini AI (Upload PDF/DOCX)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>✨ Add via AI</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSharePortalModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Generate tokenized read-only link for client sponsor"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Client Portal Link</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSignoffModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Client formal acceptance sign-off & CSAT pulse"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Sign-off / CSAT</span>
              </button>

              {matchingLead && onSelectLead && (
                <button
                  type="button"
                  onClick={() => onSelectLead(matchingLead)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-xl text-xs font-bold transition cursor-pointer"
                  title="Open the complete pipeline lead modal"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Lead</span>
                </button>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* TAB A: DELIVERY & COACHING (For Program Leads & Coaches) */}
          {/* ========================================================= */}
          {(projectSubTab === "delivery_coaching" || projectSubTab === "tenure") && (
            <div className="space-y-5 pt-1 animate-fadeIn">
              {/* 1. Hero Next Required Action Card */}
              <DeliveryNextActionCard
                record={selectedRecord}
                onMarkMilestoneCompleted={handleQuickCompleteMilestone}
                onRescheduleMilestone={handleRescheduleMilestone}
                onOpenCoachDrawer={() => setProjectSubTab("coaches")}
                onOpenSignoffModal={() => setIsSignoffModalOpen(true)}
              />

              {/* 2. Interactive Delivery Phase Stepper & Runway */}
              <DeliveryPhaseStepper
                milestones={selectedRecord.deliveryMilestones}
                onToggleMilestoneStatus={handleQuickCompleteMilestone}
              />

              {/* 3. 1-Click Milestone Presets (Eliminate the Math) */}
              <div className="p-4 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-slate-50 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-800/80 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        1-Click Milestone Presets (Eliminate the Math)
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Instantly structures delivery phases and calculates exact rupee amounts from deal size ({formatINR(selectedRecord.dealValue)}).
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/80 px-2 py-0.5 rounded-full shrink-0">
                    Auto-Calculates ₹
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {/* 3-Stage Delivery */}
                  <button
                    type="button"
                    onClick={() => handleApplyMilestonePreset("three_stage")}
                    className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/50 text-left transition group cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 dark:text-white group-hover:text-indigo-600">
                        3-Stage Delivery
                      </span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        30 - 40 - 30
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                      Kickoff & Discovery → Mid Execution → Final Sign-off
                    </p>
                    <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-1.5">
                      {formatINR(selectedRecord.dealValue * 0.3)} • {formatINR(selectedRecord.dealValue * 0.4)} • {formatINR(selectedRecord.dealValue * 0.3)}
                    </div>
                  </button>

                  {/* 50 / 50 Standard */}
                  <button
                    type="button"
                    onClick={() => handleApplyMilestonePreset("fifty_fifty")}
                    className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/50 text-left transition group cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 dark:text-white group-hover:text-indigo-600">
                        50 / 50 Standard
                      </span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        50% / 50%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                      50% Advance on Agreement → 50% on Project Completion
                    </p>
                    <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-1.5">
                      2 x {formatINR(selectedRecord.dealValue * 0.5)}
                    </div>
                  </button>

                  {/* Monthly Retainer */}
                  <button
                    type="button"
                    onClick={() => handleApplyMilestonePreset("monthly_retainer")}
                    className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/50 text-left transition group cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 dark:text-white group-hover:text-indigo-600">
                        Monthly Retainer
                      </span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        4 x 25%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                      4 Equal monthly tranches over engagement duration
                    </p>
                    <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-1.5">
                      4 x {formatINR(selectedRecord.dealValue * 0.25)}
                    </div>
                  </button>
                </div>
              </div>

                        {/* 4. Clean Delivery Phase Checklist (Zero GST, UTR, or Invoice Clutter) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center space-x-2">
                    <Truck className="w-4 h-4 text-indigo-600" />
                    <span>Delivery Phases & Execution Checklist</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Focus purely on milestone delivery, cohort sessions, and faculty assignment. Financial details stay in Billing.
                  </p>
                </div>
                <SpringButton
                  size="sm"
                  variant="primary"
                  onClick={handleAddMilestone}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Phase</span>
                </SpringButton>
              </div>

              {/* Clean Phase Checklist Items */}
              <div className="space-y-3">
                {selectedRecord.deliveryMilestones.map((m) => {
                  const isCompleted = m.milestoneStatus === "completed";
                  const isInProgress = m.milestoneStatus === "in_progress";
                  return (
                    <div
                      key={m.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isCompleted
                          ? "bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60"
                          : isInProgress
                          ? "bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800"
                          : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80"
                      }`}
                    >
                      {/* Left: Phase Title, Scope & Target % */}
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleQuickCompleteMilestone(m.id)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-1 transition cursor-pointer ${
                            isCompleted
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "border-2 border-slate-300 dark:border-slate-600 hover:border-indigo-500"
                          }`}
                          title={isCompleted ? "Phase Completed (Click to reopen)" : "Mark phase completed"}
                        >
                          {isCompleted && <Check className="w-4 h-4 stroke-[3]" />}
                        </button>
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={m.milestoneTitle}
                              onChange={(e) =>
                                handleUpdateMilestone(m.id, { milestoneTitle: e.target.value })
                              }
                              className="font-black text-sm text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 px-1 py-0.5 rounded outline-none flex-1 min-w-[200px]"
                              placeholder="Milestone Phase Scope..."
                            />
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 shrink-0">
                              {m.projectCompletionPercent}% Progress Target
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                                isCompleted
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : isInProgress
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {isCompleted ? "🟢 Delivered" : isInProgress ? "🟡 In Delivery" : "⚪ Not Started"}
                            </span>
                          </div>

                          {/* Due Date & Coach Assignment Strip */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>Target Due:</span>
                              <input
                                type="date"
                                value={m.targetDate || ""}
                                onChange={(e) =>
                                  handleUpdateMilestone(m.id, { targetDate: e.target.value })
                                }
                                className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-transparent hover:bg-white dark:hover:bg-slate-800 px-1 py-0.5 rounded border border-transparent hover:border-slate-200 dark:border-slate-700 outline-none cursor-pointer"
                              />
                            </div>

                            <div className="flex items-center space-x-1.5">
                              <Users className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Faculty:</span>
                              <input
                                type="text"
                                value={m.assignedCoach || (selectedRecord.coaches && selectedRecord.coaches[0]?.name) || ""}
                                placeholder="Assign Coach..."
                                onChange={(e) =>
                                  handleUpdateMilestone(m.id, { assignedCoach: e.target.value })
                                }
                                className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 outline-none w-36"
                              />
                            </div>

                            {isCompleted && m.completionDate && (
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                                ✓ Completed on {m.completionDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Big Simple Action & Delete */}
                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleQuickCompleteMilestone(m.id)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center space-x-1.5 cursor-pointer shadow-2xs ${
                            isCompleted
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                              : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/20"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>{isCompleted ? "Reopen Phase" : "Mark Phase Completed"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMilestone(m.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition cursor-pointer"
                          title="Delete this milestone"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. Quick Coach & Faculty Allocation Matrix Link */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider">
                    Faculty & Coach Roster ({selectedRecord.coaches?.length || 0} Assigned)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Manage ICF Master Certified Coaches, Facilitators, and Executive Faculty for this engagement.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProjectSubTab("coaches")}
                className="px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs cursor-pointer shrink-0"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Open Full Coach Matrix</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB B: BILLING & INVOICES (For Accounts & Client Partners) */}
        {/* ========================================================= */}
        {projectSubTab === "billing_invoices" && (() => {
          const invoicedMilestones = (selectedRecord.deliveryMilestones || [])
            .filter((m) => m.paymentStatus === "invoiced" || m.paymentStatus === "received" || !!m.invoiceNumber)
            .map((m) => ({
              id: m.id,
              title: m.milestoneTitle,
              type: "milestone" as const,
              typeBadge: "Milestone",
              amount: m.amount || 0,
              percent: m.paymentPercent || 0,
              invoiceDate: m.invoiceDate || m.completionDate || m.targetDate || "",
              invoiceNumber: m.invoiceNumber,
              rawItem: m,
            }));

          const invoicedTerms = (selectedRecord.paymentTerms || [])
            .filter((t) => t.paymentStatus === "invoiced" || t.paymentStatus === "received" || !!t.invoiceNumber)
            .map((t) => ({
              id: t.id,
              title: t.termLabel,
              type: "payment_term" as const,
              typeBadge: t.isAdvance ? "Advance Term" : "Scheduled Term",
              amount: t.amount || 0,
              percent: t.paymentPercent || 0,
              invoiceDate: t.invoiceDate || t.dueDate || "",
              invoiceNumber: t.invoiceNumber,
              rawItem: t,
            }));

          const invoicedPayments =
            selectedRecord.tenureType === "delivery"
              ? invoicedMilestones
              : selectedRecord.tenureType === "payment_terms"
              ? invoicedTerms
              : [...invoicedMilestones, ...invoicedTerms];

          const totalInvoiced = invoicedPayments.reduce((sum, p) => sum + p.amount, 0);
          const totalPercent = invoicedPayments.reduce((sum, p) => sum + p.percent, 0);
          const unbilledAmount = Math.max(0, (selectedRecord.dealValue || 0) - totalInvoiced);
          const invoicingRate =
            selectedRecord.dealValue > 0
              ? Math.round((totalInvoiced / selectedRecord.dealValue) * 100)
              : 0;

          const handleExportInvoicesCSV = () => {
            if (invoicedPayments.length === 0) return;
            const headers = [
              "Company Name",
              "Program",
              "Tranche Scope / Title",
              "Type",
              "Share (%)",
              "Invoiced Amount (INR)",
              "Invoice Date",
              "Invoice Number",
              "Payment Status",
              "UTR / Ref",
            ];
            const rows = invoicedPayments.map((p) => {
              const isPaid = p.rawItem.paymentStatus === "received";
              return [
                `"${selectedRecord.companyName.replace(/"/g, '""')}"`,
                `"${selectedRecord.program || ""}"`,
                `"${p.title.replace(/"/g, '""')}"`,
                `"${p.typeBadge}"`,
                p.percent,
                p.amount,
                `"${p.invoiceDate}"`,
                `"${p.invoiceNumber || ""}"`,
                isPaid ? "Paid in Full" : "Invoiced (Pending Payment)",
                `"${p.rawItem.utrNumber || ""}"`,
              ].join(",");
            });
            const csvContent = [headers.join(","), ...rows].join("\n");
            downloadCSV(
              csvContent,
              `Invoices_${selectedRecord.companyName.replace(/\s+/g, "_")}.csv`
            );
          };

          return (
            <div className="space-y-6 pt-1 animate-fadeIn">
              {/* 1. Financial Realization Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gradient-to-r from-indigo-50/60 via-emerald-50/40 to-blue-50/40 dark:from-indigo-950/40 dark:via-emerald-950/30 dark:to-blue-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                    Contract Value
                  </span>
                  <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    {formatINR(selectedRecord.dealValue)}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">100% Contracted</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400 block tracking-wider">
                    Total Invoiced
                  </span>
                  <div className="text-lg font-black text-indigo-700 dark:text-indigo-300 mt-0.5">
                    {formatINR(totalInvoiced)}
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    {invoicingRate}% of Deal Size
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block tracking-wider">
                    Collected (Paid)
                  </span>
                  <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {formatINR(
                      invoicedPayments
                        .filter((p) => p.rawItem.paymentStatus === "received")
                        .reduce((sum, p) => sum + p.amount, 0)
                    )}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium">Cleared into Bank</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 block tracking-wider">
                    Unbilled Balance
                  </span>
                  <div className="text-lg font-black text-amber-700 dark:text-amber-300 mt-0.5">
                    {formatINR(unbilledAmount)}
                  </div>
                  <span className="text-[10px] text-amber-600 font-medium">Scheduled / Future</span>
                </div>
              </div>

              {/* 2. Tranches & Billing Table (Milestones + Payment Terms) */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center space-x-2">
                      <Receipt className="w-4 h-4 text-indigo-600" />
                      <span>Tranches, Invoices & Payment Status</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Track invoice generation, payment receipts, UTR reference codes, and billing status.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {invoicedPayments.length > 0 && (
                      <button
                        type="button"
                        onClick={handleExportInvoicesCSV}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Export Invoices CSV</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Tranches List */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-2.5 px-3">Tranche / Phase</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Share (%)</th>
                        <th className="py-2.5 px-3">Amount (INR)</th>
                        <th className="py-2.5 px-3">Delivery Status</th>
                        <th className="py-2.5 px-3">Billing Status</th>
                        <th className="py-2.5 px-3">Invoice & Payment Ref</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(selectedRecord.deliveryMilestones || []).map((m) => {
                        const isDelivered = m.milestoneStatus === "completed";
                        const isPaid = m.paymentStatus === "received";
                        const isInvoiced = m.paymentStatus === "invoiced" || !!m.invoiceNumber;
                        const simpleBilling = isPaid ? "paid" : isInvoiced ? "invoiced" : "unbilled";

                        return (
                          <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                            <td className="py-3 px-3 font-black text-slate-900 dark:text-white">
                              {m.milestoneTitle}
                            </td>
                            <td className="py-3 px-3">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                Milestone
                              </span>
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-600 dark:text-slate-300">
                              {m.paymentPercent}%
                            </td>
                            <td className="py-3 px-3 font-black text-slate-900 dark:text-white whitespace-nowrap">
                              {formatINR(m.amount)}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isDelivered
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                }`}
                              >
                                <span>{isDelivered ? "🟢 Delivered" : "🟡 In Delivery"}</span>
                              </span>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  simpleBilling === "paid"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : simpleBilling === "invoiced"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                    : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                                }`}
                              >
                                <span>
                                  {simpleBilling === "paid"
                                    ? "🟢 Paid in Full"
                                    : simpleBilling === "invoiced"
                                    ? "🔵 Invoiced"
                                    : "⚪ Unbilled"}
                                </span>
                              </span>
                            </td>
                            <td className="py-3 px-3 text-[11px] text-slate-500">
                              {m.invoiceNumber ? (
                                <div>
                                  <div className="font-bold text-slate-800 dark:text-slate-200">
                                    Inv #{m.invoiceNumber}
                                  </div>
                                  {m.utrNumber && (
                                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                      UTR: {m.utrNumber}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">No invoice raised yet</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end space-x-1.5">
                                {!isInvoiced && !isPaid ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setInvoiceModalState({
                                        isOpen: true,
                                        record: selectedRecord,
                                        item: m,
                                        itemType: "milestone",
                                      })
                                    }
                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold shadow transition cursor-pointer"
                                  >
                                    📄 Generate Invoice
                                  </button>
                                ) : !isPaid ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setInvoiceModalState({
                                        isOpen: true,
                                        record: selectedRecord,
                                        item: m,
                                        itemType: "milestone",
                                      })
                                    }
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow transition cursor-pointer"
                                  >
                                    💵 Record Payment
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setInvoiceModalState({
                                        isOpen: true,
                                        record: selectedRecord,
                                        item: m,
                                        itemType: "milestone",
                                      })
                                    }
                                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                  >
                                    View Details
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {(selectedRecord.paymentTerms || []).map((t) => {
                        const isPaid = t.paymentStatus === "received";
                        const isInvoiced = t.paymentStatus === "invoiced" || !!t.invoiceNumber;
                        const simpleBilling = isPaid ? "paid" : isInvoiced ? "invoiced" : "unbilled";

                        return (
                          <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                            <td className="py-3 px-3 font-black text-slate-900 dark:text-white">
                              {t.termLabel}
                            </td>
                            <td className="py-3 px-3">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                {t.isAdvance ? "Advance Term" : "Scheduled Term"}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-600 dark:text-slate-300">
                              {t.paymentPercent}%
                            </td>
                            <td className="py-3 px-3 font-black text-slate-900 dark:text-white whitespace-nowrap">
                              {formatINR(t.amount)}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="text-[10px] font-bold text-slate-500">
                                {t.timeframe}
                              </span>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  simpleBilling === "paid"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : simpleBilling === "invoiced"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                    : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                                }`}
                              >
                                <span>
                                  {simpleBilling === "paid"
                                    ? "🟢 Paid in Full"
                                    : simpleBilling === "invoiced"
                                    ? "🔵 Invoiced"
                                    : "⚪ Unbilled"}
                                </span>
                              </span>
                            </td>
                            <td className="py-3 px-3 text-[11px] text-slate-500">
                              {t.invoiceNumber ? (
                                <div>
                                  <div className="font-bold text-slate-800 dark:text-slate-200">
                                    Inv #{t.invoiceNumber}
                                  </div>
                                  {t.utrNumber && (
                                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                      UTR: {t.utrNumber}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">No invoice raised yet</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end space-x-1.5">
                                {!isInvoiced && !isPaid ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setInvoiceModalState({
                                        isOpen: true,
                                        record: selectedRecord,
                                        item: t,
                                        itemType: "payment_term",
                                      })
                                    }
                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold shadow transition cursor-pointer"
                                  >
                                    📄 Generate Invoice
                                  </button>
                                ) : !isPaid ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setInvoiceModalState({
                                        isOpen: true,
                                        record: selectedRecord,
                                        item: t,
                                        itemType: "payment_term",
                                      })
                                    }
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow transition cursor-pointer"
                                  >
                                    💵 Record Payment
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setInvoiceModalState({
                                        isOpen: true,
                                        record: selectedRecord,
                                        item: t,
                                        itemType: "payment_term",
                                      })
                                    }
                                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                  >
                                    View Details
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ========================================================= */}
        {/* TAB C: DOSSIER & SECONDARY DETAILS */}
        {/* ========================================================= */}
        {(projectSubTab === "dossier" ||
          projectSubTab === "pipeline_data" ||
          projectSubTab === "coaches" ||
          projectSubTab === "signoff") && (
          <div className="space-y-6 pt-1 animate-fadeIn">
            {/* 1. Commercial Dossier & Key Pipeline Attributes */}
            {effectivePipelineData && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1.5 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Deal Value & Program
                  </span>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {formatINR(effectivePipelineData.dealValue)}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {effectivePipelineData.program}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      {effectivePipelineData.leadSource}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1.5 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Pipeline Stage & Status
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Closure (Won) • {effectivePipelineData.weightage}%</span>
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1 pt-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Closure Month: <strong className="text-slate-700 dark:text-slate-200">{formatClosureMonth(effectivePipelineData.closureMonth || effectivePipelineData.expectedCloseDate)}</strong>
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1.5 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Deal Owner & Region
                  </span>
                  <div className="text-sm font-black text-slate-900 dark:text-white">
                    {effectivePipelineData.owner}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center space-x-1 pt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{effectivePipelineData.city || "Pan-India"}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1.5 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Client Sponsor Contact
                  </span>
                  <div className="text-sm font-black text-slate-900 dark:text-white">
                    {effectivePipelineData.contactName || "Contact Unspecified"}
                  </div>
                  <div className="text-xs text-slate-500">{effectivePipelineData.designation || "Executive Sponsor"}</div>
                </div>
              </div>
            )}

            {/* 2. Full Coaches & Faculty Allocation Matrix */}
            <div className="pt-2">
              <CoachAllocationDrawer
                record={selectedRecord}
                onUpdateCoaches={handleUpdateCoaches}
              />
            </div>

            {/* 3. Client Sign-off & CSAT Pulse */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Client Formal Acceptance & CSAT Pulse
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Record executive milestone acceptance, CSAT/NPS scores, and generate branded completion certificates.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSignoffModalOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-md shadow-amber-500/20 transition flex items-center space-x-2 shrink-0 cursor-pointer"
                >
                  <Award className="w-4 h-4" />
                  <span>{selectedRecord.clientSignoff ? "Edit Sign-off / Certificate" : "Record Formal Sign-off"}</span>
                </button>
              </div>

              {selectedRecord.clientSignoff ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Authorized Signatory</span>
                    <div className="text-sm font-black text-slate-900 dark:text-white mt-1">
                      {selectedRecord.clientSignoff.signatoryName}
                    </div>
                    <div className="text-xs text-slate-500">{selectedRecord.clientSignoff.signatoryDesignation || "Client Sponsor"}</div>
                    <div className="text-[11px] text-slate-400 mt-1">Date: {selectedRecord.clientSignoff.signoffDate}</div>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CSAT & NPS Pulse</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex text-amber-400">
                        {"★".repeat(selectedRecord.clientSignoff.csatRating || 5)}
                        {"☆".repeat(5 - (selectedRecord.clientSignoff.csatRating || 5))}
                      </div>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                        {selectedRecord.clientSignoff.csatRating}/5
                      </span>
                    </div>
                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                      Net Promoter Score: +{selectedRecord.clientSignoff.npsScore || 9}/10
                    </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Formal Feedback</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 italic mt-1 line-clamp-3">
                      &quot;{selectedRecord.clientSignoff.clientFeedback || "Outstanding program impact."}&quot;
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No sign-off recorded yet. Click &quot;Record Formal Sign-off&quot; upon milestone completion or final program wrap-up.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )}

      {/* ========================================================= */}
      {/* ALL PROJECTS IN DELIVERY PIPELINE TABLE / CARDS */}
      {/* ========================================================= */}
      <div
        id="delivery-projects-table"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2 flex-wrap gap-y-1">
              <span>{isAdmin ? "All Delivery Projects" : "My Delivery Projects"}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300">
                {filteredRecords.length}
              </span>
              {isAdmin && selectedOwnerFilter !== "all" && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Owner: {selectedOwnerFilter}
                </span>
              )}
              {selectedMonthFilter !== "all" && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 inline-flex items-center space-x-1">
                  <span>Month: {selectedMonthFilter}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedMonthFilter("all")}
                    className="hover:text-rose-600 transition cursor-pointer"
                    title="Clear month filter"
                  >
                    <X className="w-2.5 h-2.5 inline" />
                  </button>
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAdmin
                ? "Click any project to configure or manage its Tenure model and completion milestones across all client partners."
                : "Click your assigned project to manage tenure terms, milestones, and tax invoicing."}
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAdmin ? "Search company, owner..." : "Search company, program..."}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Lead Owner Filter: Admin gets dropdown across all partners, Client Partner is locked */}
            {isAdmin ? (
              <div className="relative">
                <select
                  value={selectedOwnerFilter}
                  onChange={(e) => setSelectedOwnerFilter(e.target.value)}
                  className={`text-xs font-bold px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-700 dark:text-slate-200 transition ${
                    selectedOwnerFilter !== "all"
                      ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                  title="Admin Filter by Lead Owner"
                >
                  <option value="all">
                    All Lead Owners ({allLeadOwnersList.length})
                  </option>
                  {allLeadOwnersList.map((o) => (
                    <option key={o.owner} value={o.owner}>
                      {o.owner} ({o.accountsCount} {o.accountsCount === 1 ? "account" : "accounts"})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 shadow-2xs"
                title="Client Partner: viewing only your assigned delivery projects"
              >
                <Lock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>My Deliveries ({accessibleDeliveryRecords.length})</span>
              </div>
            )}

            {isAdmin && selectedOwnerFilter !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedOwnerFilter("all")}
                className="flex items-center space-x-1 px-2.5 py-1.5 text-xs bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold transition cursor-pointer"
                title="Clear owner filter"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{selectedOwnerFilter}</span>
                <X className="w-3.5 h-3.5 ml-0.5" />
              </button>
            )}

            {/* Month Filter Dropdown */}
            <div className="relative">
              <select
                value={selectedMonthFilter}
                onChange={(e) => setSelectedMonthFilter(e.target.value)}
                className={`text-xs font-bold px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-700 dark:text-slate-200 transition ${
                  selectedMonthFilter !== "all"
                    ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                    : "border-slate-200 dark:border-slate-700"
                }`}
                title="Filter delivery projects by month"
              >
                <option value="all">
                  All Months ({monthWiseRevenueList.length})
                </option>
                {monthWiseRevenueList.map((m) => (
                  <option key={m.monthKey} value={m.monthKey}>
                    {m.monthKey} ({m.accountsCount} {m.accountsCount === 1 ? "project" : "projects"})
                  </option>
                ))}
              </select>
            </div>

            {selectedMonthFilter !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedMonthFilter("all")}
                className="flex items-center space-x-1 px-2.5 py-1.5 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-xl font-bold transition cursor-pointer"
                title="Clear month filter"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{selectedMonthFilter}</span>
                <X className="w-3.5 h-3.5 ml-0.5" />
              </button>
            )}

            <select
              value={selectedTenureFilter}
              onChange={(e) => setSelectedTenureFilter(e.target.value)}
              className="text-xs font-bold px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200"
            >
              <option value="all">All Tenure Models</option>
              <option value="delivery">Delivery (% Completion)</option>
              <option value="payment_terms">Payment Terms (Schedule)</option>
              <option value="contract">Contract (Delivery + Terms)</option>
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="text-xs font-bold px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200"
            >
              <option value="all">All Statuses</option>
              <option value="in_progress">In Progress</option>
              <option value="delivered">Delivered</option>
              <option value="not_started">Not Started</option>
              <option value="on_hold">On Hold</option>
            </select>

            {/* View Mode Switcher: Operations Table vs Gantt Roadmap */}
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setDeliveryViewMode("table")}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  deliveryViewMode === "table"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Detailed Operations & Delivery Lead Table"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Operations Table</span>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryViewMode("timeline")}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  deliveryViewMode === "timeline"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Interactive Gantt Timeline Roadmap"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Roadmap</span>
              </button>
            </div>
          </div>
        </div>

        {deliveryViewMode === "timeline" ? (
          <DeliveryTimelineView
            records={filteredRecords}
            onSelectRecord={handleSelectRecord}
          />
        ) : filteredRecords.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <Truck className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No delivery projects found
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Import a won deal from the Closure stage in your pipeline or create a new delivery project to get started.
            </p>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer"
            >
              Import from Closure
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Company & Program</th>
                  <th className="py-3 px-4">Client Partner</th>
                  <th className="py-3 px-4">Deal Value</th>
                  <th className="py-3 px-4">Tenure Model</th>
                  <th className="py-3 px-4">Project Completion</th>
                  <th className="py-3 px-4">Invoiced Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredRecords.map((r) => {
                  const fin = getRecordFinancials(r);
                  const invoicedAmt = fin.invoiced;
                  const percentInvoiced = Math.round(fin.invoicedRate);

                  const isSelected = selectedRecordId === r.id;

                  const rowMatchingLead =
                    allLeads.find((l) => l.id === r.leadId) ||
                    leads.find((l) => l.id === r.leadId) ||
                    allLeads.find(
                      (l) => l.companyName.trim().toLowerCase() === r.companyName.trim().toLowerCase()
                    ) ||
                    leads.find(
                      (l) => l.companyName.trim().toLowerCase() === r.companyName.trim().toLowerCase()
                    );
                  const effectiveRowLogo = rowMatchingLead?.companyLogo || r.companyLogo;

                  return (
                    <tr
                      key={r.id}
                      onClick={() => handleSelectRecord(r.id)}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition ${
                        isSelected ? "bg-indigo-50/60 dark:bg-indigo-950/40" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          {effectiveRowLogo ? (
                            <img
                              src={effectiveRowLogo}
                              alt={r.companyName}
                              className="w-8 h-8 rounded-lg object-contain bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center border border-indigo-200 dark:border-indigo-800 shrink-0">
                              {r.companyName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-black text-slate-900 dark:text-white text-sm">
                              {r.companyName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {r.program || "Enterprise Program"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                        {r.clientPartner}
                      </td>

                      <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white whitespace-nowrap">
                        {formatINR(r.dealValue)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-black border ${
                            r.tenureType === "delivery"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800"
                              : r.tenureType === "contract"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                              : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
                          }`}
                        >
                          {r.tenureType === "delivery" ? (
                            <>
                              <Truck className="w-3 h-3" />
                              <span>Delivery (% Milestone)</span>
                            </>
                          ) : r.tenureType === "contract" ? (
                            <>
                              <FileText className="w-3 h-3" />
                              <span>Contract (Hybrid)</span>
                            </>
                          ) : (
                            <>
                              <Calendar className="w-3 h-3" />
                              <span>Payment Terms</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 min-w-[150px]">
                        <ProjectProgressBar
                          percent={r.overallCompletionPercent}
                          compact={true}
                          showControls={false}
                          editable={false}
                        />
                      </td>

                      <td className="py-3.5 px-4 min-w-[130px]">
                        <div className="flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                          <span>{percentInvoiced}%</span>
                          <span className="text-[10px] text-slate-400">({formatINR(invoicedAmt)})</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full"
                            style={{ width: `${percentInvoiced}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {(() => {
                          const simpleDelivery = getSimpleDeliveryStatus(r);
                          const simpleBilling = getSimpleBillingStatus(fin.total, fin.invoiced, fin.received);
                          return (
                            <div className="flex flex-col space-y-1.5">
                              {/* Delivery Status Badge */}
                              <div className="flex items-center space-x-1.5">
                                <span
                                  className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${simpleDelivery.badgeBg} ${simpleDelivery.badgeText}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${simpleDelivery.dotColor}`} />
                                  <span>{simpleDelivery.label}</span>
                                </span>
                              </div>

                              {/* Billing Status Badge */}
                              <div className="flex items-center space-x-1.5">
                                <span
                                  className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${simpleBilling.badgeBg} ${simpleBilling.badgeText}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${simpleBilling.dotColor}`} />
                                  <span>{simpleBilling.label}</span>
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectRecord(r.id);
                              setProjectSubTab("delivery_coaching");
                            }}
                            className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 font-bold text-xs transition cursor-pointer flex items-center space-x-1"
                            title="Open Delivery & Coaching execution view"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>🎯 Delivery</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectRecord(r.id);
                              setProjectSubTab("billing_invoices");
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs transition cursor-pointer flex items-center space-x-1"
                            title="Open Billing & Invoices ledger"
                          >
                            <Receipt className="w-3.5 h-3.5 text-indigo-500" />
                            <span>💳 Billing</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRequestDelete(r);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Delete project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: IMPORT WON DEAL FROM PIPELINE (CLOSURE STAGE) */}
      {/* ========================================================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Import Won Deal to Delivery
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select a closed-won deal from the pipeline to launch delivery tracking and tenure setup.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {closureLeads.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No leads are currently in the Closure stage.
                </p>
                <p className="text-xs text-slate-400">
                  When a deal reaches the Closure column in the pipeline, it will appear here ready for delivery handoff.
                </p>
              </div>
            ) : (
              <div className="max-h-[380px] overflow-y-auto space-y-2.5 pr-1">
                {closureLeads.map((lead) => {
                  const alreadyImported = deliveryRecords.some((r) => r.leadId === lead.id);

                  return (
                    <div
                      key={lead.id}
                      className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-4 hover:border-indigo-300 dark:hover:border-indigo-600 transition"
                    >
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          {lead.companyName}
                        </h4>
                        <div className="flex items-center space-x-3 text-xs text-slate-500 mt-0.5">
                          <span>Value: <strong className="text-indigo-600 dark:text-indigo-400">{formatINR(lead.dealValue)}</strong></span>
                          <span>Owner: <strong>{lead.owner}</strong></span>
                          <span>Program: <strong>{lead.program}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {alreadyImported ? (
                          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg text-xs font-bold border border-emerald-300 dark:border-emerald-800 flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>In Delivery</span>
                          </span>
                        ) : (
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => handleImportLead(lead, "delivery")}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center space-x-1"
                              title="Set up with Delivery (% Completion) Tenure"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Delivery</span>
                            </button>
                            <button
                              onClick={() => handleImportLead(lead, "payment_terms")}
                              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center space-x-1"
                              title="Set up with Payment Terms Tenure"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Terms</span>
                            </button>
                            <button
                              onClick={() => handleImportLead(lead, "contract")}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center space-x-1"
                              title="Set up with Hybrid Contract (Delivery + Payment Terms) Tenure"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Contract</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: NEW CUSTOM DELIVERY PROJECT */}
      {/* ========================================================= */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateNewProject}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Create New Delivery Project
              </h3>
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Company / Client Name *
                </label>
                <input
                  type="text"
                  required
                  value={newProjectForm.companyName}
                  onChange={(e) =>
                    setNewProjectForm({ ...newProjectForm, companyName: e.target.value })
                  }
                  placeholder="e.g. Acme Global Industries"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Contract / Deal Value (INR) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="10000"
                  value={newProjectForm.dealValue}
                  onChange={(e) =>
                    setNewProjectForm({ ...newProjectForm, dealValue: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Program / Solution
                </label>
                <select
                  value={newProjectForm.program}
                  onChange={(e) =>
                    setNewProjectForm({ ...newProjectForm, program: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                >
                  <option value="Executive Coaching">Executive Coaching</option>
                  <option value="L&D Transformation">L&D Transformation</option>
                  <option value="TASC Inhouse">TASC Inhouse</option>
                  <option value="Assessments & Succession">Assessments & Succession</option>
                  <option value="Custom Delivery">Custom Delivery</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Assign Client Partner *
                </label>
                {isAdmin ? (
                  <select
                    value={newProjectForm.clientPartner}
                    onChange={(e) =>
                      setNewProjectForm({ ...newProjectForm, clientPartner: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                  >
                    {VALID_USERS.filter((u) => u.username !== "admin" && u.username !== "accounts").map((u) => (
                      <option key={u.username} value={u.name}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between text-xs">
                    <span>{currentUser?.name || "Client Partner"}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Assigned to You</span>
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  ⚡ 1-Click Milestone Preset (Eliminates the Math)
                </label>
                <div className="grid grid-cols-1 gap-2 mt-1">
                  {[
                    {
                      id: "three_stage",
                      title: "3-Stage Delivery",
                      desc: "30% Kickoff & Discovery → 40% Mid-way Execution → 30% Final Sign-off",
                      badge: "30 / 40 / 30",
                      calc: `${formatINR(newProjectForm.dealValue * 0.3)} • ${formatINR(newProjectForm.dealValue * 0.4)} • ${formatINR(newProjectForm.dealValue * 0.3)}`,
                    },
                    {
                      id: "fifty_fifty",
                      title: "50 / 50 Standard",
                      desc: "50% Advance on Agreement → 50% on Project Completion",
                      badge: "50% / 50%",
                      calc: `2 x ${formatINR(newProjectForm.dealValue * 0.5)}`,
                    },
                    {
                      id: "monthly_retainer",
                      title: "Monthly Retainer",
                      desc: "Equal monthly tranches over engagement duration",
                      badge: "4 x 25%",
                      calc: `4 x ${formatINR(newProjectForm.dealValue * 0.25)}`,
                    },
                  ].map((preset) => {
                    const isSelected = newProjectForm.milestonePreset === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() =>
                          setNewProjectForm({
                            ...newProjectForm,
                            milestonePreset: preset.id as MilestonePresetType,
                          })
                        }
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition flex items-start justify-between ${
                          isSelected
                            ? "bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/20"
                            : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-black text-slate-900 dark:text-white text-xs">
                              {preset.title}
                            </span>
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                              {preset.badge}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {preset.desc}
                          </div>
                          <div className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                            Auto-calculated: {preset.calc}
                          </div>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Tenure Model Structure
                </label>
                <select
                  value={newProjectForm.tenureType}
                  onChange={(e) =>
                    setNewProjectForm({
                      ...newProjectForm,
                      tenureType: e.target.value as TenureType,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                >
                  <option value="delivery">Delivery (Project Completion Milestones)</option>
                  <option value="payment_terms">Payment Terms (Advance & Schedule)</option>
                  <option value="contract">Contract (Delivery Milestones + Payment Terms)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition"
              >
                Create Delivery Project
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: DELETE PROJECT CONFIRMATION MODAL */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-900/50 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Delete Delivery Project?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Are you sure you want to remove <strong className="text-slate-800 dark:text-slate-200">{projectToDelete.companyName}</strong> from the delivery workspace?
                </p>
                <div className="mt-2.5 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 space-y-1 border border-slate-200 dark:border-slate-700">
                  <div>• Program: <span className="font-semibold text-slate-800 dark:text-slate-200">{projectToDelete.program}</span></div>
                  <div>• Value: <span className="font-semibold text-slate-800 dark:text-slate-200">{formatINR(projectToDelete.dealValue)}</span></div>
                  <div>• Tenure Model: <span className="font-semibold text-slate-800 dark:text-slate-200">{projectToDelete.tenureType === "delivery" ? "Delivery (% Milestone)" : projectToDelete.tenureType === "contract" ? "Contract (Delivery + Terms)" : "Payment Terms"}</span></div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-500/20 transition cursor-pointer"
              >
                Yes, Delete Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ONE-CLICK INVOICE GENERATOR & UTR PROOF MODAL */}
      {invoiceModalState.isOpen && invoiceModalState.record && invoiceModalState.item && (
        <DeliveryInvoiceModal
          isOpen={invoiceModalState.isOpen}
          onClose={() =>
            setInvoiceModalState({
              isOpen: false,
              record: null,
              item: null,
              itemType: "milestone",
            })
          }
          record={invoiceModalState.record}
          item={invoiceModalState.item}
          itemType={invoiceModalState.itemType}
          onSaveUTR={handleSaveUTR}
        />
      )}

      {/* MODAL 5: CLIENT SIGN-OFF, CSAT & COMPLETION CERTIFICATE MODAL */}
      {isSignoffModalOpen && selectedRecord && (
        <ClientSignoffModal
          isOpen={isSignoffModalOpen}
          onClose={() => setIsSignoffModalOpen(false)}
          record={selectedRecord}
          onSaveSignoff={handleSaveSignoff}
        />
      )}

      {/* MODAL 6: CLIENT-FACING READ-ONLY SHAREABLE PORTAL MODAL */}
      {isSharePortalModalOpen && selectedRecord && (
        <ClientShareablePortalModal
          isOpen={isSharePortalModalOpen}
          onClose={() => setIsSharePortalModalOpen(false)}
          record={selectedRecord}
        />
      )}

      {/* MODAL 7: AI PROPOSAL DOCUMENT & TENURE SCHEDULE GENERATOR */}
      {isAiImportModalOpen && selectedRecord && (
        <DeliveryAiImportModal
          isOpen={isAiImportModalOpen}
          onClose={() => setIsAiImportModalOpen(false)}
          record={selectedRecord}
          onApplySchedule={handleApplyAiSchedule}
        />
      )}
    </div>
  );
};
