"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Lead, LeadStage, ApproachNote, FinancialDocument } from "@/types/lead";
import {
  subscribeToLeads,
  createLead,
  createLeadsBulk,
  updateLeadStage,
  addJourneyNote,
  updateDealValue,
  updateLeadProgram,
  deleteLead,
  updateLeadOwner,
  updateLeadClosureMonth,
  attachLeadApproachNote,
  attachLeadApproachNotes,
  removeLeadApproachNote,
  attachLeadFinancialDocuments,
  removeLeadFinancialDocument,
  updateLeadSource,
  updateLeadCompanyLogo,
  removeLeadCompanyLogo,
  addLeadContact,
  removeLeadContact,
  updateLeadPrimaryContact,
  editLeadContact,
  setLeadPrimaryContact,
  completeLeadFollowup,
  updateLeadInvoiceDetails,
} from "@/lib/leadsService";
import { exportLeadsToCSV } from "@/lib/exportService";
import { Sidebar, NavTab } from "@/components/Sidebar";
import { DashboardStats } from "@/components/DashboardStats";
import { FilterBar } from "@/components/FilterBar";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LeadTable } from "@/components/LeadTable";
import { LeadDetailModal } from "@/components/LeadDetailModal";
import { AddLeadModal } from "@/components/AddLeadModal";
import { BulkUploadModal } from "@/components/BulkUploadModal";
import { AnalyticsCharts } from "@/components/AnalyticsCharts";
import { ForecastTab } from "@/components/ForecastTab";
import { EmailCampaignTab, ParsedCSVEmailRecipient } from "@/components/EmailCampaignTab";
import { DeveloperTab } from "@/components/DeveloperTab";
import { OutreachTab } from "@/components/OutreachTab";
import { TouchpointHistoryTab } from "@/components/TouchpointHistoryTab";
import { BillingTab } from "@/components/BillingTab";
import { DeliveryTab } from "@/components/DeliveryTab";
import { SpringPortalLoader } from "@/components/spring";
import { MoneyLottieLoader } from "@/components/MoneyLottieLoader";
import { ProspectorTab } from "@/components/ProspectorTab";
import { LibraryTab } from "@/components/LibraryTab";
import { TemplatesTab } from "@/components/TemplatesTab";
import { SalesQuoteBanner } from "@/components/SalesQuoteBanner";
import { EmailAttachment } from "@/constants/emailTemplates";
import { ColdClient, ColdClientStatus, OutreachChannel, AdminComment } from "@/types/outreach";
import {
  subscribeToColdClients,
  addColdClient,
  updateColdClient,
  deleteColdClient,
  logOutreachTouchpoint,
  bulkAddColdClients,
  bulkUpdateColdClients,
  bulkDeleteColdClients,
  convertColdClientToLead,
  addAdminCommentToColdClient,
  markAdminCommentRead,
  addReplyToAdminComment,
  completeColdClientFollowup,
} from "@/lib/outreachService";
import { STAGES } from "@/constants/stages";
import { LoginForm } from "@/components/LoginForm";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { UserAccount, isSameOwner } from "@/constants/users";
import {
  subscribeToUserPreferences,
  saveUserPreferencesToFirestore,
  getLocalPreferences,
} from "@/lib/preferencesService";
import { migrateLeadToBilling } from "@/lib/billingService";
import { createDeliveryRecordFromLead } from "@/lib/deliveryService";
import {
  Receipt,
  CheckCircle2,
  CheckCheck,
  ArrowRight,
  X,
  Bell,
  ShieldAlert,
  MessageSquare,
  Truck,
  Reply,
  CornerDownRight,
  History,
  Search,
  SendHorizontal,
  Check,
  Clock,
  Calendar,
  AlertCircle,
  CalendarClock,
  Phone,
  Mail,
  Building2,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useRef, useSyncExternalStore } from "react";

const TAB_METADATA: Record<NavTab, { title: string; subtitle: string }> = {
  kanban: {
    title: "Pipeline Kanban Board",
    subtitle: "Tracking deal progress, closures and client stages",
  },
  table: {
    title: "Lead Directory & Records",
    subtitle: "Structured table view of all qualified B2B prospects",
  },
  outreach: {
    title: "Outreach Engine & Prospects",
    subtitle: "Cold client outreach pipelines and automated follow-ups",
  },
  touchpoints: {
    title: "Touchpoint Journey & History",
    subtitle: "Audit trail of all client engagements, notes and meetings",
  },
  delivery: {
    title: "Delivery & Payment Milestones",
    subtitle: "Project execution milestones and tenure payment schedules",
  },
  billing: {
    title: "Billing & Invoices",
    subtitle: "Collections ledger, payment terms and financial paperwork",
  },
  analytics: {
    title: "Executive Revenue Analytics",
    subtitle: "Comprehensive pipeline velocity and financial forecasts",
  },
  forecast: {
    title: "Financial Invoice Forecast",
    subtitle: "Realized and scheduled invoices raised by date, amount and lead owner",
  },
  email: {
    title: "Campaigns & Email Sequences",
    subtitle: "Direct outreach campaigns and custom email templates",
  },
  prospector: {
    title: "AI B2B Prospector",
    subtitle: "Intelligent lead discovery and market prospecting tools",
  },
  library: {
    title: "Digital Collateral & Library",
    subtitle: "Case studies, pitch decks and sales enablement assets",
  },
  templates: {
    title: "Corporate Templates & Proposals Hub",
    subtitle: "Standardized enterprise financial proposals, contracts and documents",
  },
  developer: {
    title: "Developer System Console",
    subtitle: "System diagnostics, data schemas and integration health",
  },
};

const emptySubscribe = () => () => {};

