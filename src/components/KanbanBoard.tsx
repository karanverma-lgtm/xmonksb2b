"use client";

import React from "react";
import { Lead, LeadStage } from "@/types/lead";
import { PIPELINE_STAGES, STAGES, STAGE_ORDER } from "@/constants/stages";
import {
  Sparkles,
  FileText,
  Users,
  Scale,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  Calendar,
  User,
  History,
  Building2,
  Trash2,
  MapPin,
  Phone,
} from "lucide-react";
import confetti from "canvas-confetti";

import { formatINR } from "@/lib/formatters";

interface KanbanBoardProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateStage: (leadId: string, newStage: LeadStage, notes?: string) => void;
  onDeleteLead?: (leadId: string) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  leads,
  onSelectLead,
  onUpdateStage,
  onDeleteLead,
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Sparkles":
        return <Sparkles className="w-4 h-4 text-blue-500" />;
      case "FileText":
        return <FileText className="w-4 h-4 text-indigo-500" />;
      case "Users":
        return <Users className="w-4 h-4 text-purple-500" />;
      case "Scale":
        return <Scale className="w-4 h-4 text-amber-500" />;
      case "CheckCircle2":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      default:
        return <XCircle className="w-4 h-4 text-rose-500" />;
    }
  };

  const handleQuickAdvance = (
    e: React.MouseEvent,
    lead: Lead,
    direction: "next" | "prev"
  ) => {
    e.stopPropagation();
    const currentIndex = STAGE_ORDER.indexOf(lead.stage);
    let targetIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

    if (targetIndex < 0 || targetIndex >= STAGE_ORDER.length) return;
    const nextStage = STAGE_ORDER[targetIndex];

    if (nextStage === "closure") {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    const note = prompt(
      `Update stage to "${STAGES[nextStage].label}" (${STAGES[nextStage].weightage}% weightage)? Add optional journey log note:`,
      `Stage updated to ${STAGES[nextStage].label}`
    );

    if (note !== null) {
      onUpdateStage(lead.id, nextStage, note);
    }
  };

  const formatCurrency = (val: number) => formatINR(val);

  return (
    <div className="w-full overflow-x-auto pb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 min-w-[1100px]">
        {PIPELINE_STAGES.map((stageId) => {
          const stageInfo = STAGES[stageId];
          const stageLeads = leads.filter((l) => l.stage === stageId);
          const totalVal = stageLeads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);
          const weightedVal = totalVal * (stageInfo.weightage / 100);

          return (
            <div
              key={stageId}
              className="flex flex-col bg-slate-100/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 min-h-[600px]"
            >
              {/* Column Header */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-sm mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getIcon(stageInfo.iconName)}
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {stageInfo.label}
                    </h4>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold border ${stageInfo.badgeBg} ${stageInfo.badgeText}`}
                  >
                    {stageInfo.weightage}%
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                  {stageInfo.description}
                </p>

                {/* Column Totals */}
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    {stageLeads.length} {stageLeads.length === 1 ? "Deal" : "Deals"}
                  </span>
                  <div className="text-right">
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(totalVal)}
                    </div>
                    <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                      W: {formatCurrency(weightedVal)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lead Cards List */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[70vh] pr-0.5">
                {stageLeads.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs p-4 text-center">
                    <span>No leads in {stageInfo.label}</span>
                  </div>
                ) : (
                  stageLeads.map((lead) => {
                    const leadWeightedValue = lead.dealValue * (lead.weightage / 100);
                    const latestLog = lead.journeyLogs?.[0];

                    return (
                      <div
                        key={lead.id}
                        onClick={() => onSelectLead(lead)}
                        className="group relative bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-500/40 dark:hover:border-indigo-500/40 transition-all cursor-pointer"
                      >
                        {/* Top Industry & Tag */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/50">
                            {lead.industry}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: #{lead.id.slice(-4)}
                          </span>
                        </div>

                        {/* Company & Contact */}
                        <div className="flex items-center justify-between space-x-2">
                          <h5 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center space-x-1.5 min-w-0">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{lead.companyName}</span>
                          </h5>
                          {lead.city && (
                            <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-indigo-500 border border-indigo-500/10 flex-shrink-0">
                              <MapPin className="w-2.5 h-2.5" />
                              <span className="truncate max-w-[65px]">{lead.city}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                          <div className="flex items-center space-x-1 truncate">
                            <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{lead.contactName}</span>
                          </div>
                          {lead.contactPhone && (
                            <div className="flex items-center space-x-1 text-[11px] text-slate-400 flex-shrink-0">
                              <Phone className="w-2.5 h-2.5" />
                              <span>{lead.contactPhone}</span>
                            </div>
                          )}
                        </div>

                        {/* Deal Value & Weightage breakdown */}
                        <div className="mt-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase font-semibold">
                              Deal Value
                            </div>
                            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                              {formatCurrency(lead.dealValue)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-indigo-500 uppercase font-semibold">
                              {lead.weightage}% Weighted
                            </div>
                            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              {formatCurrency(leadWeightedValue)}
                            </div>
                          </div>
                        </div>

                        {/* Latest Activity Stamp */}
                        {latestLog && (
                          <div className="mt-2 text-[10px] text-slate-400 flex items-center space-x-1 line-clamp-1">
                            <History className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{latestLog.formattedDate}: {latestLog.title}</span>
                          </div>
                        )}

                        {/* Card Footer Actions */}
                        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <div className="flex items-center space-x-1 text-[11px] text-slate-500">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>Close: {lead.expectedCloseDate}</span>
                          </div>

                          {/* Quick Stage Controls */}
                          <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            {STAGE_ORDER.indexOf(lead.stage) > 0 && (
                              <button
                                onClick={(e) => handleQuickAdvance(e, lead, "prev")}
                                className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                                title="Move to previous stage"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {STAGE_ORDER.indexOf(lead.stage) < STAGE_ORDER.length - 2 && (
                              <button
                                onClick={(e) => handleQuickAdvance(e, lead, "next")}
                                className="p-1 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition font-bold"
                                title="Advance stage & update journey log"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {onDeleteLead && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteLead(lead.id);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition"
                                title="Delete Lead"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
