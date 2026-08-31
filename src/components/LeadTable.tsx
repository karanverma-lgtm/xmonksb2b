"use client";

import React, { useState } from "react";
import { Lead, LeadStage } from "@/types/lead";
import { STAGES, STAGE_ORDER } from "@/constants/stages";
import {
  Search,
  Filter,
  Building2,
  Mail,
  Phone,
  IndianRupee,
  TrendingUp,
  History,
  Eye,
  ArrowUpDown,
  Trash2,
  MapPin,
} from "lucide-react";

import { formatINR } from "@/lib/formatters";

interface LeadTableProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateStage: (leadId: string, newStage: LeadStage, notes?: string) => void;
  onDeleteLead?: (leadId: string) => void;
}

export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  onSelectLead,
  onUpdateStage,
  onDeleteLead,
}) => {
  const [sortBy, setSortBy] = useState<"dealValue" | "weightage" | "updatedAt">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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

  const formatCurrency = (val: number) => formatINR(val);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Table Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
          Filtered B2B Directory ({sortedLeads.length} leads)
        </h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Company & Industry</th>
              <th className="py-3 px-4">Primary Contact</th>
              <th className="py-3 px-4">Stage & Weightage</th>
              <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort("dealValue")}>
                <div className="flex items-center space-x-1">
                  <span>Deal Value</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort("weightage")}>
                <div className="flex items-center space-x-1">
                  <span>Weighted Revenue</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4">Last Activity Log</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            {sortedLeads.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 text-sm">
                  No matching B2B leads found.
                </td>
              </tr>
            ) : (
              sortedLeads.map((lead) => {
                const stageInfo = STAGES[lead.stage];
                const weightedVal = lead.dealValue * (lead.weightage / 100);
                const latestLog = lead.journeyLogs?.[0];

                return (
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Company */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                          <Building2 className="w-4 h-4" />
                        </div>
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
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold border ${stageInfo.badgeBg} ${stageInfo.badgeText}`}
                        >
                          {stageInfo.label} ({lead.weightage}%)
                        </span>
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
                      <div className="text-[10px] text-slate-400">{lead.weightage}% probability</div>
                    </td>

                    {/* Last Log */}
                    <td className="py-3.5 px-4 text-xs text-slate-500 max-w-[220px]">
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
                          View Logs
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
