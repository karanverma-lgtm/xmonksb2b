"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Building2,
  User,
  Mail,
  Phone,
  Briefcase,
  Globe,
  Link2,
  MapPin,
  Calendar,
  Sparkles,
  ArrowRight,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  Send,
  MessageSquare,
  Flame,
  CheckCheck,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  Save,
} from "lucide-react";
import { ColdClient, ColdClientStatus, OutreachChannel, OutreachTouchpoint } from "@/types/outreach";
import { COLD_STATUS_CONFIG, OUTREACH_CHANNELS, OUTREACH_INDUSTRIES } from "@/constants/outreach";
import { PRESET_PROGRAMS } from "@/constants/programs";
import { UserAccount } from "@/constants/users";
import { formatINR } from "@/lib/formatters";

interface ColdClientDetailModalProps {
  client: ColdClient | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateClient: (id: string, updates: Partial<ColdClient>) => Promise<void>;
  onLogTouchpoint: (
    clientId: string,
    touchpoint: {
      channel: OutreachChannel | "note";
      summary: string;
      author: string;
      nextStatus?: ColdClientStatus;
      nextFollowUpDate?: string;
    }
  ) => Promise<void>;
  onConvertToLead: (
    client: ColdClient,
    dealValue: number,
    author: string,
    targetClosureMonth?: string
  ) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
  currentUser?: UserAccount | null;
  onNavigateToEmail?: (recipientEmail: string, recipientName: string, companyName: string) => void;
}

