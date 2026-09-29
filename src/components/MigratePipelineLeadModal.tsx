"use client";

import React, { useState } from "react";
import { Lead } from "@/types/lead";
import { BillingRecord } from "@/types/billing";
import { formatINR, formatClosureMonth } from "@/lib/formatters";
import { getLeadSourceBadgeStyle } from "@/constants/leadSources";
import { STAGES } from "@/constants/stages";
import {
  X,
  Zap,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Compass,
  Calendar,
  FileText,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Filter,
  Layers,
  Receipt,
} from "lucide-react";

interface MigratePipelineLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  existingBillingRecords: BillingRecord[];
  onMigrateLead: (
    lead: Lead,
    options?: {
      tenureMonths?: number;
      billingFrequency?: BillingRecord["billingFrequency"];
      startDate?: string;
    }
  ) => void;
  onViewBillingRecord?: (record: BillingRecord) => void;
}

export const MigratePipelineLeadModal: React.FC<MigratePipelineLeadModalProps> = ({
  isOpen,
  onClose,
  leads,
  existingBillingRecords,
  onMigrateLead,
  onViewBillingRecord,
}) => {
  const [filterType, setFilterType] = useState<"closure_only" | "all">("closure_only");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTenure, setSelectedTenure] = useState<number>(12);
  const [selectedFrequency, setSelectedFrequency] = useState<BillingRecord["billingFrequency"]>("monthly");
  const [migratingLeadId, setMigratingLeadId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Build a map of existing billing records by leadId and by company name
  const billingByLeadId = new Map<string, BillingRecord>();
  const billingByCompanyName = new Map<string, BillingRecord>();
  existingBillingRecords.forEach((r) => {
    if (r.leadId) billingByLeadId.set(r.leadId, r);
    if (r.vendor?.companyName) {
      billingByCompanyName.set(r.vendor.companyName.toLowerCase().trim(), r);
    }
  });

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    const isClosure = lead.stage === "closure";
    if (filterType === "closure_only" && !isClosure) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCompany = lead.companyName?.toLowerCase().includes(q);
      const matchContact = lead.contactName?.toLowerCase().includes(q);
      const matchIndustry = lead.industry?.toLowerCase().includes(q);
      const matchProgram = lead.program?.toLowerCase().includes(q);
      return matchCompany || matchContact || matchIndustry || matchProgram;
    }

    return true;
  });

  // Count unmigrated closure deals
  const closureLeads = leads.filter((l) => l.stage === "closure");
  const unmigratedClosureLeads = closureLeads.filter(
    (l) => !billingByLeadId.has(l.id) && !billingByCompanyName.has(l.companyName.toLowerCase().trim())
  );

  const handleMigrate = (lead: Lead) => {
    setMigratingLeadId(lead.id);
    setTimeout(() => {
      onMigrateLead(lead, {
        tenureMonths: selectedTenure,
        billingFrequency: selectedFrequency,
      });
      setMigratingLeadId(null);
    }, 250);
  };

  const handleMigrateAllUnmigrated = () => {
    if (unmigratedClosureLeads.length === 0) return;
    if (
      !confirm(
        `Are you sure you want to migrate all ${unmigratedClosureLeads.length} unmigrated Closure deals into the Billing section?`
      )
    ) {
      return;
    }

    unmigratedClosureLeads.forEach((lead) => {
      onMigrateLead(lead, {
        tenureMonths: selectedTenure,
        billingFrequency: selectedFrequency,
      });
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-950 via-teal-950 to-indigo-950 text-white border-b border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-400/30 text-emerald-300">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-black tracking-tight">
                    Migrate Pipeline Deals to Billing
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Seamless CRM Sync
                  </span>
                </div>
                <p className="text-xs text-emerald-200/80 mt-0.5">
                  Convert Closed-Won pipeline cards into live billing accounts with complete vendor info, deal values, and documents.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Migration Defaults Toolbar */}
          <div className="mt-4 pt-4 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <span className="text-emerald-200 font-semibold">Default Tenure:</span>
              <select
                value={selectedTenure}
                onChange={(e) => setSelectedTenure(Number(e.target.value))}
                className="px-2.5 py-1 bg-slate-900/90 text-white border border-emerald-500/30 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-400"
              >
                <option value={3}>3 Months</option>
                <option value={6}>6 Months</option>
                <option value={9}>9 Months</option>
                <option value={12}>12 Months (1 Year)</option>
                <option value={18}>18 Months</option>
                <option value={24}>24 Months (2 Years)</option>
              </select>

              <span className="text-emerald-200 font-semibold ml-2">Frequency:</span>
              <select
                value={selectedFrequency}
                onChange={(e) =>
                  setSelectedFrequency(e.target.value as BillingRecord["billingFrequency"])
                }
                className="px-2.5 py-1 bg-slate-900/90 text-white border border-emerald-500/30 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-400"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="milestone">Milestone</option>
                <option value="annual">Annual</option>
                <option value="one_time">One Time</option>
              </select>
            </div>

            {unmigratedClosureLeads.length > 0 && (
              <button
                onClick={handleMigrateAllUnmigrated}
                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-md transition flex items-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Migrate All {unmigratedClosureLeads.length} Won Deals</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center space-x-1 p-1 bg-slate-200/70 dark:bg-slate-900 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setFilterType("closure_only")}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                filterType === "closure_only"
                  ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Closure Deals (Won) ({closureLeads.length})</span>
            </button>

            <button
              onClick={() => setFilterType("all")}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                filterType === "all"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>All Pipeline Leads ({leads.length})</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company, contact, industry..."
              className="w-full px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Deals List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredLeads.length === 0 ? (
            <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <Building2 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-xs font-semibold">No pipeline deals found matching criteria.</p>
            </div>
          ) : (
            filteredLeads.map((lead) => {
              const existingRecord =
                billingByLeadId.get(lead.id) ||
                billingByCompanyName.get(lead.companyName.toLowerCase().trim());
              const isMigrated = Boolean(existingRecord);
              const stageInfo = STAGES[lead.stage];
              const sourceStyle = getLeadSourceBadgeStyle(lead.leadSource);

              return (
                <div
                  key={lead.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isMigrated
                      ? "bg-slate-50/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 opacity-90"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 shadow-xs hover:shadow-md"
                  }`}
                >
                  {/* Left: Lead Identity & Pipeline Details */}
                  <div className="space-y-2 min-w-0 flex-1">
                    {/* Top Row: Industry & City Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {lead.industry && (
                        <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-800/50">
                          {lead.industry}
                        </span>
                      )}

                      {lead.city && (
                        <span className="inline-flex items-center space-x-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                          <MapPin className="w-2.5 h-2.5 text-indigo-500" />
                          <span>{lead.city}</span>
                        </span>
                      )}

                      {stageInfo && (
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${stageInfo.badgeBg} ${stageInfo.badgeText}`}
                        >
                          {stageInfo.label} ({stageInfo.weightage}%)
                        </span>
                      )}

                      <span className="text-[10px] font-mono text-slate-400 ml-auto">
                        #{lead.id.slice(-4)}
                      </span>
                    </div>

                    {/* Company Name & Contact Header */}
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                        {lead.companyLogo ? (
                          <img
                            src={lead.companyLogo}
                            alt=""
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <Building2 className="w-5 h-5 text-slate-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                          {lead.companyName}
                        </h4>
                        <div className="flex items-center space-x-2 text-xs text-slate-500 truncate">
                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                            {lead.contactName}
                          </span>
                          {lead.designation && (
                            <span className="text-slate-400 text-[11px] truncate">
                              ({lead.designation})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      {lead.program && (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200/60">
                          <GraduationCap className="w-3 h-3 text-teal-500" />
                          <span>{lead.program}</span>
                        </span>
                      )}

                      {lead.leadSource && (
                        <span
                          className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${sourceStyle.badgeBg} ${sourceStyle.badgeText} ${sourceStyle.borderColor}`}
                        >
                          <Compass className="w-3 h-3" />
                          <span>{lead.leadSource}</span>
                        </span>
                      )}

                      {lead.closureMonth && (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200">
                          <Calendar className="w-3 h-3 text-blue-500" />
                          <span>Target: {formatClosureMonth(lead.closureMonth, "short")}</span>
                        </span>
                      )}

                      {lead.approachNote && (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200">
                          <FileText className="w-3 h-3 text-rose-500" />
                          <span>Approach Note Included</span>
                        </span>
                      )}

                      {lead.financialDocuments && lead.financialDocuments.length > 0 && (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200">
                          <Receipt className="w-3 h-3 text-emerald-500" />
                          <span>{lead.financialDocuments.length} Fin Docs Included</span>
                        </span>
                      )}

                      {lead.owner && (
                        <span className="text-[10px] text-slate-400">
                          Owner: <span className="font-semibold text-slate-600 dark:text-slate-300">{lead.owner}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Deal Value & Action Button */}
                  <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800 gap-2 shrink-0">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Pipeline Deal Value
                      </span>
                      <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                        {formatINR(lead.dealValue || 0)}
                      </span>
                    </div>

                    {isMigrated ? (
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded-xl border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>In Billing</span>
                        </span>
                        {onViewBillingRecord && existingRecord && (
                          <button
                            onClick={() => {
                              onViewBillingRecord(existingRecord);
                              onClose();
                            }}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
                          >
                            View
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleMigrate(lead)}
                        disabled={migratingLeadId === lead.id}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition transform hover:scale-[1.02] flex items-center space-x-1.5"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>{migratingLeadId === lead.id ? "Migrating..." : "Migrate to Billing"}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>
            {unmigratedClosureLeads.length} Closure Won deal(s) ready for billing migration
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
