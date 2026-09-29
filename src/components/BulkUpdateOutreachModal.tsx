"use client";

import React, { useState } from "react";
import {
  X,
  Layers,
  Sparkles,
  Calendar,
  DollarSign,
  User,
  Radio,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { ColdClient, ColdClientStatus, OutreachChannel } from "@/types/outreach";
import { COLD_STATUS_CONFIG, OUTREACH_CHANNELS } from "@/constants/outreach";
import { PRESET_PROGRAMS } from "@/constants/programs";
import { UserAccount } from "@/constants/users";

interface BulkUpdateOutreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  clients: ColdClient[];
  platformOwners: string[];
  currentUser?: UserAccount | null;
  onConfirmBulkUpdate: (
    ids: string[],
    updates: Partial<ColdClient>,
    touchpointNote?: string
  ) => Promise<void>;
}

export const BulkUpdateOutreachModal: React.FC<BulkUpdateOutreachModalProps> = ({
  isOpen,
  onClose,
  selectedIds,
  clients,
  platformOwners,
  currentUser,
  onConfirmBulkUpdate,
}) => {
  // Form states - "__KEEP__" represents untouched/unchanged field
  const [selectedStatus, setSelectedStatus] = useState<string>("__KEEP__");
  const [selectedOffering, setSelectedOffering] = useState<string>("__KEEP__");
  const [customOffering, setCustomOffering] = useState<string>("");
  
  const [shouldUpdateValue, setShouldUpdateValue] = useState<boolean>(false);
  const [potentialValue, setPotentialValue] = useState<number>(500000);

  const [selectedOwner, setSelectedOwner] = useState<string>("__KEEP__");
  const [selectedChannel, setSelectedChannel] = useState<string>("__KEEP__");

  const [followUpMode, setFollowUpMode] = useState<"keep" | "set" | "clear">("keep");
  const [followUpDate, setFollowUpDate] = useState<string>("");

  const [shouldAddTouchpoint, setShouldAddTouchpoint] = useState<boolean>(false);
  const [touchpointNote, setTouchpointNote] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  // Selected clients details for context
  const selectedClientsList = clients.filter((c) => selectedIds.includes(c.id));

  // Quick date helper
  const setQuickDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setFollowUpMode("set");
    setFollowUpDate(d.toISOString().split("T")[0]);
  };

  // Format INR for display preview
  const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Determine which fields have active updates
  const hasStatusUpdate = selectedStatus !== "__KEEP__";
  const hasOfferingUpdate =
    selectedOffering !== "__KEEP__" &&
    (selectedOffering !== "custom" || customOffering.trim().length > 0);
  const hasValueUpdate = shouldUpdateValue;
  const hasOwnerUpdate = selectedOwner !== "__KEEP__";
  const hasChannelUpdate = selectedChannel !== "__KEEP__";
  const hasFollowUpUpdate = followUpMode !== "keep";
  const hasTouchpointUpdate = shouldAddTouchpoint && touchpointNote.trim().length > 0;

  const totalModificationsCount = [
    hasStatusUpdate,
    hasOfferingUpdate,
    hasValueUpdate,
    hasOwnerUpdate,
    hasChannelUpdate,
    hasFollowUpUpdate,
    hasTouchpointUpdate,
  ].filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalModificationsCount === 0) return;

    setIsSubmitting(true);
    try {
      const updates: Partial<ColdClient> = {};

      if (hasStatusUpdate) {
        updates.status = selectedStatus as ColdClientStatus;
      }

      if (hasOfferingUpdate) {
        updates.targetProgram =
          selectedOffering === "custom" ? customOffering.trim() : selectedOffering;
      }

      if (hasValueUpdate) {
        updates.estimatedPotentialValue = Number(potentialValue) || 0;
      }

      if (hasOwnerUpdate) {
        updates.owner = selectedOwner;
      }

      if (hasChannelUpdate) {
        updates.channel = selectedChannel as OutreachChannel;
      }

      if (followUpMode === "set" && followUpDate) {
        updates.nextFollowUpDate = followUpDate;
      } else if (followUpMode === "clear") {
        updates.nextFollowUpDate = "";
      }

      const noteToLog = hasTouchpointUpdate ? touchpointNote.trim() : undefined;

      await onConfirmBulkUpdate(selectedIds, updates, noteToLog);
      onClose();
    } catch (err) {
      console.error("Bulk update failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Multi-Update Leads
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                  {selectedIds.length} {selectedIds.length === 1 ? "Lead" : "Leads"} Selected
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Update only the fields you wish to modify across the selected leads.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Leads Chips Preview */}
        <div className="px-6 py-2.5 bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
            Targeting:
          </span>
          {selectedClientsList.slice(0, 6).map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium shrink-0 text-[11px]"
            >
              {c.companyName}
            </span>
          ))}
          {selectedClientsList.length > 6 && (
            <span className="text-[11px] text-slate-400 font-medium shrink-0">
              +{selectedClientsList.length - 6} more
            </span>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[68vh] overflow-y-auto">
          {/* 1. Potential Value & Target Offering Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Potential Deal Value */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shouldUpdateValue}
                    onChange={(e) => setShouldUpdateValue(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
                  />
                  <span>Update Potential Value</span>
                </label>
                {shouldUpdateValue && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {formatINR(potentialValue)}
                  </span>
                )}
              </div>

              {shouldUpdateValue ? (
                <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <DollarSign className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="number"
                      step={25000}
                      min={0}
                      value={potentialValue}
                      onChange={(e) => setPotentialValue(Number(e.target.value))}
                      className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="e.g. 500000"
                    />
                  </div>
                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {[250000, 500000, 1000000, 2500000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setPotentialValue(val)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                          potentialValue === val
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500"
                        }`}
                      >
                        {formatINR(val)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  Keep existing potential values unchanged.
                </p>
              )}
            </div>

            {/* Target Offering / Program */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 space-y-2.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                <Briefcase className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                Target Offering / Program
              </label>
              <select
                value={selectedOffering}
                onChange={(e) => setSelectedOffering(e.target.value)}
                className={`w-full px-3 py-1.5 text-xs font-medium rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  selectedOffering !== "__KEEP__"
                    ? "border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 font-semibold"
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                <option value="__KEEP__">— Keep Current Offering —</option>
                {PRESET_PROGRAMS.map((prog) => (
                  <option key={prog.name} value={prog.name}>
                    {prog.name}
                  </option>
                ))}
                <option value="custom">+ Custom Offering...</option>
              </select>

              {selectedOffering === "custom" && (
                <input
                  type="text"
                  value={customOffering}
                  onChange={(e) => setCustomOffering(e.target.value)}
                  placeholder="Enter custom program/offering name"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none mt-1"
                />
              )}
            </div>
          </div>

          {/* 2. Outreach Status & Assigned Owner Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Outreach Status */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                <Radio className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                Outreach Status / Stage
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={`w-full px-3 py-1.5 text-xs font-medium rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  selectedStatus !== "__KEEP__"
                    ? "border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 font-semibold"
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                <option value="__KEEP__">— Keep Current Status —</option>
                {Object.entries(COLD_STATUS_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
              {selectedStatus !== "__KEEP__" && (
                <p className="text-[11px] text-blue-600 dark:text-blue-400">
                  {COLD_STATUS_CONFIG[selectedStatus as ColdClientStatus]?.description || ""}
                </p>
              )}
            </div>

            {/* Assigned Owner */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                <User className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                Assigned Owner
              </label>
              <select
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                className={`w-full px-3 py-1.5 text-xs font-medium rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  selectedOwner !== "__KEEP__"
                    ? "border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 font-semibold"
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                <option value="__KEEP__">— Keep Current Owner —</option>
                {platformOwners.map((owner) => (
                  <option key={owner} value={owner}>
                    {owner}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Outreach Channel & Follow-Up Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Outreach Channel */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Outreach Channel
              </label>
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className={`w-full px-3 py-1.5 text-xs font-medium rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  selectedChannel !== "__KEEP__"
                    ? "border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 font-semibold"
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                <option value="__KEEP__">— Keep Current Channel —</option>
                {OUTREACH_CHANNELS.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Next Follow-Up Date */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                Next Follow-Up Date
              </label>
              <div className="flex items-center space-x-2">
                <select
                  value={followUpMode}
                  onChange={(e) => setFollowUpMode(e.target.value as "keep" | "set" | "clear")}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="keep">Keep Unchanged</option>
                  <option value="set">Set Date</option>
                  <option value="clear">Clear Date</option>
                </select>
                {followUpMode === "set" && (
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                )}
              </div>

              {followUpMode === "set" && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setQuickDate(1)}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(3)}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400"
                  >
                    +3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(7)}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400"
                  >
                    +1 Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(14)}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400"
                  >
                    +2 Weeks
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 4. Touchpoint Note (Optional Bulk Activity Log) */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 space-y-2">
            <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={shouldAddTouchpoint}
                onChange={(e) => setShouldAddTouchpoint(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
              />
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Log Outreach Activity / Touchpoint Note for all selected leads</span>
            </label>

            {shouldAddTouchpoint && (
              <div className="pt-1 space-y-1.5 animate-in fade-in duration-150">
                <textarea
                  rows={2}
                  value={touchpointNote}
                  onChange={(e) => setTouchpointNote(e.target.value)}
                  placeholder="e.g., Dispatched personalized Q3 Leadership deck & introductory outreach via LinkedIn."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400">
                  This note will be added to the touchpoint timeline of each selected lead with today's date and {currentUser?.name || "your"} authorship.
                </p>
              </div>
            )}
          </div>

          {/* Action Summary Pill Bar */}
          <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs">
            {totalModificationsCount === 0 ? (
              <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Select at least one field above to update across {selectedIds.length} leads.</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2 text-blue-900 dark:text-blue-200 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>
                    Ready to update {totalModificationsCount} attribute{totalModificationsCount > 1 ? "s" : ""} on {selectedIds.length} leads:
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-6">
                  {hasStatusUpdate && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-medium text-[11px]">
                      Status: {COLD_STATUS_CONFIG[selectedStatus as ColdClientStatus]?.label}
                    </span>
                  )}
                  {hasOfferingUpdate && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 font-medium text-[11px]">
                      Offering: {selectedOffering === "custom" ? customOffering : selectedOffering}
                    </span>
                  )}
                  {hasValueUpdate && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-medium text-[11px]">
                      Value: {formatINR(potentialValue)}
                    </span>
                  )}
                  {hasOwnerUpdate && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-medium text-[11px]">
                      Owner: {selectedOwner}
                    </span>
                  )}
                  {hasChannelUpdate && (
                    <span className="px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-300 font-medium text-[11px]">
                      Channel: {selectedChannel.toUpperCase()}
                    </span>
                  )}
                  {hasFollowUpUpdate && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 font-medium text-[11px]">
                      Follow-Up: {followUpMode === "clear" ? "Cleared" : followUpDate}
                    </span>
                  )}
                  {hasTouchpointUpdate && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-[11px]">
                      + Touchpoint Logged
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={totalModificationsCount === 0 || isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition shadow-md shadow-blue-600/20 flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    Apply Updates ({selectedIds.length} {selectedIds.length === 1 ? "Lead" : "Leads"})
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
