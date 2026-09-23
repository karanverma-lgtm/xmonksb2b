"use client";

import React, { useState } from "react";
import { Lead, LeadStage } from "@/types/lead";
import { STAGES, STAGE_ORDER, PIPELINE_STAGES } from "@/constants/stages";
import {
  X,
  Building2,
  Mail,
  Phone,
  User,
  Sparkles,
  CheckCircle2,
  Clock,
  Send,
  History,
  MessageSquare,
  AlertCircle,
  Trash2,
  MapPin,
  Pencil,
  Check,
  GraduationCap,
  Calendar,
  FileText,
  UploadCloud,
  Download,
  ExternalLink,
  Eye,
  Loader2,
  FileCheck,
  Compass,
  Camera,
  Image as ImageIcon,
  Link2,
} from "lucide-react";
import confetti from "canvas-confetti";

import { formatINR, formatClosureMonth } from "@/lib/formatters";
import { PRESET_PROGRAMS, getProgramBadgeStyle } from "@/constants/programs";
import { LEAD_SOURCES, getLeadSourceBadgeStyle } from "@/constants/leadSources";
import { ApproachNote } from "@/types/lead";
import { uploadApproachNoteToFirebase } from "@/lib/approachNoteService";
import { uploadCompanyLogoToFirebase } from "@/lib/companyLogoService";
import { GoogleCalendarDatePicker } from "./GoogleCalendarDatePicker";

import { UserAccount, VALID_USERS } from "@/constants/users";

