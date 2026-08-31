"use client";

import React, { useState } from "react";
import { Lead, LeadStage } from "@/types/lead";
import { STAGES, STAGE_ORDER, PIPELINE_STAGES } from "@/constants/stages";
import {
  X,
  Building2,
  Mail,
  Phone,
  Calendar,
  User,
  Sparkles,
  CheckCircle2,
  Clock,
  Send,
  History,
  TrendingUp,
  Tag,
  MessageSquare,
  AlertCircle,
  Trash2,
  MapPin,
} from "lucide-react";
import confetti from "canvas-confetti";

import { formatINR } from "@/lib/formatters";

interface LeadDetailModalProps {
  lead: Lead | null;
  onClose: () => void;
  onUpdateStage: (leadId: string, newStage: LeadStage, notes?: string) => void;
  onAddNote: (leadId: string, noteText: string) => void;
  onDeleteLead?: (leadId: string) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  onClose,
  onUpdateStage,
  onAddNote,
  onDeleteLead,
}) => {
  const [newNoteText, setNewNoteText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [stageNotePrompt, setStageNotePrompt] = useState<{
    show: boolean;
    targetStage?: LeadStage;
    noteText: string;
  }>({ show: false, noteText: "" });

  if (!lead) return null;

  const currentStageInfo = STAGES[lead.stage];
  const weightedValue = lead.dealValue * (lead.weightage / 100);

  const handleStageClick = (stageId: LeadStage) => {
    if (stageId === lead.stage) return;
    setStageNotePrompt({
      show: true,
      targetStage: stageId,
      noteText: `Transitioned stage from ${STAGES[lead.stage].label} to ${STAGES[stageId].label}.`,
    });
  };

  const confirmStageChange = () => {
    if (!stageNotePrompt.targetStage) return;
    const targetStage = stageNotePrompt.targetStage;

    if (targetStage === "closure") {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
      });
    }

    onUpdateStage(lead.id, targetStage, stageNotePrompt.noteText);
    setStageNotePrompt({ show: false, noteText: "" });
  };

  const handlePostNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    onAddNote(lead.id, newNoteText.trim());
    setNewNoteText("");
  };

  const formatCurrency = (val: number) => formatINR(val);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header Bar */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20">
              <Building2 className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  {lead.companyName}
                </h2>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${currentStageInfo.badgeBg} ${currentStageInfo.badgeText}`}
                >
                  {currentStageInfo.label} ({lead.weightage}%)
                </span>
              </div>

              <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span className="flex items-center space-x-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{lead.contactName}</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{lead.contactEmail}</span>
                </span>
                {lead.contactPhone && (
                  <>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{lead.contactPhone}</span>
                    </span>
                  </>
                )}
                {lead.city && (
                  <>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{lead.city}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onDeleteLead && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition"
                title="Delete this B2B Lead"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete Lead</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Alert Banner */}
        {showDeleteConfirm && (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4" />
              <span>Are you sure you want to delete {lead.companyName}? This cannot be undone.</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteLead) {
                    onDeleteLead(lead.id);
                  }
                  onClose();
                }}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Key Deal Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase">Total Deal Value</div>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                {formatCurrency(lead.dealValue)}
              </div>
            </div>

            <div>
              <div className="text-xs text-indigo-500 font-semibold uppercase">
                Stage Weightage Probability
              </div>
              <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                {lead.weightage}% Weightage
              </div>
            </div>

            <div>
              <div className="text-xs text-purple-500 font-semibold uppercase">
                Forecasted Weighted Revenue
              </div>
              <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
                {formatCurrency(weightedValue)}
              </div>
            </div>
          </div>

          {/* Interactive Lead Stage Journey Stepper */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>Update Lead Stage & Weightage</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Click any stage to update probability weightage & append timestamped journey log.
                </p>
              </div>
            </div>

            {/* Stepper Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {PIPELINE_STAGES.map((stageKey) => {
                const info = STAGES[stageKey];
                const isActive = lead.stage === stageKey;
                const isPassed =
                  STAGE_ORDER.indexOf(lead.stage) >= STAGE_ORDER.indexOf(stageKey);

                return (
                  <button
                    key={stageKey}
                    onClick={() => handleStageClick(stageKey)}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      isActive
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/30 font-bold scale-[1.02]"
                        : isPassed
                        ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100"
                        : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-extrabold">
                      <span>{info.weightage}%</span>
                      {isActive ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      ) : isPassed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                      ) : null}
                    </div>
                    <div className="text-xs font-semibold mt-1 truncate">{info.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prompt Box for Stage Change Notes */}
          {stageNotePrompt.show && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-3">
              <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>
                  Updating stage to {STAGES[stageNotePrompt.targetStage!].label} (
                  {STAGES[stageNotePrompt.targetStage!].weightage}% Weightage)
                </span>
              </div>

              <textarea
                value={stageNotePrompt.noteText}
                onChange={(e) =>
                  setStageNotePrompt({ ...stageNotePrompt, noteText: e.target.value })
                }
                rows={2}
                placeholder="Enter details about this stage transition..."
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setStageNotePrompt({ show: false, noteText: "" })}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmStageChange}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow"
                >
                  Confirm Stage & Save Log
                </button>
              </div>
            </div>
          )}

          {/* Add Manual Touchpoint Log Box */}
          <form
            onSubmit={handlePostNote}
            className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3"
          >
            <label className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              <span>Log Customer Touchpoint / Note</span>
            </label>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Logged phone call, meeting feedback, or client note..."
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                className="flex-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post Log</span>
              </button>
            </div>
          </form>

          {/* Customer Journey Logs Timeline */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                <History className="w-4 h-4 text-purple-500" />
                <span>Timestamped Customer Journey Logs ({lead.journeyLogs?.length || 0})</span>
              </h3>
              <span className="text-[11px] text-slate-400">Chronological Audit Trail</span>
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {lead.journeyLogs?.map((log) => (
                <div key={log.id} className="relative group">
                  {/* Timeline Bullet Dot */}
                  <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-600 shadow-sm" />

                  {/* Log Content Card */}
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                        {log.title}
                      </h4>
                      <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-mono bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded-md">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{log.formattedDate}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                      {log.description}
                    </p>

                    <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Author: <strong className="text-slate-600 dark:text-slate-300">{log.author}</strong></span>
                      {log.newStage && (
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                          Stage: {STAGES[log.newStage]?.label} ({STAGES[log.newStage]?.weightage}%)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
