"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  X,
  Mail,
  Send,
  Sparkles,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Users,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Copy,
  Check,
  ExternalLink,
  RotateCcw,
  Building2,
  User,
  Monitor,
  Smartphone,
  Trash2,
  FolderOpen,
} from "lucide-react";
import { ColdClient, ColdClientStatus, OutreachChannel } from "@/types/outreach";
import { EmailTemplate, EmailAttachment } from "@/constants/emailTemplates";
import { UserAccount, getUserProfile } from "@/constants/users";
import { AttachFromLibraryModal } from "./AttachFromLibraryModal";
import {
  subscribeToTemplates,
  getAllTemplates,
  subscribeToSenderProfiles,
  getSenderProfileForUser,
  SMTPSenderProfile,
  sendEmailCampaign,
  personalizeEmailTemplate,
  saveCampaignRecord,
  uploadEmailAttachment,
  stripBadgesFromEmailHtml,
} from "@/lib/emailService";
import { recordUsedEmails } from "@/lib/contactSuggestionService";
import { formatBytes, formatINR } from "@/lib/formatters";
import { EmailPreviewCard } from "./EmailPreviewCard";

interface BulkEmailOutreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  clients: ColdClient[];
  currentUser?: UserAccount | null;
  onLogTouchpoint?: (
    clientId: string,
    touchpoint: {
      channel: OutreachChannel | "note";
      summary: string;
      author: string;
      nextStatus?: ColdClientStatus;
      nextFollowUpDate?: string;
      activityDate?: string;
      activityTime?: string;
      time?: string;
      timestamp?: string;
    }
  ) => Promise<void>;
  onBulkUpdateClients?: (
    ids: string[],
    updates: Partial<ColdClient>,
    touchpointNote?: string
  ) => Promise<void>;
  onClearSelection?: () => void;
  onNavigateToBulkEmailTab?: (
    recipients: Array<{
      email: string;
      contactName: string;
      companyName: string;
      designation?: string;
      industry?: string;
      dealValue?: number;
    }>
  ) => void;
}

const MERGE_TAGS = [
  { tag: "{{contactName}}", label: "Contact Name", example: "Aarav Patel" },
  { tag: "{{companyName}}", label: "Company", example: "Zenith Cloud" },
  { tag: "{{designation}}", label: "Designation", example: "VP of Engineering" },
  { tag: "{{industry}}", label: "Industry", example: "SaaS & Software" },
  { tag: "{{dealValue}}", label: "Deal Value", example: "₹5,00,000" },
  { tag: "{{senderName}}", label: "Sender Name", example: "Amit Sharma" },
  { tag: "{{senderEmail}}", label: "Sender Email", example: "amit@xmonks.com" },
  { tag: "{{senderRole}}", label: "Sender Role", example: "Enterprise Solutions" },
];

