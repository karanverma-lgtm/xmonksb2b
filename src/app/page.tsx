"use client";

import React, { useState, useEffect } from "react";
import { Lead, LeadStage } from "@/types/lead";
import {
  subscribeToLeads,
  createLead,
  updateLeadStage,
  addJourneyNote,
  deleteLead,
  resetDemoData,
} from "@/lib/leadsService";
import { Navbar } from "@/components/Navbar";
import { DashboardStats } from "@/components/DashboardStats";
import { FilterBar } from "@/components/FilterBar";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LeadTable } from "@/components/LeadTable";
import { LeadDetailModal } from "@/components/LeadDetailModal";
import { AddLeadModal } from "@/components/AddLeadModal";
import { BulkUploadModal } from "@/components/BulkUploadModal";
import { AnalyticsCharts } from "@/components/AnalyticsCharts";
import { LoginForm } from "@/components/LoginForm";
import { UserAccount } from "@/constants/users";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState<boolean>(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [isFirebaseSyncing, setIsFirebaseSyncing] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"kanban" | "table" | "analytics">("kanban");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);

  // Check auth session on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("xmonks_b2b_authenticated");
      const storedUser = localStorage.getItem("xmonks_b2b_user");
      if (stored === "true") {
        setIsAuthenticated(true);
        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser));
        }
      }
    } catch (e) {
      console.warn("Could not read auth state", e);
    } finally {
      setIsAuthChecked(true);
    }
  }, []);

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

  // Filter Leads based on user selection
  const filteredLeads = leads.filter((lead) => {
    // 1. Search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        lead.companyName.toLowerCase().includes(term) ||
        lead.contactName.toLowerCase().includes(term) ||
        lead.contactEmail.toLowerCase().includes(term) ||
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
  };

  // Calculate total weighted pipeline across filtered leads
  const activeFilteredLeads = filteredLeads.filter((l) => l.stage !== "closed_lost");
  const totalWeightedPipeline = activeFilteredLeads.reduce(
    (acc, curr) => acc + (curr.dealValue || 0) * ((curr.weightage || 0) / 100),
    0
  );

  const handleCreateLead = async (leadData: Parameters<typeof createLead>[0]) => {
    const newLead = await createLead(leadData);
    setLeads((prev) => [newLead, ...prev.filter((l) => l.id !== newLead.id)]);
  };

  const handleBulkImport = async (importedLeads: Parameters<typeof createLead>[0][]) => {
    const createdList: Lead[] = [];
    for (const item of importedLeads) {
      const created = await createLead(item);
      createdList.push(created);
    }
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
      setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)));
      setSelectedLead((prev) => (prev && prev.id === leadId ? updated : prev));
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    // Immediately update state for instantaneous UI response
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    setSelectedLead((prev) => (prev && prev.id === leadId ? null : prev));
    await deleteLead(leadId);
  };

  const handleResetDemo = async () => {
    if (confirm("Reset all CRM data back to initial demo B2B leads?")) {
      const resetLeads = await resetDemoData();
      setLeads(resetLeads);
    }
  };

  if (!isAuthChecked) {
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
        setActiveTab={setActiveTab}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenBulkModal={() => setIsBulkModalOpen(true)}
        onResetDemoData={handleResetDemo}
        onLogout={handleLogout}
        currentUser={currentUser}
        isFirebaseSyncing={isFirebaseSyncing}
        totalLeadsCount={filteredLeads.length}
        totalWeightedPipeline={totalWeightedPipeline}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* KPI Dashboard Summary Bar (Reflects Filtered Leads) */}
        <DashboardStats leads={filteredLeads} />

        {/* Global Filter Bar (From Date, To Date, Weightage %, Stage, Search) */}
        <FilterBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          fromDate={fromDate}
          setFromDate={setFromDate}
          toDate={toDate}
          setToDate={setToDate}
          selectedWeightage={selectedWeightage}
          setSelectedWeightage={setSelectedWeightage}
          selectedStage={selectedStage}
          setSelectedStage={setSelectedStage}
          onResetFilters={handleResetFilters}
          filteredCount={filteredLeads.length}
          totalCount={leads.length}
        />

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
      </main>

      {/* Lead Detail & Customer Journey Modal */}
      <LeadDetailModal
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onUpdateStage={handleUpdateStage}
        onAddNote={handleAddNote}
        onDeleteLead={handleDeleteLead}
      />

      {/* Add New Lead Modal */}
      <AddLeadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateLead}
      />

      {/* Bulk Upload CSV Modal */}
      <BulkUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
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
