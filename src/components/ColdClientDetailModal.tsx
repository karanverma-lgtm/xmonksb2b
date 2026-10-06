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
  Check,
  Users,
  UserPlus,
  Pencil,
  Star,
  Eye,
  Paperclip,
} from "lucide-react";
import { ColdClient, ColdClientStatus, OutreachChannel, OutreachTouchpoint } from "@/types/outreach";
import { ContactPerson } from "@/types/lead";
import { COLD_STATUS_CONFIG, OUTREACH_CHANNELS, OUTREACH_INDUSTRIES, PRIMARY_OUTREACH_STATUSES } from "@/constants/outreach";
import { PRESET_PROGRAMS } from "@/constants/programs";
import { UserAccount, VALID_USERS } from "@/constants/users";
import { formatINR } from "@/lib/formatters";
import {
  getAllTemplates,
  sendEmailCampaign,
  getAllSenderProfiles,
  getSenderProfileForUser,
  personalizeEmailTemplate,
} from "@/lib/emailService";
import { EmailTemplate, EmailAttachment } from "@/constants/emailTemplates";
import { EmailAttachmentManager } from "./EmailAttachmentManager";
import { EmailAutocompleteInput } from "./EmailAutocompleteInput";
import {
  ContactSuggestion,
  getStoredContactSuggestions,
  subscribeToContactSuggestions,
  recordUsedEmails,
} from "@/lib/contactSuggestionService";
import { ModernTimePicker } from "./ModernTimePicker";

