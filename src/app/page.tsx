"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Lead, LeadStage } from "@/types/lead";
import {
  subscribeToLeads,
  createLead,
  createLeadsBulk,
  updateLeadStage,
  addJourneyNote,
  updateDealValue,
  deleteLead,
} from "@/lib/leadsService";
import { Navbar, NavTab } from "@/components/Navbar";
import { DashboardStats } from "@/components/DashboardStats";
import { FilterBar } from "@/components/FilterBar";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LeadTable } from "@/components/LeadTable";
import { LeadDetailModal } from "@/components/LeadDetailModal";
import { AddLeadModal } from "@/components/AddLeadModal";
import { BulkUploadModal } from "@/components/BulkUploadModal";
import { AnalyticsCharts } from "@/components/AnalyticsCharts";
import { EmailCampaignTab } from "@/components/EmailCampaignTab";
import { DeveloperTab } from "@/components/DeveloperTab";
import { LoginForm } from "@/components/LoginForm";
import { UserAccount } from "@/constants/users";
import {
  subscribeToUserPreferences,
  saveUserPreferencesToFirestore,
} from "@/lib/preferencesService";
import { useRef, useSyncExternalStore } from "react";

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
  const [activeTab, setActiveTab] = useState<NavTab>("kanban");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);

  const handleLoginSuccess = (user: UserAccount) => {
    try {
      localStorage.setItem("xmonks_b2b_authenticated", "true");
      localStorage.setItem("xmonks_b2b_user", JSON.stringify(user));
    } catch (e) {
      console.warn("Could not set auth state", e);
    }
    setCurrentUser(user);
    setIsAuthenticated(true);
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

  // Filter States (From Date, To Date, Weightage, Stage, Search)
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedWeightage, setSelectedWeightage] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");

  // Load & subscribe to user UI view & filter preferences from Firestore
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToUserPreferences(currentUser.username, (prefs) => {
      if (prefs.activeTab) setActiveTab(prefs.activeTab as NavTab);
      if (prefs.searchTerm !== undefined) setSearchTerm(prefs.searchTerm);
      if (prefs.fromDate !== undefined) setFromDate(prefs.fromDate);
      if (prefs.toDate !== undefined) setToDate(prefs.toDate);
      if (prefs.selectedStage !== undefined) setSelectedStage(prefs.selectedStage);
      if (prefs.selectedWeightage !== undefined) setSelectedWeightage(prefs.selectedWeightage);
    });

    return () => unsub();
  }, [currentUser]);

  // Debounce search sync to Firestore
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  // Handlers to synchronize UI state to Firestore
  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    if (currentUser) {
      saveUserPreferencesToFirestore(currentUser.username, { activeTab: tab });
    }
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

  // Subscribe to Firestore Realtime Data
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsubscribe = subscribeToLeads((updatedLeads, isSyncing) => {
      setLeads(updatedLeads);
      setIsFirebaseSyncing(isSyncing);

      // Keep selected lead modal updated if open
      setSelectedLead((prev) => {
        if (!prev) return null;
        const fresh = updatedLeads.find((l) => l.id === prev.id);
        return fresh || null;
      });
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  // 1. Role-Based Access Control (RBAC):
  // Admin can see ALL leads. Regular users (e.g. Ruby) see ONLY their own assigned leads.
  const userScopedLeads = useMemo(() => {
    if (!currentUser) return [];
    const isAdmin =
      currentUser.username.toLowerCase() === "admin" ||
      currentUser.role.toLowerCase().includes("admin");

    if (isAdmin) return leads;

    const activeName = (currentUser.name || "").toLowerCase().trim();
    const activeUser = (currentUser.username || "").toLowerCase().trim();

    return leads.filter((lead: Lead) => {
      const ownerStr = (lead.owner || "").toLowerCase().trim();
      if (!ownerStr) return true; // Include unassigned leads for active user
      return (
        ownerStr === activeName ||
        ownerStr === activeUser ||
        ownerStr.includes(activeName) ||
        (activeName.length > 0 && activeName.includes(ownerStr))
      );
    });
  }, [leads, currentUser]);

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
      if (lead.weightage !== Number(selectedWeightage)) return false;
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

    return true;
  });

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setFromDate("");
    setToDate("");
    setSelectedWeightage("all");
    setSelectedStage("all");
    if (currentUser) {
      saveUserPreferencesToFirestore(currentUser.username, {
        searchTerm: "",
        fromDate: "",
        toDate: "",
        selectedWeightage: "all",
        selectedStage: "all",
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
    const activeUserName = currentUser?.name || "Ruby";
    const isAdmin =
      currentUser?.username.toLowerCase() === "admin" ||
      currentUser?.role.toLowerCase().includes("admin");

    const preparedList = importedLeads.map((item) => ({
      ...item,
      owner: !isAdmin
        ? item.owner && item.owner.trim() !== ""
          ? item.owner
          : activeUserName
        : item.owner || activeUserName,
    }));

    const createdList = await createLeadsBulk(preparedList);
    setLeads((prev) => [...createdList, ...prev]);
  };

  const handleUpdateStage = async (
    leadId: string,
    newStage: LeadStage,
    notes?: string
  ) => {
    const updated = await updateLeadStage(leadId, newStage, notes);
    if (updated) {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)));
      setSelectedLead((prev) => (prev && prev.id === leadId ? updated : prev));
    }
  };

  const handleAddNote = async (leadId: string, noteText: string) => {
    const updated = await addJourneyNote(leadId, noteText);
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

  const handleDeleteLead = async (leadId: string) => {
    // Immediately update state for instantaneous UI response
    setLeads((prev) => prev.filter((l: Lead) => l.id !== leadId));
    setSelectedLead((prev) => (prev && prev.id === leadId ? null : prev));
    await deleteLead(leadId);
  };

  if (!isClient) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">Loading Portal...</div>;
  }

  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenBulkModal={() => setIsBulkModalOpen(true)}
        onLogout={handleLogout}
        currentUser={currentUser}
        isFirebaseSyncing={isFirebaseSyncing}
        totalLeadsCount={filteredLeads.length}
        totalWeightedPipeline={totalWeightedPipeline}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* KPI Dashboard Summary Bar & Filter Bar for Lead Management tabs */}
        {(activeTab === "kanban" || activeTab === "table" || activeTab === "analytics") && (
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
              onResetFilters={handleResetFilters}
              filteredCount={filteredLeads.length}
              totalCount={userScopedLeads.length}
            />
          </>
        )}

        {/* Tab Views */}
        {activeTab === "kanban" && (
          <KanbanBoard
            leads={filteredLeads}
            onSelectLead={(lead) => setSelectedLead(lead)}
            onUpdateStage={handleUpdateStage}
            onDeleteLead={handleDeleteLead}
          />
        )}

        {activeTab === "table" && (
          <LeadTable
            leads={filteredLeads}
            onSelectLead={(lead) => setSelectedLead(lead)}
            onUpdateStage={handleUpdateStage}
            onDeleteLead={handleDeleteLead}
          />
        )}

        {activeTab === "analytics" && (
          <AnalyticsCharts
            leads={filteredLeads}
            onSelectLead={(lead) => setSelectedLead(lead)}
          />
        )}

        {activeTab === "email" && (
          <EmailCampaignTab
            leads={userScopedLeads}
            onNavigateToDeveloper={() => handleTabChange("developer")}
          />
        )}

        {activeTab === "developer" && <DeveloperTab />}
      </main>

      {/* Lead Detail & Customer Journey Modal */}
      <LeadDetailModal
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onUpdateStage={handleUpdateStage}
        onAddNote={handleAddNote}
        onDeleteLead={handleDeleteLead}
        onUpdateDealValue={handleUpdateDealValue}
      />

      {/* Add New Lead Modal */}
      <AddLeadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        currentUser={currentUser}
        onSubmit={handleCreateLead}
      />

      {/* Bulk Upload CSV Modal */}
      <BulkUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        currentUser={currentUser}
        onBulkImport={handleBulkImport}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>
          xMonks B2B Lead Journey CRM • Firebase Integration (`xmonksb2b2`) • Stage Weightage
          Calculations & Real-Time Date-Time Logs
        </p>
      </footer>
    </div>
  );
}