interface LeadDetailModalProps {
  lead: Lead | null;
  currentUser?: UserAccount | null;
  onClose: () => void;
  onUpdateStage: (leadId: string, newStage: LeadStage, notes?: string) => void;
  onAddNote: (leadId: string, noteText: string) => void;
  onDeleteLead?: (leadId: string) => void;
  onUpdateDealValue?: (leadId: string, newDealValue: number) => void;
  onUpdateProgram?: (leadId: string, newProgram: string) => void;
  onUpdateLeadSource?: (leadId: string, newSource: string) => void;
  onUpdateOwner?: (leadId: string, newOwner: string) => void;
  onUpdateClosureMonth?: (leadId: string, closureMonth: string) => void;
  onAttachApproachNote?: (leadId: string, approachNote: ApproachNote) => void;
  onRemoveApproachNote?: (leadId: string) => void;
  onUpdateCompanyLogo?: (leadId: string, logoUrl: string) => void;
  onRemoveCompanyLogo?: (leadId: string) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  currentUser,
  onClose,
  onUpdateStage,
  onAddNote,
  onDeleteLead,
  onUpdateDealValue,
  onUpdateProgram,
  onUpdateLeadSource,
  onUpdateOwner,
  onUpdateClosureMonth,
  onAttachApproachNote,
  onRemoveApproachNote,
  onUpdateCompanyLogo,
  onRemoveCompanyLogo,
}) => {
  const [newNoteText, setNewNoteText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [editedValue, setEditedValue] = useState("");
  const [isEditingProgram, setIsEditingProgram] = useState(false);
  const [editedProgram, setEditedProgram] = useState("");
  const [isCustomProgram, setIsCustomProgram] = useState(false);
  const [customProgramInput, setCustomProgramInput] = useState("");

  // Logo Upload & URL State
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [showLogoOptions, setShowLogoOptions] = useState(false);
  const [isEnteringLogoUrl, setIsEnteringLogoUrl] = useState(false);
  const [logoUrlInput, setLogoUrlInput] = useState("");
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [logoUploadSuccess, setLogoUploadSuccess] = useState<string | null>(null);
  const logoInputRef = React.useRef<HTMLInputElement | null>(null);

  // Lead Source State
  const [isEditingLeadSource, setIsEditingLeadSource] = useState(false);
  const [editedLeadSource, setEditedLeadSource] = useState(lead?.leadSource || "Event Based");

  React.useEffect(() => {
    setEditedLeadSource(lead?.leadSource || "Event Based");
  }, [lead?.leadSource]);

  const [stageNotePrompt, setStageNotePrompt] = useState<{
    show: boolean;
    targetStage?: LeadStage;
    noteText: string;
  }>({ show: false, noteText: "" });

  // Closure Month State
  const [isEditingClosureMonth, setIsEditingClosureMonth] = useState(false);
  const [editedClosureMonth, setEditedClosureMonth] = useState(lead?.closureMonth || "");

  React.useEffect(() => {
    setEditedClosureMonth(lead?.closureMonth || "");
  }, [lead?.closureMonth]);

  // Approach Note State
  const [isUploadingNote, setIsUploadingNote] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isPreviewingPdf, setIsPreviewingPdf] = useState(false);
  const [showDeleteNoteConfirm, setShowDeleteNoteConfirm] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !lead) return;

    if (!file.type.startsWith("image/")) {
      setLogoUploadError("Please select a valid image file (PNG, JPG, SVG, WebP).");
      if (logoInputRef.current) logoInputRef.current.value = "";
      return;
    }

    setLogoUploadError(null);
    setIsUploadingLogo(true);
    setShowLogoOptions(false);

    try {
      const logoUrl = await uploadCompanyLogoToFirebase(lead.id, file);
      if (onUpdateCompanyLogo) {
        onUpdateCompanyLogo(lead.id, logoUrl);
      }
      setLogoUploadSuccess("Company logo updated!");
      setTimeout(() => setLogoUploadSuccess(null), 3000);
    } catch (err: any) {
      setLogoUploadError(err?.message || "Failed to upload logo.");
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleSaveLogoUrl = () => {
    if (!lead || !logoUrlInput.trim()) return;
    const url = logoUrlInput.trim();
    if (onUpdateCompanyLogo) {
      onUpdateCompanyLogo(lead.id, url);
    }
    setLogoUploadSuccess("Logo URL applied!");
    setTimeout(() => setLogoUploadSuccess(null), 3000);
    setLogoUrlInput("");
    setIsEnteringLogoUrl(false);
    setShowLogoOptions(false);
  };

  const handleRemoveLogo = () => {
    if (!lead) return;
    if (onRemoveCompanyLogo) {
      onRemoveCompanyLogo(lead.id);
    }
    setShowLogoOptions(false);
    setIsEnteringLogoUrl(false);
  };

  if (!lead) return null;

  const currentStageInfo = STAGES[lead.stage];
  const currentWeightage = currentStageInfo?.weightage ?? lead.weightage;
  const weightedValue = lead.dealValue * (currentWeightage / 100);
  const badgeStyle = getProgramBadgeStyle(lead.program);
  const leadSourceBadge = getLeadSourceBadgeStyle(lead.leadSource);

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

  const handleSaveClosureMonth = () => {
    if (onUpdateClosureMonth) {
      onUpdateClosureMonth(lead.id, editedClosureMonth);
    }
    setIsEditingClosureMonth(false);
  };

  const handleClearClosureMonth = () => {
    setEditedClosureMonth("");
    if (onUpdateClosureMonth) {
      onUpdateClosureMonth(lead.id, "");
    }
    setIsEditingClosureMonth(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setUploadError("Only PDF format documents (.pdf) can be uploaded as Approach Notes.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadError(null);
    setIsUploadingNote(true);

    try {
      const uploaded = await uploadApproachNoteToFirebase(
        lead.id,
        file,
        currentUser?.name || "Client Partner"
      );
      if (onAttachApproachNote) {
        onAttachApproachNote(lead.id, uploaded);
      }
      setUploadSuccess(`"${file.name}" uploaded successfully to Cloudflare R2!`);
      setTimeout(() => setUploadSuccess(null), 4000);
    } catch (err: any) {
      setUploadError(err?.message || "Failed to upload PDF. Please check connection.");
    } finally {
      setIsUploadingNote(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownloadNote = () => {
    if (!lead.approachNote?.downloadUrl) return;
    const downloadUrl = lead.approachNote.downloadUrl.includes("?")
      ? `${lead.approachNote.downloadUrl}&download=1`
      : `${lead.approachNote.downloadUrl}?download=1`;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = lead.approachNote.fileName;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleConfirmRemoveNote = () => {
    if (onRemoveApproachNote) {
      onRemoveApproachNote(lead.id);
    }
    setShowDeleteNoteConfirm(false);
  };

  const formatCurrency = (val: number) => formatINR(val);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header Bar */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 flex items-start justify-between">
          <div className="flex items-start space-x-4">
            {/* Interactive Company Logo Container */}
            <div className="relative group">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
              />
              
              {lead.companyLogo ? (
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-md flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                  <img
                    src={lead.companyLogo}
                    alt={`${lead.companyName} Logo`}
                    className="w-full h-full object-cover"
                  />
                  {/* Hover upload overlay */}
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold"
                    title="Change Company Logo"
                  >
                    {isUploadingLogo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-3.5 h-3.5 mb-0.5" />
                        <span>Change</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 flex items-center justify-center">
                    <Building2 className="w-6 h-6" />
                  </div>
                  {/* Upload overlay trigger */}
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="absolute inset-0 rounded-2xl bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold"
                    title="Upload Company Logo"
                  >
                    {isUploadingLogo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-3.5 h-3.5 mb-0.5" />
                        <span>Upload</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Upload badge or quick delete */}
              {lead.companyLogo && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="absolute -top-1.5 -right-1.5 p-0.5 bg-rose-500 text-white rounded-full shadow hover:bg-rose-600 opacity-0 group-hover:opacity-100 transition"
                  title="Remove custom logo"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div>
              <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>{lead.companyName}</span>
                  {/* Logo Options Trigger (Upload or URL) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowLogoOptions(!showLogoOptions);
                        setIsEnteringLogoUrl(false);
                      }}
                      disabled={isUploadingLogo}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 font-normal"
                    >
                      <Camera className="w-3 h-3" />
                      <span>
                        {isUploadingLogo
                          ? "Uploading..."
                          : lead.companyLogo
                          ? "Edit Logo"
                          : "Add Logo"}
                      </span>
                    </button>

                    {/* Popover Menu with Both Options: Upload File or Image URL */}
                    {showLogoOptions && (
                      <div className="absolute left-0 top-6 z-50 w-64 p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl space-y-2">
                        <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Set Company Logo
                        </div>

                        {!isEnteringLogoUrl ? (
                          <div className="space-y-1.5">
                            <button
                              type="button"
                              onClick={() => logoInputRef.current?.click()}
                              className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                            >
                              <UploadCloud className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Upload from Computer</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setIsEnteringLogoUrl(true)}
                              className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                            >
                              <Link2 className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Use Image URL</span>
                            </button>

                            {lead.companyLogo && (
                              <button
                                type="button"
                                onClick={handleRemoveLogo}
                                className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove Logo</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <input
                              type="url"
                              placeholder="https://example.com/logo.png"
                              value={logoUrlInput}
                              onChange={(e) => setLogoUrlInput(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              autoFocus
                            />
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                type="button"
                                onClick={() => setIsEnteringLogoUrl(false)}
                                className="px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                              >
                                Back
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveLogoUrl}
                                disabled={!logoUrlInput.trim()}
                                className="px-2.5 py-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-50"
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </h2>
                {logoUploadError && (
                  <span className="text-xs text-rose-500 font-semibold">{logoUploadError}</span>
                )}
                {logoUploadSuccess && (
                  <span className="text-xs text-emerald-500 font-semibold">{logoUploadSuccess}</span>
                )}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${currentStageInfo.badgeBg} ${currentStageInfo.badgeText}`}
                >
                  {currentStageInfo.label} ({currentWeightage}%)
                </span>
                {lead.program && (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center space-x-1 ${badgeStyle.badgeBg} ${badgeStyle.badgeText} ${badgeStyle.borderColor}`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>{lead.program}</span>
                  </span>
                )}

                {/* Account Owner Indicator */}
                {currentUser?.username.toLowerCase() === "admin" && onUpdateOwner ? (
                  <select
                    value={lead.owner || "Unassigned"}
                    onChange={(e) => onUpdateOwner(lead.id, e.target.value)}
                    className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 cursor-pointer focus:outline-none"
                    title="Change Lead Owner"
                  >
                    {VALID_USERS.map((u) => (
                      <option key={u.username} value={u.name}>
                        Owner: {u.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center space-x-1">
                    <User className="w-3 h-3 text-indigo-500" />
                    <span>Owner: {lead.owner || "Unassigned"}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap gap-y-1">
                <span className="flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium text-slate-800 dark:text-slate-200">{lead.contactName}</span>
                  {lead.designation && (
                    <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/60">
                      {lead.designation}
                    </span>
                  )}
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
          {/* Program & Lead Source Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 1. Pitched Program Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-slate-50 dark:from-slate-900 dark:via-indigo-950/30 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-900/50 flex flex-col justify-between gap-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20 flex-shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Pitched Program Offering
                    </div>
                    <div className="text-[11px] text-slate-500">4 Core Enterprise Categories</div>
                  </div>
                </div>

                {onUpdateProgram && !isEditingProgram && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditedProgram(lead.program || PRESET_PROGRAMS[0].name);
                      setCustomProgramInput(lead.program || "");
                      setIsCustomProgram(false);
                      setIsEditingProgram(true);
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition shadow-sm flex-shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>{lead.program ? "Change" : "Assign"}</span>
                  </button>
                )}
              </div>

              {isEditingProgram ? (
                <div className="mt-1 space-y-2">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    {!isCustomProgram ? (
                      <select
                        value={editedProgram}
                        onChange={(e) => setEditedProgram(e.target.value)}
                        className="px-3 py-1.5 bg-white dark:bg-slate-950 border border-indigo-500 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none flex-1 min-w-[180px]"
                      >
                        {PRESET_PROGRAMS.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={customProgramInput}
                        onChange={(e) => setCustomProgramInput(e.target.value)}
                        placeholder="Enter custom program offering..."
                        className="px-3 py-1.5 bg-white dark:bg-slate-950 border border-purple-500 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none flex-1 min-w-[180px]"
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => setIsCustomProgram(!isCustomProgram)}
                      className="text-[11px] font-bold px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300"
                    >
                      {isCustomProgram ? "Presets" : "Custom"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const valToSave = isCustomProgram
                          ? customProgramInput.trim() || editedProgram
                          : editedProgram;
                        if (onUpdateProgram && valToSave.trim()) {
                          onUpdateProgram(lead.id, valToSave.trim());
                        }
                        setIsEditingProgram(false);
                      }}
                      className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow"
                      title="Save Pitched Program"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingProgram(false)}
                      className="p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2 mt-0.5 flex-wrap gap-y-1">
                  <span className="text-sm font-black text-slate-900 dark:text-white truncate">
                    {lead.program || "No program assigned"}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeStyle.badgeBg} ${badgeStyle.badgeText} ${badgeStyle.borderColor}`}>
                    {lead.program ? "Pitched Program" : "Pending Pitch"}
                  </span>
                </div>
              )}
            </div>

            {/* 2. Lead Source Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50/90 via-blue-50/40 to-slate-50 dark:from-slate-900 dark:via-sky-950/30 dark:to-slate-900 border border-sky-200/80 dark:border-sky-900/50 flex flex-col justify-between gap-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-sky-600 text-white shadow-md shadow-sky-500/20 flex-shrink-0">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                      Lead Source Channel
                    </div>
                    <div className="text-[11px] text-slate-500">Pipeline Attribution Origin</div>
                  </div>
                </div>

                {onUpdateLeadSource && !isEditingLeadSource && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditedLeadSource(lead.leadSource || LEAD_SOURCES[0].name);
                      setIsEditingLeadSource(true);
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold text-sky-700 dark:text-sky-300 bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950 transition shadow-sm flex-shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>{lead.leadSource ? "Change" : "Select Source"}</span>
                  </button>
                )}
              </div>

              {isEditingLeadSource ? (
                <div className="mt-1 flex items-center space-x-2 flex-wrap gap-y-1">
                  <select
                    value={editedLeadSource}
                    onChange={(e) => setEditedLeadSource(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-950 border border-sky-500 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none flex-1 min-w-[180px]"
                  >
                    {LEAD_SOURCES.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateLeadSource && editedLeadSource.trim()) {
                        onUpdateLeadSource(lead.id, editedLeadSource.trim());
                      }
                      setIsEditingLeadSource(false);
                    }}
                    className="p-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition shadow"
                    title="Save Lead Source"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingLeadSource(false)}
                    className="p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2 mt-0.5 flex-wrap gap-y-1">
                  <span className="text-sm font-black text-slate-900 dark:text-white truncate">
                    {lead.leadSource || "Not Assigned"}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center space-x-1.5 ${leadSourceBadge.badgeBg} ${leadSourceBadge.badgeText} ${leadSourceBadge.borderColor}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${leadSourceBadge.dotColor}`} />
                    <span>{lead.leadSource || "Pending Attribution"}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Key Deal Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
            <div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400 font-semibold uppercase">Total Deal Value</div>
                {onUpdateDealValue && !isEditingValue && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditedValue(String(lead.dealValue));
                      setIsEditingValue(true);
                    }}
                    className="p-1 text-xs text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10 rounded flex items-center space-x-1 font-semibold transition"
                    title="Change deal value"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {isEditingValue ? (
                <div className="flex items-center space-x-1.5 mt-1">
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1.5 text-xs text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={editedValue}
                      onChange={(e) => setEditedValue(e.target.value)}
                      className="w-full pl-5 pr-2 py-1 bg-white dark:bg-slate-900 border border-indigo-500 rounded-lg text-sm font-bold focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const val = parseFloat(editedValue);
                      if (!isNaN(val) && val >= 0 && onUpdateDealValue) {
                        onUpdateDealValue(lead.id, val);
                      }
                      setIsEditingValue(false);
                    }}
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                    title="Save Deal Value"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingValue(false)}
                    className="p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  {formatCurrency(lead.dealValue)}
                </div>
              )}
            </div>

            <div>
              <div className="text-xs text-purple-500 font-semibold uppercase">
                Forecasted Weighted Revenue
              </div>
              <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
                {formatCurrency(weightedValue)}
              </div>
            </div>

            {/* Target Closure Date (Google Calendar Style: Date, Month, Year) */}
            <div className="flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#EA4335]" />
                  <span>Closure Target</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Date, Month, Year
                </span>
              </div>

              <GoogleCalendarDatePicker
                value={lead.closureMonth}
                onChange={(newVal) => {
                  if (onUpdateClosureMonth) {
                    onUpdateClosureMonth(lead.id, newVal);
                  }
                }}
              />
            </div>

            <div>
              <div className="text-xs text-emerald-500 font-semibold uppercase">
                Stage Weightage
              </div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {currentWeightage}%
              </div>
              <div className="text-[10px] font-semibold text-slate-400">
                {currentStageInfo?.label}
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

          {/* Dedicated Approach Note (PDF) Section */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>Approach Note (PDF)</span>
                    {lead.approachNote ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                        <FileCheck className="w-3 h-3" />
                        <span>Attached</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        Pending Upload
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Client strategy document and presentation approach note stored in Cloudflare R2.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  disabled={isUploadingNote}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                >
                  {isUploadingNote ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading to Cloudflare R2...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{lead.approachNote ? "Replace PDF" : "Upload PDF Note"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Upload Error / Success Notifications */}
            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            {/* Approach Note Card Display */}
            {lead.approachNote ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center space-x-3 min-w-[240px]">
                  <div className="w-10 h-10 rounded-xl bg-rose-600/10 border border-rose-600/20 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                    PDF
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                      {lead.approachNote.fileName}
                    </div>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                      <span>{lead.approachNote.fileSize}</span>
                      <span>•</span>
                      <span>By: {lead.approachNote.uploadedBy || "Client Partner"}</span>
                      <span>•</span>
                      <span>
                        {new Date(lead.approachNote.uploadedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsPreviewingPdf(true)}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    title="View PDF Document"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-500" />
                    <span>View</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadNote}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    title="Download PDF"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Download</span>
                  </button>

                  {onRemoveApproachNote && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteNoteConfirm(true)}
                      className="p-1.5 rounded-lg text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition"
                      title="Remove PDF"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Dropzone Placeholder */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-50/50 dark:bg-slate-950/30 group"
              >
                <UploadCloud className="w-8 h-8 mx-auto text-slate-400 group-hover:text-indigo-500 transition mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Click to upload Approach Note PDF for this lead
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Only .pdf files accepted • Stored securely in Cloudflare R2
                </p>
              </div>
            )}

            {/* Remove Confirmation Dialog */}
            {showDeleteNoteConfirm && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  Remove attached approach note & delete file from Cloudflare R2?
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteNoteConfirm(false)}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRemoveNote}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>

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
              {lead.journeyLogs?.map((log) => {
                const isApproachNoteLog = log.type === "approach_note";
                const isClosureMonthLog = log.type === "closure_month_update";

                return (
                  <div key={log.id} className="relative group">
                    {/* Timeline Bullet Dot */}
                    <div
                      className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 shadow-sm ${
                        isApproachNoteLog
                          ? "bg-rose-500"
                          : isClosureMonthLog
                          ? "bg-amber-500"
                          : "bg-indigo-600"
                      }`}
                    />

                    {/* Log Content Card */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center space-x-2">
                          {isApproachNoteLog && <FileText className="w-3.5 h-3.5 text-rose-500" />}
                          {isClosureMonthLog && <Calendar className="w-3.5 h-3.5 text-amber-500" />}
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                            {log.title}
                          </h4>
                        </div>
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
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* PDF Document Preview Modal */}
      {isPreviewingPdf && lead.approachNote && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-5xl h-[88vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center space-x-2 truncate">
                <FileText className="w-5 h-5 text-rose-500 flex-shrink-0" />
                <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {lead.approachNote.fileName}
                </span>
                <span className="text-xs text-slate-400">({lead.approachNote.fileSize})</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleDownloadNote}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <a
                  href={lead.approachNote.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                  title="Open in new window"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setIsPreviewingPdf(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 dark:bg-slate-950 relative overflow-hidden">
              <iframe
                src={lead.approachNote.downloadUrl}
                title={lead.approachNote.fileName}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