function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentTimeString(): string {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function getTouchpointDisplay(tp: OutreachTouchpoint): { date: string; time: string } {
  let timeStr = tp.time || "";
  let dateStr = "";

  if (tp.activityDate) {
    try {
      const [y, m, d] = tp.activityDate.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      if (!isNaN(dateObj.getTime())) {
        dateStr = dateObj.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    } catch {
      dateStr = tp.activityDate;
    }
  }

  // Compatibility fallback from timestamp if time is missing
  if (!timeStr && tp.timestamp) {
    try {
      const parsed = new Date(tp.timestamp);
      if (!isNaN(parsed.getTime())) {
        timeStr = parsed.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }
    } catch {
      // fallback
    }
  }

  if (!dateStr) {
    if (tp.formattedDate) {
      if (tp.formattedDate.includes(",")) {
        const parts = tp.formattedDate.split(",");
        if (parts.length >= 3) {
          dateStr = `${parts[0].trim()}, ${parts[1].trim()}`;
          if (!timeStr) {
            timeStr = parts.slice(2).join(",").trim();
          }
        } else {
          dateStr = tp.formattedDate;
        }
      } else {
        dateStr = tp.formattedDate;
      }
    } else if (tp.timestamp) {
      try {
        const parsed = new Date(tp.timestamp);
        if (!isNaN(parsed.getTime())) {
          dateStr = parsed.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
        } else {
          dateStr = tp.timestamp;
        }
      } catch {
        dateStr = tp.timestamp;
      }
    }
  }

  return { date: dateStr || "Recent", time: timeStr };
}

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
      activityDate?: string;
      activityTime?: string;
      time?: string;
      timestamp?: string;
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
  const [owner, setOwner] = useState("Amit");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [notes, setNotes] = useState("");

  // Touchpoint logger state
  const [tpChannel, setTpChannel] = useState<OutreachChannel | "note">("email");
  const [tpDate, setTpDate] = useState<string>(getTodayDateString());
  const [tpTime, setTpTime] = useState<string>(getCurrentTimeString());
  const [tpSummary, setTpSummary] = useState("");
  const [tpNextStatus, setTpNextStatus] = useState<ColdClientStatus | "">("");
  const [tpFollowUpDate, setTpFollowUpDate] = useState("");
  const [isLoggingTp, setIsLoggingTp] = useState(false);

  // Convert state
  const [convertDealValue, setConvertDealValue] = useState("500000");
  const [convertClosureMonth, setConvertClosureMonth] = useState(new Date().toISOString().slice(0, 7));

  // People / Contacts state (Multi-people support for client card)
  const [showContactPersonModal, setShowContactPersonModal] = useState(false);
  const [contactModalMode, setContactModalMode] = useState<"new" | "primary" | "additional">("new");
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [isPrimaryContact, setIsPrimaryContact] = useState(false);
  const [personName, setPersonName] = useState("");
  const [personContactNumber, setPersonContactNumber] = useState("");
  const [personEmail, setPersonEmail] = useState("");
  const [personDesignation, setPersonDesignation] = useState("");
  const [personToDelete, setPersonToDelete] = useState<ContactPerson | null>(null);
  const [personFormError, setPersonFormError] = useState<string | null>(null);

  // Email Template Selection & Sending State
  const [availableTemplates, setAvailableTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSendStatus, setEmailSendStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Email Preview Modal
  const [isEmailPreviewModalOpen, setIsEmailPreviewModalOpen] = useState(false);
  const [customSubject, setCustomSubject] = useState("");
  const [customHtml, setCustomHtml] = useState("");
  const [emailAttachments, setEmailAttachments] = useState<EmailAttachment[]>([]);
  const [emailCc, setEmailCc] = useState("");
  const [emailBcc, setEmailBcc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [suggestedContacts, setSuggestedContacts] = useState<ContactSuggestion[]>(getStoredContactSuggestions());

  useEffect(() => {
    const unsub = subscribeToContactSuggestions((updated) => {
      setSuggestedContacts(updated);
    });
    return unsub;
  }, []);

  const handleAddEmailToField = (
    currentVal: string,
    setter: (val: string) => void,
    emailToAdd: string
  ) => {
    if (!emailToAdd) return;
    const cleanEmail = emailToAdd.trim().toLowerCase();
    const existing = currentVal
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (existing.includes(cleanEmail)) return;

    const trimmed = currentVal.trim().replace(/[,;]+$/, "");
    setter(trimmed ? `${trimmed}, ${cleanEmail}` : cleanEmail);
  };

  // Load templates on modal open
  useEffect(() => {
    if (isOpen) {
      const templates = getAllTemplates();
      setAvailableTemplates(templates);
      if (templates.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(templates[0].id);
      }
      setEmailSendStatus(null);
    }
  }, [isOpen]);

  const selectedTemplate =
    availableTemplates.find((t) => t.id === selectedTemplateId) || availableTemplates[0];

  useEffect(() => {
    if (selectedTemplate && client) {
      const repName = client.contactName || "Valued Executive";
      const compName = client.companyName || "your organization";
      const desig = client.designation || "";
      const ind = client.industry || "";
      const dealVal = client.estimatedPotentialValue
        ? formatINR(client.estimatedPotentialValue)
        : "";

      const subj = personalizeEmailTemplate(selectedTemplate.subject || "", {
        recipientName: repName,
        companyName: compName,
        designation: desig,
        industry: ind,
        dealValue: dealVal,
        currentUser,
      });

      const body = personalizeEmailTemplate(selectedTemplate.htmlContent || "", {
        recipientName: repName,
        companyName: compName,
        designation: desig,
        industry: ind,
        dealValue: dealVal,
        currentUser,
      });

      setCustomSubject(subj);
      setCustomHtml(body);
      setEmailAttachments(selectedTemplate.attachments || []);
    }
  }, [selectedTemplateId, client, selectedTemplate, currentUser]);

  const handleSendEmailTemplate = async (
    overrideSubject?: string,
    overrideHtml?: string,
    overrideAttachments?: EmailAttachment[],
    overrideCc?: string,
    overrideBcc?: string
  ) => {
    if (!client || !client.email) {
      setEmailSendStatus({ type: "error", message: "Client does not have a valid email address." });
      return;
    }
    if (!selectedTemplate) {
      setEmailSendStatus({ type: "error", message: "Please select an email template to send." });
      return;
    }

    setIsSendingEmail(true);
    setEmailSendStatus(null);

    try {
      const senders = getAllSenderProfiles();
      const senderProfile = getSenderProfileForUser(senders, currentUser);

      const subjectToSend = overrideSubject || customSubject || selectedTemplate.subject;
      const htmlToSend = overrideHtml || customHtml || selectedTemplate.htmlContent;
      const attachmentsToSend =
        overrideAttachments !== undefined ? overrideAttachments : emailAttachments;
      const ccToSend = overrideCc !== undefined ? overrideCc : emailCc;
      const bccToSend = overrideBcc !== undefined ? overrideBcc : emailBcc;

      const payload = {
        recipients: [
          {
            email: client.email,
            contactName: client.contactName,
            companyName: client.companyName,
            designation: client.designation,
            industry: client.industry,
            dealValue: client.estimatedPotentialValue,
            cc: ccToSend || undefined,
            bcc: bccToSend || undefined,
            senderUser: currentUser,
          },
        ],
        subject: subjectToSend,
        htmlContent: htmlToSend,
        smtpConfig: senderProfile,
        attachments: attachmentsToSend,
        cc: ccToSend || undefined,
        bcc: bccToSend || undefined,
        senderUser: currentUser,
      };

      const res = await sendEmailCampaign(payload);

      if (res.success || (res.results && res.results[0]?.success)) {
        const attMsg = attachmentsToSend.length > 0 ? ` with ${attachmentsToSend.length} attachment(s)` : "";
        const ccMsg = ccToSend ? ` (CC: ${ccToSend})` : "";
        const bccMsg = bccToSend ? ` (BCC: ${bccToSend})` : "";
        // Record used CC and BCC emails for smart autocomplete learning
        if (ccToSend || bccToSend) {
          recordUsedEmails([ccToSend, bccToSend]);
        }

        setEmailSendStatus({
          type: "success",
          message: `Email sent to ${client.email}${ccMsg}${bccMsg} using "${selectedTemplate.name}"${attMsg}!`,
        });

        // Automatically log touchpoint in timeline
        await onLogTouchpoint(client.id, {
          channel: "email",
          summary: `Sent email template "${selectedTemplate.name}" to ${client.email}${ccMsg}${bccMsg} with subject: "${subjectToSend}"${attMsg}.`,
          author: currentUser?.name || senderProfile.senderName || "Sales Representative",
          nextStatus:
            client.status === "uncontacted" || client.status === "cold_no_answer"
              ? "outreach_sent"
              : undefined,
        });

        setIsEmailPreviewModalOpen(false);
      } else {
        const errMsg = res.error || res.results?.[0]?.error || "Failed to deliver email.";
        setEmailSendStatus({
          type: "error",
          message: `Failed to send: ${errMsg}`,
        });
      }
    } catch (err: any) {
      console.error("Error sending template email:", err);
      setEmailSendStatus({
        type: "error",
        message: err.message || "An error occurred while sending email.",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

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
      setOwner(client.owner || currentUser?.name || "Amit");
      setNextFollowUpDate(client.nextFollowUpDate || "");
      setNotes(client.notes || "");
      setConvertDealValue(client.estimatedPotentialValue?.toString() || "500000");
      setIsEditing(false);
      setShowConvertModal(false);
      setConvertSuccess(false);
      setTpSummary("");
      setTpNextStatus("");
      setTpFollowUpDate("");
      setTpDate(getTodayDateString());
      setTpTime(getCurrentTimeString());
      setEmailCc("");
      setEmailBcc("");
      setShowCc(false);
      setShowBcc(false);
    }
  }, [client, currentUser]);

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
        owner,
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
        author: currentUser?.name || currentUser?.username || "Admin User",
        nextStatus: tpNextStatus ? (tpNextStatus as ColdClientStatus) : undefined,
        nextFollowUpDate: tpFollowUpDate || undefined,
        activityDate: tpDate || getTodayDateString(),
        activityTime: tpTime || getCurrentTimeString(),
      });
      setTpSummary("");
      setTpNextStatus("");
      setTpFollowUpDate("");
      setTpDate(getTodayDateString());
      setTpTime(getCurrentTimeString());
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
      await onConvertToLead(client, val, currentUser?.name || currentUser?.username || "Admin User", convertClosureMonth);
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

  // Contact Stakeholder Handlers (Add & Edit people in cold client card)
  const handleOpenAddPerson = () => {
    setContactModalMode("new");
    setEditingContactId(null);
    setIsPrimaryContact(false);
    setPersonName("");
    setPersonContactNumber("");
    setPersonEmail("");
    setPersonDesignation("");
    setPersonFormError(null);
    setShowContactPersonModal(true);
  };

  const handleOpenEditPrimaryContact = () => {
    if (!client) return;
    setContactModalMode("primary");
    setEditingContactId("primary");
    setIsPrimaryContact(true);
    setPersonName(client.contactName || "");
    setPersonContactNumber(client.phone || "");
    setPersonEmail(client.email || "");
    setPersonDesignation(client.designation || "");
    setPersonFormError(null);
    setShowContactPersonModal(true);
  };

  const handleOpenEditAdditionalContact = (contact: ContactPerson) => {
    setContactModalMode("additional");
    setEditingContactId(contact.id);
    setIsPrimaryContact(false);
    setPersonName(contact.name || "");
    setPersonContactNumber(contact.contactNumber || "");
    setPersonEmail(contact.email || "");
    setPersonDesignation(contact.designation || "");
    setPersonFormError(null);
    setShowContactPersonModal(true);
  };

  const handleSetPrimaryContact = async (contact: ContactPerson) => {
    if (!client) return;

    const demotedPrimary: ContactPerson = {
      id: `contact-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: client.contactName || "Previous Contact",
      contactNumber: client.phone || undefined,
      email: client.email || undefined,
      designation: client.designation || undefined,
      addedAt: new Date().toISOString(),
    };

    const existingContacts = client.additionalContacts || [];
    const remaining = existingContacts.filter((c) => c.id !== contact.id);
    const updatedContacts = client.contactName ? [demotedPrimary, ...remaining] : remaining;

    await onUpdateClient(client.id, {
      contactName: contact.name,
      phone: contact.contactNumber || undefined,
      email: (contact.email || client.email).toLowerCase(),
      designation: contact.designation || undefined,
      additionalContacts: updatedContacts,
    });
  };

  const handleSavePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim()) {
      setPersonFormError("Please enter the contact person's name.");
      return;
    }
    if (!client) return;

    if (contactModalMode === "primary") {
      await onUpdateClient(client.id, {
        contactName: personName.trim(),
        phone: personContactNumber.trim() || undefined,
        email: personEmail.trim().toLowerCase(),
        designation: personDesignation.trim() || undefined,
      });
    } else if (isPrimaryContact) {
      // Promoting to primary contact
      const demotedPrimary: ContactPerson = {
        id: `contact-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: client.contactName || "Previous Contact",
        contactNumber: client.phone || undefined,
        email: client.email || undefined,
        designation: client.designation || undefined,
        addedAt: new Date().toISOString(),
      };

      const existingContacts = client.additionalContacts || [];
      const remaining = contactModalMode === "additional" && editingContactId
        ? existingContacts.filter((c) => c.id !== editingContactId)
        : existingContacts;
      const updatedContacts = client.contactName ? [demotedPrimary, ...remaining] : remaining;

      await onUpdateClient(client.id, {
        contactName: personName.trim(),
        phone: personContactNumber.trim() || undefined,
        email: (personEmail.trim() || client.email).toLowerCase(),
        designation: personDesignation.trim() || undefined,
        additionalContacts: updatedContacts,
      });
    } else if (contactModalMode === "additional" && editingContactId) {
      const existingContacts = client.additionalContacts || [];
      const updatedContacts = existingContacts.map((c) =>
        c.id === editingContactId
          ? {
              ...c,
              name: personName.trim(),
              contactNumber: personContactNumber.trim() || undefined,
              email: personEmail.trim() || undefined,
              designation: personDesignation.trim() || undefined,
            }
          : c
      );
      await onUpdateClient(client.id, {
        additionalContacts: updatedContacts,
      });
    } else {
      const newContact: ContactPerson = {
        id: `contact-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: personName.trim(),
        contactNumber: personContactNumber.trim() || undefined,
        email: personEmail.trim() || undefined,
        designation: personDesignation.trim() || undefined,
        addedAt: new Date().toISOString(),
      };

      const existingContacts = client.additionalContacts || [];
      const updatedContacts = [...existingContacts, newContact];

      await onUpdateClient(client.id, {
        additionalContacts: updatedContacts,
      });
    }

    setShowContactPersonModal(false);
  };

  const handleConfirmRemovePerson = async () => {
    if (!client || !personToDelete) return;
    const existingContacts = client.additionalContacts || [];
    const updatedContacts = existingContacts.filter((c) => c.id !== personToDelete.id);

    await onUpdateClient(client.id, {
      additionalContacts: updatedContacts,
    });

    setPersonToDelete(null);
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
            {/* Quick Status Bar with New Pill Options */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Update Outreach Status
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Click pill to change status</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRIMARY_OUTREACH_STATUSES.map((st) => {
                  const cfg = COLD_STATUS_CONFIG[st];
                  const isCurrent = status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleQuickStatusChange(st)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 border ${cfg.badgeBg} ${cfg.borderColor} ${
                        isCurrent
                          ? "ring-2 ring-offset-2 ring-blue-500 scale-105 shadow-md font-bold"
                          : "opacity-85 hover:opacity-100 hover:scale-102"
                      }`}
                    >
                      {isCurrent && <Check className="w-3.5 h-3.5" />}
                      <span>{cfg.label}</span>
                    </button>
                  );
                })}
                {/* Fallback if lead has legacy status not in PRIMARY */}
                {!PRIMARY_OUTREACH_STATUSES.includes(status) && status in COLD_STATUS_CONFIG && (
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 border bg-slate-200 text-slate-800 border-slate-400 ring-2 ring-blue-500"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{COLD_STATUS_CONFIG[status].label} (Legacy)</span>
                  </button>
                )}
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
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500">Assigned Owner</label>
                    <select
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                    >
                      {VALID_USERS.map((u) => (
                        <option key={u.username} value={u.name}>
                          {u.name}
                        </option>
                      ))}
                    </select>
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
                  {client.companySize && (
                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-400 flex items-center space-x-1">
                      <Building2 className="w-3.5 h-3.5 text-blue-500" />
                      <span>Size: {client.companySize}</span>
                    </span>
                  )}

                  {/* Select Email Template & Send Action */}
                  <div className="flex flex-wrap items-center gap-1.5 p-1 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 rounded-xl shadow-2xs">
                    <div className="flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 ml-1 shrink-0" />
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 text-purple-950 dark:text-purple-200 border border-purple-200 dark:border-purple-700/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 max-w-[200px] sm:max-w-[240px] truncate"
                        title="Select email template"
                      >
                        {availableTemplates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSendEmailTemplate()}
                      disabled={isSendingEmail || !client.email || !selectedTemplateId}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg flex items-center space-x-1 shadow-xs transition-all hover:scale-102 active:scale-98"
                      title={client.email ? `Send template to ${client.email}` : "Client has no email address"}
                    >
                      {isSendingEmail ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3 h-3" />
                          <span>Send</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsEmailPreviewModalOpen(true)}
                      className={`p-1 rounded-md transition flex items-center space-x-1 ${
                        emailAttachments.length > 0
                          ? "text-purple-700 dark:text-purple-300 bg-purple-200/60 dark:bg-purple-900/60 font-bold px-1.5"
                          : "text-purple-600 dark:text-purple-400 hover:bg-purple-200/50 dark:hover:bg-purple-900/60"
                      }`}
                      title={
                        emailAttachments.length > 0
                          ? `${emailAttachments.length} attachment(s) attached (max 6). Click to view/manage.`
                          : "Attach files to email (up to 6)"
                      }
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      {emailAttachments.length > 0 && (
                        <span className="text-[10px]">{emailAttachments.length}/6</span>
                      )}
                    </button>

                    {(emailCc || emailBcc) && (
                      <span
                        onClick={() => setIsEmailPreviewModalOpen(true)}
                        className="text-[9px] font-extrabold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/70 px-1.5 py-0.5 rounded cursor-pointer border border-purple-200 dark:border-purple-800"
                        title={`CC: ${emailCc || "None"} | BCC: ${emailBcc || "None"}`}
                      >
                        {emailCc ? "CC" : ""}{emailCc && emailBcc ? "+" : ""}{emailBcc ? "BCC" : ""}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsEmailPreviewModalOpen(true)}
                      className="p-1 text-purple-700 dark:text-purple-300 hover:bg-purple-200/50 dark:hover:bg-purple-900/60 rounded-md transition"
                      title="Preview & customize email before sending"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {onNavigateToEmail && (
                      <button
                        type="button"
                        onClick={() => onNavigateToEmail(client.email, client.contactName, client.companyName)}
                        className="p-1 text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-purple-200/50 dark:hover:bg-purple-900/60 rounded-md transition"
                        title="Open in Email Composer tab"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {emailSendStatus && (
                  <div
                    className={`mt-2 p-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition-all ${
                      emailSendStatus.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        : "bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      {emailSendStatus.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      )}
                      <span className="truncate">{emailSendStatus.message}</span>
                    </div>
                    <button
                      onClick={() => setEmailSendStatus(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs ml-2 shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {client.notes && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Prospect Notes</p>
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{client.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Stakeholders & Contacts Card (Add more people with name, contact number, email, designation) */}
            <div className="p-4 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/80">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                      <span>Key Stakeholders &amp; Contacts</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        {(client.additionalContacts?.length || 0) + 1}
                      </span>
                    </h4>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddPerson}
                  className="flex items-center space-x-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Person</span>
                </button>
              </div>

              {/* Stakeholders List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Primary Contact */}
                <div className="p-3 rounded-lg border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 space-y-2">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                        {client.contactName ? client.contactName.slice(0, 2).toUpperCase() : "PC"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {client.contactName}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center space-x-1">
                            <Star className="w-2.5 h-2.5 fill-current text-amber-500" />
                            <span>Primary</span>
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">
                          {client.designation || "Stakeholder"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenEditPrimaryContact}
                      className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 border border-blue-200 dark:border-blue-800 transition cursor-pointer shrink-0"
                      title="Edit Primary Contact"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800 space-y-1 text-[11px]">
                    {client.email && (
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span className="truncate flex items-center space-x-1">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </span>
                        <a href={`mailto:${client.email}`} className="text-[10px] font-bold text-blue-600 hover:underline shrink-0">
                          Email
                        </a>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span className="truncate flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{client.phone}</span>
                        </span>
                        <a href={`tel:${client.phone}`} className="text-[10px] font-bold text-blue-600 hover:underline shrink-0">
                          Call
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Contacts */}
                {(client.additionalContacts || []).map((person) => (
                  <div
                    key={person.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2 group hover:border-slate-300 transition"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                          {person.name ? person.name.slice(0, 2).toUpperCase() : "CO"}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                            {person.name}
                          </span>
                          <p className="text-[10px] text-slate-500 truncate">
                            {person.designation || "Stakeholder"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryContact(person)}
                          className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/60 border border-slate-200 dark:border-slate-700 hover:border-blue-300 transition cursor-pointer shadow-2xs"
                          title="Set as Primary Contact"
                        >
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500/20" />
                          <span>Make Primary</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditAdditionalContact(person)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Edit contact"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPersonToDelete(person)}
                          className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Remove contact"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[11px]">
                      {person.email ? (
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                          <span className="truncate flex items-center space-x-1">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{person.email}</span>
                          </span>
                          <a href={`mailto:${person.email}`} className="text-[10px] font-bold text-blue-600 hover:underline shrink-0">
                            Email
                          </a>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 italic">No email</div>
                      )}

                      {person.contactNumber ? (
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                          <span className="truncate flex items-center space-x-1">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{person.contactNumber}</span>
                          </span>
                          <a href={`tel:${person.contactNumber}`} className="text-[10px] font-bold text-blue-600 hover:underline shrink-0">
                            Call
                          </a>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 italic">No phone</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Custom time &amp; date support
                </span>
              </div>

              {/* Row 1: Channel, Activity Date, Activity Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Channel</label>
                  <select
                    value={tpChannel}
                    onChange={(e) => setTpChannel(e.target.value as OutreachChannel | "note")}
                    className="w-full mt-0.5 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="email">✉️ Sent Cold Email</option>
                    <option value="linkedin">💼 LinkedIn InMail</option>
                    <option value="call">📞 Phone Discovery Call</option>
                    <option value="note">📝 Internal Note</option>
                    <option value="event">🤝 Meeting / Event</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    Activity Date
                  </label>
                  <input
                    type="date"
                    required
                    value={tpDate}
                    onChange={(e) => setTpDate(e.target.value)}
                    className="w-full mt-0.5 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <ModernTimePicker
                  value={tpTime}
                  onChange={(newTime) => setTpTime(newTime)}
                  onResetNow={() => {
                    setTpDate(getTodayDateString());
                    setTpTime(getCurrentTimeString());
                  }}
                />
              </div>

              {/* Row 2: Status & Follow-up */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">New Status (Optional)</label>
                  <select
                    value={tpNextStatus}
                    onChange={(e) => setTpNextStatus(e.target.value as ColdClientStatus | "")}
                    className="w-full mt-0.5 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Next Follow-up Date (Optional)</label>
                  <input
                    type="date"
                    value={tpFollowUpDate}
                    onChange={(e) => setTpFollowUpDate(e.target.value)}
                    className="w-full mt-0.5 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
                [...(client.touchpoints || [])]
                  .sort((a, b) => {
                    const timeA = new Date(a.timestamp || 0).getTime();
                    const timeB = new Date(b.timestamp || 0).getTime();
                    return timeB - timeA;
                  })
                  .map((tp, idx) => {
                    const { date: displayDate, time: displayTime } = getTouchpointDisplay(tp);
                    return (
                      <div
                        key={tp.id || idx}
                        className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                            {tp.channel}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="font-medium text-slate-600 dark:text-slate-300">{displayDate}</span>
                            {displayTime && (
                              <>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200/50 dark:border-blue-900/40">
                                  <Clock className="w-2.5 h-2.5" />
                                  {displayTime.includes("IST") ? displayTime : `${displayTime} IST`}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {tp.summary}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">Logged by: {tp.author}</p>
                      </div>
                    );
                  })
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

        {/* Add / Edit Contact Person Modal */}
        {showContactPersonModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-scaleUp">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {contactModalMode === "new" ? (
                      <UserPlus className="w-5 h-5" />
                    ) : (
                      <Pencil className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {contactModalMode === "primary"
                        ? "Edit Primary Contact"
                        : contactModalMode === "additional"
                        ? "Edit Contact Person"
                        : "Add Contact Person"}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {contactModalMode === "primary"
                        ? `Update primary contact details for ${client.companyName}`
                        : contactModalMode === "additional"
                        ? `Update stakeholder details for ${client.companyName}`
                        : `Add a key stakeholder to ${client.companyName}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowContactPersonModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePerson} className="space-y-3.5">
                {personFormError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{personFormError}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Priya Sharma"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Contact Number (Phone / Mobile)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="e.g. +91 98765 43210"
                      value={personContactNumber}
                      onChange={(e) => setPersonContactNumber(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="email"
                      placeholder="e.g. priya.sharma@company.com"
                      value={personEmail}
                      onChange={(e) => setPersonEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Designation / Role
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. Head of Learning & Development"
                      value={personDesignation}
                      onChange={(e) => setPersonDesignation(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                </div>

                {/* Toggle to make this contact Primary */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`p-2 rounded-lg transition-colors ${
                        isPrimaryContact
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                      }`}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          isPrimaryContact ? "fill-amber-500 text-amber-500" : ""
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                        <span>Primary Contact</span>
                        {isPrimaryContact && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                            Primary
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {contactModalMode === "primary"
                          ? "Currently the primary contact for this account"
                          : "Toggle ON to make this person the primary stakeholder"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={contactModalMode === "primary"}
                    onClick={() => setIsPrimaryContact(!isPrimaryContact)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isPrimaryContact ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"
                    } ${contactModalMode === "primary" ? "opacity-75 cursor-not-allowed" : ""}`}
                    title={contactModalMode === "primary" ? "Already the primary contact" : "Toggle primary contact"}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        isPrimaryContact ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowContactPersonModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    {contactModalMode === "new" ? (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Save Person</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{contactModalMode === "primary" ? "Update Primary Contact" : "Save Changes"}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Person Confirmation Modal */}
        {personToDelete && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Remove Contact Person?
                  </h4>
                  <p className="text-xs text-slate-500">
                    Are you sure you want to remove {personToDelete.name}?
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPersonToDelete(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemovePerson}
                  className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow cursor-pointer"
                >
                  Confirm Remove
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Email Preview & Customization Modal */}
        {isEmailPreviewModalOpen && selectedTemplate && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs"
            onClick={() => setIsEmailPreviewModalOpen(false)}
          >
            <div
              className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[88vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Preview & Send Email Template
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Template: {selectedTemplate.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEmailPreviewModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Recipient & CC/BCC controls */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-750 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <span className="font-extrabold text-slate-500 uppercase text-[10px] w-9">To:</span>
                      <span className="font-bold text-slate-900 dark:text-white truncate">
                        {client.contactName} &lt;{client.email}&gt;
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                      <span className="text-[11px] text-slate-400 font-medium mr-1 hidden sm:inline">
                        {client.companyName}
                      </span>
                      {!showCc && (
                        <button
                          type="button"
                          onClick={() => setShowCc(true)}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-950/60 border border-purple-200 dark:border-purple-800 transition cursor-pointer"
                        >
                          + Cc
                        </button>
                      )}
                      {!showBcc && (
                        <button
                          type="button"
                          onClick={() => setShowBcc(true)}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-950/60 border border-purple-200 dark:border-purple-800 transition cursor-pointer"
                        >
                          + Bcc
                        </button>
                      )}
                    </div>
                  </div>

                  {/* CC Input Row */}
                  {showCc && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-purple-600 dark:text-purple-400 uppercase text-[10px]">Cc: Carbon Copy</span>
                        <div className="flex items-center space-x-1.5">
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAddEmailToField(emailCc, setEmailCc, e.target.value);
                              }
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800/80 rounded-lg text-purple-700 dark:text-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                          >
                            <option value="">▼ Select CC Contact...</option>
                            <optgroup label="Core Team & Leadership">
                              {suggestedContacts
                                .filter(
                                  (c) =>
                                    c.tag === "Core Team" ||
                                    c.tag === "Leadership" ||
                                    c.tag === "Sales Manager" ||
                                    c.tag === "Enterprise Sales"
                                )
                                .map((c) => (
                                  <option key={c.id || c.email} value={c.email}>
                                    👤 {c.name} ({c.email})
                                  </option>
                                ))}
                            </optgroup>
                            <optgroup label="All Contacts">
                              {suggestedContacts
                                .filter(
                                  (c) =>
                                    c.tag !== "Core Team" &&
                                    c.tag !== "Leadership" &&
                                    c.tag !== "Sales Manager" &&
                                    c.tag !== "Enterprise Sales"
                                )
                                .map((c) => (
                                  <option key={c.id || c.email} value={c.email}>
                                    ✉️ {c.name} ({c.email})
                                  </option>
                                ))}
                            </optgroup>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              setEmailCc("");
                              setShowCc(false);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                            title="Remove CC field"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <EmailAutocompleteInput
                        value={emailCc}
                        onChange={setEmailCc}
                        placeholder="Add CC email addresses (type name or email, e.g. Preeti, Karan, Gaurav)..."
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                      />
                    </div>
                  )}

                  {/* BCC Input Row */}
                  {showBcc && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-purple-600 dark:text-purple-400 uppercase text-[10px]">Bcc: Blind Carbon Copy</span>
                        <div className="flex items-center space-x-1.5">
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAddEmailToField(emailBcc, setEmailBcc, e.target.value);
                              }
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800/80 rounded-lg text-purple-700 dark:text-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                          >
                            <option value="">▼ Select BCC Contact...</option>
                            <optgroup label="Core Team & Leadership">
                              {suggestedContacts
                                .filter(
                                  (c) =>
                                    c.tag === "Core Team" ||
                                    c.tag === "Leadership" ||
                                    c.tag === "Sales Manager" ||
                                    c.tag === "Enterprise Sales"
                                )
                                .map((c) => (
                                  <option key={c.id || c.email} value={c.email}>
                                    👤 {c.name} ({c.email})
                                  </option>
                                ))}
                            </optgroup>
                            <optgroup label="All Contacts">
                              {suggestedContacts
                                .filter(
                                  (c) =>
                                    c.tag !== "Core Team" &&
                                    c.tag !== "Leadership" &&
                                    c.tag !== "Sales Manager" &&
                                    c.tag !== "Enterprise Sales"
                                )
                                .map((c) => (
                                  <option key={c.id || c.email} value={c.email}>
                                    ✉️ {c.name} ({c.email})
                                  </option>
                                ))}
                            </optgroup>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              setEmailBcc("");
                              setShowBcc(false);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                            title="Remove BCC field"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <EmailAutocompleteInput
                        value={emailBcc}
                        onChange={setEmailBcc}
                        placeholder="Add BCC email addresses (blind copy, comma-separated)..."
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                      />
                    </div>
                  )}

                  {/* Quick Stakeholders to CC Chips */}
                  {client.additionalContacts && client.additionalContacts.filter((c) => c.email).length > 0 && (
                    <div className="flex items-center flex-wrap gap-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        Stakeholders:
                      </span>
                      {client.additionalContacts
                        .filter((c) => c.email)
                        .map((c) => {
                          const isAlreadyInCc = emailCc.toLowerCase().includes((c.email || "").toLowerCase());
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                if (isAlreadyInCc) return;
                                setEmailCc((prev) => (prev ? `${prev}, ${c.email}` : c.email || ""));
                                setShowCc(true);
                              }}
                              className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold transition flex items-center space-x-1 cursor-pointer ${
                                isAlreadyInCc
                                  ? "bg-slate-200/70 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600"
                                  : "bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                              }`}
                              title={isAlreadyInCc ? "Already added to CC" : `Add ${c.name} (${c.email}) to CC`}
                            >
                              <span>{isAlreadyInCc ? "✓" : "+"}</span>
                              <span>{c.name}</span>
                              <span className="text-[9px] opacity-75">({c.designation || "Stakeholder"})</span>
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Subject input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Email Body Preview */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Email Body Preview
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">Personalized for {client.contactName}</span>
                  </div>
                  <div
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850/60 max-h-[220px] overflow-y-auto text-xs text-slate-800 dark:text-slate-200"
                    dangerouslySetInnerHTML={{ __html: customHtml }}
                  />
                </div>

                {/* Email Attachments Upload & Manager */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>Email Attachments</span>
                      {emailAttachments.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300">
                          {emailAttachments.length} / 6
                        </span>
                      )}
                    </label>
                  </div>
                  <EmailAttachmentManager
                    attachments={emailAttachments}
                    onChange={setEmailAttachments}
                    maxAttachments={6}
                    currentUser={currentUser}
                    isAdmin={currentUser?.username?.toLowerCase() === "admin" || currentUser?.role?.toLowerCase().includes("admin")}
                    label="Attach Files (PDF, Deck, Document, Spreadsheet - up to 6)"
                    description="Upload approach notes, brochures, pitch decks, PDFs, or files (up to 6 files, 25MB each)."
                    className="p-3 bg-slate-50 dark:bg-slate-850/60 rounded-xl border border-slate-200 dark:border-slate-750"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
                <button
                  type="button"
                  onClick={() => setIsEmailPreviewModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSendingEmail}
                  onClick={() => handleSendEmailTemplate(customSubject, customHtml, emailAttachments, emailCc, emailBcc)}
                  className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl flex items-center space-x-1.5 shadow-md shadow-purple-600/30 transition-all hover:scale-102 active:scale-98 cursor-pointer"
                >
                  {isSendingEmail ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending Email...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {emailAttachments.length > 0
                          ? `Send Email (${emailAttachments.length} Attachment${emailAttachments.length > 1 ? "s" : ""})`
                          : "Send Email Now"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