export const ColdClientDetailModal: React.FC<ColdClientDetailModalProps> = ({
  client,
  isOpen,
  onClose,
  onUpdateClient,
  onLogTouchpoint,
  onConvertToLead,
  onDeleteClient,
  currentUser,
  onNavigateToEmail,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [convertSuccess, setConvertSuccess] = useState(false);

  // Edit fields
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [designation, setDesignation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState("");
  const [targetProgram, setTargetProgram] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [status, setStatus] = useState<ColdClientStatus>("uncontacted");
  const [channel, setChannel] = useState<OutreachChannel>("email");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [notes, setNotes] = useState("");

  // Touchpoint logger state
  const [tpChannel, setTpChannel] = useState<OutreachChannel | "note">("email");
  const [tpSummary, setTpSummary] = useState("");
  const [tpNextStatus, setTpNextStatus] = useState<ColdClientStatus | "">("");
  const [tpFollowUpDate, setTpFollowUpDate] = useState("");
  const [isLoggingTp, setIsLoggingTp] = useState(false);

  // Convert state
  const [convertDealValue, setConvertDealValue] = useState("500000");
  const [convertClosureMonth, setConvertClosureMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    if (client) {
      setCompanyName(client.companyName || "");
      setContactName(client.contactName || "");
      setDesignation(client.designation || "");
      setEmail(client.email || "");
      setPhone(client.phone || "");
      setLinkedinUrl(client.linkedinUrl || "");
      setWebsite(client.website || "");
      setCity(client.city || "");
      setIndustry(client.industry || OUTREACH_INDUSTRIES[0]);
      setTargetProgram(client.targetProgram || PRESET_PROGRAMS[0]?.name || "Executive Coaching");
      setEstimatedValue(client.estimatedPotentialValue?.toString() || "0");
      setStatus(client.status || "uncontacted");
      setChannel(client.channel || "email");
      setNextFollowUpDate(client.nextFollowUpDate || "");
      setNotes(client.notes || "");
      setConvertDealValue(client.estimatedPotentialValue?.toString() || "500000");
      setIsEditing(false);
      setShowConvertModal(false);
      setConvertSuccess(false);
      setTpSummary("");
      setTpNextStatus("");
    }
  }, [client]);

  if (!isOpen || !client) return null;

  const statusConfig = COLD_STATUS_CONFIG[status] || COLD_STATUS_CONFIG.uncontacted;

  const handleSaveDetails = async () => {
    if (!companyName.trim() || !contactName.trim() || !email.trim()) return;
    try {
      setIsSaving(true);
      await onUpdateClient(client.id, {
        companyName: companyName.trim(),
        contactName: contactName.trim(),
        designation: designation.trim() || undefined,
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        linkedinUrl: linkedinUrl.trim() || undefined,
        website: website.trim() || undefined,
        city: city.trim() || undefined,
        industry,
        targetProgram,
        estimatedPotentialValue: estimatedValue ? parseInt(estimatedValue.replace(/\D/g, ""), 10) : 0,
        status,
        channel,
        nextFollowUpDate: nextFollowUpDate || undefined,
        notes: notes.trim() || undefined,
      });
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickStatusChange = async (newStatus: ColdClientStatus) => {
    setStatus(newStatus);
    await onUpdateClient(client.id, { status: newStatus });
  };

  const handleLogTouchpointSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tpSummary.trim()) return;

    try {
      setIsLoggingTp(true);
      await onLogTouchpoint(client.id, {
        channel: tpChannel,
        summary: tpSummary.trim(),
        author: currentUser?.username || "Admin",
        nextStatus: tpNextStatus ? (tpNextStatus as ColdClientStatus) : undefined,
        nextFollowUpDate: tpFollowUpDate || undefined,
      });
      setTpSummary("");
      setTpNextStatus("");
      setTpFollowUpDate("");
      if (tpNextStatus) {
        setStatus(tpNextStatus as ColdClientStatus);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoggingTp(false);
    }
  };

  const handleExecuteConversion = async () => {
    try {
      setIsConverting(true);
      const val = parseInt(convertDealValue.replace(/\D/g, ""), 10) || 500000;
      await onConvertToLead(client, val, currentUser?.username || "Admin", convertClosureMonth);
      setConvertSuccess(true);
      setStatus("converted");
      setTimeout(() => {
        setShowConvertModal(false);
      }, 1500);
    } catch (e) {
      console.error(e);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete cold prospect "${client.companyName}"?`)) {
      await onDeleteClient(client.id);
      onClose();
    }
  };

  // Follow-up status check
  const isFollowUpDue = client.nextFollowUpDate && client.nextFollowUpDate <= new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-blue-50/20 to-transparent dark:from-slate-950 dark:via-blue-950/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-lg">
              {client.companyName ? client.companyName.charAt(0).toUpperCase() : "C"}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {client.companyName}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusConfig.badgeBg} ${statusConfig.badgeText} ${statusConfig.borderColor}`}
                >
                  {statusConfig.label}
                </span>
                {isFollowUpDue && status !== "converted" && status !== "not_interested" && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Follow-up Due</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {client.contactName} • {client.designation || "Key Stakeholder"} • Assigned to: <strong className="text-slate-700 dark:text-slate-300">{client.owner}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {status !== "converted" && (
              <button
                onClick={() => setShowConvertModal(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm shadow-emerald-500/20 flex items-center space-x-1.5 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Convert to Lead</span>
              </button>
            )}

            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1 transition-colors ${
                isEditing
                  ? "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-400"
                  : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Delete Prospect"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[80vh] overflow-y-auto">
          {/* Left Column: Details & Edit Form (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Quick Status Bar */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Update Outreach Status
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(COLD_STATUS_CONFIG) as ColdClientStatus[]).map((st) => {
                  const cfg = COLD_STATUS_CONFIG[st];
                  const isCurrent = status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleQuickStatusChange(st)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                        isCurrent
                          ? `${cfg.badgeBg} ${cfg.badgeText} ${cfg.borderColor} shadow-xs ring-2 ring-blue-500/20`
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prospect Info / Edit Form */}
            {isEditing ? (
              <div className="p-4 bg-white dark:bg-slate-800/80 rounded-xl border border-blue-200 dark:border-blue-900/60 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5" />
                    Editing Prospect Details
                  </span>
                  <button
                    onClick={handleSaveDetails}
                    disabled={isSaving}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-xs disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? "Saving..." : "Save Changes"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">Company</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">Contact Person</label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">Designation</label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">Phone</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">LinkedIn URL</label>
                    <input
                      type="url"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">Industry</label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      {OUTREACH_INDUSTRIES.map((ind) => (
                        <option key={ind} value={ind}>
                          {ind}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">Target Offering</label>
                    <select
                      value={targetProgram}
                      onChange={(e) => setTargetProgram(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      {PRESET_PROGRAMS.map((prog) => (
                        <option key={prog.id} value={prog.name}>
                          {prog.name}
                        </option>
                      ))}
                      <option value="General Leadership">General Leadership</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">Potential Value (INR)</label>
                    <input
                      type="number"
                      value={estimatedValue}
                      onChange={(e) => setEstimatedValue(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">Next Follow-Up</label>
                    <input
                      type="date"
                      value={nextFollowUpDate}
                      onChange={(e) => setNextFollowUpDate(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Contact Email</p>
                    <a
                      href={`mailto:${client.email}`}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 truncate block hover:underline"
                    >
                      {client.email}
                    </a>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Phone</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {client.phone || "Not recorded"}
                    </p>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Potential Value</p>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {formatINR(client.estimatedPotentialValue || 0)}
                    </p>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Industry</p>
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      {client.industry || "General B2B"}
                    </p>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Target Offering</p>
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {client.targetProgram || "Executive Coaching"}
                    </p>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Next Follow-Up</p>
                    <p
                      className={`text-xs font-bold ${
                        isFollowUpDue ? "text-amber-600 dark:text-amber-400 flex items-center gap-1" : "text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {isFollowUpDue && <Clock className="w-3 h-3" />}
                      {client.nextFollowUpDate || "Not scheduled"}
                    </p>
                  </div>
                </div>

                {/* Social Links & Location */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {client.linkedinUrl && (
                    <a
                      href={client.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center space-x-1.5 hover:bg-blue-100 transition-colors"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>LinkedIn Profile</span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>
                  )}
                  {client.website && (
                    <a
                      href={client.website.startsWith("http") ? client.website : `https://${client.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 hover:bg-slate-200 transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>{client.website}</span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>
                  )}
                  {client.city && (
                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-400 flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{client.city}</span>
                    </span>
                  )}
                  {onNavigateToEmail && (
                    <button
                      onClick={() => onNavigateToEmail(client.email, client.contactName, client.companyName)}
                      className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800 rounded-lg text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center space-x-1.5 hover:bg-purple-100 transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Draft Cold Email</span>
                    </button>
                  )}
                </div>

                {client.notes && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Prospect Notes</p>
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{client.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Quick Action: Log Touchpoint */}
            <form
              onSubmit={handleLogTouchpointSubmit}
              className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-blue-500" />
                  Log New Touchpoint / Activity
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Auto-recorded with timestamp</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Channel</label>
                  <select
                    value={tpChannel}
                    onChange={(e) => setTpChannel(e.target.value as OutreachChannel | "note")}
                    className="w-full mt-0.5 px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="email">✉️ Sent Cold Email</option>
                    <option value="linkedin">💼 LinkedIn InMail</option>
                    <option value="call">📞 Phone Discovery Call</option>
                    <option value="note">📝 Internal Note</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500">New Status (Optional)</label>
                  <select
                    value={tpNextStatus}
                    onChange={(e) => setTpNextStatus(e.target.value as ColdClientStatus | "")}
                    className="w-full mt-0.5 px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">Keep current status</option>
                    {Object.entries(COLD_STATUS_CONFIG).map(([k, cfg]) => (
                      <option key={k} value={k}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500">Next Follow-up Date</label>
                  <input
                    type="date"
                    value={tpFollowUpDate}
                    onChange={(e) => setTpFollowUpDate(e.target.value)}
                    className="w-full mt-0.5 px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <textarea
                  rows={2}
                  required
                  value={tpSummary}
                  onChange={(e) => setTpSummary(e.target.value)}
                  placeholder="Record summary of outreach note, response received, objection, or next step..."
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoggingTp || !tpSummary.trim()}
                  className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center space-x-1"
                >
                  <Send className="w-3 h-3" />
                  <span>{isLoggingTp ? "Logging..." : "Log Activity"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Touchpoint Timeline & Journey History (5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Touchpoint History ({client.touchpoints?.length || 0})
              </span>
              <span className="text-[10px] text-slate-400">Chronological activity</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[500px] pr-1">
              {!client.touchpoints || client.touchpoints.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                  <MessageSquare className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    No outreach activities logged yet.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Log your first cold touchpoint in the panel to the left.
                  </p>
                </div>
              ) : (
                client.touchpoints.map((tp, idx) => (
                  <div
                    key={tp.id || idx}
                    className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                        {tp.channel}
                      </span>
                      <span className="text-[10px] text-slate-400">{tp.formattedDate || tp.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {tp.summary}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">Logged by: {tp.author}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Conversion Popup Confirmation */}
        {showConvertModal && (
          <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Convert to Active Pipeline Lead
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Migrate {client.companyName} into the CRM Pipeline at initial stage <strong>Interest (10%)</strong>
                  </p>
                </div>
              </div>

              {convertSuccess ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 dark:text-emerald-400 animate-bounce" />
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    Successfully Converted to Pipeline Deal!
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    Lead created in main B2B CRM pipeline.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Initial Deal Value (INR)
                    </label>
                    <input
                      type="number"
                      value={convertDealValue}
                      onChange={(e) => setConvertDealValue(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Target Closure Month
                    </label>
                    <input
                      type="month"
                      value={convertClosureMonth}
                      onChange={(e) => setConvertClosureMonth(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1 text-slate-600 dark:text-slate-400">
                    <p>• Company: <strong className="text-slate-900 dark:text-white">{client.companyName}</strong></p>
                    <p>• Contact: <strong className="text-slate-900 dark:text-white">{client.contactName}</strong></p>
                    <p>• Program: <strong className="text-slate-900 dark:text-white">{client.targetProgram}</strong></p>
                    <p>• Assigned Owner: <strong className="text-slate-900 dark:text-white">{client.owner}</strong></p>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowConvertModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isConverting}
                      onClick={handleExecuteConversion}
                      className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      {isConverting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Converting...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Confirm Conversion</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
