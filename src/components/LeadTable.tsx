"use client";

import React, { useState } from "react";
import { Lead, LeadStage, getLeadInvoices } from "@/types/lead";
import { STAGES } from "@/constants/stages";
import {
  Building2,
  Mail,
  Phone,
  ArrowUpDown,
  Trash2,
  MapPin,
  GraduationCap,
  Pencil,
  Check,
  X,
  Plus,
  Calendar,
  FileText,
  Compass,
  Download,
  Receipt,
  Truck,
  Users,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Eye,
  Clock,
} from "lucide-react";
import { formatINR, formatClosureMonth } from "@/lib/formatters";
import { PRESET_PROGRAMS, getProgramBadgeStyle } from "@/constants/programs";
import { LEAD_SOURCES, getLeadSourceBadgeStyle } from "@/constants/leadSources";
import { SpringButton } from "@/components/spring";

interface LeadTableProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateStage?: (leadId: string, newStage: LeadStage, notes?: string) => void;
  onDeleteLead?: (leadId: string) => void;
  onUpdateProgram?: (leadId: string, newProgram: string) => void;
  onUpdateLeadSource?: (leadId: string, newSource: string) => void;
  isAdmin?: boolean;
  onExportLeads?: () => void;
  onMoveToBilling?: (lead: Lead) => void;
  onSendToDelivery?: (lead: Lead) => void;
}