export const BulkEmailOutreachModal: React.FC<BulkEmailOutreachModalProps> = ({
  isOpen,
  onClose,
  selectedIds,
  clients,
  currentUser,
  onLogTouchpoint,
  onBulkUpdateClients,
  onClearSelection,
  onNavigateToBulkEmailTab,
}) => {
  // Navigation & View Mode
  const [activeTab, setActiveTab] = useState<"compose" | "preview" | "recipients">("compose");
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  // Sender Profiles
  const [senderProfiles, setSenderProfiles] = useState<SMTPSenderProfile[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string>("");

  useEffect(() => {
    const unsub = subscribeToSenderProfiles((profiles) => {
      setSenderProfiles(profiles);
    });
    return () => unsub();
  }, []);

  const activeSender = useMemo(() => {
    if (selectedSenderId) {
      const found = senderProfiles.find((s) => s.id === selectedSenderId);
      if (found) return found;
    }
    return getSenderProfileForUser(senderProfiles, currentUser);
  }, [senderProfiles, currentUser, selectedSenderId]);

  // Templates
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  useEffect(() => {
    const unsub = subscribeToTemplates((updated) => {
      setTemplates(updated);
    });
    return () => unsub();
  }, []);

  // Form Fields
  const [subject, setSubject] = useState<string>("");
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState<boolean>(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // CC / BCC
  const [showCc, setShowCc] = useState<boolean>(false);
  const [showBcc, setShowBcc] = useState<boolean>(false);
  const [cc, setCc] = useState<string>("");
  const [bcc, setBcc] = useState<string>("");

  // Outreach automations
  const [autoLogTouchpoints, setAutoLogTouchpoints] = useState<boolean>(true);
  const [advanceStatusToSent, setAdvanceStatusToSent] = useState<boolean>(true);

  // Recipient Exclusion
  const [excludedClientIds, setExcludedClientIds] = useState<string[]>([]);
  const [showRecipientsList, setShowRecipientsList] = useState<boolean>(false);

  // Sending progress & result states
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number; company?: string } | null>(null);
  const [sendResult, setSendResult] = useState<{
    successCount: number;
    failedCount: number;
    totalCount: number;
    failedItems: Array<{ email: string; company: string; error?: string }>;
  } | null>(null);

  // Copy chip feedback
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  // Filter selected clients
  const selectedClients = useMemo(() => {
    return clients.filter((c) => selectedIds.includes(c.id));
  }, [clients, selectedIds]);

  // Clients with valid email vs missing email
  const validClients = useMemo(() => {
    return selectedClients.filter(
      (c) => Boolean(c.email && c.email.trim().includes("@")) && !excludedClientIds.includes(c.id)
    );
  }, [selectedClients, excludedClientIds]);

  const missingEmailClients = useMemo(() => {
    return selectedClients.filter((c) => !c.email || !c.email.trim().includes("@"));
  }, [selectedClients]);

  // Apply template helper
  const applyTemplate = useCallback(
    (tpl: EmailTemplate) => {
      setSelectedTemplateId(tpl.id);
      const subj = personalizeEmailTemplate(tpl.subject || "", {
        currentUser,
        senderProfile: activeSender,
      });
      const body = personalizeEmailTemplate(stripBadgesFromEmailHtml(tpl.htmlContent || ""), {
        currentUser,
        senderProfile: activeSender,
      });
      setSubject(subj);
      setHtmlContent(body);
      setAttachments(tpl.attachments ? [...tpl.attachments] : []);
    },
    [currentUser, activeSender]
  );

  // Initialize or reset form on modal open
  useEffect(() => {
    if (isOpen) {
      setExcludedClientIds([]);
      setSendResult(null);
      setSendProgress(null);
      setIsSending(false);
      setPreviewIndex(0);
      setActiveTab("compose");

      // Auto-select template if none selected or set initial default
      const defaultTemplates = templates.length > 0 ? templates : getAllTemplates();
      if (defaultTemplates.length > 0 && !selectedTemplateId) {
        const initial =
          defaultTemplates.find((t) => t.id === "b2b-outreach-v1") || defaultTemplates[0];
        if (initial) {
          setSelectedTemplateId(initial.id);
          applyTemplate(initial);
        }
      }
    }
  }, [isOpen, templates, selectedTemplateId, applyTemplate]);

  const handleSelectTemplate = (tplId: string) => {
    const found = templates.find((t) => t.id === tplId);
    if (found) {
      applyTemplate(found);
    }
  };

  // Insert or copy merge tag
  const handleTagClick = (tag: string) => {
    navigator.clipboard?.writeText(tag).catch(() => {});
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1500);

    // Also append tag to HTML content
    setHtmlContent((prev) => `${prev} ${tag} `);
  };

  // Upload attachment handler
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (attachments.length >= 6) {
      setUploadError("Maximum 6 attachments allowed per bulk email.");
      return;
    }

    setIsUploadingAttachment(true);
    setUploadError(null);
    try {
      const uploaded = await uploadEmailAttachment(file);
      setAttachments((prev) => [...prev, uploaded]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload file.";
      setUploadError(msg);
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = "";
    }
  };

  const handleRemoveAttachment = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  // Toggle recipient exclusion
  const toggleExcludeRecipient = (id: string) => {
    setExcludedClientIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Current preview lead
  const currentPreviewLead = validClients[previewIndex] || validClients[0];

  const previewSubject = useMemo(() => {
    if (!currentPreviewLead) return subject;
    return personalizeEmailTemplate(subject, {
      recipientName: currentPreviewLead.contactName,
      companyName: currentPreviewLead.companyName,
      designation: currentPreviewLead.designation,
      industry: currentPreviewLead.industry,
      dealValue: currentPreviewLead.estimatedPotentialValue
        ? formatINR(currentPreviewLead.estimatedPotentialValue)
        : undefined,
      currentUser,
      senderProfile: activeSender,
    });
  }, [subject, currentPreviewLead, currentUser, activeSender]);

  const previewHtml = useMemo(() => {
    if (!currentPreviewLead) return htmlContent;
    return personalizeEmailTemplate(htmlContent, {
      recipientName: currentPreviewLead.contactName,
      companyName: currentPreviewLead.companyName,
      designation: currentPreviewLead.designation,
      industry: currentPreviewLead.industry,
      dealValue: currentPreviewLead.estimatedPotentialValue
        ? formatINR(currentPreviewLead.estimatedPotentialValue)
        : undefined,
      currentUser,
      senderProfile: activeSender,
    });
  }, [htmlContent, currentPreviewLead, currentUser, activeSender]);

  // Execute Bulk Sending
  const handleExecuteSend = async () => {
    if (validClients.length === 0) return;
    if (!subject.trim() || !htmlContent.trim()) {
      alert("Please enter both a Subject line and Email message body.");
      return;
    }

    setIsSending(true);
    setSendProgress({ current: 0, total: validClients.length });
    setSendResult(null);

    const targetRecipients = validClients.map((c) => ({
      email: c.email.trim(),
      contactName: c.contactName,
      companyName: c.companyName,
      designation: c.designation,
      industry: c.industry,
      dealValue: c.estimatedPotentialValue,
      senderUser: currentUser,
      cc: cc.trim() || undefined,
      bcc: bcc.trim() || undefined,
    }));

    try {
      const res = await sendEmailCampaign({
        recipients: targetRecipients,
        subject,
        htmlContent,
        smtpConfig: activeSender,
        attachments,
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        senderUser: currentUser,
      });

      const succCount = res.successCount ?? (res.success ? targetRecipients.length : 0);
      const failCount = targetRecipients.length - succCount;

      const failedItems: Array<{ email: string; company: string; error?: string }> = [];
      const successfulClientIds: string[] = [];

      targetRecipients.forEach((tr) => {
        const matched = res.results?.find((r: { recipient: string; success: boolean; error?: string }) => r.recipient === tr.email);
        const isSuccess = matched ? matched.success : res.success;
        if (isSuccess) {
          const foundClient = validClients.find((c) => c.email.trim() === tr.email);
          if (foundClient) successfulClientIds.push(foundClient.id);
        } else {
          failedItems.push({
            email: tr.email,
            company: tr.companyName || "Unknown",
            error: matched?.error || res.error || "Sending failed",
          });
        }
      });

      // Save campaign record into Firebase & Local history
      const templateName = templates.find((t) => t.id === selectedTemplateId)?.name || "Outreach Campaign";
      saveCampaignRecord({
        name: `Outreach Bulk: ${subject.slice(0, 32)} (${validClients.length} leads)`,
        subject,
        templateId: selectedTemplateId || undefined,
        templateName,
        htmlContent,
        source: "crm",
        recipientCount: validClients.length,
        successCount: succCount,
        failedCount: failCount,
        status: succCount > 0 ? "completed" : "failed",
        attachments,
        recipients: targetRecipients.map((tr) => {
          const matched = res.results?.find((r: { recipient: string; success: boolean; error?: string }) => r.recipient === tr.email);
          return {
            ...tr,
            status: matched ? (matched.success ? "success" : "failed") : res.success ? "success" : "failed",
            error: matched?.error || res.error,
          };
        }),
      });

      // Record CC and BCC emails for autocomplete
      if (cc || bcc) {
        recordUsedEmails([cc, bcc]);
      }

      // Automatically log touchpoints & update status if enabled
      if (autoLogTouchpoints && successfulClientIds.length > 0) {
        const todayStr = new Date().toISOString().split("T")[0];
        const authorName = currentUser?.name || activeSender.senderName || "Sales Representative";
        const attMsg = attachments.length > 0 ? ` (${attachments.length} attachment[s])` : "";

        for (const clientId of successfulClientIds) {
          const cl = validClients.find((c) => c.id === clientId);
          const nextStatus: ColdClientStatus | undefined =
            advanceStatusToSent &&
            cl &&
            (cl.status === "uncontacted" || cl.status === "cold_no_answer")
              ? "outreach_sent"
              : undefined;

          if (onLogTouchpoint) {
            await onLogTouchpoint(clientId, {
              channel: "email",
              summary: `Sent bulk outreach email: "${subject}"${attMsg}`,
              author: authorName,
              nextStatus,
            }).catch((e) => console.warn("Failed to log touchpoint for client:", clientId, e));
          } else if (onBulkUpdateClients) {
            const updates: Partial<ColdClient> = {
              lastContactDate: todayStr,
            };
            if (nextStatus) updates.status = nextStatus;
            await onBulkUpdateClients(
              [clientId],
              updates,
              `Sent bulk outreach email: "${subject}"${attMsg}`
            ).catch((e) => console.warn("Failed bulk update client:", clientId, e));
          }
        }
      }

      setSendResult({
        successCount: succCount,
        failedCount: failCount,
        totalCount: targetRecipients.length,
        failedItems,
      });
    } catch (err: unknown) {
      console.error("Bulk email sending failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to deliver emails. Check SMTP configuration.";
      setSendResult({
        successCount: 0,
        failedCount: targetRecipients.length,
        totalCount: targetRecipients.length,
        failedItems: targetRecipients.map((tr) => ({
          email: tr.email,
          company: tr.companyName || "Unknown",
          error: msg,
        })),
      });
    } finally {
      setIsSending(false);
      setSendProgress(null);
    }
  };

  // Open in full Email Campaigns Tab shortcut
  const handleOpenInCampaignTab = () => {
    if (onNavigateToBulkEmailTab && validClients.length > 0) {
      const recipients = validClients.map((c) => ({
        email: c.email.trim(),
        contactName: c.contactName,
        companyName: c.companyName,
        designation: c.designation,
        industry: c.industry,
        dealValue: c.estimatedPotentialValue,
      }));
      onNavigateToBulkEmailTab(recipients);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-purple-50/60 via-indigo-50/30 to-transparent dark:from-purple-950/20 dark:via-indigo-950/10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-600/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Bulk Outreach Email
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  {validClients.length} Ready to Email
                </span>
                {missingEmailClients.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    {missingEmailClients.length} Missing Email
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Send personalized emails with dynamic variables directly to selected outreach leads.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onNavigateToBulkEmailTab && validClients.length > 0 && !sendResult && (
              <button
                type="button"
                onClick={handleOpenInCampaignTab}
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                title="Switch to full Email Campaign tab with these leads"
              >
                <span>Campaign Builder</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              disabled={isSending}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Missing Email Alert Banner */}
        {missingEmailClients.length > 0 && (
          <div className="px-6 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200/60 dark:border-amber-800/60 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>{missingEmailClients.length} selected lead{missingEmailClients.length > 1 ? "s" : ""}</strong>{" "}
                ({missingEmailClients.slice(0, 3).map((c) => c.companyName).join(", ")}
                {missingEmailClients.length > 3 ? `, +${missingEmailClients.length - 3} more` : ""}) do not have an email address and will be skipped.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowRecipientsList((p) => !p)}
              className="text-amber-900 dark:text-amber-200 font-bold underline hover:no-underline ml-2 whitespace-nowrap cursor-pointer"
            >
              {showRecipientsList ? "Hide List" : "View Leads"}
            </button>
          </div>
        )}

        {/* Recipients Quick Strip / Drawer */}
        <div className="px-6 py-2 bg-slate-50 dark:bg-slate-850 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">
              Recipients ({validClients.length}):
            </span>
            {validClients.slice(0, 5).map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium shrink-0"
              >
                <span>{c.companyName}</span>
                <span className="text-[10px] text-slate-400">({c.contactName.split(" ")[0]})</span>
              </span>
            ))}
            {validClients.length > 5 && (
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                +{validClients.length - 5} more
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowRecipientsList((p) => !p)}
            className="flex items-center space-x-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 ml-3 shrink-0"
          >
            <span>{showRecipientsList ? "Collapse List" : "Manage Recipients"}</span>
            {showRecipientsList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Expanded Recipients Management Drawer */}
        {showRecipientsList && (
          <div className="px-6 py-3 bg-slate-100/70 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 max-h-48 overflow-y-auto animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <span>Selected Leads ({selectedClients.length})</span>
              <span className="text-[11px] text-slate-400">
                Uncheck to exclude a lead from this bulk email
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {selectedClients.map((client) => {
                const hasEmail = Boolean(client.email && client.email.trim().includes("@"));
                const isExcluded = excludedClientIds.includes(client.id);

                return (
                  <div
                    key={client.id}
                    onClick={() => hasEmail && toggleExcludeRecipient(client.id)}
                    className={`p-2 rounded-xl border text-xs flex items-center space-x-2 transition ${
                      !hasEmail
                        ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-300 opacity-60 cursor-not-allowed"
                        : isExcluded
                        ? "bg-slate-200/50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 opacity-50 cursor-pointer"
                        : "bg-white dark:bg-slate-800 border-purple-200 dark:border-purple-800/50 text-slate-900 dark:text-white cursor-pointer shadow-xs"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={hasEmail && !isExcluded}
                      disabled={!hasEmail}
                      onChange={() => {}}
                      className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate text-[11px]">{client.companyName}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {client.contactName} • {client.email || "No email"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sender Profile Bar */}
        <div className="px-6 py-2.5 bg-slate-50/50 dark:bg-slate-855/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
              Sending From:
            </span>
            {senderProfiles.length > 1 ? (
              <select
                value={selectedSenderId || activeSender.id}
                onChange={(e) => setSelectedSenderId(e.target.value)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                {senderProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.senderName} ({p.userEmail})
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>
                  {activeSender.senderName} &lt;{activeSender.userEmail}&gt;
                </span>
              </div>
            )}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center space-x-1 bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-300/60 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab("compose")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                activeTab === "compose"
                  ? "bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Compose Email</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                activeTab === "preview"
                  ? "bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Preview ({validClients.length})</span>
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Post-Send Report Screen */}
          {sendResult && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div
                className={`p-5 rounded-2xl border ${
                  sendResult.failedCount === 0
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                    : "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                }`}
              >
                <div className="flex items-start space-x-3">
                  {sendResult.failedCount === 0 ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h4 className="text-base font-bold">
                      {sendResult.failedCount === 0
                        ? `Bulk Outreach Sent Successfully!`
                        : `Bulk Send Finished with Warnings`}
                    </h4>
                    <p className="text-xs mt-1 opacity-90">
                      Delivered to <strong>{sendResult.successCount} of {sendResult.totalCount}</strong> selected leads.
                      {autoLogTouchpoints && sendResult.successCount > 0 && (
                        <span> Touchpoint activity records and pipeline statuses have been updated.</span>
                      )}
                    </p>

                    {sendResult.failedItems.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-amber-300/50 dark:border-amber-800/50 space-y-1.5">
                        <p className="text-xs font-bold text-rose-700 dark:text-rose-400">
                          Failed Deliveries ({sendResult.failedItems.length}):
                        </p>
                        <div className="space-y-1 max-h-36 overflow-y-auto">
                          {sendResult.failedItems.map((fi, i) => (
                            <div
                              key={i}
                              className="text-[11px] p-2 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between"
                            >
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {fi.company} ({fi.email})
                              </span>
                              <span className="text-rose-600 dark:text-rose-400 font-medium">
                                {fi.error || "Delivery failed"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Completion Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSendResult(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Send Another Email
                </button>
                {onClearSelection && (
                  <button
                    type="button"
                    onClick={() => {
                      onClearSelection();
                      onClose();
                    }}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 transition"
                  >
                    Done & Deselect Leads
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 transition"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Compose Form */}
          {!sendResult && activeTab === "compose" && (
            <div className="space-y-4">
              {/* Template Picker */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Template:
                  </span>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="">-- Choose Email Template --</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} ({tpl.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2 text-[11px] text-purple-700 dark:text-purple-300">
                  <span>Templates automatically adapt to each lead</span>
                </div>
              </div>

              {/* Merge Tags Quick Chips */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                    <span>Dynamic Personalization Tags</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      (Click to append tag)
                    </span>
                  </span>
                  {copiedTag && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 animate-in fade-in">
                      <Check className="w-3 h-3" />
                      <span>Appended & Copied {copiedTag}</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {MERGE_TAGS.map((mt) => (
                    <button
                      key={mt.tag}
                      type="button"
                      onClick={() => handleTagClick(mt.tag)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-100 dark:bg-slate-800 dark:hover:bg-purple-950/60 border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 text-slate-700 dark:text-slate-300 hover:text-purple-700 dark:hover:text-purple-300 text-xs font-medium transition cursor-pointer flex items-center space-x-1"
                      title={`Insert ${mt.tag} (e.g. ${mt.example})`}
                    >
                      <code className="text-[11px] font-mono font-bold text-purple-600 dark:text-purple-400">
                        {mt.tag}
                      </code>
                      <span className="text-[10px] text-slate-400">({mt.label})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Line */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Subject Line</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    Supports <code>{"{{companyName}}"}</code>, <code>{"{{contactName}}"}</code>
                  </span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Strategic Partnership Discussion for {{companyName}}"
                  className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* CC & BCC Toggles */}
              <div className="space-y-2">
                <div className="flex items-center space-x-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowCc((p) => !p)}
                    className={`font-semibold transition ${
                      showCc ? "text-purple-600 dark:text-purple-400" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    {showCc ? "- Remove CC" : "+ Add CC"}
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={() => setShowBcc((p) => !p)}
                    className={`font-semibold transition ${
                      showBcc ? "text-purple-600 dark:text-purple-400" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    {showBcc ? "- Remove BCC" : "+ Add BCC"}
                  </button>
                </div>

                {showCc && (
                  <input
                    type="text"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="CC email addresses (comma separated)"
                    className="w-full px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                )}

                {showBcc && (
                  <input
                    type="text"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="BCC email addresses (comma separated)"
                    className="w-full px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                )}
              </div>

              {/* Email Content Body */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Email Message Body (HTML or Text)</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center space-x-1"
                  >
                    <Eye className="w-3 h-3" />
                    <span>See Live Preview</span>
                  </button>
                </label>
                <textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  rows={9}
                  placeholder="Enter email content with HTML or formatted text..."
                  className="w-full px-3.5 py-2.5 text-xs font-mono font-normal rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
                />
              </div>

              {/* Attachments Section */}
              <div className="space-y-2 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Paperclip className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Attachments ({attachments.length}/6)
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsLibraryModalOpen(true)}
                      disabled={isUploadingAttachment || attachments.length >= 6}
                      className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-900/70 border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>+ From Library</span>
                    </button>

                    <label className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer shadow-xs transition">
                      <span>{isUploadingAttachment ? "Uploading..." : "+ Upload File"}</span>
                      <input
                        type="file"
                        onChange={handleAttachmentUpload}
                        disabled={isUploadingAttachment || attachments.length >= 6}
                        className="hidden"
                        accept="*/*"
                      />
                    </label>
                  </div>
                </div>

                {uploadError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                    {uploadError}
                  </p>
                )}

                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs shadow-xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span className="font-medium text-slate-800 dark:text-slate-200 max-w-[150px] truncate">
                          {att.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({formatBytes(att.size)})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="text-slate-400 hover:text-rose-500 transition p-0.5"
                          title="Remove attachment"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Automation Checkboxes */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-2">
                <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoLogTouchpoints}
                    onChange={(e) => setAutoLogTouchpoints(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span>Automatically log email touchpoints in the Outreach pipeline timeline</span>
                </label>

                {autoLogTouchpoints && (
                  <label className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400 ml-6 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={advanceStatusToSent}
                      onChange={(e) => setAdvanceStatusToSent(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <span>
                      Advance uncontacted leads to <strong>&quot;Outreach Sent&quot;</strong> stage automatically
                    </span>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Live Preview Screen */}
          {!sendResult && activeTab === "preview" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Recipient Pager */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-purple-50/60 dark:bg-purple-950/20 rounded-xl border border-purple-200/60 dark:border-purple-800/40">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Previewing for:
                  </span>
                  {validClients.length > 0 && currentPreviewLead && (
                    <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 text-xs font-bold text-purple-700 dark:text-purple-300">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{currentPreviewLead.companyName}</span>
                      <span className="text-slate-400 font-normal">
                        ({currentPreviewLead.contactName} &lt;{currentPreviewLead.email}&gt;)
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setPreviewIndex((prev) => Math.max(0, prev - 1))}
                    disabled={previewIndex === 0}
                    className="p-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {previewIndex + 1} of {validClients.length}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewIndex((prev) => Math.min(validClients.length - 1, prev + 1))
                    }
                    disabled={previewIndex >= validClients.length - 1}
                    className="p-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Rendered Preview Card */}
              {currentPreviewLead ? (
                <EmailPreviewCard
                  html={previewHtml}
                  subject={previewSubject}
                  recipientName={currentPreviewLead.contactName}
                  recipientEmail={currentPreviewLead.email}
                  senderName={activeSender.senderName}
                  senderEmail={activeSender.userEmail}
                  currentUser={currentUser}
                  senderProfile={activeSender}
                  attachments={attachments}
                  cc={cc || undefined}
                  bcc={bcc || undefined}
                  height="h-[420px]"
                />
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No valid recipients selected for preview.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!sendResult && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {isSending ? (
                <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 font-bold">
                  <div className="w-3.5 h-3.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  <span>
                    Sending bulk emails ({sendProgress?.current || 0} of {sendProgress?.total || validClients.length})...
                  </span>
                </div>
              ) : (
                <span>
                  Ready to send to <strong>{validClients.length}</strong> recipients using{" "}
                  <strong>{activeSender.senderName}</strong>.
                </span>
              )}
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSending}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteSend}
                disabled={isSending || validClients.length === 0 || !subject.trim() || !htmlContent.trim()}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-600/30 flex items-center space-x-2 transition-all hover:scale-102 active:scale-98 disabled:opacity-50 disabled:scale-100 disabled:shadow-none cursor-pointer"
              >
                {isSending ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending Emails...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to {validClients.length} {validClients.length === 1 ? "Lead" : "Leads"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Attach from Library Modal */}
      <AttachFromLibraryModal
        isOpen={isLibraryModalOpen}
        onClose={() => setIsLibraryModalOpen(false)}
        onAttach={(libAttachments) => {
          setAttachments((prev) => {
            const next = [...prev];
            for (const att of libAttachments) {
              if (
                !next.some(
                  (a) =>
                    (a.id && a.id === att.id) ||
                    (a.name === att.name && a.size === att.size)
                )
              ) {
                if (next.length < 6) next.push(att);
              }
            }
            return next;
          });
        }}
        alreadyAttachedIds={attachments.map((a) => a.id).filter(Boolean)}
        maxSelectable={6 - attachments.length}
      />
    </div>
  );
};
