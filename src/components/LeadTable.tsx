"use client";

import React, { useState } from "react";
import { Lead, LeadStage } from "@/types/lead";
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
} from "lucide-react";
import { formatINR, formatClosureMonth } from "@/lib/formatters";
import { PRESET_PROGRAMS, getProgramBadgeStyle } from "@/constants/programs";
import { LEAD_SOURCES, getLeadSourceBadgeStyle } from "@/constants/leadSources";

interface LeadTableProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateStage?: (leadId: string, newStage: LeadStage, notes?: string) => void;
  onDeleteLead?: (leadId: string) => void;
  onUpdateProgram?: (leadId: string, newProgram: string) => void;
  onUpdateLeadSource?: (leadId: string, newSource: string) => void;
}

export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  onSelectLead,
  onDeleteLead,
  onUpdateProgram,
  onUpdateLeadSource,
}) => {
  const [sortBy, setSortBy] = useState<"dealValue" | "weightage" | "updatedAt">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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
      {/* Table Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
          <span>Client Roster & Pitched Offerings</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
            {sortedLeads.length} clients
          </span>
        </h3>
      </div>

      {/* Table */}
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
                              className="w-full h-full object-cover"
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

                    {/* Pitched Program Column (Interactive & Editable) */}
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

                    {/* Lead Source Column (Interactive & Editable) */}
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

                        {/* Micro progress bar tracking probability weightage */}
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
                      {lead.approachNote ? (
                        <div
                          onClick={() => onSelectLead(lead)}
                          className="inline-flex items-center space-x-1 mt-1 px-2 py-0.5 rounded text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/70 border border-rose-200/60 dark:border-rose-800/60 cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/60 transition"
                          title={`PDF: ${lead.approachNote.fileName} (${lead.approachNote.fileSize})`}
                        >
                          <FileText className="w-3 h-3 text-rose-500 flex-shrink-0" />
                          <span className="truncate max-w-[100px]">PDF Attached</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 mt-0.5">No note</div>
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
                        <button
                          onClick={() => onSelectLead(lead)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 font-medium text-xs transition"
                        >
                          View Details
                        </button>
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
    </div>
  );
};