export default function Home() {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("xmonks_b2b_authenticated") === "true";
    } catch {
      return false;
    }
  });

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const storedUser = localStorage.getItem("xmonks_b2b_user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });

  const [leads, setLeads] = useState<Lead[]>([]);
  const [isFirebaseSyncing, setIsFirebaseSyncing] = useState<boolean>(true);

  const isAdmin = Boolean(
    currentUser?.username.toLowerCase() === "admin" ||
    currentUser?.role.toLowerCase().includes("admin")
  );
  const isAccounts = Boolean(
    currentUser?.username.toLowerCase() === "accounts" ||
    currentUser?.role.toLowerCase().includes("accounts")
  );
  const isDeliveryOnly = Boolean(
    currentUser?.username.toLowerCase() === "vikram" ||
    currentUser?.role.toLowerCase().includes("delivery") ||
    (currentUser?.allowedTabs &&
      currentUser.allowedTabs.length === 1 &&
      currentUser.allowedTabs[0] === "delivery")
  );
  const isRestrictedToDelivery = isAccounts || isDeliveryOnly;

  // 2-Second Money.json initial page loading state
  const [isInitialPageLoading, setIsInitialPageLoading] = useState<boolean>(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialPageLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // 2-Second Money.json tab transition state
  const tabTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [tabLoadingState, setTabLoadingState] = useState<{
    tab: NavTab;
    title: string;
    subtitle: string;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (tabTimerRef.current) {
        clearTimeout(tabTimerRef.current);
      }
    };
  }, []);

  // Track if user explicitly clicked/changed tabs or if initial tab was restored
  const userHasChangedTabRef = useRef<boolean>(false);
  const initialTabLoadedRef = useRef<boolean>(false);

  // Initialize activeTab from local preferences immediately to prevent flash
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    if (typeof window === "undefined") return "kanban";
    try {
      const storedUser = localStorage.getItem("xmonks_b2b_user");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (
          u?.username?.toLowerCase() === "accounts" ||
          u?.role?.toLowerCase().includes("accounts") ||
          u?.username?.toLowerCase() === "vikram" ||
          u?.role?.toLowerCase().includes("delivery") ||
          (u?.allowedTabs && u.allowedTabs.length === 1 && u.allowedTabs[0] === "delivery")
        ) {
          return "delivery";
        }
        const userIsAdmin = Boolean(
          u?.username?.toLowerCase() === "admin" || u?.role?.toLowerCase().includes("admin")
        );
        const prefs = getLocalPreferences(u.username);
        if (
          prefs?.activeTab &&
          ["kanban", "table", "outreach", "analytics", "email", "library", "prospector", "delivery", "developer"].includes(prefs.activeTab)
        ) {
          if (prefs.activeTab === "developer" && !userIsAdmin) {
            return "kanban";
          }
          return prefs.activeTab as NavTab;
        }
      }
    } catch {}
    return "kanban";
  });

  const [coldClients, setColdClients] = useState<ColdClient[]>([]);
  const [outreachFilteredCount, setOutreachFilteredCount] = useState<number | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState<boolean>(false);

  const handleLoginSuccess = (user: UserAccount) => {
    try {
      localStorage.setItem("xmonks_b2b_authenticated", "true");
      localStorage.setItem("xmonks_b2b_user", JSON.stringify(user));
    } catch (e) {
      console.warn("Could not set auth state", e);
    }
    setCurrentUser(user);
    setIsAuthenticated(true);
    setIsInitialPageLoading(true);
    setTimeout(() => {
      setIsInitialPageLoading(false);
    }, 2000);
    if (
      user.username.toLowerCase() === "accounts" ||
      user.role.toLowerCase().includes("accounts") ||
      user.username.toLowerCase() === "vikram" ||
      user.role.toLowerCase().includes("delivery") ||
      (user.allowedTabs && user.allowedTabs.length === 1 && user.allowedTabs[0] === "delivery")
    ) {
      setActiveTab("delivery");
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("xmonks_b2b_authenticated");
      localStorage.removeItem("xmonks_b2b_user");
    } catch (e) {
      console.warn("Could not remove auth state", e);
    }
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  // Filter States (From Date, To Date, Weightage, Stage, Search, Client Partner, Lead Source, Program)
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedWeightage, setSelectedWeightage] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedPartner, setSelectedPartner] = useState("all");
  const [selectedLeadSource, setSelectedLeadSource] = useState("all");
  const [selectedProgram, setSelectedProgram] = useState("all");
  const [emailTabPrefill, setEmailTabPrefill] = useState<{ email: string; name?: string; company?: string } | null>(null);
  const [emailTabBulkPrefill, setEmailTabBulkPrefill] = useState<ParsedCSVEmailRecipient[] | null>(null);
  const [emailTabAttachmentsPrefill, setEmailTabAttachmentsPrefill] = useState<EmailAttachment[] | null>(null);

  // Load & subscribe to user UI view & filter preferences from Firestore
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToUserPreferences(currentUser.username, (prefs) => {
      // Only set initial tab from preferences ONCE on load, and NEVER if the user has already changed tabs
      if (!initialTabLoadedRef.current && !userHasChangedTabRef.current && prefs.activeTab) {
        initialTabLoadedRef.current = true;
        if (isRestrictedToDelivery) {
          setActiveTab("delivery");
        } else if (prefs.activeTab === "developer" && !isAdmin) {
          setActiveTab("kanban");
        } else {
          setActiveTab(prefs.activeTab as NavTab);
        }
      }
      if (prefs.searchTerm !== undefined) setSearchTerm(prefs.searchTerm);
      if (prefs.fromDate !== undefined) setFromDate(prefs.fromDate);
      if (prefs.toDate !== undefined) setToDate(prefs.toDate);
      if (prefs.selectedStage !== undefined) setSelectedStage(prefs.selectedStage);
      if (prefs.selectedWeightage !== undefined) setSelectedWeightage(prefs.selectedWeightage);
      if (prefs.selectedPartner !== undefined) setSelectedPartner(prefs.selectedPartner);
    });

    return () => unsub();
  }, [currentUser, isAdmin, isRestrictedToDelivery]);

  // Ensure non-admin users can never land on or stay on the developer tab
  useEffect(() => {
    if (currentUser && !isAdmin && activeTab === "developer") {
      setActiveTab("kanban");
    }
  }, [currentUser, isAdmin, activeTab]);

  // Debounce search sync to Firestore
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  // Ensure accounts & delivery-only users always stay on the delivery tab
  useEffect(() => {
    if (isRestrictedToDelivery && activeTab !== "delivery") {
      setActiveTab("delivery");
    }
  }, [isRestrictedToDelivery, activeTab]);

  // Handlers to synchronize UI state to Firestore
  const handleTabChange = (tab: NavTab) => {
    if (isRestrictedToDelivery && tab !== "delivery") {
      return;
    }
    if (tab === "developer" && !isAdmin) {
      return;
    }
    if (tab === activeTab && !tabLoadingState) {
      return;
    }
    userHasChangedTabRef.current = true;
    initialTabLoadedRef.current = true;

    const meta = TAB_METADATA[tab] || {
      title: `Switching to ${tab.toUpperCase()}...`,
      subtitle: "Loading workspace module and records",
    };

    // Trigger Money.json transition with exactly 2-second timer
    setTabLoadingState({
      tab,
      title: meta.title,
      subtitle: meta.subtitle,
    });

    setActiveTab(tab);
    if (currentUser) {
      saveUserPreferencesToFirestore(currentUser.username, { activeTab: tab });
    }

    if (tabTimerRef.current) {
      clearTimeout(tabTimerRef.current);
    }

    tabTimerRef.current = setTimeout(() => {
      setTabLoadingState(null);
    }, 2000);
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    if (currentUser) {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      searchDebounceRef.current = setTimeout(() => {
        saveUserPreferencesToFirestore(currentUser.username, { searchTerm: term });
      }, 400);
    }
  };

  const handleFromDateChange = (val: string) => {
    setFromDate(val);
    if (currentUser) {
      saveUserPreferencesToFirestore(currentUser.username, { fromDate: val });
    }
  };

  const handleToDateChange = (val: string) => {
    setToDate(val);
    if (currentUser) {
      saveUserPreferencesToFirestore(currentUser.username, { toDate: val });
    }
  };

  const handleStageChange = (val: string) => {
    setSelectedStage(val);
    if (currentUser) {
      saveUserPreferencesToFirestore(currentUser.username, { selectedStage: val });
    }
  };

  const handleWeightageChange = (val: string) => {
    setSelectedWeightage(val);
    if (currentUser) {
      saveUserPreferencesToFirestore(currentUser.username, { selectedWeightage: val });
    }
  };

  const handlePartnerChange = (val: string) => {
    setSelectedPartner(val);
    if (currentUser) {
      saveUserPreferencesToFirestore(currentUser.username, { selectedPartner: val });
    }
  };

  const handleLeadSourceChange = (val: string) => {
    setSelectedLeadSource(val);
  };

  const handleProgramChange = (val: string) => {
    setSelectedProgram(val);
  };

  // Subscribe to Firestore Realtime Data
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsubscribeLeads = subscribeToLeads((updatedLeads, isSyncing) => {
      setLeads(updatedLeads);
      setIsFirebaseSyncing(isSyncing);

      // Keep selected lead modal updated if open
      setSelectedLead((prev) => {
        if (!prev) return null;
        const fresh = updatedLeads.find((l) => l.id === prev.id);
        return fresh || null;
      });
    });

    const unsubscribeCold = subscribeToColdClients((updatedClients) => {
      setColdClients(updatedClients);
    });

    return () => {
      unsubscribeLeads();
      unsubscribeCold();
    };
  }, [isAuthenticated]);

  // 1. Role-Based Access Control (RBAC):
  // Admin can see ALL leads. Regular users (e.g. Ruby) see ONLY their own assigned leads.
  const userScopedLeads = useMemo(() => {
    if (!currentUser) return [];
    const isSuperUser =
      currentUser.username.toLowerCase() === "admin" ||
      currentUser.role.toLowerCase().includes("admin") ||
      currentUser.username.toLowerCase() === "accounts" ||
      currentUser.role.toLowerCase().includes("accounts") ||
      currentUser.username.toLowerCase() === "vikram" ||
      currentUser.role.toLowerCase().includes("delivery");

    if (isSuperUser) return leads;

    const activeName = (currentUser.name || "").toLowerCase().trim();
    const activeUser = (currentUser.username || "").toLowerCase().trim();

    return leads.filter((lead: Lead) => {
      const ownerStr = (lead.owner || "").toLowerCase().trim();
      return (
        ownerStr === activeName ||
        ownerStr === activeUser ||
        (activeName.length > 0 && (ownerStr.includes(activeName) || activeName.includes(ownerStr))) ||
        (activeUser.length > 0 && (ownerStr.includes(activeUser) || activeUser.includes(ownerStr)))
      );
    });
  }, [leads, currentUser]);

  // Scoped cold clients for outreach
  const userScopedColdClients = useMemo(() => {
    if (!currentUser) return [];
    const isUserAdmin =
      currentUser.username.toLowerCase() === "admin" ||
      currentUser.role.toLowerCase().includes("admin");

    if (isUserAdmin) return coldClients;

    const activeName = (currentUser.name || "").toLowerCase().trim();
    const activeUser = (currentUser.username || "").toLowerCase().trim();

    return coldClients.filter((c: ColdClient) => {
      const ownerStr = (c.owner || "").toLowerCase().trim();
      return (
        !ownerStr ||
        ownerStr === activeName ||
        ownerStr === activeUser ||
        (activeName.length > 0 && (ownerStr.includes(activeName) || activeName.includes(ownerStr))) ||
        (activeUser.length > 0 && (ownerStr.includes(activeUser) || activeUser.includes(ownerStr)))
      );
    });
  }, [coldClients, currentUser]);

  // 2. Filter user-scoped leads based on user toolbar selections
  const filteredLeads = userScopedLeads.filter((lead: Lead) => {
    // 1. Search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        lead.companyName.toLowerCase().includes(term) ||
        lead.contactName.toLowerCase().includes(term) ||
        lead.contactEmail.toLowerCase().includes(term) ||
        (lead.owner && lead.owner.toLowerCase().includes(term)) ||
        lead.industry.toLowerCase().includes(term);
      if (!matchSearch) return false;
    }

    // 2. Weightage filter
    if (selectedWeightage !== "all") {
      const currentWeight = STAGES[lead.stage]?.weightage ?? lead.weightage;
      if (currentWeight !== Number(selectedWeightage)) return false;
    }

    // 3. Stage filter
    if (selectedStage !== "all") {
      if (lead.stage !== selectedStage) return false;
    }

    // 4. From Date filter (Compares ISO date string YYYY-MM-DD)
    const leadDateStr = lead.updatedAt ? lead.updatedAt.slice(0, 10) : lead.createdAt.slice(0, 10);
    if (fromDate && leadDateStr < fromDate) return false;

    // 5. To Date filter
    if (toDate && leadDateStr > toDate) return false;

    // 6. Client Partner filter (for Admin to view specific individual's pipeline)
    const isAdmin =
      currentUser?.username.toLowerCase() === "admin" ||
      currentUser?.role.toLowerCase().includes("admin");

    if (isAdmin && selectedPartner !== "all") {
      const match = isSameOwner(lead.owner, selectedPartner);
      if (!match) return false;
    }

    // 7. Lead Source filter
    if (selectedLeadSource !== "all") {
      const src = (lead.leadSource || "").toLowerCase().trim();
      if (src !== selectedLeadSource.toLowerCase().trim()) return false;
    }

    // 8. Pitched Program filter
    if (selectedProgram !== "all") {
      const prg = (lead.program || "").toLowerCase().trim();
      if (prg !== selectedProgram.toLowerCase().trim()) return false;
    }

    return true;
  });

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setFromDate("");
    setToDate("");
    setSelectedWeightage("all");
    setSelectedStage("all");
    setSelectedPartner("all");
    setSelectedLeadSource("all");
    setSelectedProgram("all");
    if (currentUser) {
      saveUserPreferencesToFirestore(currentUser.username, {
        searchTerm: "",
        fromDate: "",
        toDate: "",
        selectedWeightage: "all",
        selectedStage: "all",
        selectedPartner: "all",
      });
    }
  };

  // Calculate total weighted pipeline across filtered leads
  const activeFilteredLeads = filteredLeads.filter((l: Lead) => l.stage !== "closed_lost");
  const totalWeightedPipeline = activeFilteredLeads.reduce(
    (acc: number, curr: Lead) => acc + (curr.dealValue || 0) * ((curr.weightage || 0) / 100),
    0
  );

  const handleCreateLead = async (leadData: Parameters<typeof createLead>[0]) => {
    const newLead = await createLead(leadData);
    setLeads((prev) => [newLead, ...prev.filter((l) => l.id !== newLead.id)]);
  };

  const handleBulkImport = async (importedLeads: Parameters<typeof createLead>[0][]) => {
    const activeUserName = currentUser?.name || "Unassigned";

    const preparedList = importedLeads.map((item) => ({
      ...item,
      owner: item.owner && item.owner.trim() !== "" ? item.owner.trim() : activeUserName,
    }));

    const createdList = await createLeadsBulk(preparedList);
    setLeads((prev) => [...createdList, ...prev]);
  };

  const handleUpdateStage = async (
    leadId: string,
    newStage: LeadStage,
    notes?: string
  ) => {
    const updated = await updateLeadStage(
      leadId,
      newStage,
      notes,
      currentUser?.name || "Sales Representative"
    );
    if (updated) {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)));
      setSelectedLead((prev) => (prev && prev.id === leadId ? updated : prev));
    }
  };

  const handleAddNote = async (leadId: string, noteText: string) => {
    const updated = await addJourneyNote(
      leadId,
      noteText,
      currentUser?.name || "Sales Representative"
    );
    if (updated) {
      setLeads((prev) => prev.map((l: Lead) => (l.id === leadId ? updated : l)));
      setSelectedLead((prev) => (prev && prev.id === leadId ? updated : prev));
    }
  };

  const handleUpdateDealValue = async (leadId: string, newDealValue: number) => {
    const updated = await updateDealValue(
      leadId,
      newDealValue,
      currentUser?.name || "Sales Representative"
    );
    if (updated) {
      setLeads((prev) => prev.map((l: Lead) => (l.id === leadId ? updated : l)));
      setSelectedLead((prev) => (prev && prev.id === leadId ? updated : prev));
    }
  };

  const handleUpdateProgram = async (leadId: string, newProgram: string) => {
    const updated = await updateLeadProgram(
      leadId,
      newProgram,
      currentUser?.name || "Sales Representative"
    );
    if (updated) {
      setLeads((prev) => prev.map((l: Lead) => (l.id === leadId ? updated : l)));
      setSelectedLead((prev) => (prev && prev.id === leadId ? updated : prev));
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    // Immediately update state for instantaneous UI response
    setLeads((prev) => prev.filter((l: Lead) => l.id !== leadId));
    setSelectedLead((prev) => (prev && prev.id === leadId ? null : prev));
    await deleteLead(leadId);
  };

  const handleUpdateOwner = async (leadId: string, newOwner: string) => {
    const updated = await updateLeadOwner(
      leadId,
      newOwner,
      currentUser?.name || "Administrator"
    );
    if (updated) {
      setLeads((prev) => prev.map((l: Lead) => (l.id === leadId ? updated : l)));
      setSelectedLead((prev) => (prev && prev.id === leadId ? updated : prev));
    }
  };

  const handleUpdateClosureMonth = async (leadId: string, closureMonth: string) => {
    const updated = await updateLeadClosureMonth(
      leadId,
      closureMonth,
      currentUser?.name || "Client Partner"
    );
    if (updated) {
      setLeads((prev) => prev.map((l: Lead) => (l.id === leadId ? updated : l)));
      setSelectedLead((prev) => (prev && prev.id === leadId ? updated : prev));
    }
  };

  const handleAttachApproachNote = async (leadId: string, approachNote: ApproachNote) => {
    const updated = await attachLeadApproachNote(
      leadId,
      approachNote,
      currentUser?.name || "Client Partner"
    );
    if (updated) {
      setLeads((prev) => prev.map((l: Lead) => (l.id === leadId ? updated : l)));
      setSelectedLead((prev) => (prev && prev.id === leadId ? updated : prev));
    }
  };

  const handleAttachApproachNotes = async (
    leadId: string,
    approachNotes: ApproachNote[]
  ) => {
    const updated = await attachLeadApproachNotes(
      leadId,
      approachNotes,
      currentUser?.name || "Client Partner"
    );
    if (updated) {
      setLeads((prev) => prev.map((l: Lead) => (l.id === leadId ? updated : l)));
      setSelectedLead((prev) => (prev && prev.id === leadId ? updated : prev));
    }
  };

  const handleRemoveApproachNote = async (leadId: string, noteId?: string) => {
    const updated = await removeLeadApproachNote(
      leadId,
      noteId,
      currentUser?.name || "Client Partner"
    );
    if (updated) {
      setLeads((prev) => prev.map((l: Lead) => (l.id === leadId ? updated : l)));
      setSelectedLead((prev) => (prev && prev.id === leadId ? updated : prev));
    }
  };

  const handleUpdateInvoiceDetails = async (
    leadId: string,
    invoiceData: { invoiceNumber?: string; invoiceDate?: string; invoiceAmount?: number }
  ) => {
    try {
      const updated = await updateLeadInvoiceDetails(
        leadId,
        invoiceData,
        currentUser?.name || "Client Partner"
      );
      if (updated && selectedLead && selectedLead.id === leadId) {
        setSelectedLead(updated);
      }
    } catch (err) {
      console.error("Failed to update lead invoice details:", err);
    }
  };

    const handleAttachFinancialDocuments = async (
    leadId: string,
    documents: FinancialDocument[]
  ) => {
    const updated = await attachLeadFinancialDocuments(
      leadId,
      documents,
      currentUser?.name || "Client Partner"
    );
    if (updated) {
      setLeads((prev) => prev.map((l: Lead) => (l.id === leadId ? updated : l)));
      setSelectedLead((prev) => (prev && prev.id === leadId ? updated : prev));
    }
  };

  const handleRemoveFinancialDocument = async (
    leadId: string,
    documentId: string
  ) => {
    const updated = await removeLeadFinancialDocument(
      leadId,
      documentId,
      currentUser?.name || "Client Partner"
    );
    if (updated) {
      setLeads((prev) => prev.map((l: Lead) => (l.id === leadId ? updated : l)));
      setSelectedLead((prev) => (prev && prev.id === leadId ? updated : prev));
    }
  };

  const handleUpdateLeadSource = async (leadId: string, newSource: string) => {
    const updated = await updateLeadSource(
      leadId,
      newSource,
      currentUser?.name || "Client Partner"
    );
    if (updated) {
      setLeads((prev) => prev.map((l: Lead) => (l.id === leadId ? updated : l)));
      setSelectedLead((prev) => (prev && prev.id === leadId ? updated : prev));
    }
  };

  const handleUpdateCompanyLogo = async (leadId: string, logoUrl: string) => {
    const updated = await updateLeadCompanyLogo(
      leadId,
      logoUrl,
      currentUser?.name || "Client Partner"
    );
    if (updated) {
      setLeads((prev) => prev.map((l: Lead) => (l.id === leadId ? updated : l)));
      setSelectedLead((prev) => (prev && prev.id === leadId ? updated : prev));
    }
  };

  const handleRemoveCompanyLogo = async (leadId: string) => {
    const updated = await removeLeadCompanyLogo(
      leadId,
      currentUser?.name || "Client Partner"
    );
    if (updated) {
      setLeads((prev) => prev.map((l: Lead) => (l.id === leadId ? updated : l)));
      setSelectedLead((prev) => (prev && prev.id === leadId ? updated : prev));
    }
  };

  const handleAddLeadContact = async (
    leadId: string,
    contact: {
      name: string;
      contactNumber?: string;
      email?: string;
      designation?: string;
    },
    isPrimary?: boolean
  ) => {
    const updated = await addLeadContact(
      leadId,
      contact,
      currentUser?.name || "Client Partner",
      isPrimary
    );
    if (updated) {
      setLeads((prev) => prev.map((l: Lead) => (l.id === leadId ? updated : l)));
      setSelectedLead((prev) => (prev && prev.id === leadId ? updated : prev));
    }
  };

  const handleRemoveLeadContact = async (leadId: string, contactId: string) => {
    const updated = await removeLeadContact(
      leadId,
      contactId,
      currentUser?.name || "Client Partner"
    );
    if (updated) {
      setLeads((prev) => prev.map((l: Lead) => (l.id === leadId ? updated : l)));
      setSelectedLead((prev) => (prev && prev.id === leadId ? updated : prev));
    }
  };

  const handleUpdatePrimaryContact = async (
    leadId: string,
    contactData: {
      contactName: string;
      contactPhone?: string;
      contactEmail: string;
      designation?: string;
    }
  ) => {
    const updated = await updateLeadPrimaryContact(
      leadId,
      contactData,
      currentUser?.name || "Client Partner"
    );
    if (updated) {
      setLeads((prev) => prev.map((l: Lead) => (l.id === leadId ? updated : l)));
      setSelectedLead((prev) => (prev && prev.id === leadId ? updated : prev));
    }
  };

  const handleEditLeadContact = async (
    leadId: string,
    contactId: string,
    contactData: {
      name: string;
      contactNumber?: string;
      email?: string;
      designation?: string;
    },
    isPrimary?: boolean
  ) => {
    const updated = await editLeadContact(
      leadId,
      contactId,
      contactData,
      currentUser?.name || "Client Partner",
      isPrimary
    );
    if (updated) {
      setLeads((prev) => prev.map((l: Lead) => (l.id === leadId ? updated : l)));
      setSelectedLead((prev) => (prev && prev.id === leadId ? updated : prev));
    }
  };

  const handleSetLeadPrimaryContact = async (
    leadId: string,
    contactId: string
  ) => {
    const updated = await setLeadPrimaryContact(
      leadId,
      contactId,
      currentUser?.name || "Client Partner"
    );
    if (updated) {
      setLeads((prev) => prev.map((l: Lead) => (l.id === leadId ? updated : l)));
      setSelectedLead((prev) => (prev && prev.id === leadId ? updated : prev));
    }
  };

  const handleExportLeads = () => {
    // Export all active leads in the system for admin
    exportLeadsToCSV(leads, "xMonks_B2B_All_Clients_Export");
  };

  // Cold Client / Outreach Handlers
  const handleAddColdClient = async (
    clientData: Omit<ColdClient, "id" | "createdAt" | "updatedAt" | "touchpoints"> & {
      initialNote?: string;
    }
  ) => {
    await addColdClient(clientData);
  };

  const handleBulkAddColdClients = async (
    clientsData: Array<Omit<ColdClient, "id" | "createdAt" | "updatedAt" | "touchpoints">>
  ) => {
    await bulkAddColdClients(clientsData);
  };

  const handleUpdateColdClient = async (id: string, updates: Partial<ColdClient>) => {
    await updateColdClient(id, updates);
  };

  const handleLogOutreachTouchpoint = async (
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
  ) => {
    await logOutreachTouchpoint(clientId, touchpoint);
  };

  const handleConvertToLead = async (
    client: ColdClient,
    dealValue: number,
    author: string,
    targetClosureMonth?: string
  ) => {
    await convertColdClientToLead(client, dealValue, author, targetClosureMonth);
  };

  const handleDeleteColdClient = async (id: string) => {
    await deleteColdClient(id);
  };

  const handleBulkUpdateColdClients = async (
    clientIds: string[],
    updates: Partial<ColdClient>,
    touchpointNote?: string
  ) => {
    await bulkUpdateColdClients(
      clientIds,
      updates,
      touchpointNote,
      currentUser?.name || "Sales Representative"
    );
  };

  const handleBulkDeleteColdClients = async (clientIds: string[]) => {
    await bulkDeleteColdClients(clientIds);
  };

  const handleAddOutreachAdminComment = async (clientId: string, commentText: string) => {
    if (!currentUser) return;
    await addAdminCommentToColdClient(clientId, commentText, currentUser);
  };

  const handleMarkOutreachAdminCommentRead = async (clientId: string, commentId: string) => {
    await markAdminCommentRead(clientId, commentId);
  };

  const handleReplyToAdminComment = async (
    clientId: string,
    commentId: string,
    replyText: string
  ) => {
    if (!currentUser) return;
    await addReplyToAdminComment(clientId, commentId, replyText, currentUser);
  };

  // Outreach selected client & Screen Notifications state
  const [selectedOutreachClientId, setSelectedOutreachClientId] = useState<string | null>(null);
  const [dismissedDirectiveIds, setDismissedDirectiveIds] = useState<string[]>([]);
  const [dismissedFollowupReminderIds, setDismissedFollowupReminderIds] = useState<string[]>([]);
  const [isFloatingFollowupDismissed, setIsFloatingFollowupDismissed] = useState<boolean>(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [notificationCenterTab, setNotificationCenterTab] = useState<"followups" | "directives" | "history">("followups");
  const [followupFilterTab, setFollowupFilterTab] = useState<"all" | "today" | "overdue" | "upcoming">("all");
  const [followupSearch, setFollowupSearch] = useState("");
  const [activeInlineReplyId, setActiveInlineReplyId] = useState<string | null>(null);
  const [inlineReplyText, setInlineReplyText] = useState("");
  const [isSubmittingInlineReply, setIsSubmittingInlineReply] = useState(false);
  const [notificationHistorySearch, setNotificationHistorySearch] = useState("");
  const [completingFollowupId, setCompletingFollowupId] = useState<string | null>(null);
  const [isCompletingAllToday, setIsCompletingAllToday] = useState<boolean>(false);

  // Upcoming Follow-up Reminders for Outreach Clients and Pipeline Leads
  const followupReminders = useMemo(() => {
    if (!currentUser) return [];
    const uName = (currentUser.name || "").toLowerCase().trim();
    const uUser = (currentUser.username || "").toLowerCase().trim();
    const isUserAdmin =
      currentUser.username.toLowerCase() === "admin" ||
      currentUser.role.toLowerCase().includes("admin");

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const list: Array<{
      id: string;
      sourceType: "outreach" | "pipeline";
      companyName: string;
      companyLogo?: string;
      contactName: string;
      contactEmail?: string;
      contactPhone?: string;
      designation?: string;
      owner: string;
      followUpDate: string;
      followUpTime?: string;
      statusBadge: string;
      notes?: string;
      urgency: "overdue" | "due_today" | "due_tomorrow" | "upcoming";
      urgencyLabel: string;
      daysDiff: number;
      rawItem: ColdClient | Lead;
    }> = [];

    // 1. Outreach follow-ups
    for (const client of coldClients) {
      if (client.status === "converted" || client.status === "not_interested") continue;

      const owner = (client.owner || "").toLowerCase().trim();
      const isOwner =
        owner === uName ||
        owner === uUser ||
        (uName.length > 0 && (owner.includes(uName) || uName.includes(owner))) ||
        (uUser.length > 0 && (owner.includes(uUser) || uUser.includes(owner)));

      if (!isOwner && !isUserAdmin) continue;

      if (client.nextFollowUpDate && client.nextFollowUpDate.trim() !== "") {
        const dateStr = client.nextFollowUpDate.slice(0, 10);
        const targetDate = new Date(dateStr + "T00:00:00");
        const currentDate = new Date(todayStr + "T00:00:00");
        const diffDays = Math.round((targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

        let urgency: "overdue" | "due_today" | "due_tomorrow" | "upcoming" = "upcoming";
        let urgencyLabel = `In ${diffDays} days`;

        if (diffDays < 0) {
          urgency = "overdue";
          urgencyLabel = `${Math.abs(diffDays)}d Overdue`;
        } else if (diffDays === 0) {
          urgency = "due_today";
          urgencyLabel = "Due Today";
        } else if (diffDays === 1) {
          urgency = "due_tomorrow";
          urgencyLabel = "Due Tomorrow";
        }

        const lastTouchpoint = Array.isArray(client.touchpoints) && client.touchpoints.length > 0
          ? client.touchpoints[client.touchpoints.length - 1]
          : null;

        list.push({
          id: client.id,
          sourceType: "outreach",
          companyName: client.companyName,
          companyLogo: client.companyLogo,
          contactName: client.contactName,
          contactEmail: client.email,
          contactPhone: client.phone,
          designation: client.designation,
          owner: client.owner || "Unassigned",
          followUpDate: dateStr,
          followUpTime: client.nextFollowUpTime,
          statusBadge: client.status.replace(/_/g, " ").toUpperCase(),
          notes: client.notes || lastTouchpoint?.summary || "",
          urgency,
          urgencyLabel,
          daysDiff: diffDays,
          rawItem: client,
        });
      }
    }

    // 2. Pipeline leads with expected target closing date upcoming / overdue
    for (const lead of leads) {
      if (lead.stage === "closure" || lead.stage === "closed_lost") continue;

      const owner = (lead.owner || "").toLowerCase().trim();
      const isOwner =
        owner === uName ||
        owner === uUser ||
        (uName.length > 0 && (owner.includes(uName) || uName.includes(owner))) ||
        (uUser.length > 0 && (owner.includes(uUser) || uUser.includes(owner)));

      if (!isOwner && !isUserAdmin) continue;

      if (lead.expectedCloseDate && lead.expectedCloseDate.trim() !== "") {
        const dateStr = lead.expectedCloseDate.slice(0, 10);
        const targetDate = new Date(dateStr + "T00:00:00");
        const currentDate = new Date(todayStr + "T00:00:00");
        const diffDays = Math.round((targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= 14) {
          let urgency: "overdue" | "due_today" | "due_tomorrow" | "upcoming" = "upcoming";
          let urgencyLabel = `In ${diffDays} days`;

          if (diffDays < 0) {
            urgency = "overdue";
            urgencyLabel = `${Math.abs(diffDays)}d Overdue`;
          } else if (diffDays === 0) {
            urgency = "due_today";
            urgencyLabel = "Closing Today";
          } else if (diffDays === 1) {
            urgency = "due_tomorrow";
            urgencyLabel = "Closing Tomorrow";
          }

          list.push({
            id: lead.id,
            sourceType: "pipeline",
            companyName: lead.companyName,
            companyLogo: lead.companyLogo,
            contactName: lead.contactName,
            contactEmail: lead.contactEmail,
            contactPhone: lead.contactPhone,
            designation: lead.designation,
            owner: lead.owner || "Unassigned",
            followUpDate: dateStr,
            statusBadge: `${lead.stage.toUpperCase()} (${lead.weightage}%)`,
            notes: lead.notes || "",
            urgency,
            urgencyLabel,
            daysDiff: diffDays,
            rawItem: lead,
          });
        }
      }
    }

    return list.sort((a, b) => {
      const order = { overdue: 0, due_today: 1, due_tomorrow: 2, upcoming: 3 };
      if (order[a.urgency] !== order[b.urgency]) {
        return order[a.urgency] - order[b.urgency];
      }
      return a.daysDiff - b.daysDiff;
    });
  }, [coldClients, leads, currentUser]);

  const dueTodayFollowups = useMemo(() => {
    return followupReminders.filter((f) => f.urgency === "due_today");
  }, [followupReminders]);

  const overdueFollowups = useMemo(() => {
    return followupReminders.filter((f) => f.urgency === "overdue");
  }, [followupReminders]);

  const upcomingFollowupsOnly = useMemo(() => {
    return followupReminders.filter((f) => f.urgency === "due_tomorrow" || f.urgency === "upcoming");
  }, [followupReminders]);

  const urgentFollowupsCount = dueTodayFollowups.length + overdueFollowups.length;

  const activeFloatingFollowup = useMemo(() => {
    if (isFloatingFollowupDismissed) return null;
    return (
      dueTodayFollowups.find((f) => !dismissedFollowupReminderIds.includes(f.id)) ||
      overdueFollowups.find((f) => !dismissedFollowupReminderIds.includes(f.id)) ||
      null
    );
  }, [dueTodayFollowups, overdueFollowups, dismissedFollowupReminderIds, isFloatingFollowupDismissed]);

  const displayedFollowups = useMemo(() => {
    let res = followupReminders;
    if (followupFilterTab === "today") {
      res = res.filter((f) => f.urgency === "due_today");
    } else if (followupFilterTab === "overdue") {
      res = res.filter((f) => f.urgency === "overdue");
    } else if (followupFilterTab === "upcoming") {
      res = res.filter((f) => f.urgency === "due_tomorrow" || f.urgency === "upcoming");
    }
    if (followupSearch.trim()) {
      const q = followupSearch.toLowerCase().trim();
      res = res.filter(
        (f) =>
          f.companyName.toLowerCase().includes(q) ||
          f.contactName.toLowerCase().includes(q) ||
          (f.notes && f.notes.toLowerCase().includes(q))
      );
    }
    return res;
  }, [followupReminders, followupFilterTab, followupSearch]);

  // Compute all leadership directives (both read and unread, plus replies) for notification history
  const allAdminDirectives = useMemo(() => {
    if (!currentUser) return [];
    const uName = (currentUser.name || "").toLowerCase().trim();
    const uUser = (currentUser.username || "").toLowerCase().trim();
    const isUserAdmin =
      currentUser.username.toLowerCase() === "admin" ||
      currentUser.role.toLowerCase().includes("admin");

    const list: Array<{
      clientId: string;
      client: ColdClient;
      comment: AdminComment;
    }> = [];

    for (const client of coldClients) {
      const owner = (client.owner || "").toLowerCase().trim();
      const isOwner =
        owner === uName ||
        owner === uUser ||
        (uName.length > 0 && (owner.includes(uName) || uName.includes(owner))) ||
        (uUser.length > 0 && (owner.includes(uUser) || uUser.includes(owner)));

      if ((isOwner || isUserAdmin) && Array.isArray(client.adminComments)) {
        for (const cm of client.adminComments) {
          list.push({ clientId: client.id, client, comment: cm });
        }
      }
    }

    return list.sort(
      (a, b) => new Date(b.comment.createdAt).getTime() - new Date(a.comment.createdAt).getTime()
    );
  }, [coldClients, currentUser]);

  // Filtered history based on search query
  const filteredHistoryDirectives = useMemo(() => {
    if (!notificationHistorySearch.trim()) return allAdminDirectives;
    const term = notificationHistorySearch.toLowerCase().trim();
    return allAdminDirectives.filter((d) => {
      const company = (d.client.companyName || "").toLowerCase();
      const comment = (d.comment.comment || "").toLowerCase();
      const author = (d.comment.author || "").toLowerCase();
      const hasMatchingReply = Array.isArray(d.comment.replies) && d.comment.replies.some(
        (r) => r.reply.toLowerCase().includes(term) || r.author.toLowerCase().includes(term)
      );
      return company.includes(term) || comment.includes(term) || author.includes(term) || hasMatchingReply;
    });
  }, [allAdminDirectives, notificationHistorySearch]);

  // Compute unread leadership directives for currentUser's owned leads
  const unreadAdminDirectives = useMemo(() => {
    if (!currentUser) return [];
    const uName = (currentUser.name || "").toLowerCase().trim();
    const uUser = (currentUser.username || "").toLowerCase().trim();

    const list: Array<{
      clientId: string;
      client: ColdClient;
      comment: AdminComment;
    }> = [];

    for (const client of coldClients) {
      const owner = (client.owner || "").toLowerCase().trim();
      const isOwner =
        owner === uName ||
        owner === uUser ||
        (uName.length > 0 && (owner.includes(uName) || uName.includes(owner))) ||
        (uUser.length > 0 && (owner.includes(uUser) || uUser.includes(owner)));

      if (isOwner && Array.isArray(client.adminComments)) {
        for (const cm of client.adminComments) {
          if (!cm.readByOwner) {
            list.push({ clientId: client.id, client, comment: cm });
          }
        }
      }
    }

    return list;
  }, [coldClients, currentUser]);

  const totalNotificationsCount = unreadAdminDirectives.length + urgentFollowupsCount;

  const activeFloatingDirective = useMemo(() => {
    return unreadAdminDirectives.find((d) => !dismissedDirectiveIds.includes(d.comment.id)) || null;
  }, [unreadAdminDirectives, dismissedDirectiveIds]);

  // Mark a single follow-up reminder as completed
  const handleMarkFollowupCompleted = async (f: {
    id: string;
    sourceType: "outreach" | "pipeline";
    companyName: string;
    [key: string]: unknown;
  }) => {
    try {
      setCompletingFollowupId(f.id);
      const author = currentUser?.name || currentUser?.username || "Admin User";

      if (f.sourceType === "outreach") {
        // Optimistically update coldClients state
        setColdClients((prev) =>
          prev.map((c) =>
            c.id === f.id
              ? {
                  ...c,
                  nextFollowUpDate: "",
                  nextFollowUpTime: "",
                  lastContactDate: new Date().toISOString().split("T")[0],
                }
              : c
          )
        );

        await completeColdClientFollowup(f.id, author);
      } else {
        // Pipeline Lead
        setLeads((prev) =>
          prev.map((l) =>
            l.id === f.id
              ? {
                  ...l,
                  expectedCloseDate: "",
                }
              : l
          )
        );

        await completeLeadFollowup(f.id, author);
      }

      // Small confetti celebration
      try {
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.25, x: 0.8 },
        });
      } catch {}
    } catch (err) {
      console.error("Error marking followup as completed:", err);
    } finally {
      setCompletingFollowupId(null);
    }
  };

  // Mark all today follow-ups as completed in one click
  const handleMarkAllTodayFollowupsCompleted = async () => {
    if (dueTodayFollowups.length === 0) return;
    try {
      setIsCompletingAllToday(true);
      const author = currentUser?.name || currentUser?.username || "Admin User";

      // Optimistically clear all today follow-ups from local state
      const todayIds = new Set(dueTodayFollowups.map((f) => f.id));
      setColdClients((prev) =>
        prev.map((c) =>
          todayIds.has(c.id)
            ? {
                ...c,
                nextFollowUpDate: "",
                nextFollowUpTime: "",
                lastContactDate: new Date().toISOString().split("T")[0],
              }
            : c
        )
      );
      setLeads((prev) =>
        prev.map((l) =>
          todayIds.has(l.id)
            ? {
                ...l,
                expectedCloseDate: "",
              }
            : l
        )
      );

      for (const f of dueTodayFollowups) {
        if (f.sourceType === "outreach") {
          await completeColdClientFollowup(f.id, author);
        } else {
          await completeLeadFollowup(f.id, author);
        }
      }

      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.3, x: 0.8 },
        });
      } catch {}
    } catch (err) {
      console.error("Error completing all today followups:", err);
    } finally {
      setIsCompletingAllToday(false);
    }
  };

  // Send Closure Lead to Delivery
  const [deliveryToast, setDeliveryToast] = useState<{
    show: boolean;
    companyName: string;
    leadId: string;
  } | null>(null);

  const handleSendToDelivery = async (lead: Lead) => {
    // 1. Create/link record in delivery pipeline
    await createDeliveryRecordFromLead(lead, "delivery", currentUser?.name || "Delivery Lead");

    // 2. Confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}

    // 3. Show notification toast
    setDeliveryToast({
      show: true,
      companyName: lead.companyName,
      leadId: lead.id,
    });
  };

  // Alias for backward compatibility
  const handleMoveLeadToBilling = handleSendToDelivery;

  if (!isClient || isInitialPageLoading) {
    return (
      <MoneyLottieLoader
        mode="fullscreen"
        title="Loading xMonks B2B Workspace..."
        subtitle="Synchronizing live pipeline, revenue & financials"
        durationMs={2000}
        onComplete={() => setIsInitialPageLoading(false)}
      />
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenBulkModal={() => setIsBulkModalOpen(true)}
        onOpenChangePassword={() => setIsChangePasswordModalOpen(true)}
        onExportLeads={handleExportLeads}
        onLogout={handleLogout}
        currentUser={currentUser}
        isFirebaseSyncing={isFirebaseSyncing}
        totalLeadsCount={
          activeTab === "outreach" || activeTab === "touchpoints"
            ? (outreachFilteredCount ?? userScopedColdClients.length)
            : filteredLeads.length
        }
        totalWeightedPipeline={totalWeightedPipeline}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-9 pb-6">
          {/* Top Header Status & Notification Center Strip */}
          <div className="flex items-center justify-between pt-2 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Logged in as <span className="font-bold text-slate-900 dark:text-white">{currentUser?.name || "User"}</span>
              </span>
              <span className="text-xs text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs text-slate-400 font-medium capitalize">
                {currentUser?.role || "Team Member"}
              </span>
            </div>

            {/* Center: Daily/Hourly Sales Motivation & Humor Quote */}
            <SalesQuoteBanner />

            {/* Right: Live Follow-up Reminder Pill + Notifications Trigger */}
            <div className="flex items-center space-x-2.5 shrink-0">
              {/* On-Screen Follow-up Alert Pill (Live Header Reminder) */}
              {followupReminders.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsNotificationCenterOpen(true);
                    setNotificationCenterTab("followups");
                    if (dueTodayFollowups.length > 0) setFollowupFilterTab("today");
                    else if (overdueFollowups.length > 0) setFollowupFilterTab("overdue");
                    else setFollowupFilterTab("all");
                  }}
                  className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border shadow-xs ${
                    dueTodayFollowups.length > 0
                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 animate-pulse ring-2 ring-amber-400/20"
                      : overdueFollowups.length > 0
                      ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-300 ring-2 ring-rose-400/20"
                      : "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                  }`}
                  title="Click to view follow-up schedule & reminders"
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {dueTodayFollowups.length > 0
                      ? `${dueTodayFollowups.length} Due Today`
                      : overdueFollowups.length > 0
                      ? `${overdueFollowups.length} Overdue`
                      : `${upcomingFollowupsOnly.length} Upcoming`}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/70 dark:bg-slate-900/70 font-black">
                    Follow-ups
                  </span>
                </button>
              )}

              {/* Notification Center Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsNotificationCenterOpen(!isNotificationCenterOpen)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    totalNotificationsCount > 0
                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 ring-2 ring-amber-400/20"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                  title="Notifications & Upcoming Follow-up Reminders"
                >
                  <Bell className={`w-3.5 h-3.5 ${totalNotificationsCount > 0 ? "text-amber-600 dark:text-amber-400 animate-bounce" : ""}`} />
                  <span className="hidden sm:inline">Notifications</span>
                  {totalNotificationsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-xs">
                      {totalNotificationsCount}
                    </span>
                  )}
                </button>

                {/* Notification Center Dropdown */}
                {isNotificationCenterOpen && (
                  <div className="absolute right-0 mt-2 w-[350px] sm:w-[500px] max-w-[95vw] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50 space-y-3 animate-in fade-in zoom-in-95">
                    {/* Dropdown Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            Notifications & Reminders
                          </h4>
                          <p className="text-[10px] text-slate-500">
                            Upcoming follow-ups, leadership directives & activity history
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsNotificationCenterOpen(false)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Notification Center Tabs */}
                    <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs gap-1">
                      <button
                        type="button"
                        onClick={() => setNotificationCenterTab("followups")}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          notificationCenterTab === "followups"
                            ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Follow-ups</span>
                        {urgentFollowupsCount > 0 ? (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-white">
                            {urgentFollowupsCount}
                          </span>
                        ) : followupReminders.length > 0 ? (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {followupReminders.length}
                          </span>
                        ) : null}
                      </button>

                      <button
                        type="button"
                        onClick={() => setNotificationCenterTab("directives")}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          notificationCenterTab === "directives"
                            ? "bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Directives</span>
                        {unreadAdminDirectives.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-white">
                            {unreadAdminDirectives.length}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setNotificationCenterTab("history")}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          notificationCenterTab === "history"
                            ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>History</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {allAdminDirectives.length}
                        </span>
                      </button>
                    </div>

                    {/* TAB: FOLLOW-UP REMINDERS */}
                    {notificationCenterTab === "followups" && (
                      <div className="space-y-2.5">
                        {/* Sub-Filter Chips */}
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setFollowupFilterTab("all")}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
                                followupFilterTab === "all"
                                  ? "bg-indigo-600 text-white"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              All ({followupReminders.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setFollowupFilterTab("today")}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
                                followupFilterTab === "today"
                                  ? "bg-amber-500 text-white"
                                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                              }`}
                            >
                              Today ({dueTodayFollowups.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setFollowupFilterTab("overdue")}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
                                followupFilterTab === "overdue"
                                  ? "bg-rose-500 text-white"
                                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                              }`}
                            >
                              Overdue ({overdueFollowups.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setFollowupFilterTab("upcoming")}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
                                followupFilterTab === "upcoming"
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              Upcoming ({upcomingFollowupsOnly.length})
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            {followupFilterTab === "today" && dueTodayFollowups.length > 0 && (
                              <button
                                type="button"
                                onClick={handleMarkAllTodayFollowupsCompleted}
                                disabled={isCompletingAllToday}
                                className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <CheckCheck className="w-3 h-3" />
                                <span>{isCompletingAllToday ? "Completing all..." : "Mark all as completed"}</span>
                              </button>
                            )}
                            <span className="text-[10px] text-slate-400 font-medium">
                              {displayedFollowups.length} scheduled
                            </span>
                          </div>
                        </div>

                        {/* Search input if > 3 follow-ups */}
                        {followupReminders.length > 3 && (
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                            <input
                              type="text"
                              value={followupSearch}
                              onChange={(e) => setFollowupSearch(e.target.value)}
                              placeholder="Search follow-up company or notes..."
                              className="w-full pl-8 pr-3 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        )}

                        {/* Follow-ups List */}
                        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                          {displayedFollowups.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                              <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-500" />
                              <p className="font-bold text-slate-700 dark:text-slate-200">
                                No follow-up reminders pending!
                              </p>
                              <p className="text-[11px] text-slate-400">
                                You are completely on track with your upcoming outreach schedule.
                              </p>
                            </div>
                          ) : (
                            displayedFollowups.map((f) => (
                              <div
                                key={`${f.sourceType}-${f.id}`}
                                className={`p-3 rounded-2xl border text-xs space-y-2 transition ${
                                  f.urgency === "overdue"
                                    ? "border-rose-300 dark:border-rose-800/80 bg-rose-50/60 dark:bg-rose-950/20"
                                    : f.urgency === "due_today"
                                    ? "border-amber-300 dark:border-amber-700/80 bg-amber-50/70 dark:bg-amber-950/30"
                                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center space-x-2">
                                    {f.companyLogo ? (
                                      <img
                                        src={f.companyLogo}
                                        alt={f.companyName}
                                        className="w-6 h-6 rounded-md object-contain bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 shrink-0"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-black text-[10px] flex items-center justify-center border border-indigo-200 dark:border-indigo-800 shrink-0">
                                        {f.companyName.slice(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                    <div>
                                      <h5 className="font-black text-slate-900 dark:text-white text-xs truncate max-w-[200px]">
                                        {f.companyName}
                                      </h5>
                                      <div className="text-[10px] text-slate-500 flex items-center space-x-1.5">
                                        <span>{f.contactName}</span>
                                        {f.designation && <span>• {f.designation}</span>}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Urgency Badge */}
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap ${
                                      f.urgency === "overdue"
                                        ? "bg-rose-500 text-white"
                                        : f.urgency === "due_today"
                                        ? "bg-amber-500 text-white"
                                        : "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                                    }`}
                                  >
                                    {f.urgencyLabel}
                                  </span>
                                </div>

                                {/* Schedule time & Source */}
                                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                  <div className="flex items-center space-x-1.5">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    <span className="font-bold text-slate-700 dark:text-slate-200">
                                      {f.followUpDate}
                                    </span>
                                    {f.followUpTime && (
                                      <>
                                        <span>•</span>
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                                          {f.followUpTime}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    {f.sourceType === "outreach" ? "Outreach" : "Pipeline"}
                                  </span>
                                </div>

                                {f.notes && (
                                  <p className="text-[11px] text-slate-700 dark:text-slate-300 italic line-clamp-2 bg-white/50 dark:bg-slate-900/40 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800/60">
                                    "{f.notes}"
                                  </p>
                                )}

                                {/* Action Buttons */}
                                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                                  <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                                    {f.contactPhone && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="w-2.5 h-2.5" /> {f.contactPhone}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {(f.urgency === "due_today" || f.urgency === "overdue" || followupFilterTab === "today") && (
                                      <button
                                        type="button"
                                        onClick={() => handleMarkFollowupCompleted(f)}
                                        disabled={completingFollowupId === f.id || isCompletingAllToday}
                                        className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg transition flex items-center space-x-1 cursor-pointer disabled:opacity-50 shadow-2xs"
                                        title="Mark this follow-up as completed"
                                      >
                                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                        <span>
                                          {completingFollowupId === f.id ? "Completing..." : "Mark as completed"}
                                        </span>
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (f.sourceType === "outreach") {
                                          setSelectedOutreachClientId(f.id);
                                          handleTabChange("outreach");
                                        } else {
                                          setSelectedLead(f.rawItem as Lead);
                                        }
                                        setIsNotificationCenterOpen(false);
                                      }}
                                      className="px-2.5 py-1 text-[11px] font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-xs flex items-center space-x-1 cursor-pointer"
                                    >
                                      <span>Open {f.sourceType === "outreach" ? "Outreach" : "Lead"}</span>
                                      <ArrowRight className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                  {/* Tab 2: Admin Directives */}
                  {notificationCenterTab === "directives" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] px-1 text-slate-500">
                        <span>{unreadAdminDirectives.length} unread directive(s)</span>
                        {unreadAdminDirectives.length > 0 && (
                          <button
                            type="button"
                            onClick={async () => {
                              for (const d of unreadAdminDirectives) {
                                await handleMarkOutreachAdminCommentRead(d.clientId, d.comment.id);
                              }
                            }}
                            className="text-[10px] text-amber-600 hover:text-amber-700 dark:text-amber-400 font-bold cursor-pointer underline"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>

                      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                        {unreadAdminDirectives.length === 0 ? (
                          <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                            <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-500" />
                            <p className="font-bold text-slate-700 dark:text-slate-200">All caught up!</p>
                            <p className="text-[11px] text-slate-400">
                              No unread leadership directives pending your review.
                            </p>
                            <button
                              type="button"
                              onClick={() => setNotificationCenterTab("history")}
                              className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                            >
                              <History className="w-3 h-3" /> View past notifications & replies
                            </button>
                          </div>
                        ) : (
                          unreadAdminDirectives.map((d) => (
                            <div
                              key={d.comment.id}
                              className="p-3 rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/30 text-xs space-y-2 hover:border-amber-400 transition"
                            >
                              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                                <span className="truncate max-w-[220px] text-amber-950 dark:text-amber-100 font-extrabold">
                                  {d.client.companyName}
                                </span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                  {new Date(d.comment.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-800 dark:text-slate-200 leading-relaxed italic bg-white/70 dark:bg-slate-900/60 p-2 rounded-xl border border-amber-200/50 dark:border-amber-900/40">
                                "{d.comment.comment}"
                              </p>

                              {/* Previous Replies if any */}
                              {Array.isArray(d.comment.replies) && d.comment.replies.length > 0 && (
                                <div className="space-y-1 pl-2 border-l-2 border-indigo-400">
                                  {d.comment.replies.map((rp) => (
                                    <div key={rp.id} className="text-[10px] text-slate-600 dark:text-slate-300">
                                      <strong className="text-indigo-600 dark:text-indigo-400">{rp.author}:</strong> {rp.reply}
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-1 border-t border-amber-200/40 dark:border-amber-800/40">
                                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                                  From: {d.comment.author}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveInlineReplyId(activeInlineReplyId === d.comment.id ? null : d.comment.id);
                                      setInlineReplyText("");
                                    }}
                                    className="px-2 py-1 text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <Reply className="w-2.5 h-2.5" />
                                    <span>Reply</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await handleMarkOutreachAdminCommentRead(d.clientId, d.comment.id);
                                    }}
                                    className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                                  >
                                    Mark Read
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedOutreachClientId(d.clientId);
                                      handleTabChange("outreach");
                                      setIsNotificationCenterOpen(false);
                                    }}
                                    className="px-2 py-1 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                                  >
                                    View Lead
                                  </button>
                                </div>
                              </div>

                              {/* Inline Reply Input */}
                              {activeInlineReplyId === d.comment.id && (
                                <div className="pt-2 border-t border-amber-200 dark:border-amber-800/60 space-y-1.5 animate-in fade-in">
                                  <textarea
                                    rows={2}
                                    value={inlineReplyText}
                                    onChange={(e) => setInlineReplyText(e.target.value)}
                                    placeholder={`Reply to ${d.comment.author}...`}
                                    className="w-full p-2 text-xs rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder:text-slate-400"
                                  />
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setActiveInlineReplyId(null)}
                                      className="px-2 py-1 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      disabled={!inlineReplyText.trim() || isSubmittingInlineReply}
                                      onClick={async () => {
                                        try {
                                          setIsSubmittingInlineReply(true);
                                          await handleReplyToAdminComment(d.clientId, d.comment.id, inlineReplyText.trim());
                                          setInlineReplyText("");
                                          setActiveInlineReplyId(null);
                                        } catch (e) {
                                          console.error(e);
                                        } finally {
                                          setIsSubmittingInlineReply(false);
                                        }
                                      }}
                                      className="px-2.5 py-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                                    >
                                      <SendHorizontal className="w-2.5 h-2.5" />
                                      <span>{isSubmittingInlineReply ? "Sending..." : "Send Reply"}</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Notification History & Replies */}
                  {notificationCenterTab === "history" && (
                    <div className="space-y-2.5">
                      {/* Search in History */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          value={notificationHistorySearch}
                          onChange={(e) => setNotificationHistorySearch(e.target.value)}
                          placeholder="Search notifications history or replies..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                        {filteredHistoryDirectives.length === 0 ? (
                          <div className="py-8 text-center text-xs text-slate-400">
                            <History className="w-7 h-7 mx-auto text-slate-400 mb-1" />
                            <p className="font-semibold text-slate-600 dark:text-slate-300">No notifications found</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {notificationHistorySearch ? "No matches for your search." : "No past directives logged yet."}
                            </p>
                          </div>
                        ) : (
                          filteredHistoryDirectives.map((d) => {
                            const hasReplies = Array.isArray(d.comment.replies) && d.comment.replies.length > 0;
                            return (
                              <div
                                key={d.comment.id}
                                className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs space-y-2 shadow-2xs"
                              >
                                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                                  <div className="flex items-center gap-1.5 truncate max-w-[240px]">
                                    <span className="truncate font-extrabold text-slate-900 dark:text-slate-100">
                                      {d.client.companyName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {hasReplies ? (
                                      <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                        Replied ({d.comment.replies!.length})
                                      </span>
                                    ) : d.comment.readByOwner ? (
                                      <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-0.5">
                                        <Check className="w-2.5 h-2.5" /> Read
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                        Unread
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-800 dark:text-slate-200 leading-relaxed">
                                  "{d.comment.comment}"
                                </div>

                                {/* Threaded Replies in History */}
                                {hasReplies && (
                                  <div className="space-y-1.5 pl-2.5 border-l-2 border-indigo-400">
                                    <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                                      <CornerDownRight className="w-3 h-3 text-indigo-500" />
                                      <span>Replies</span>
                                    </div>
                                    {d.comment.replies!.map((rp) => (
                                      <div
                                        key={rp.id}
                                        className="bg-indigo-50/50 dark:bg-indigo-950/30 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900/40 text-[10px] space-y-0.5"
                                      >
                                        <div className="flex items-center justify-between text-[9px]">
                                          <span className="font-bold text-slate-800 dark:text-slate-200">
                                            {rp.author} <span className="font-normal text-slate-400">({rp.authorRole || "User"})</span>
                                          </span>
                                          <span className="text-slate-400 font-mono">
                                            {new Date(rp.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + new Date(rp.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                                          </span>
                                        </div>
                                        <p className="text-slate-700 dark:text-slate-300 text-[11px]">
                                          {rp.reply}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                                  <span className="text-slate-400">
                                    From {d.comment.author} • {new Date(d.comment.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveInlineReplyId(activeInlineReplyId === d.comment.id ? null : d.comment.id);
                                        setInlineReplyText("");
                                      }}
                                      className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-md border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1 cursor-pointer"
                                    >
                                      <Reply className="w-2.5 h-2.5" />
                                      <span>Reply</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedOutreachClientId(d.clientId);
                                        handleTabChange("outreach");
                                        setIsNotificationCenterOpen(false);
                                      }}
                                      className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md cursor-pointer"
                                    >
                                      View Lead
                                    </button>
                                  </div>
                                </div>

                                {/* Inline reply inside history */}
                                {activeInlineReplyId === d.comment.id && (
                                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5 animate-in fade-in">
                                    <textarea
                                      rows={2}
                                      value={inlineReplyText}
                                      onChange={(e) => setInlineReplyText(e.target.value)}
                                      placeholder={`Write a reply to ${d.comment.author}...`}
                                      className="w-full p-2 text-xs rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                    />
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setActiveInlineReplyId(null)}
                                        className="px-2 py-1 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        disabled={!inlineReplyText.trim() || isSubmittingInlineReply}
                                        onClick={async () => {
                                          try {
                                            setIsSubmittingInlineReply(true);
                                            await handleReplyToAdminComment(d.clientId, d.comment.id, inlineReplyText.trim());
                                            setInlineReplyText("");
                                            setActiveInlineReplyId(null);
                                          } catch (e) {
                                            console.error(e);
                                          } finally {
                                            setIsSubmittingInlineReply(false);
                                          }
                                        }}
                                        className="px-2.5 py-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                                      >
                                        <SendHorizontal className="w-2.5 h-2.5" />
                                        <span>{isSubmittingInlineReply ? "Sending..." : "Send Reply"}</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPI Dashboard Summary Bar & Filter Bar for Lead Management tabs */}
        {!isRestrictedToDelivery && (activeTab === "kanban" || activeTab === "table" || activeTab === "analytics") && (
          <>
            <DashboardStats leads={filteredLeads} />
            <FilterBar
              searchTerm={searchTerm}
              setSearchTerm={handleSearchChange}
              fromDate={fromDate}
              setFromDate={handleFromDateChange}
              toDate={toDate}
              setToDate={handleToDateChange}
              selectedWeightage={selectedWeightage}
              setSelectedWeightage={handleWeightageChange}
              selectedStage={selectedStage}
              setSelectedStage={handleStageChange}
              selectedPartner={selectedPartner}
              setSelectedPartner={handlePartnerChange}
              selectedLeadSource={selectedLeadSource}
              setSelectedLeadSource={handleLeadSourceChange}
              selectedProgram={selectedProgram}
              setSelectedProgram={handleProgramChange}
              isAdmin={isAdmin}
              onResetFilters={handleResetFilters}
              filteredCount={filteredLeads.length}
              totalCount={userScopedLeads.length}
            />
          </>
        )}

        {/* Tab Views */}
        {!isRestrictedToDelivery && activeTab === "kanban" && (
          <KanbanBoard
            leads={filteredLeads}
            onSelectLead={(lead) => setSelectedLead(lead)}
            onUpdateStage={handleUpdateStage}
            onDeleteLead={handleDeleteLead}
            onMoveToBilling={handleMoveLeadToBilling}
            onSendToDelivery={handleSendToDelivery}
            onUpdateInvoiceDetails={handleUpdateInvoiceDetails}
          />
        )}

        {!isRestrictedToDelivery && activeTab === "table" && (
          <LeadTable
            leads={filteredLeads}
            onSelectLead={(lead) => setSelectedLead(lead)}
            onUpdateStage={handleUpdateStage}
            onDeleteLead={handleDeleteLead}
            onUpdateProgram={handleUpdateProgram}
            onUpdateLeadSource={handleUpdateLeadSource}
            isAdmin={isAdmin}
            onExportLeads={handleExportLeads}
            onMoveToBilling={handleMoveLeadToBilling}
            onSendToDelivery={handleSendToDelivery}
          />
        )}

        {!isRestrictedToDelivery && activeTab === "outreach" && (
          <OutreachTab
            coldClients={userScopedColdClients}
            onAddColdClient={handleAddColdClient}
            onBulkAddColdClients={handleBulkAddColdClients}
            onUpdateColdClient={handleUpdateColdClient}
            onBulkUpdateColdClients={handleBulkUpdateColdClients}
            onBulkDeleteColdClients={handleBulkDeleteColdClients}
            onLogTouchpoint={handleLogOutreachTouchpoint}
            onConvertToLead={handleConvertToLead}
            onDeleteColdClient={handleDeleteColdClient}
            currentUser={currentUser}
            onNavigateToEmailTab={(email, name, company) => {
              setEmailTabPrefill({ email, name, company });
              setEmailTabBulkPrefill(null);
              handleTabChange("email");
            }}
            onNavigateToBulkEmailTab={(recipients) => {
              setEmailTabBulkPrefill(recipients);
              setEmailTabPrefill(null);
              handleTabChange("email");
            }}
            onFilteredCountChange={setOutreachFilteredCount}
            onAddAdminComment={handleAddOutreachAdminComment}
            onMarkAdminCommentRead={handleMarkOutreachAdminCommentRead}
            onReplyToAdminComment={handleReplyToAdminComment}
            selectedClientId={selectedOutreachClientId}
            onSelectClientId={setSelectedOutreachClientId}
          />
        )}

        {!isRestrictedToDelivery && activeTab === "touchpoints" && (
          <TouchpointHistoryTab
            coldClients={userScopedColdClients}
            currentUser={currentUser}
            isAdmin={isAdmin}
            onUpdateColdClient={handleUpdateColdClient}
            onLogTouchpoint={handleLogOutreachTouchpoint}
            onConvertToLead={handleConvertToLead}
            onDeleteColdClient={handleDeleteColdClient}
            onNavigateToTab={handleTabChange}
            onSelectOutreachClient={(clientId) => {
              setSelectedOutreachClientId(clientId);
              handleTabChange("outreach");
            }}
            onAddAdminComment={handleAddOutreachAdminComment}
            onMarkAdminCommentRead={handleMarkOutreachAdminCommentRead}
            onReplyToAdminComment={handleReplyToAdminComment}
          />
        )}

        {!isRestrictedToDelivery && activeTab === "analytics" && (
          <AnalyticsCharts
            leads={filteredLeads}
            onSelectLead={(lead) => setSelectedLead(lead)}
          />
        )}

        {!isRestrictedToDelivery && activeTab === "forecast" && (
          <ForecastTab
            leads={leads}
            currentUser={currentUser}
            isAdmin={isAdmin}
            onSelectLead={(lead) => setSelectedLead(lead)}
            onNavigateToTab={handleTabChange}
            onUpdateInvoiceDetails={handleUpdateInvoiceDetails}
          />
        )}

        {!isRestrictedToDelivery && activeTab === "email" && (
          <EmailCampaignTab
            leads={userScopedLeads}
            currentUser={currentUser}
            isAdmin={isAdmin}
            initialRecipient={emailTabPrefill}
            initialBulkRecipients={emailTabBulkPrefill}
            initialAttachments={emailTabAttachmentsPrefill}
            onNavigateToDeveloper={isAdmin ? () => handleTabChange("developer") : undefined}
          />
        )}

        {!isRestrictedToDelivery && activeTab === "library" && (
          <LibraryTab
            currentUser={currentUser}
            isAdmin={isAdmin}
            onNavigateToEmailWithAttachments={(attachments) => {
              setEmailTabAttachmentsPrefill(attachments);
              setEmailTabPrefill(null);
              setEmailTabBulkPrefill(null);
              handleTabChange("email");
            }}
          />
        )}

        {!isRestrictedToDelivery && activeTab === "templates" && (
          <TemplatesTab
            currentUser={currentUser}
            isAdmin={isAdmin}
          />
        )}

        {!isRestrictedToDelivery && activeTab === "prospector" && (
          <ProspectorTab
            currentUser={currentUser}
            isAdmin={isAdmin}
            onNavigateToTab={handleTabChange}
            onCreateLead={handleCreateLead}
            onAddColdClient={handleAddColdClient}
          />
        )}

        {activeTab === "delivery" && (
          <DeliveryTab
            leads={userScopedLeads}
            allLeads={leads}
            currentUser={currentUser}
            isAdmin={isAdmin}
            onSelectLead={(lead) => setSelectedLead(lead)}
          />
        )}

        {!isRestrictedToDelivery && activeTab === "developer" && isAdmin && (
          <DeveloperTab onOpenChangePassword={() => setIsChangePasswordModalOpen(true)} />
        )}
      </main>

      {/* Floating Notification Toast when Closure Card is sent to Delivery */}
      {deliveryToast?.show && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900/95 text-white rounded-2xl shadow-2xl border border-indigo-500/40 backdrop-blur-md flex items-center space-x-4 animate-slideUp">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-black flex items-center space-x-1.5 text-white">
              <span>Sent to Delivery</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              <span className="font-bold text-indigo-300">{deliveryToast.companyName}</span> is now active in Delivery to configure Tenure & track milestones.
            </p>
          </div>
          <div className="flex items-center space-x-2 pl-3 border-l border-slate-800">
            <button
              onClick={() => {
                setDeliveryToast(null);
                handleTabChange("delivery");
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-black rounded-xl transition shadow-md flex items-center space-x-1 cursor-pointer"
            >
              <span>Go to Delivery</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeliveryToast(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Real-time Floating Directive Screen Notification for Lead Owner */}
      {activeFloatingDirective && (
        <div
          className={`fixed ${
            deliveryToast?.show ? "bottom-32" : "bottom-6"
          } right-6 z-50 max-w-md w-full p-4 bg-slate-900/95 dark:bg-slate-900/95 text-white rounded-2xl shadow-2xl border border-amber-500/50 backdrop-blur-md flex items-start space-x-3.5 animate-slideUp`}
        >
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                Admin Directive • Outreach
              </span>
              <span className="text-[10px] text-slate-400">
                {new Date(activeFloatingDirective.comment.createdAt).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
            <h4 className="text-sm font-bold text-white truncate mt-0.5">
              {activeFloatingDirective.client.companyName}
            </h4>
            <p className="text-xs text-slate-300 mt-1 line-clamp-2 italic leading-snug">
              "{activeFloatingDirective.comment.comment}"
            </p>
            <div className="text-[11px] text-slate-400 mt-1">
              By <span className="font-semibold text-slate-200">{activeFloatingDirective.comment.author}</span>
            </div>

            <div className="flex items-center space-x-2 mt-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setSelectedOutreachClientId(activeFloatingDirective.clientId);
                  handleTabChange("outreach");
                  setDismissedDirectiveIds((prev) => [...prev, activeFloatingDirective.comment.id]);
                }}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-xl transition shadow flex items-center space-x-1 cursor-pointer"
              >
                <span>View Lead</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveInlineReplyId(
                    activeInlineReplyId === activeFloatingDirective.comment.id ? null : activeFloatingDirective.comment.id
                  );
                  setInlineReplyText("");
                }}
                className="px-2.5 py-1.5 text-xs font-bold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-xl transition border border-indigo-500/30 flex items-center gap-1 cursor-pointer"
              >
                <Reply className="w-3 h-3" />
                <span>Reply</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleMarkOutreachAdminCommentRead(
                    activeFloatingDirective.clientId,
                    activeFloatingDirective.comment.id
                  );
                }}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                Mark Read
              </button>
            </div>

            {/* Quick Inline Reply on Floating Toast */}
            {activeInlineReplyId === activeFloatingDirective.comment.id && (
              <div className="mt-2.5 pt-2 border-t border-slate-800 space-y-1.5 animate-in fade-in">
                <textarea
                  rows={2}
                  value={inlineReplyText}
                  onChange={(e) => setInlineReplyText(e.target.value)}
                  placeholder={`Reply to ${activeFloatingDirective.comment.author}...`}
                  className="w-full p-2 text-xs rounded-xl border border-indigo-500/40 bg-slate-900 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none placeholder:text-slate-500"
                />
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveInlineReplyId(null)}
                    className="px-2 py-1 text-[10px] text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!inlineReplyText.trim() || isSubmittingInlineReply}
                    onClick={async () => {
                      try {
                        setIsSubmittingInlineReply(true);
                        await handleReplyToAdminComment(
                          activeFloatingDirective.clientId,
                          activeFloatingDirective.comment.id,
                          inlineReplyText.trim()
                        );
                        setInlineReplyText("");
                        setActiveInlineReplyId(null);
                        setDismissedDirectiveIds((prev) => [...prev, activeFloatingDirective.comment.id]);
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setIsSubmittingInlineReply(false);
                      }
                    }}
                    className="px-3 py-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                  >
                    <SendHorizontal className="w-2.5 h-2.5" />
                    <span>{isSubmittingInlineReply ? "Sending..." : "Send Reply"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setDismissedDirectiveIds((prev) => [...prev, activeFloatingDirective.comment.id]);
            }}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer shrink-0"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Real-time Floating Upcoming Follow-up Reminder for Lead Owner */}
      {activeFloatingFollowup && !isFloatingFollowupDismissed && (
        <div
          className={`fixed ${
            activeFloatingDirective ? "bottom-56" : deliveryToast?.show ? "bottom-32" : "bottom-6"
          } right-6 z-50 max-w-md w-full p-4 bg-slate-900/95 dark:bg-slate-900/95 text-white rounded-2xl shadow-2xl border border-indigo-500/50 backdrop-blur-md flex items-start space-x-3.5 animate-slideUp`}
        >
          <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 shrink-0 mt-0.5">
            <Clock className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>Follow-up Reminder • {activeFloatingFollowup.urgencyLabel}</span>
              </span>
              <span className="text-[10px] text-slate-400 font-bold">
                {activeFloatingFollowup.followUpDate}
              </span>
            </div>
            <h4 className="text-sm font-bold text-white truncate mt-0.5">
              {activeFloatingFollowup.companyName}
            </h4>
            <div className="text-xs text-slate-300 mt-0.5">
              Contact: <strong className="text-white">{activeFloatingFollowup.contactName}</strong>
              {activeFloatingFollowup.followUpTime && ` at ${activeFloatingFollowup.followUpTime}`}
            </div>
            {activeFloatingFollowup.notes && (
              <p className="text-xs text-slate-300 mt-1 line-clamp-2 italic leading-snug bg-white/10 p-1.5 rounded-lg">
                "{activeFloatingFollowup.notes}"
              </p>
            )}

            <div className="flex items-center space-x-2 mt-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (activeFloatingFollowup.sourceType === "outreach") {
                    setSelectedOutreachClientId(activeFloatingFollowup.id);
                    handleTabChange("outreach");
                  } else {
                    setSelectedLead(activeFloatingFollowup.rawItem as Lead);
                  }
                  setDismissedFollowupReminderIds((prev) => [...prev, activeFloatingFollowup.id]);
                }}
                className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl transition shadow flex items-center space-x-1 cursor-pointer"
              >
                <span>Open {activeFloatingFollowup.sourceType === "outreach" ? "Lead" : "Pipeline"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleMarkFollowupCompleted(activeFloatingFollowup);
                  setDismissedFollowupReminderIds((prev) => [...prev, activeFloatingFollowup.id]);
                }}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow flex items-center space-x-1 cursor-pointer"
                title="Mark this follow-up as completed"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark Completed</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsNotificationCenterOpen(true);
                  setNotificationCenterTab("followups");
                }}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                View Reminders
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setDismissedFollowupReminderIds((prev) => [...prev, activeFloatingFollowup.id]);
              setIsFloatingFollowupDismissed(true);
            }}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer shrink-0"
            title="Dismiss reminder"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Lead Detail & Customer Journey Modal (Disabled for Accounts and Delivery Operations) */}
      {!isRestrictedToDelivery && (
        <LeadDetailModal
          lead={selectedLead}
          currentUser={currentUser}
          onClose={() => setSelectedLead(null)}
          onUpdateStage={handleUpdateStage}
          onAddNote={handleAddNote}
          onDeleteLead={handleDeleteLead}
          onUpdateDealValue={handleUpdateDealValue}
          onUpdateProgram={handleUpdateProgram}
          onUpdateLeadSource={handleUpdateLeadSource}
          onUpdateOwner={handleUpdateOwner}
          onUpdateClosureMonth={handleUpdateClosureMonth}
          onAttachApproachNote={handleAttachApproachNote}
          onAttachApproachNotes={handleAttachApproachNotes}
          onRemoveApproachNote={handleRemoveApproachNote}
          onAttachFinancialDocuments={handleAttachFinancialDocuments}
          onRemoveFinancialDocument={handleRemoveFinancialDocument}
          onUpdateCompanyLogo={handleUpdateCompanyLogo}
          onRemoveCompanyLogo={handleRemoveCompanyLogo}
          onAddContact={handleAddLeadContact}
          onRemoveContact={handleRemoveLeadContact}
          onUpdatePrimaryContact={handleUpdatePrimaryContact}
          onEditContact={handleEditLeadContact}
          onSetPrimaryContact={handleSetLeadPrimaryContact}
          onMoveToBilling={handleMoveLeadToBilling}
          onSendToDelivery={handleSendToDelivery}
          onUpdateInvoiceDetails={handleUpdateInvoiceDetails}
        />
      )}

      {/* Add New Lead Modal (Disabled for Accounts and Delivery Operations) */}
      {!isRestrictedToDelivery && (
        <AddLeadModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          currentUser={currentUser}
          onSubmit={handleCreateLead}
        />
      )}

      {/* Bulk Upload CSV Modal (Disabled for Accounts and Delivery Operations) */}
      {!isRestrictedToDelivery && (
        <BulkUploadModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          currentUser={currentUser}
          onBulkImport={handleBulkImport}
        />
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        currentUser={currentUser}
      />

        {/* Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-4 text-center text-xs text-slate-500">
          <p>
            {isAccounts
              ? "xMonks B2B CRM • Accounts & Billing Department Portal"
              : isDeliveryOnly
              ? "xMonks B2B CRM • Delivery Operations Portal"
              : "xMonks B2B Lead Journey CRM • Firebase Integration (`xmonksb2b2`) • Stage Weightage Calculations & Real-Time Date-Time Logs"}
          </p>
        </footer>
      </div>

      {/* 2-Second Money.json Tab Transition Loader Overlay */}
      {tabLoadingState && (
        <MoneyLottieLoader
          mode="overlay"
          title={tabLoadingState.title}
          subtitle={tabLoadingState.subtitle}
          durationMs={2000}
          onComplete={() => setTabLoadingState(null)}
        />
      )}
    </div>
  );
}