export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  onSelectLead,
  onDeleteLead,
  onUpdateProgram,
  onUpdateLeadSource,
  isAdmin,
  onExportLeads,
  onMoveToBilling,
  onSendToDelivery,
}) => {
  const [sortBy, setSortBy] = useState<"dealValue" | "weightage" | "updatedAt">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewLayout, setViewLayout] = useState<"compact" | "grid" | "wide">("grid");

  // Inline program editing state
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [selectedProgramInput, setSelectedProgramInput] = useState<string>("");

  // Inline lead source editing state
  const [editingSourceLeadId, setEditingSourceLeadId] = useState<string | null>(null);
  const [selectedSourceInput, setSelectedSourceInput] = useState<string>("");

  // Sort leads
  const sortedLeads = [...leads].sort((a, b) => {
    let aVal: number | string = a[sortBy];
    let bVal: number | string = b[sortBy];

    if (sortBy === "updatedAt") {
      aVal = new Date(a.updatedAt).getTime();
      bVal = new Date(b.updatedAt).getTime();
    }

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const toggleSort = (field: "dealValue" | "weightage" | "updatedAt") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handleStartEditProgram = (lead: Lead) => {
    setEditingLeadId(lead.id);
    setSelectedProgramInput(lead.program || PRESET_PROGRAMS[0].name);
  };

  const handleSaveProgram = (leadId: string) => {
    if (onUpdateProgram && selectedProgramInput.trim()) {
      onUpdateProgram(leadId, selectedProgramInput.trim());
    }
    setEditingLeadId(null);
  };

  const handleStartEditSource = (lead: Lead) => {
    setEditingSourceLeadId(lead.id);
    setSelectedSourceInput(lead.leadSource || LEAD_SOURCES[0].name);
  };

  const handleSaveSource = (leadId: string) => {
    if (onUpdateLeadSource && selectedSourceInput.trim()) {
      onUpdateLeadSource(leadId, selectedSourceInput.trim());
    }
    setEditingSourceLeadId(null);
  };

  const formatCurrency = (val: number) => formatINR(val);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Table Header & View Layout Switcher */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
            <span>Client Roster & Pitched Offerings</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-extrabold border border-indigo-200/50 dark:border-indigo-800/50">
              {sortedLeads.length} clients
            </span>
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Layout Switcher (Cards & Wide Only) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setViewLayout("grid")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                viewLayout === "grid"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Card Grid: Visual multi-column card layout"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout("wide")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                viewLayout === "wide"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Wide Table: Horizontal scroll table"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Wide</span>
            </button>
          </div>

          {/* Export Trigger (Admin & Preeti only) */}
          {Boolean(onExportLeads) && (
            <button
              type="button"
              onClick={onExportLeads}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all shadow-xs cursor-pointer"
              title="Export full roster to CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: FIT-TO-SCREEN COMPACT TABLE (ZERO HORIZONTAL SCROLL) */}
      {viewLayout === "compact" && (
        <div className="w-full overflow-hidden">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3.5">Client & Industry</th>
                <th className="py-3 px-3">Pitched Program & Source</th>
                <th className="py-3 px-3">Primary Contact</th>
                <th className="py-3 px-3">Stage & Probability</th>
                <th
                  className="py-3 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition"
                  onClick={() => toggleSort("dealValue")}
                  title="Click to sort by Deal Value"
                >
                  <div className="flex items-center space-x-1">
                    <span>Deal & Weighted</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Closure & Docs</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs bg-white dark:bg-slate-900">
              {sortedLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No matching B2B clients found.
                  </td>
                </tr>
              ) : (
                sortedLeads.map((lead) => {
                  const stageInfo = STAGES[lead.stage];
                  const stageWeight = stageInfo?.weightage ?? lead.weightage;
                  const weightedVal = lead.dealValue * (stageWeight / 100);
                  const latestLog = lead.journeyLogs?.[0];
                  const badgeStyle = getProgramBadgeStyle(lead.program);
                  const isEditing = editingLeadId === lead.id;
                  const isEditingSource = editingSourceLeadId === lead.id;
                  const sourceBadge = getLeadSourceBadgeStyle(lead.leadSource);

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* 1. Client / Company */}
                      <td className="py-3 px-3.5 align-top">
                        <div className="flex items-start space-x-2.5">
                          {lead.companyLogo ? (
                            <div
                              onClick={() => onSelectLead(lead)}
                              className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 cursor-pointer shadow-2xs border border-slate-200/80 dark:border-slate-700/80 mt-0.5"
                            >
                              <img
                                src={lead.companyLogo}
                                alt={lead.companyName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div
                              onClick={() => onSelectLead(lead)}
                              className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 cursor-pointer mt-0.5 border border-indigo-200/40 dark:border-indigo-800/40"
                            >
                              <Building2 className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div
                              onClick={() => onSelectLead(lead)}
                              className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center flex-wrap gap-1 leading-snug"
                            >
                              <span>{lead.companyName}</span>
                              {lead.city && (
                                <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                                  <MapPin className="w-2.5 h-2.5 text-indigo-400" />
                                  <span>{lead.city}</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              {lead.industry || "General B2B"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Pitched Program & Lead Source (Stacked Compactly) */}
                      <td className="py-3 px-3 align-top">
                        <div className="space-y-1.5">
                          {/* Program */}
                          {isEditing ? (
                            <div className="flex items-center space-x-1">
                              <select
                                value={selectedProgramInput}
                                onChange={(e) => setSelectedProgramInput(e.target.value)}
                                className="text-[11px] font-semibold px-2 py-0.5 bg-white dark:bg-slate-950 border border-indigo-500 rounded-lg focus:outline-none max-w-[150px]"
                                autoFocus
                              >
                                {PRESET_PROGRAMS.map((p) => (
                                  <option key={p.id} value={p.name}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleSaveProgram(lead.id)}
                                className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition"
                                title="Save Pitched Program"
                              >
                                <Check className="w-2.5 h-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingLeadId(null)}
                                className="p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition"
                                title="Cancel"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : lead.program ? (
                            <div className="inline-flex items-center space-x-1 group">
                              <span
                                className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${badgeStyle.badgeBg} ${badgeStyle.badgeText} ${badgeStyle.borderColor}`}
                                title={`Pitched Program: ${lead.program}`}
                              >
                                <GraduationCap className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate max-w-[130px]">{lead.program}</span>
                              </span>
                              {onUpdateProgram && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditProgram(lead)}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                                  title="Edit Pitched Program"
                                >
                                  <Pencil className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartEditProgram(lead)}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800/60 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 border border-dashed border-slate-300 dark:border-slate-700 transition"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>Assign Program</span>
                            </button>
                          )}

                          {/* Source */}
                          <div>
                            {isEditingSource ? (
                              <div className="flex items-center space-x-1">
                                <select
                                  value={selectedSourceInput}
                                  onChange={(e) => setSelectedSourceInput(e.target.value)}
                                  className="text-[11px] font-semibold px-2 py-0.5 bg-white dark:bg-slate-950 border border-sky-500 rounded-lg focus:outline-none max-w-[130px]"
                                  autoFocus
                                >
                                  {LEAD_SOURCES.map((s) => (
                                    <option key={s.id} value={s.name}>
                                      {s.name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleSaveSource(lead.id)}
                                  className="p-1 bg-sky-600 hover:bg-sky-700 text-white rounded transition"
                                  title="Save Lead Source"
                                >
                                  <Check className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingSourceLeadId(null)}
                                  className="p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition"
                                  title="Cancel"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ) : lead.leadSource ? (
                              <div className="inline-flex items-center space-x-1 group">
                                <span
                                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sourceBadge.badgeBg} ${sourceBadge.badgeText} ${sourceBadge.borderColor}`}
                                  title={`Lead Source: ${lead.leadSource}`}
                                >
                                  <Compass className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate max-w-[125px]">{lead.leadSource}</span>
                                </span>
                                {onUpdateLeadSource && (
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditSource(lead)}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition cursor-pointer"
                                    title="Edit Lead Source"
                                  >
                                    <Pencil className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStartEditSource(lead)}
                                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 hover:bg-sky-50 dark:bg-slate-800/60 dark:hover:bg-sky-950/60 hover:text-sky-600 dark:hover:text-sky-300 border border-dashed border-slate-300 dark:border-slate-700 transition"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>Select Source</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Primary Contact */}
                      <td className="py-3 px-3 align-top">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1 flex-wrap">
                            <span>{lead.contactName}</span>
                            {lead.designation && (
                              <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-1 py-0.2 rounded border border-indigo-200/60 dark:border-indigo-800/60">
                                {lead.designation}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 text-[11px] text-slate-500 truncate max-w-[180px]">
                            <Mail className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                            <span className="truncate">{lead.contactEmail}</span>
                          </div>
                          {lead.contactPhone && (
                            <div className="flex items-center space-x-1 text-[10px] text-slate-400">
                              <Phone className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                              <span>{lead.contactPhone}</span>
                            </div>
                          )}
                          {lead.additionalContacts && lead.additionalContacts.length > 0 && (
                            <div className="pt-0.5">
                              <span
                                className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50"
                                title={`${lead.additionalContacts.length} additional contact(s)`}
                              >
                                <Users className="w-2.5 h-2.5" />
                                <span>+{lead.additionalContacts.length} people</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 4. Stage & Probability */}
                      <td className="py-3 px-3 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${stageInfo.badgeBg} ${stageInfo.badgeText}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                              <span className="truncate max-w-[120px]">{stageInfo.label}</span>
                            </span>
                            <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 font-mono">
                              {stageWeight}%
                            </span>
                          </div>

                          {/* Probability runway progress bar */}
                          <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                stageWeight >= 75
                                  ? "bg-emerald-500"
                                  : stageWeight >= 50
                                  ? "bg-indigo-500"
                                  : stageWeight >= 25
                                  ? "bg-purple-500"
                                  : "bg-blue-500"
                              }`}
                              style={{ width: `${Math.max(stageWeight, 8)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 5. Deal Value & Weighted Revenue (Combined Cleanly) */}
                      <td className="py-3 px-3 align-top">
                        <div className="space-y-0.5">
                          <div className="font-black text-slate-900 dark:text-white text-xs">
                            {formatCurrency(lead.dealValue)}
                          </div>
                          <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(weightedVal)}
                            <span className="text-[10px] text-slate-400 font-normal ml-1">
                              ({stageWeight}%)
                            </span>
                          </div>
                          {(() => {
                            const leadInvs = getLeadInvoices(lead);
                            if (leadInvs.length === 0) return null;
                            const totalInvAmt = leadInvs.reduce((s, i) => s + (i.invoiceAmount || 0), 0);
                            const label =
                              leadInvs.length === 1
                                ? `#${leadInvs[0].invoiceNumber}`
                                : `${leadInvs.length} Invoices (${formatCurrency(totalInvAmt)})`;
                            const tooltip = leadInvs
                              .map((i) => `#${i.invoiceNumber}: ${formatCurrency(i.invoiceAmount)} (${i.invoiceDate})`)
                              .join(" • ");
                            return (
                              <div className="pt-1">
                                <span
                                  onClick={() => onSelectLead(lead)}
                                  className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-black text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/80 cursor-pointer hover:bg-amber-100"
                                  title={`Invoices: ${tooltip}`}
                                >
                                  <Receipt className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                  <span>{label}</span>
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </td>

                      {/* 6. Target Closure & Docs */}
                      <td className="py-3 px-3 align-top">
                        <div className="space-y-1">
                          {lead.closureMonth ? (
                            <div className="flex items-center space-x-1 font-bold text-[11px] text-blue-700 dark:text-blue-300">
                              <Calendar className="w-3 h-3 text-[#4285F4] shrink-0" />
                              <span>{formatClosureMonth(lead.closureMonth, "short")}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">Not Set</span>
                          )}

                          {/* Docs badges */}
                          <div className="flex flex-wrap items-center gap-1">
                            {(() => {
                              const noteCount = lead.approachNotes?.length || (lead.approachNote ? 1 : 0);
                              if (noteCount === 0) return null;
                              return (
                                <span
                                  onClick={() => onSelectLead(lead)}
                                  className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/70 border border-rose-200/60 dark:border-rose-800/60 cursor-pointer hover:bg-rose-100"
                                  title={`${noteCount} Approach Note(s)`}
                                >
                                  <FileText className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                                  <span>{noteCount === 1 ? "Note" : `${noteCount} Notes`}</span>
                                </span>
                              );
                            })()}

                            {lead.financialDocuments && lead.financialDocuments.length > 0 && (
                              <span
                                onClick={() => onSelectLead(lead)}
                                className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/60 dark:border-emerald-800/60 cursor-pointer hover:bg-emerald-100"
                                title={`${lead.financialDocuments.length} Financial Document(s)`}
                              >
                                <Receipt className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                                <span>{lead.financialDocuments.length} Fin</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 7. Actions */}
                      <td className="py-3 px-3.5 align-top text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {lead.stage === "closure" && (onSendToDelivery || onMoveToBilling) && (
                            <button
                              type="button"
                              onClick={() => (onSendToDelivery || onMoveToBilling)?.(lead)}
                              className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 transition cursor-pointer"
                              title="Send won deal to Delivery pipeline"
                            >
                              <Truck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onSelectLead(lead)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition cursor-pointer"
                          >
                            View
                          </button>
                          {onDeleteLead && (
                            <button
                              type="button"
                              onClick={() => onDeleteLead(lead.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title="Delete Lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* VIEW 2: CARD GRID LAYOUT (ZERO HORIZONTAL SCROLL) */}
      {viewLayout === "grid" && (
        <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20">
          {sortedLeads.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No matching B2B clients found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sortedLeads.map((lead) => {
                const stageInfo = STAGES[lead.stage];
                const stageWeight = stageInfo?.weightage ?? lead.weightage;
                const weightedVal = lead.dealValue * (stageWeight / 100);
                const badgeStyle = getProgramBadgeStyle(lead.program);
                const sourceBadge = getLeadSourceBadgeStyle(lead.leadSource);

                return (
                  <div
                    key={lead.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-md transition-all space-y-3"
                  >
                    {/* Card Top: Logo, Company & Stage */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        {lead.companyLogo ? (
                          <div
                            onClick={() => onSelectLead(lead)}
                            className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 cursor-pointer border border-slate-200 dark:border-slate-700"
                          >
                            <img
                              src={lead.companyLogo}
                              alt={lead.companyName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div
                            onClick={() => onSelectLead(lead)}
                            className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 cursor-pointer border border-indigo-200 dark:border-indigo-800"
                          >
                            <Building2 className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4
                            onClick={() => onSelectLead(lead)}
                            className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer text-sm truncate"
                          >
                            {lead.companyName}
                          </h4>
                          <div className="text-[11px] text-slate-500 flex items-center space-x-1.5 truncate">
                            <span>{lead.industry || "General B2B"}</span>
                            {lead.city && (
                              <span>• {lead.city}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stage Pill */}
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border shrink-0 ${stageInfo.badgeBg} ${stageInfo.badgeText}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                        <span>{stageInfo.label}</span>
                      </span>
                    </div>

                    {/* Program & Source Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {lead.program && (
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeStyle.badgeBg} ${badgeStyle.badgeText} ${badgeStyle.borderColor}`}
                        >
                          <GraduationCap className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate max-w-[140px]">{lead.program}</span>
                        </span>
                      )}
                      {lead.leadSource && (
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sourceBadge.badgeBg} ${sourceBadge.badgeText} ${sourceBadge.borderColor}`}
                        >
                          <Compass className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate max-w-[120px]">{lead.leadSource}</span>
                        </span>
                      )}
                    </div>

                    {/* Commercials Matrix */}
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl grid grid-cols-2 gap-2 text-xs border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">
                          Deal Value
                        </span>
                        <strong className="text-slate-900 dark:text-white font-black text-sm">
                          {formatCurrency(lead.dealValue)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">
                          Weighted ({stageWeight}%)
                        </span>
                        <strong className="text-indigo-600 dark:text-indigo-400 font-black text-sm">
                          {formatCurrency(weightedVal)}
                        </strong>
                      </div>
                    </div>

                    {/* Primary Contact Details */}
                    <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                        <span>{lead.contactName}</span>
                        {lead.designation && (
                          <span className="text-[10px] text-slate-500 font-normal">
                            ({lead.designation})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 text-[11px] text-slate-500 truncate">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{lead.contactEmail}</span>
                      </div>
                    </div>

                    {/* Card Footer: Target Date & Actions */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1 text-[11px] text-slate-500 font-medium">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{lead.closureMonth ? formatClosureMonth(lead.closureMonth, "short") : "No target date"}</span>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {lead.stage === "closure" && (onSendToDelivery || onMoveToBilling) && (
                          <button
                            type="button"
                            onClick={() => (onSendToDelivery || onMoveToBilling)?.(lead)}
                            className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 text-[11px] font-bold flex items-center space-x-1 transition cursor-pointer"
                            title="Send won deal to Delivery pipeline"
                          >
                            <Truck className="w-3 h-3" />
                            <span>Delivery</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onSelectLead(lead)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition cursor-pointer"
                        >
                          Details
                        </button>
                        {onDeleteLead && (
                          <button
                            type="button"
                            onClick={() => onDeleteLead(lead.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Delete Lead"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: WIDE EXTENDED TABLE (LEGACY SCROLLABLE TABLE) */}
      {viewLayout === "wide" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1400px]">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 min-w-[200px] whitespace-nowrap">Client / Company</th>
                <th className="py-3 px-4 min-w-[190px] whitespace-nowrap">Pitched Program</th>
                <th className="py-3 px-4 min-w-[170px] whitespace-nowrap">Lead Source</th>
                <th className="py-3 px-4 min-w-[180px] whitespace-nowrap">Primary Contact</th>
                <th className="py-3 px-4 min-w-[220px] whitespace-nowrap">Stage & Weightage</th>
                <th className="py-3 px-4 min-w-[130px] whitespace-nowrap cursor-pointer" onClick={() => toggleSort("dealValue")}>
                  <div className="flex items-center space-x-1">
                    <span>Deal Value</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 min-w-[140px] whitespace-nowrap cursor-pointer" onClick={() => toggleSort("weightage")}>
                  <div className="flex items-center space-x-1">
                    <span>Weighted Rev.</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 min-w-[160px] whitespace-nowrap">Target Closure & Note</th>
                <th className="py-3 px-4 min-w-[180px] whitespace-nowrap">Last Activity Log</th>
                <th className="py-3 px-4 min-w-[100px] whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {sortedLeads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 text-sm">
                    No matching B2B clients found.
                  </td>
                </tr>
              ) : (
                sortedLeads.map((lead) => {
                  const stageInfo = STAGES[lead.stage];
                  const stageWeight = stageInfo?.weightage ?? lead.weightage;
                  const weightedVal = lead.dealValue * (stageWeight / 100);
                  const latestLog = lead.journeyLogs?.[0];
                  const badgeStyle = getProgramBadgeStyle(lead.program);
                  const isEditing = editingLeadId === lead.id;
                  const isEditingSource = editingSourceLeadId === lead.id;
                  const sourceBadge = getLeadSourceBadgeStyle(lead.leadSource);

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Company */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          {lead.companyLogo ? (
                            <div
                              onClick={() => onSelectLead(lead)}
                              className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 cursor-pointer shadow-xs border border-slate-200/80 dark:border-slate-700/80"
                            >
                              <img
                                src={lead.companyLogo}
                                alt={lead.companyName}
                              />
                            </div>
                          ) : (
                            <div
                              onClick={() => onSelectLead(lead)}
                              className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex-shrink-0 cursor-pointer"
                            >
                              <Building2 className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <div
                              onClick={() => onSelectLead(lead)}
                              className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 cursor-pointer flex items-center space-x-2"
                            >
                              <span>{lead.companyName}</span>
                              {lead.city && (
                                <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                                  <MapPin className="w-2.5 h-2.5 text-indigo-400" />
                                  <span>{lead.city}</span>
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">{lead.industry}</div>
                          </div>
                        </div>
                      </td>

                      {/* Pitched Program Column */}
                      <td className="py-3.5 px-4 min-w-[200px]">
                        {isEditing ? (
                          <div className="flex items-center space-x-1.5">
                            <select
                              value={selectedProgramInput}
                              onChange={(e) => setSelectedProgramInput(e.target.value)}
                              className="text-xs font-semibold px-2 py-1 bg-white dark:bg-slate-950 border border-indigo-500 rounded-lg focus:outline-none max-w-[170px]"
                              autoFocus
                            >
                              {PRESET_PROGRAMS.map((p) => (
                                <option key={p.id} value={p.name}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleSaveProgram(lead.id)}
                              className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition"
                              title="Save Pitched Program"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingLeadId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : lead.program ? (
                          <div className="inline-flex items-center space-x-1.5 group">
                            <span
                              className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${badgeStyle.badgeBg} ${badgeStyle.badgeText} ${badgeStyle.borderColor}`}
                              title={`Pitched Program: ${lead.program}`}
                            >
                              <GraduationCap className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate max-w-[170px]">{lead.program}</span>
                            </span>
                            {onUpdateProgram && (
                              <button
                                type="button"
                                onClick={() => handleStartEditProgram(lead)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                                title="Edit Pitched Program"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStartEditProgram(lead)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800/60 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 border border-dashed border-slate-300 dark:border-slate-700 transition"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Assign Program</span>
                          </button>
                        )}
                      </td>

                      {/* Lead Source Column */}
                      <td className="py-3.5 px-4 min-w-[180px]">
                        {isEditingSource ? (
                          <div className="flex items-center space-x-1.5">
                            <select
                              value={selectedSourceInput}
                              onChange={(e) => setSelectedSourceInput(e.target.value)}
                              className="text-xs font-semibold px-2 py-1 bg-white dark:bg-slate-950 border border-sky-500 rounded-lg focus:outline-none max-w-[150px]"
                              autoFocus
                            >
                              {LEAD_SOURCES.map((s) => (
                                <option key={s.id} value={s.name}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleSaveSource(lead.id)}
                              className="p-1 bg-sky-600 hover:bg-sky-700 text-white rounded transition"
                              title="Save Lead Source"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSourceLeadId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : lead.leadSource ? (
                          <div className="inline-flex items-center space-x-1.5 group">
                            <span
                              className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${sourceBadge.badgeBg} ${sourceBadge.badgeText} ${sourceBadge.borderColor}`}
                              title={`Lead Source: ${lead.leadSource}`}
                            >
                              <Compass className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate max-w-[150px]">{lead.leadSource}</span>
                            </span>
                            {onUpdateLeadSource && (
                              <button
                                type="button"
                                onClick={() => handleStartEditSource(lead)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition"
                                title="Edit Lead Source"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStartEditSource(lead)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 hover:bg-sky-50 dark:bg-slate-800/60 dark:hover:bg-sky-950/60 hover:text-sky-600 dark:hover:text-sky-300 border border-dashed border-slate-300 dark:border-slate-700 transition"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Select Source</span>
                          </button>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5 flex-wrap">
                          <span>{lead.contactName}</span>
                          {lead.designation && (
                            <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/60">
                              {lead.designation}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-slate-500 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{lead.contactEmail}</span>
                        </div>
                        {lead.contactPhone && (
                          <div className="flex items-center space-x-1 text-[11px] text-slate-400 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{lead.contactPhone}</span>
                          </div>
                        )}
                      </td>

                      {/* Stage & Weightage */}
                      <td className="py-3.5 px-4 min-w-[220px] whitespace-nowrap">
                        <div className="flex flex-col space-y-1.5">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${stageInfo.badgeBg} ${stageInfo.badgeText}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
                              <span className="whitespace-nowrap">{stageInfo.label}</span>
                            </span>
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300 font-mono">
                              {stageWeight}%
                            </span>
                          </div>
                          <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                stageWeight >= 75
                                  ? "bg-emerald-500"
                                  : stageWeight >= 50
                                  ? "bg-indigo-500"
                                  : stageWeight >= 25
                                  ? "bg-purple-500"
                                  : "bg-blue-500"
                              }`}
                              style={{ width: `${Math.max(stageWeight, 8)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Unweighted Value */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {formatCurrency(lead.dealValue)}
                      </td>

                      {/* Weighted Revenue */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-indigo-600 dark:text-indigo-400">
                          {formatCurrency(weightedVal)}
                        </div>
                        <div className="text-[10px] text-slate-400">{stageWeight}% probability</div>
                      </td>

                      {/* Target Closure & Approach Note */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {lead.closureMonth ? (
                          <div className="flex items-center space-x-1.5 font-bold text-xs text-blue-700 dark:text-blue-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335] flex-shrink-0" />
                            <Calendar className="w-3.5 h-3.5 text-[#4285F4] flex-shrink-0" />
                            <span>{formatClosureMonth(lead.closureMonth, "short")}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Not Set</span>
                        )}
                      </td>

                      {/* Last Log */}
                      <td className="py-3.5 px-4 text-xs text-slate-500 max-w-[200px]">
                        {latestLog ? (
                          <div>
                            <div className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                              {latestLog.title}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {latestLog.formattedDate}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">No logs</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {lead.stage === "closure" && (onSendToDelivery || onMoveToBilling) && (
                            <SpringButton
                              variant="secondary"
                              size="sm"
                              onClick={() => (onSendToDelivery || onMoveToBilling)?.(lead)}
                              className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-bold"
                              title="Send won deal to Delivery pipeline"
                            >
                              <Truck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span className="hidden sm:inline">To Delivery</span>
                            </SpringButton>
                          )}
                          <SpringButton
                            variant="ghost"
                            size="sm"
                            onClick={() => onSelectLead(lead)}
                            className="bg-indigo-50/60 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 font-semibold"
                          >
                            View Details
                          </SpringButton>
                          {onDeleteLead && (
                            <button
                              onClick={() => onDeleteLead(lead.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition"
                              title="Delete Lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
      )}
    </div>
  );
};
