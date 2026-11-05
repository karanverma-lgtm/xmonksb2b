"use client";

import React from "react";
import { Lead, LeadStage, getLeadInvoices, LeadInvoice } from "@/types/lead";
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
  GraduationCap,
  Compass,
  Receipt,
  Truck,
  ArrowRight,
  Pencil,
  X,
  Check,
} from "lucide-react";
import { useState, useEffect } from "react";
import confetti from "canvas-confetti";

import { formatINR, formatClosureMonth } from "@/lib/formatters";
import { getLeadSourceBadgeStyle } from "@/constants/leadSources";
import { SpringButton, SpringCard } from "@/components/spring";

interface KanbanBoardProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateStage: (leadId: string, newStage: LeadStage, notes?: string) => void;
  onDeleteLead?: (leadId: string) => void;
  onMoveToBilling?: (lead: Lead) => void;
  onSendToDelivery?: (lead: Lead) => void;
  onUpdateInvoiceDetails?: (
    leadId: string,
    invoiceData: { invoiceNumber?: string; invoiceDate?: string; invoiceAmount?: number }
  ) => void;
  readOnly?: boolean;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  leads,
  onSelectLead,
  onUpdateStage,
  onDeleteLead,
  onMoveToBilling,
  onSendToDelivery,
  onUpdateInvoiceDetails,
  readOnly = false,
}) => {
  const [quickInvoiceLead, setQuickInvoiceLead] = useState<Lead | null>(null);
  const [quickInvoiceNumber, setQuickInvoiceNumber] = useState("");
  const [quickInvoiceDate, setQuickInvoiceDate] = useState("");
  const [quickInvoiceAmount, setQuickInvoiceAmount] = useState("");
  const [isSavingQuickInvoice, setIsSavingQuickInvoice] = useState(false);

  useEffect(() => {
    if (quickInvoiceLead) {
      setQuickInvoiceNumber(quickInvoiceLead.invoiceNumber || "");
      setQuickInvoiceDate(
        quickInvoiceLead.invoiceDate ||
        quickInvoiceLead.expectedCloseDate ||
        new Date().toISOString().split("T")[0]
      );
      setQuickInvoiceAmount(
        quickInvoiceLead.invoiceAmount !== undefined && quickInvoiceLead.invoiceAmount !== null
          ? String(quickInvoiceLead.invoiceAmount)
          : String(quickInvoiceLead.dealValue || 100000)
      );
    }
  }, [quickInvoiceLead]);

  const handleSaveQuickInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInvoiceLead) return;
    setIsSavingQuickInvoice(true);
    const parsedAmount = parseFloat(quickInvoiceAmount);
    if (onUpdateInvoiceDetails) {
      await onUpdateInvoiceDetails(quickInvoiceLead.id, {
        invoiceNumber: quickInvoiceNumber.trim() || undefined,
        invoiceDate: quickInvoiceDate.trim() || undefined,
        invoiceAmount: !isNaN(parsedAmount) ? parsedAmount : undefined,
      });
    }
    setIsSavingQuickInvoice(false);
    setQuickInvoiceLead(null);
  };
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
    const targetIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

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
                    const stageWeight = STAGES[lead.stage]?.weightage ?? lead.weightage;
                    const leadWeightedValue = lead.dealValue * (stageWeight / 100);
                    const latestLog = lead.journeyLogs?.[0];

                    return (
                      <SpringCard
                        key={lead.id}
                        onClick={() => onSelectLead(lead)}
                        className="group relative bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-indigo-500/40 dark:hover:border-indigo-500/40 transition-colors cursor-pointer"
                      >
                        {/* Top Industry & Tag */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/50 truncate min-w-0"
                            title={lead.industry}
                          >
                            {lead.industry}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                            ID: #{lead.id.slice(-4)}
                          </span>
                        </div>

                        {/* Company & Contact */}
                        <div className="flex items-center justify-between space-x-2">
                          <h5 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center space-x-2 min-w-0">
                            {lead.companyLogo ? (
                              <img
                                src={lead.companyLogo}
                                alt=""
                                className="w-5 h-5 rounded-md object-cover flex-shrink-0 bg-slate-100 dark:bg-slate-800 shadow-xs"
                              />
                            ) : (
                              <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            )}
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
                          <div className="flex items-center space-x-1 truncate min-w-0">
                            <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{lead.contactName}</span>
                            {lead.designation && (
                              <span className="text-[10px] text-slate-400 font-normal truncate">
                                ({lead.designation})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1.5 flex-shrink-0">
                            {lead.additionalContacts && lead.additionalContacts.length > 0 && (
                              <span
                                className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50"
                                title={`${lead.additionalContacts.length} additional contact(s): ${lead.additionalContacts.map((c) => c.name).join(", ")}`}
                              >
                                <Users className="w-2.5 h-2.5" />
                                <span>+{lead.additionalContacts.length}</span>
                              </span>
                            )}
                            {lead.contactPhone && (
                              <div className="flex items-center space-x-1 text-[11px] text-slate-400">
                                <Phone className="w-2.5 h-2.5" />
                                <span>{lead.contactPhone}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Badges: Pitched Program, Target Closure Month, Approach Note */}
                        <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                          {lead.program && (
                            <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/90 dark:bg-indigo-950/70 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/60 max-w-full">
                              <GraduationCap className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                              <span className="truncate">{lead.program}</span>
                            </span>
                          )}

                          {lead.leadSource && (
                            <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${getLeadSourceBadgeStyle(lead.leadSource).badgeBg} ${getLeadSourceBadgeStyle(lead.leadSource).badgeText} ${getLeadSourceBadgeStyle(lead.leadSource).borderColor}`}>
                              <Compass className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{lead.leadSource}</span>
                            </span>
                          )}

                          {lead.closureMonth && (
                            <span className="inline-flex items-center space-x-1.5 text-[10px] font-bold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 px-2 py-0.5 rounded-md border border-blue-200/70 dark:border-blue-800/70">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335] flex-shrink-0" />
                              <Calendar className="w-3 h-3 text-[#4285F4] flex-shrink-0" />
                              <span>Target: {formatClosureMonth(lead.closureMonth, "short")}</span>
                            </span>
                          )}

                          {(() => {
                            const count = lead.approachNotes?.length || (lead.approachNote ? 1 : 0);
                            if (count === 0) return null;
                            return (
                              <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200/60 dark:border-rose-800/60">
                                <FileText className="w-3 h-3 text-rose-500 flex-shrink-0" />
                                <span>{count === 1 ? "Approach Note" : `${count} Notes`}</span>
                              </span>
                            );
                          })()}

                          {lead.financialDocuments && lead.financialDocuments.length > 0 && (
                            <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                              <Receipt className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                              <span>
                                {lead.financialDocuments.length} Fin{" "}
                                {lead.financialDocuments.length === 1 ? "Doc" : "Docs"}
                              </span>
                            </span>
                          )}

                          {/* Badge if set */}
                          {(() => {
                            const leadInvs = getLeadInvoices(lead);
                            if (leadInvs.length === 0) return null;
                            const totalInv = leadInvs.reduce((s, i) => s + (i.invoiceAmount || 0), 0);
                            return (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectLead(lead);
                                }}
                                className="inline-flex items-center space-x-1 text-[10px] font-black text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-700 shadow-2xs cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40"
                                title="Click to view & manage Invoices (Synced to Forecast)"
                              >
                                <Receipt className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                <span className="truncate max-w-[130px]">
                                  {leadInvs.length === 1
                                    ? `#${leadInvs[0].invoiceNumber}`
                                    : `${leadInvs.length} Invoices`}
                                  {totalInv ? ` • ${formatCurrency(totalInv)}` : ""}
                                </span>
                                <Pencil className="w-2.5 h-2.5 ml-0.5 text-amber-600 dark:text-amber-400" />
                              </span>
                            );
                          })()}
                        </div>

                        {/* Deal Value & Weightage breakdown */}
                        <div className="mt-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
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
                              {stageWeight}% Weighted
                            </div>
                            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              {formatCurrency(leadWeightedValue)}
                            </div>
                          </div>
                        </div>

                        {/* Invoice Date, Number & Amount (Synced to Forecast) */}
                        {(() => {
                          const leadInvs = getLeadInvoices(lead);
                          if (leadInvs.length > 0) {
                            const totalInv = leadInvs.reduce((s, i) => s + (i.invoiceAmount || 0), 0);
                            const latestInv = leadInvs[leadInvs.length - 1];
                            return (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectLead(lead);
                                }}
                                className={`mt-2 p-2 rounded-xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-700/60 ${readOnly ? "" : "hover:border-amber-400 cursor-pointer group/inv"} space-y-1 shadow-2xs`}
                                title={readOnly ? "Invoice Details" : "Click to view and manage all invoices for this lead"}
                              >
                                <div className="flex items-center justify-between text-[10px]">
                                  <div className="flex items-center space-x-1 font-mono font-black text-amber-900 dark:text-amber-200">
                                    <Receipt className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span>
                                      {leadInvs.length === 1
                                        ? `#${leadInvs[0].invoiceNumber}`
                                        : `${leadInvs.length} Invoices`}
                                    </span>
                                  </div>
                                  {!readOnly && (
                                    <div className="flex items-center space-x-1 text-amber-700 dark:text-amber-300 text-[10px] font-bold opacity-80 group-hover/inv:opacity-100">
                                      <Pencil className="w-2.5 h-2.5" />
                                      <span>Manage</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center justify-between text-[11px] pt-0.5">
                                  <span className="font-black text-emerald-700 dark:text-emerald-400 font-mono">
                                    {formatCurrency(totalInv)}
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 flex items-center space-x-1">
                                    <Calendar className="w-2.5 h-2.5 text-slate-400" />
                                    <span>{latestInv?.invoiceDate || "No Date"}</span>
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          if (!readOnly) {
                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectLead(lead);
                                }}
                                className="mt-2 w-full py-1.5 px-2 rounded-xl text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 bg-slate-100/80 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-dashed border-slate-200 dark:border-slate-700 hover:border-amber-300 transition flex items-center justify-center space-x-1.5 cursor-pointer"
                                title="Add invoices for the Forecast tab"
                              >
                                <Receipt className="w-3 h-3 text-slate-400" />
                                <span>+ Add Invoices</span>
                              </button>
                            );
                          }
                          return null;
                        })()}

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

                          {/* Quick Stage Controls (Disabled in View Only Mode) */}
                          {!readOnly && (
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
                          )}
                        </div>

                        {/* Send to Delivery Option for Closure Stage */}
                        {lead.stage === "closure" && !readOnly && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <SpringButton
                              variant="gradient"
                              size="md"
                              onClick={(e) => {
                                e.stopPropagation();
                                (onSendToDelivery || onMoveToBilling)?.(lead);
                              }}
                              className="w-full flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-500/25"
                              title="Send this won deal to Delivery pipeline to configure Tenure & track milestones"
                            >
                              <Truck className="w-3.5 h-3.5 text-indigo-200" />
                              <span>Send to Delivery</span>
                              <ArrowRight className="w-3.5 h-3.5 text-indigo-200" />
                            </SpringButton>
                          </div>
                        )}
                      </SpringCard>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Invoice Modal in Pipeline */}
      {quickInvoiceLead && !readOnly && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn"
          onClick={() => setQuickInvoiceLead(null)}
        >
          <div
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    Set Pipeline Invoice Details
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {quickInvoiceLead.companyName} • Synced directly to Forecast tab
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickInvoiceLead(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveQuickInvoice} className="p-5 space-y-4">
              {/* 1. Invoice Number */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Invoice Number *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={quickInvoiceNumber}
                    onChange={(e) => setQuickInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-XM-2026-001"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs"
                  />
                  {!quickInvoiceNumber && (
                    <button
                      type="button"
                      onClick={() => {
                        const year = new Date().getFullYear();
                        const rand = Math.floor(1000 + Math.random() * 9000);
                        setQuickInvoiceNumber(`INV-XM-${year}-${rand}`);
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                    >
                      Auto
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Invoice Date */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Invoice Date *
                </label>
                <input
                  type="date"
                  required
                  value={quickInvoiceDate}
                  onChange={(e) => setQuickInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs"
                />
              </div>

              {/* 3. Invoice Amount */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    Invoice Amount (₹) *
                  </label>
                  {quickInvoiceLead.dealValue > 0 && (
                    <button
                      type="button"
                      onClick={() => setQuickInvoiceAmount(String(quickInvoiceLead.dealValue))}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Use Deal Value ({formatCurrency(quickInvoiceLead.dealValue)})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={quickInvoiceAmount}
                  onChange={(e) => setQuickInvoiceAmount(e.target.value)}
                  placeholder={`e.g. ${quickInvoiceLead.dealValue || 100000}`}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs"
                />
                {quickInvoiceAmount && !isNaN(parseFloat(quickInvoiceAmount)) && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1">
                    Formatted: {formatCurrency(parseFloat(quickInvoiceAmount))}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setQuickInvoiceLead(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <SpringButton
                  type="submit"
                  variant="gradient"
                  size="sm"
                  disabled={isSavingQuickInvoice}
                  className="flex items-center space-x-1.5 font-bold shadow-md cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingQuickInvoice ? "Saving..." : "Save & Sync to Forecast"}</span>
                </SpringButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
