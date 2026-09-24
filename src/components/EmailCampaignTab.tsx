"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Mail,
  FileCode,
  Users,
  Send,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  UploadCloud,
  Plus,
  Trash2,
  Edit3,
  Eye,
  History,
  Loader2,
  Search,
  CheckSquare,
  Square,
  Settings,
  Save,
  ShieldCheck,
  Lock,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Calendar,
  Flame,
} from "lucide-react";
import { EmailPreviewCard } from "@/components/EmailPreviewCard";
import { AITemplateGeneratorModal } from "@/components/AITemplateGeneratorModal";
import { Lead } from "@/types/lead";
import { EmailTemplate } from "@/constants/emailTemplates";
import { UserAccount } from "@/constants/users";
import {
  getAllTemplates,
  saveCustomTemplate,
  deleteTemplate,
  sendEmailCampaign,
  clearEmailLogs,
  getStoredSMTPConfig,
  subscribeToTemplates,
  subscribeToEmailLogs,
  subscribeToCampaigns,
  saveCampaignRecord,
  deleteCampaignRecord,
  clearAllCampaigns,
  subscribeToSenderProfiles,
  setActiveSender,
  getSenderProfileForUser,
  SMTPSenderProfile,
  EmailLogEntry,
  EmailCampaign,
} from "@/lib/emailService";

interface EmailCampaignTabProps {
  leads: Lead[];
  onNavigateToDeveloper?: () => void;
  currentUser?: UserAccount | null;
  isAdmin?: boolean;
}

interface ParsedCSVEmailRecipient {
  email: string;
  contactName: string;
  companyName: string;
  designation?: string;
  industry?: string;
  dealValue?: number;
}

const SAMPLE_BULK_EMAIL_CSV = `Contact Email,Contact Name,Company Name,Designation,Industry,Deal Value
aarav@zenithcloud.in,Aarav Patel,Zenith Cloud Tech,VP of Infrastructure,SaaS & Software,1500000
psharma@titanfin.com,Priya Sharma,Titan Financial Services,Chief Risk Officer,Fintech & Banking,2500000
v.sethi@quantummed.org,Dr. Vikram Sethi,Quantum Medical Systems,Head of R&D,Healthcare & Biotech,950000
`;

export const EmailCampaignTab: React.FC<EmailCampaignTabProps> = ({
  leads,
  onNavigateToDeveloper,
  currentUser,
  isAdmin = false,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"templates" | "single" | "bulk" | "campaigns" | "logs">("templates");
  const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false);

  // Sender Capsules State
  const [senderProfiles, setSenderProfiles] = useState<SMTPSenderProfile[]>([]);
  const [adminSelectedSenderId, setAdminSelectedSenderId] = useState<string>("");

  useEffect(() => {
    const unsub = subscribeToSenderProfiles((profiles) => {
      setSenderProfiles(profiles);
    });
    return () => unsub();
  }, []);

  // Active Sender: allocated to Amit for Amit, Ruby for Ruby, locked for non-admins
  const activeSender = useMemo(() => {
    if (isAdmin && adminSelectedSenderId) {
      const found = senderProfiles.find((s) => s.id === adminSelectedSenderId);
      if (found) return found;
    }
    return getSenderProfileForUser(senderProfiles, currentUser);
  }, [senderProfiles, currentUser, isAdmin, adminSelectedSenderId]);

  // Template State
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("b2b-outreach-v1");
  const [templateName, setTemplateName] = useState<string>("");
  const [templateSubject, setTemplateSubject] = useState<string>("");
  const [templateCategory, setTemplateCategory] = useState<EmailTemplate["category"]>("outreach");
  const [templateHtml, setTemplateHtml] = useState<string>("");
  const [templateSavedMsg, setTemplateSavedMsg] = useState<string>("");

  // Individual Scoped Templates:
  // Each user has their own custom templates + shared system prebuilt templates.
  // Admin can see all templates.
  const userVisibleTemplates = useMemo(() => {
    if (isAdmin) return templates;
    const currentUsername = currentUser?.username?.toLowerCase();
    return templates.filter((tpl) => {
      if (tpl.isSystem || !tpl.owner || tpl.owner === "system") {
        return true;
      }
      return Boolean(currentUsername && tpl.owner.toLowerCase() === currentUsername);
    });
  }, [templates, currentUser, isAdmin]);

  // Enterprise Persona Filters & 30-Day Sequence Matrix
  const [selectedPersonaFilter, setSelectedPersonaFilter] = useState<string>("all");
  const [showPlaybookGuide, setShowPlaybookGuide] = useState<boolean>(false);

  const filteredUserTemplates = useMemo(() => {
    if (selectedPersonaFilter === "all") return userVisibleTemplates;
    const filter = selectedPersonaFilter.toLowerCase();
    return userVisibleTemplates.filter((t) => {
      const name = t.name.toLowerCase();
      const desc = (t.description || "").toLowerCase();
      const id = t.id.toLowerCase();
      if (filter === "chro") return id.includes("chro") || name.includes("chro") || desc.includes("chro");
      if (filter === "ld") return id.includes("ld") || name.includes("l&d") || desc.includes("l&d");
      if (filter === "talent") return id.includes("talent") || name.includes("talent") || desc.includes("hi-po") || desc.includes("succession");
      if (filter === "hrbp") return id.includes("hrbp") || name.includes("hrbp") || desc.includes("hrbp");
      if (filter === "dei") return id.includes("dei") || name.includes("dei") || desc.includes("women");
      if (filter === "ceo") return id.includes("ceo") || name.includes("ceo") || desc.includes("business head");
      if (filter === "closing") return id.includes("conversion") || name.includes("closing") || desc.includes("20-min") || desc.includes("conversion");
      return true;
    });
  }, [userVisibleTemplates, selectedPersonaFilter]);

  const handleSelectPlaybookTemplate = (tplId: string) => {
    const found = templates.find((t) => t.id === tplId);
    if (found) {
      setSelectedTemplateId(found.id);
      loadTemplateIntoEditor(found);
      setSelectedSingleTemplateId(found.id);
      setSingleSubject(found.subject);
      setSingleHtmlContent(found.htmlContent);
      setSelectedBulkTemplateId(found.id);
      setBulkSubject(found.subject);
      setBulkHtmlContent(found.htmlContent);
    }
  };

  // Single Email State
  const [selectedSingleTemplateId, setSelectedSingleTemplateId] = useState<string>("");
  const [singleRecipientEmail, setSingleRecipientEmail] = useState<string>("");
  const [singleContactName, setSingleContactName] = useState<string>("");
  const [singleCompanyName, setSingleCompanyName] = useState<string>("");
  const [singleDesignation, setSingleDesignation] = useState<string>("");
  const [singleIndustry, setSingleIndustry] = useState<string>("");
  const [singleSubject, setSingleSubject] = useState<string>("");
  const [singleHtmlContent, setSingleHtmlContent] = useState<string>("");
  const [isSendingSingle, setIsSendingSingle] = useState<boolean>(false);
  const [singleStatusMsg, setSingleStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Bulk Email State
  const [selectedBulkTemplateId, setSelectedBulkTemplateId] = useState<string>("");
  const [bulkRecipients, setBulkRecipients] = useState<ParsedCSVEmailRecipient[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkSource, setBulkSource] = useState<"csv" | "crm">("crm");
  const [bulkSubject, setBulkSubject] = useState<string>("");
  const [bulkHtmlContent, setBulkHtmlContent] = useState<string>("");
  const [isSendingBulk, setIsSendingBulk] = useState<boolean>(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkStatusMsg, setBulkStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [csvFileName, setCsvFileName] = useState<string>("");

  // Campaigns & Logs State
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [campaignSearchTerm, setCampaignSearchTerm] = useState<string>("");
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [logSearchTerm, setLogSearchTerm] = useState<string>("");

  const loadTemplateIntoEditor = useCallback((tpl: EmailTemplate) => {
    setTemplateName(tpl.name);
    setTemplateSubject(tpl.subject);
    setTemplateCategory(tpl.category);
    setTemplateHtml(tpl.htmlContent);
  }, []);

  // Subscribe to Real-Time Templates, Campaigns & Email Logs via Firebase Firestore
  useEffect(() => {
    let initialized = false;
    const unsubTemplates = subscribeToTemplates((updatedTemplates) => {
      setTemplates(updatedTemplates);
      if (updatedTemplates.length > 0 && !initialized) {
        initialized = true;
        const currentUsername = currentUser?.username?.toLowerCase();
        const visible = isAdmin
          ? updatedTemplates
          : updatedTemplates.filter(
              (tpl) =>
                tpl.isSystem ||
                !tpl.owner ||
                tpl.owner === "system" ||
                (currentUsername && tpl.owner.toLowerCase() === currentUsername)
            );
        const initialTpl = visible[0] || updatedTemplates[0];
        if (initialTpl) {
          setSelectedTemplateId(initialTpl.id);
          loadTemplateIntoEditor(initialTpl);

          setSelectedSingleTemplateId(initialTpl.id);
          setSingleSubject(initialTpl.subject);
          setSingleHtmlContent(initialTpl.htmlContent);

          setSelectedBulkTemplateId(initialTpl.id);
          setBulkSubject(initialTpl.subject);
          setBulkHtmlContent(initialTpl.htmlContent);
        }
      }
    });

    const unsubCampaigns = subscribeToCampaigns((updatedCampaigns) => {
      setCampaigns(updatedCampaigns);
    });

    const unsubLogs = subscribeToEmailLogs((updatedLogs) => {
      setLogs(updatedLogs);
    });

    return () => {
      unsubTemplates();
      unsubCampaigns();
      unsubLogs();
    };
  }, [loadTemplateIntoEditor, currentUser, isAdmin]);

  const handleCreateNewTemplate = () => {
    setSelectedTemplateId("");
    setTemplateName("New Custom HTML Template");
    setTemplateSubject("Subject Line for {{companyName}}");
    setTemplateCategory("custom");
    setTemplateHtml(`<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
  <h2 style="color: #4f46e5;">Hello {{contactName}},</h2>
  <p>Thank you for connecting with us regarding {{companyName}} in the {{industry}} sector.</p>
  <p>Best regards,<br/>xMonks Sales Team</p>
</div>`);
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim() || !templateHtml.trim()) return;
    const currentOwner = currentUser?.username?.toLowerCase() || "system";
    const currentCreator = currentUser?.name || currentUser?.username || "User";

    const existing = templates.find((t) => t.id === selectedTemplateId);
    // If not admin and editing a system template or another user's template, save as personal copy
    if (!isAdmin && existing && (existing.isSystem || (existing.owner && existing.owner.toLowerCase() !== currentOwner))) {
      const saved = saveCustomTemplate({
        name: `${templateName} (My Copy)`,
        subject: templateSubject,
        category: templateCategory,
        htmlContent: templateHtml,
        description: `Personal copy saved by ${currentCreator}`,
        owner: currentOwner,
        createdBy: currentCreator,
        isSystem: false,
      });
      setSelectedTemplateId(saved.id);
      setTemplateSavedMsg("Saved as your personal custom template!");
      setTimeout(() => setTemplateSavedMsg(""), 3000);
      return;
    }

    const saved = saveCustomTemplate({
      id: selectedTemplateId || undefined,
      name: templateName,
      subject: templateSubject,
      category: templateCategory,
      htmlContent: templateHtml,
      description: existing?.description || `Custom template by ${currentCreator}`,
      owner: existing?.owner || currentOwner,
      createdBy: existing?.createdBy || currentCreator,
      isSystem: existing ? Boolean(existing.isSystem) : false,
    });
    setSelectedTemplateId(saved.id);
    setTemplateSavedMsg("Template saved successfully!");
    setTimeout(() => setTemplateSavedMsg(""), 3000);
  };

  const handleDeleteTemplate = (id?: string) => {
    const targetId = id || selectedTemplateId;
    if (!targetId) return;
    const target = templates.find((t) => t.id === targetId);
    const currentOwner = currentUser?.username?.toLowerCase();

    if (!isAdmin && target) {
      if (target.isSystem || (target.owner && target.owner.toLowerCase() !== currentOwner)) {
        alert("You can only delete your own personal templates.");
        return;
      }
    }

    if (confirm("Are you sure you want to delete this HTML email template?")) {
      deleteTemplate(targetId);
      const remaining = getAllTemplates();
      setTemplates(remaining);
      const remainingVisible = isAdmin
        ? remaining
        : remaining.filter(
            (t) =>
              t.isSystem ||
              !t.owner ||
              t.owner === "system" ||
              (currentOwner && t.owner.toLowerCase() === currentOwner)
          );
      if (remainingVisible.length > 0) {
        setSelectedTemplateId(remainingVisible[0].id);
        loadTemplateIntoEditor(remainingVisible[0]);
      } else {
        handleCreateNewTemplate();
      }
      setTemplateSavedMsg("Template deleted successfully.");
      setTimeout(() => setTemplateSavedMsg(""), 3000);
    }
  };

  // AI Generated Template Callbacks
  const handleAISaveToLibrary = (aiTemplate: {
    name: string;
    subject: string;
    category: EmailTemplate["category"];
    htmlContent: string;
    description: string;
  }) => {
    const currentOwner = currentUser?.username?.toLowerCase() || "system";
    const currentCreator = currentUser?.name || currentUser?.username || "User";

    const saved = saveCustomTemplate({
      name: aiTemplate.name,
      subject: aiTemplate.subject,
      category: aiTemplate.category,
      htmlContent: aiTemplate.htmlContent,
      description: aiTemplate.description,
      owner: currentOwner,
      createdBy: currentCreator,
      isSystem: false,
    });
    setSelectedTemplateId(saved.id);
    setTemplateName(saved.name);
    setTemplateSubject(saved.subject);
    setTemplateCategory(saved.category);
    setTemplateHtml(saved.htmlContent);
    setTemplateSavedMsg("✨ AI Template generated & saved to your personal library!");
    setTimeout(() => setTemplateSavedMsg(""), 4000);
  };

  const handleAIApplyToSingle = (tpl: { subject: string; htmlContent: string }) => {
    setSingleSubject(tpl.subject);
    setSingleHtmlContent(tpl.htmlContent);
    setActiveSubTab("single");
  };

  const handleAIApplyToBulk = (tpl: { subject: string; htmlContent: string }) => {
    setBulkSubject(tpl.subject);
    setBulkHtmlContent(tpl.htmlContent);
    setActiveSubTab("bulk");
  };

  const handleInsertPlaceholder = (placeholder: string) => {
    setTemplateHtml((prev) => prev + ` ${placeholder}`);
  };

  // Apply template to Single Email sender
  const handleApplyTemplateToSingle = (tpl: EmailTemplate) => {
    setSelectedSingleTemplateId(tpl.id);
    setSingleSubject(tpl.subject);
    setSingleHtmlContent(tpl.htmlContent);
  };

  // Apply template to Bulk Email sender
  const handleApplyTemplateToBulk = (tpl: EmailTemplate) => {
    setSelectedBulkTemplateId(tpl.id);
    setBulkSubject(tpl.subject);
    setBulkHtmlContent(tpl.htmlContent);
  };

  // Select CRM lead for Single Email
  const handleSelectCRMLeadForSingle = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      setSingleRecipientEmail(lead.contactEmail);
      setSingleContactName(lead.contactName);
      setSingleCompanyName(lead.companyName);
      setSingleDesignation(lead.designation || "");
      setSingleIndustry(lead.industry || "");
    }
  };

  // Send Single Email handler
  const handleSendSingleEmail = async () => {
    setSingleStatusMsg(null);
    if (!singleRecipientEmail || !singleRecipientEmail.includes("@")) {
      setSingleStatusMsg({ type: "error", text: "Please enter a valid recipient email address." });
      return;
    }
    if (!singleSubject || !singleHtmlContent) {
      setSingleStatusMsg({ type: "error", text: "Please provide both Subject and HTML content." });
      return;
    }

    setIsSendingSingle(true);
    try {
      const res = await sendEmailCampaign({
        recipients: [
          {
            email: singleRecipientEmail,
            contactName: singleContactName,
            companyName: singleCompanyName,
            designation: singleDesignation,
            industry: singleIndustry,
          },
        ],
        subject: singleSubject,
        htmlContent: singleHtmlContent,
        smtpConfig: activeSender,
      });

      const successCount = res.successCount || (res.success ? 1 : 0);
      const failedCount = 1 - successCount;

      saveCampaignRecord({
        name: `Single Email: ${singleContactName || singleRecipientEmail}`,
        subject: singleSubject,
        templateId: selectedSingleTemplateId,
        templateName: templates.find((t) => t.id === selectedSingleTemplateId)?.name,
        htmlContent: singleHtmlContent,
        source: "single",
        recipientCount: 1,
        successCount,
        failedCount,
        status: successCount > 0 ? "completed" : "failed",
        recipients: [
          {
            email: singleRecipientEmail,
            contactName: singleContactName,
            companyName: singleCompanyName,
            designation: singleDesignation,
            industry: singleIndustry,
            status: successCount > 0 ? "success" : "failed",
            error: res.error || res.results?.[0]?.error,
          },
        ],
      });

      if (res.success && res.successCount > 0) {
        setSingleStatusMsg({
          type: "success",
          text: `Email successfully delivered to ${singleRecipientEmail}! Saved to Firebase.`,
        });
      } else {
        setSingleStatusMsg({
          type: "error",
          text: res.error || res.results?.[0]?.error || "Failed to send email. Verify SMTP settings.",
        });
      }
    } catch (err: unknown) {
      setSingleStatusMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to send email.",
      });
    } finally {
      setIsSendingSingle(false);
    }
  };

  // CSV File Handler for Bulk Emailing
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) return;

      const parsed: ParsedCSVEmailRecipient[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map((c) =>
          c.replace(/^"|"$/g, "").trim()
        );
        if (cols.length >= 2) {
          const emailCol = cols[0].includes("@") ? cols[0] : cols[3] || cols[2];
          const nameCol = cols[1] || "Valued Executive";
          const companyCol = cols[2] || "Company";
          const designationCol = cols[3] || "";
          const industryCol = cols[4] || "B2B Industry";
          const dealValueCol = parseFloat(cols[5]) || 0;

          if (emailCol && emailCol.includes("@")) {
            parsed.push({
              email: emailCol,
              contactName: nameCol,
              companyName: companyCol,
              designation: designationCol,
              industry: industryCol,
              dealValue: dealValueCol,
            });
          }
        }
      }
      setBulkRecipients(parsed);
    };
    reader.readAsText(file);
  };

  // Download Sample CSV template for Email Campaign
  const handleDownloadSampleBulkCSV = () => {
    const blob = new Blob([SAMPLE_BULK_EMAIL_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "xmonks_bulk_email_recipients.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Select / Deselect CRM leads for Bulk Emailing
  const toggleSelectAllCRMLeads = () => {
    if (selectedLeadIds.length === leads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map((l) => l.id));
    }
  };

  const toggleSelectCRMLead = (id: string) => {
    if (selectedLeadIds.includes(id)) {
      setSelectedLeadIds((prev) => prev.filter((i) => i !== id));
    } else {
      setSelectedLeadIds((prev) => [...prev, id]);
    }
  };

  // Send Bulk Email handler
  const handleSendBulkEmail = async () => {
    setBulkStatusMsg(null);

    let targetRecipients: ParsedCSVEmailRecipient[] = [];

    if (bulkSource === "csv") {
      targetRecipients = bulkRecipients;
    } else {
      targetRecipients = leads
        .filter((l) => selectedLeadIds.includes(l.id))
        .map((l) => ({
          email: l.contactEmail,
          contactName: l.contactName,
          companyName: l.companyName,
          designation: l.designation,
          industry: l.industry,
          dealValue: l.dealValue,
        }));
    }

    if (targetRecipients.length === 0) {
      setBulkStatusMsg({ type: "error", text: "No recipients selected for bulk emailing." });
      return;
    }

    if (!bulkSubject || !bulkHtmlContent) {
      setBulkStatusMsg({ type: "error", text: "Please set Email Subject and HTML template." });
      return;
    }

    setIsSendingBulk(true);
    setBulkProgress({ current: 0, total: targetRecipients.length });

    try {
      const res = await sendEmailCampaign({
        recipients: targetRecipients,
        subject: bulkSubject,
        htmlContent: bulkHtmlContent,
        smtpConfig: activeSender,
      });

      setBulkProgress({ current: targetRecipients.length, total: targetRecipients.length });

      const recipientDetails = targetRecipients.map((tr) => {
        const matched = res.results?.find((r: { recipient: string; success: boolean; error?: string }) => r.recipient === tr.email);
        return {
          ...tr,
          status: matched ? (matched.success ? ("success" as const) : ("failed" as const)) : ("failed" as const),
          error: matched?.error,
        };
      });

      const succCount = res.successCount || 0;
      const totCount = res.totalCount || targetRecipients.length;

      saveCampaignRecord({
        name: `Bulk Campaign: ${bulkSubject} (${targetRecipients.length} recipients)`,
        subject: bulkSubject,
        templateId: selectedBulkTemplateId,
        templateName: templates.find((t) => t.id === selectedBulkTemplateId)?.name,
        htmlContent: bulkHtmlContent,
        source: bulkSource === "csv" ? "csv" : "crm",
        recipientCount: targetRecipients.length,
        successCount: succCount,
        failedCount: totCount - succCount,
        status: succCount === targetRecipients.length ? "completed" : succCount > 0 ? "partial" : "failed",
        recipients: recipientDetails,
      });

      if (res.successCount > 0) {
        setBulkStatusMsg({
          type: "success",
          text: `Bulk Email Campaign Completed! Dispatched ${res.successCount} of ${res.totalCount} emails. Saved to Firebase.`,
        });
      } else {
        setBulkStatusMsg({
          type: "error",
          text: res.error || "Bulk campaign dispatch failed. Check Developer SMTP settings.",
        });
      }
    } catch (err: unknown) {
      setBulkStatusMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to dispatch bulk emails.",
      });
    } finally {
      setIsSendingBulk(false);
    }
  };

  // Filter campaigns for campaigns tab
  const filteredCampaigns = useMemo(() => {
    if (!campaignSearchTerm.trim()) return campaigns;
    const term = campaignSearchTerm.toLowerCase();
    return campaigns.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.subject.toLowerCase().includes(term) ||
        c.source.toLowerCase().includes(term) ||
        c.recipients.some((r) => r.email.toLowerCase().includes(term))
    );
  }, [campaigns, campaignSearchTerm]);

  // Filter logs for logs tab
  const filteredLogs = useMemo(() => {
    if (!logSearchTerm.trim()) return logs;
    const term = logSearchTerm.toLowerCase();
    return logs.filter(
      (l) =>
        l.recipient.toLowerCase().includes(term) ||
        l.subject.toLowerCase().includes(term) ||
        l.status.toLowerCase().includes(term)
    );
  }, [logs, logSearchTerm]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-purple-900/90 via-slate-900 to-indigo-900/90 rounded-3xl border border-purple-500/20 text-white shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 bg-purple-500/20 rounded-2xl border border-purple-400/30 text-purple-300">
            <Mail className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black tracking-tight">Email Campaigns & Templates</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Google Apps SMTP Enabled
              </span>
            </div>
            <p className="text-xs text-purple-200/80 mt-1 max-w-2xl">
              Create rich HTML templates with dynamic CRM tags, send personalized emails to individual B2B leads, or execute bulk CSV email campaigns directly via your Google Apps password integration.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex items-center space-x-2.5">
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-semibold">Active Sender Capsule:</span>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-indigo-300 font-mono text-xs">
                  {activeSender.senderName || activeSender.userEmail}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  ({activeSender.userEmail})
                </span>
              </div>
            </div>

            {isAdmin ? (
              senderProfiles.length > 1 && (
                <select
                  value={activeSender.id || ""}
                  onChange={(e) => {
                    setAdminSelectedSenderId(e.target.value);
                    setActiveSender(e.target.value);
                  }}
                  className="bg-slate-800 text-xs text-white rounded-lg px-2 py-1 border border-slate-700 focus:outline-none focus:border-indigo-500 font-mono"
                >
                  {senderProfiles.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.senderName} ({s.userEmail})
                    </option>
                  ))}
                </select>
              )
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                <span>Assigned</span>
              </span>
            )}
          </div>

          {isAdmin && onNavigateToDeveloper && (
            <button
              onClick={onNavigateToDeveloper}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
              title="Configure Senders & SMTP in Developer Tab"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveSubTab("templates")}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
            activeSubTab === "templates"
              ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>HTML Templates ({userVisibleTemplates.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab("single");
            const currentTpl = userVisibleTemplates.find((t) => t.id === selectedTemplateId) || userVisibleTemplates[0];
            if (currentTpl && !singleSubject) handleApplyTemplateToSingle(currentTpl);
          }}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
            activeSubTab === "single"
              ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Send Single Email</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab("bulk");
            const currentTpl = userVisibleTemplates.find((t) => t.id === selectedTemplateId) || userVisibleTemplates[0];
            if (currentTpl && !bulkSubject) handleApplyTemplateToBulk(currentTpl);
          }}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
            activeSubTab === "bulk"
              ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Bulk CSV Emailing</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab("campaigns");
          }}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
            activeSubTab === "campaigns"
              ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Firebase Campaigns ({campaigns.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab("logs");
          }}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
            activeSubTab === "logs"
              ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Dispatch Logs ({logs.length})</span>
        </button>
      </div>

      {/* TAB 1: HTML TEMPLATE BUILDER & EDITOR */}
      {activeSubTab === "templates" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar: Template Selection */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-1.5">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Templates ({filteredUserTemplates.length})
              </h3>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setIsAIModalOpen(true)}
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-[11px] rounded-xl shadow-md shadow-purple-500/20 transition transform hover:scale-[1.02]"
                  title="Generate HTML template with Gemini AI"
                >
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  <span>AI Gen</span>
                </button>
                <button
                  onClick={handleCreateNewTemplate}
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] rounded-xl transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>New</span>
                </button>
              </div>
            </div>

            {/* 30-Day Enterprise Playbook Collapsible for Amit */}
            <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-slate-900/40 border border-orange-500/30 rounded-2xl p-3">
              <button
                type="button"
                onClick={() => setShowPlaybookGuide(!showPlaybookGuide)}
                className="w-full flex items-center justify-between text-left text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-500 transition"
              >
                <div className="flex items-center space-x-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span>30-Day Enterprise Emailer Playbook</span>
                </div>
                {showPlaybookGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showPlaybookGuide && (
                <div className="mt-3 space-y-2.5 pt-2.5 border-t border-orange-500/20 text-[11px]">
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    Account-based sequential cadences for Amit Shelly. Click any step to load that email instantly:
                  </p>
                  
                  {/* CHRO Sequence */}
                  <div className="bg-white/80 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="font-extrabold text-[10.5px] text-slate-800 dark:text-slate-200 block mb-1">
                      CHRO / HR Head:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { day: "Day 0", id: "amit-chro-email-1", name: "Email 1" },
                        { day: "Day 4", id: "amit-chro-email-2", name: "Email 2" },
                        { day: "Day 9", id: "amit-chro-email-3", name: "Email 3" },
                        { day: "Day 15", id: "amit-chro-email-4", name: "Email 4" },
                        { day: "Day 23", id: "amit-conversion-email-18", name: "Email 18" },
                      ].map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleSelectPlaybookTemplate(s.id)}
                          className="px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800 font-bold text-[9.5px] hover:bg-orange-500 hover:text-white transition"
                        >
                          {s.day}: {s.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* L&D Head Sequence */}
                  <div className="bg-white/80 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="font-extrabold text-[10.5px] text-slate-800 dark:text-slate-200 block mb-1">
                      L&D Head:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { day: "Day 0", id: "amit-ld-email-5", name: "Email 5" },
                        { day: "Day 3", id: "amit-ld-email-6", name: "Email 6" },
                        { day: "Day 8", id: "amit-ld-email-7", name: "Email 7" },
                        { day: "Day 14", id: "amit-ld-email-8", name: "Email 8" },
                        { day: "Day 22", id: "amit-conversion-email-18", name: "Email 18" },
                      ].map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleSelectPlaybookTemplate(s.id)}
                          className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 font-bold text-[9.5px] hover:bg-purple-600 hover:text-white transition"
                        >
                          {s.day}: {s.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Talent Head Sequence */}
                  <div className="bg-white/80 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="font-extrabold text-[10.5px] text-slate-800 dark:text-slate-200 block mb-1">
                      Talent / Succession Head:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { day: "Day 0", id: "amit-talent-email-9", name: "Email 9" },
                        { day: "Day 5", id: "amit-talent-email-10", name: "Email 10" },
                        { day: "Day 11", id: "amit-talent-email-11", name: "Email 11" },
                        { day: "Day 18", id: "amit-chro-email-4", name: "Email 4" },
                        { day: "Day 25", id: "amit-conversion-email-18", name: "Email 18" },
                      ].map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleSelectPlaybookTemplate(s.id)}
                          className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 font-bold text-[9.5px] hover:bg-blue-600 hover:text-white transition"
                        >
                          {s.day}: {s.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* HRBP Sequence */}
                  <div className="bg-white/80 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="font-extrabold text-[10.5px] text-slate-800 dark:text-slate-200 block mb-1">
                      HRBP:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { day: "Day 0", id: "amit-hrbp-email-12", name: "Email 12" },
                        { day: "Day 5", id: "amit-hrbp-email-13", name: "Email 13" },
                        { day: "Day 12", id: "amit-ld-email-6", name: "Email 6" },
                        { day: "Day 20", id: "amit-chro-email-2", name: "Email 2" },
                        { day: "Day 27", id: "amit-conversion-email-18", name: "Email 18" },
                      ].map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleSelectPlaybookTemplate(s.id)}
                          className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold text-[9.5px] hover:bg-emerald-600 hover:text-white transition"
                        >
                          {s.day}: {s.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DEI / Women Leadership Sequence */}
                  <div className="bg-white/80 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="font-extrabold text-[10.5px] text-slate-800 dark:text-slate-200 block mb-1">
                      DEI & Women Leadership:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { day: "Day 0", id: "amit-dei-email-14", name: "Email 14" },
                        { day: "Day 5", id: "amit-dei-email-15", name: "Email 15" },
                        { day: "Day 12", id: "amit-talent-email-11", name: "Email 11" },
                        { day: "Day 20", id: "amit-chro-email-4", name: "Email 4" },
                        { day: "Day 27", id: "amit-conversion-email-18", name: "Email 18" },
                      ].map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleSelectPlaybookTemplate(s.id)}
                          className="px-1.5 py-0.5 rounded bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-800 font-bold text-[9.5px] hover:bg-pink-600 hover:text-white transition"
                        >
                          {s.day}: {s.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CEO / Business Head Sequence */}
                  <div className="bg-white/80 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="font-extrabold text-[10.5px] text-slate-800 dark:text-slate-200 block mb-1">
                      CEO / Business Head:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { day: "Day 0", id: "amit-ceo-email-16", name: "Email 16" },
                        { day: "Day 5", id: "amit-ceo-email-17", name: "Email 17" },
                        { day: "Day 12", id: "amit-chro-email-3", name: "Email 3" },
                        { day: "Day 19", id: "amit-chro-email-4", name: "Email 4" },
                        { day: "Day 27", id: "amit-conversion-email-18", name: "Email 18" },
                      ].map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleSelectPlaybookTemplate(s.id)}
                          className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 font-bold text-[9.5px] hover:bg-indigo-600 hover:text-white transition"
                        >
                          {s.day}: {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Persona Quick Filter Pills */}
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: "all", label: `All (${userVisibleTemplates.length})` },
                { id: "chro", label: "CHRO" },
                { id: "ld", label: "L&D" },
                { id: "talent", label: "Talent" },
                { id: "hrbp", label: "HRBP" },
                { id: "dei", label: "DEI" },
                { id: "ceo", label: "CEO" },
                { id: "closing", label: "Closing" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedPersonaFilter(f.id)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                    selectedPersonaFilter === f.id
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredUserTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => {
                    setSelectedTemplateId(tpl.id);
                    loadTemplateIntoEditor(tpl);
                  }}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                    selectedTemplateId === tpl.id
                      ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-indigo-950 dark:text-indigo-100"
                      : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs">{tpl.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-800">
                      {tpl.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{tpl.subject}</p>
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800/60 pt-2">
                    <span className="text-[10px]">
                      {tpl.isSystem || !tpl.owner || tpl.owner === "system" ? (
                        <span className="text-slate-500 font-medium">System Prebuilt</span>
                      ) : currentUser?.username && tpl.owner.toLowerCase() === currentUser.username.toLowerCase() ? (
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-md">My Template</span>
                      ) : (
                        <span className="text-slate-400 font-medium">{tpl.createdBy || tpl.owner}</span>
                      )}
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyTemplateToSingle(tpl);
                          setActiveSubTab("single");
                        }}
                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Use in Single
                      </button>

                      {(isAdmin || (Boolean(tpl.owner) && tpl.owner?.toLowerCase() === currentUser?.username?.toLowerCase())) && !tpl.isSystem && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(tpl.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                          title="Delete Template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Area: Template Code Editor & Live Preview */}
          <div className="lg:col-span-8 space-y-5">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                    <Edit3 className="w-4 h-4 text-purple-500" />
                    <span>HTML Template Editor</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Design custom HTML email layouts with dynamic merge fields.
                  </p>
                </div>

                <div className="flex items-center space-x-2.5">
                  <button
                    type="button"
                    onClick={() => setIsAIModalOpen(true)}
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-purple-500/20 transition transform hover:scale-[1.02]"
                  >
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    <span>Generate with Gemini AI</span>
                  </button>

                  {selectedTemplateId && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(selectedTemplateId)}
                      className="flex items-center space-x-1.5 px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-xs rounded-xl transition"
                      title="Delete active template"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
                      <span>Delete Template</span>
                    </button>
                  )}

                  <button
                    onClick={handleSaveTemplate}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Template</span>
                  </button>
                </div>
              </div>

              {templateSavedMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>{templateSavedMsg}</span>
                </div>
              )}

              {/* Template Title & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. Executive Cold Outreach"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Default Subject Line
                  </label>
                  <input
                    type="text"
                    value={templateSubject}
                    onChange={(e) => setTemplateSubject(e.target.value)}
                    placeholder="Subject for {{companyName}}"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Dynamic Placeholder Tag Chips */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Click to Insert Dynamic Merge Tags:
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "{{contactName}}",
                    "{{companyName}}",
                    "{{designation}}",
                    "{{industry}}",
                    "{{dealValue}}",
                    "{{email}}",
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleInsertPlaceholder(tag)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 font-mono text-[11px] font-bold hover:bg-indigo-100 transition flex items-center space-x-1"
                    >
                      <span>{tag}</span>
                      <Plus className="w-3 h-3 text-indigo-400" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Editor & Live Preview Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1.5">
                    <FileCode className="w-4 h-4 text-indigo-500" />
                    <span>Raw HTML Code</span>
                  </label>
                  <textarea
                    rows={16}
                    value={templateHtml}
                    onChange={(e) => setTemplateHtml(e.target.value)}
                    className="w-full p-3.5 bg-slate-950 text-indigo-200 font-mono text-xs border border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1.5">
                    <Eye className="w-4 h-4 text-emerald-500" />
                    <span>Live Visual Preview</span>
                  </label>
                  <EmailPreviewCard
                    html={templateHtml}
                    subject={templateSubject}
                    recipientName="Aarav Patel"
                    recipientEmail="aarav@zenithcloud.in"
                    height="h-[420px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SINGLE EMAIL SENDER */}
      {activeSubTab === "single" && (
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <Send className="w-4 h-4 text-indigo-500" />
                <span>Send Single Email to B2B Lead</span>
              </h3>
              <p className="text-xs text-slate-500">
                Dispatch personalized HTML email directly to a CRM lead or custom recipient.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsAIModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-500/20 transition transform hover:scale-[1.02]"
                title="Generate custom email copy with Gemini AI"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>AI Write Email</span>
              </button>

              {/* Quick Pick CRM Lead dropdown */}
              <div className="w-60">
                <select
                  onChange={(e) => handleSelectCRMLeadForSingle(e.target.value)}
                  defaultValue=""
                  className="w-full px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <option value="" disabled>
                    -- Select Lead from Directory --
                  </option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.contactName} ({l.companyName})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {singleStatusMsg && (
            <div
              className={`p-4 rounded-2xl text-xs font-semibold flex items-center space-x-3 ${
                singleStatusMsg.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400"
              }`}
            >
              {singleStatusMsg.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
              )}
              <span>{singleStatusMsg.text}</span>
            </div>
          )}

          {/* Recipient Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Recipient Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={singleRecipientEmail}
                onChange={(e) => setSingleRecipientEmail(e.target.value)}
                placeholder="lead@company.com"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Contact Name
              </label>
              <input
                type="text"
                value={singleContactName}
                onChange={(e) => setSingleContactName(e.target.value)}
                placeholder="e.g. Aarav Patel"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={singleCompanyName}
                onChange={(e) => setSingleCompanyName(e.target.value)}
                placeholder="e.g. Zenith Cloud Tech"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Template Selector Dropdown */}
          <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Select Saved HTML Email Template <span className="text-rose-500">*</span></span>
                <button
                  type="button"
                  onClick={() => setIsAIModalOpen(true)}
                  className="text-[11px] text-purple-600 dark:text-purple-400 font-bold hover:underline flex items-center space-x-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  <span>Generate with Gemini AI</span>
                </button>
              </label>
              <select
                value={selectedSingleTemplateId}
                onChange={(e) => {
                  const tplId = e.target.value;
                  setSelectedSingleTemplateId(tplId);
                  const tpl = userVisibleTemplates.find((t) => t.id === tplId);
                  if (tpl) {
                    setSingleSubject(tpl.subject);
                    setSingleHtmlContent(tpl.htmlContent);
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="" disabled>-- Select Saved HTML Email Template --</option>
                {userVisibleTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.category.toUpperCase()}) - {t.subject}
                  </option>
                ))}
              </select>
            </div>

            {/* Template Content Preview */}
            {selectedSingleTemplateId && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Selected Subject Line Preview:
                  </span>
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                    {singleSubject || "No subject specified"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                    HTML Content Visual Preview:
                  </span>
                  <EmailPreviewCard
                    html={singleHtmlContent}
                    subject={singleSubject}
                    recipientName={singleContactName || "Contact Name"}
                    recipientEmail={singleRecipientEmail || "lead@company.com"}
                    height="h-[360px]"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              onClick={handleSendSingleEmail}
              disabled={isSendingSingle}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/30 transition flex items-center space-x-2"
            >
              {isSendingSingle ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Dispatching Email...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Email Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: BULK CSV & CRM EMAIL CAMPAIGN */}
      {activeSubTab === "bulk" && (
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Source Toggle */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-purple-500" />
                  <span>Bulk Email Campaign Dispatcher</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Batch send personalized HTML emails to CSV list or CRM Leads.
                </p>
              </div>

              <div className="flex items-center space-x-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setBulkSource("crm")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    bulkSource === "crm"
                      ? "bg-purple-600 text-white shadow"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Select CRM Leads ({selectedLeadIds.length})
                </button>

                <button
                  onClick={() => setBulkSource("csv")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    bulkSource === "csv"
                      ? "bg-purple-600 text-white shadow"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Upload CSV File ({bulkRecipients.length})
                </button>
              </div>
            </div>

            {bulkStatusMsg && (
              <div
                className={`p-4 rounded-2xl text-xs font-semibold flex items-center space-x-3 ${
                  bulkStatusMsg.type === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400"
                }`}
              >
                {bulkStatusMsg.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                )}
                <span>{bulkStatusMsg.text}</span>
              </div>
            )}

            {/* CSV Source View */}
            {bulkSource === "csv" && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 flex items-center justify-between flex-wrap gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-purple-950 dark:text-purple-200 block">
                      Need a Bulk Email CSV Template?
                    </span>
                    <p className="text-xs text-purple-800/80 dark:text-purple-300/80">
                      Download pre-formatted CSV template with columns for Email, Name, Company, Designation, Industry.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadSampleBulkCSV}
                    className="flex items-center space-x-2 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Bulk Email CSV Sample</span>
                  </button>
                </div>

                <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-purple-500 rounded-2xl p-6 text-center bg-slate-50/50 dark:bg-slate-950/40 transition">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    id="bulk-email-csv-input"
                    className="hidden"
                  />
                  <label htmlFor="bulk-email-csv-input" className="cursor-pointer flex flex-col items-center justify-center space-y-2">
                    <div className="p-3.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      {csvFileName ? csvFileName : "Click to select or drop CSV email list"}
                    </span>
                    <span className="text-xs text-slate-400">CSV file with contact email and lead details</span>
                  </label>
                </div>

                {bulkRecipients.length > 0 && (
                  <div className="overflow-x-auto max-h-48 rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-2.5">Email</th>
                          <th className="p-2.5">Contact Name</th>
                          <th className="p-2.5">Company</th>
                          <th className="p-2.5">Industry</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {bulkRecipients.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 font-bold font-mono text-purple-600 dark:text-purple-400">
                              {r.email}
                            </td>
                            <td className="p-2.5 text-slate-800 dark:text-slate-200">{r.contactName}</td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-400">{r.companyName}</td>
                            <td className="p-2.5 text-slate-500">{r.industry}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* CRM Source View */}
            {bulkSource === "crm" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={toggleSelectAllCRMLeads}
                    className="flex items-center space-x-2 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    {selectedLeadIds.length === leads.length ? (
                      <CheckSquare className="w-4 h-4 text-purple-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <span>
                      {selectedLeadIds.length === leads.length
                        ? "Deselect All Leads"
                        : `Select All (${leads.length} Leads)`}
                    </span>
                  </button>
                  <span className="text-xs text-slate-500 font-bold">
                    Selected: {selectedLeadIds.length} leads
                  </span>
                </div>

                <div className="overflow-x-auto max-h-60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-2.5 w-10 text-center">#</th>
                        <th className="p-2.5">Company & Contact</th>
                        <th className="p-2.5">Email</th>
                        <th className="p-2.5">Industry</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {leads.map((lead) => {
                        const isChecked = selectedLeadIds.includes(lead.id);
                        return (
                          <tr
                            key={lead.id}
                            onClick={() => toggleSelectCRMLead(lead.id)}
                            className={`cursor-pointer transition ${
                              isChecked
                                ? "bg-purple-50/70 dark:bg-purple-950/40"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                            }`}
                          >
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                              />
                            </td>
                            <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">
                              {lead.companyName}{" "}
                              <span className="font-normal text-slate-500">({lead.contactName})</span>
                            </td>
                            <td className="p-2.5 font-mono text-purple-600 dark:text-purple-400">
                              {lead.contactEmail}
                            </td>
                            <td className="p-2.5 text-slate-500">{lead.industry}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Campaign Template Selection Dropdown */}
            <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Select Campaign HTML Template <span className="text-rose-500">*</span></span>
                  <button
                    type="button"
                    onClick={() => setIsAIModalOpen(true)}
                    className="text-[11px] text-purple-600 dark:text-purple-400 font-bold hover:underline flex items-center space-x-1"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    <span>Generate Campaign with Gemini AI</span>
                  </button>
                </label>
                <select
                  value={selectedBulkTemplateId}
                  onChange={(e) => {
                    const tplId = e.target.value;
                    setSelectedBulkTemplateId(tplId);
                    const tpl = userVisibleTemplates.find((t) => t.id === tplId);
                    if (tpl) {
                      setBulkSubject(tpl.subject);
                      setBulkHtmlContent(tpl.htmlContent);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="" disabled>-- Select Saved HTML Email Template --</option>
                  {userVisibleTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.category.toUpperCase()}) - {t.subject}
                    </option>
                  ))}
                </select>
              </div>

              {/* Template Content Preview Card */}
              {selectedBulkTemplateId && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Campaign Subject Line Preview:
                    </span>
                    <p className="text-xs font-bold text-purple-600 dark:text-purple-400 font-mono">
                      {bulkSubject || "No subject specified"}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                      HTML Content Visual Preview:
                    </span>
                    <EmailPreviewCard
                      html={bulkHtmlContent}
                      subject={bulkSubject}
                      recipientName="Contact Name"
                      recipientEmail="lead@company.com"
                      height="h-[360px]"
                    />
                  </div>
                </div>
              )}
            </div>

            {bulkProgress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400">
                  <span>Dispatching Campaign Emails...</span>
                  <span>
                    {bulkProgress.current} / {bulkProgress.total} Complete
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-300"
                    style={{
                      width: `${(bulkProgress.current / Math.max(bulkProgress.total, 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end">
              <button
                onClick={handleSendBulkEmail}
                disabled={isSendingBulk}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-500/30 transition flex items-center space-x-2"
              >
                {isSendingBulk ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Dispatching Bulk Campaign...</span>
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    <span>Dispatch Bulk Campaign</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FIREBASE CAMPAIGNS HISTORY */}
      {activeSubTab === "campaigns" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Saved Firebase Campaigns</span>
              </h3>
              <p className="text-xs text-slate-500">
                All single and bulk email campaign records synchronized in real-time with Firebase Firestore.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={campaignSearchTerm}
                  onChange={(e) => setCampaignSearchTerm(e.target.value)}
                  placeholder="Filter campaigns by name or subject..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              {campaigns.length > 0 && (
                <button
                  onClick={async () => {
                    if (confirm("Are you sure you want to delete all stored campaigns from Firebase?")) {
                      await clearAllCampaigns();
                    }
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                >
                  Clear All Campaigns
                </button>
              )}
            </div>
          </div>

          {filteredCampaigns.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
              <Mail className="w-12 h-12 text-slate-400 mx-auto opacity-50" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                No campaign records found in Firebase.
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Dispatch a single email or bulk CSV campaign from the tabs above to see real-time campaign analytics and history stored directly in Firestore.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredCampaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-purple-500/40 transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/60 pb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {camp.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            camp.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : camp.status === "partial"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {camp.status}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          Source: {camp.source}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Subject: <span className="font-semibold text-slate-700 dark:text-slate-300">{camp.subject}</span>
                      </p>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-mono">Dispatched</span>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          {camp.createdAt}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          if (confirm("Delete this campaign record from Firebase?")) {
                            deleteCampaignRecord(camp.id);
                          }
                        }}
                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition"
                        title="Delete Campaign"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Campaign Stats Bar */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-extrabold block">Total Target</span>
                      <span className="text-base font-black text-slate-800 dark:text-slate-200">
                        {camp.recipientCount}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-extrabold block">
                        Delivered
                      </span>
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        {camp.successCount}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20">
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 uppercase font-extrabold block">
                        Failed
                      </span>
                      <span className="text-base font-black text-rose-600 dark:text-rose-400">
                        {camp.failedCount}
                      </span>
                    </div>
                  </div>

                  {/* Recipient breakdown list */}
                  {camp.recipients && camp.recipients.length > 0 && (
                    <details className="group">
                      <summary className="cursor-pointer text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline py-1 flex items-center justify-between">
                        <span>View Recipient Breakdowns ({camp.recipients.length})</span>
                        <span className="text-[10px] text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="p-2">Email</th>
                              <th className="p-2">Name / Company</th>
                              <th className="p-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-mono text-[11px]">
                            {camp.recipients.map((r, idx) => (
                              <tr key={idx}>
                                <td className="p-2 text-slate-800 dark:text-slate-200 font-semibold">{r.email}</td>
                                <td className="p-2 text-slate-500 font-sans">
                                  {r.contactName || r.companyName || "N/A"}
                                </td>
                                <td className="p-2">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      r.status === "success"
                                        ? "text-emerald-500"
                                        : "text-rose-500"
                                    }`}
                                  >
                                    {r.status === "success" ? "Sent" : r.error || "Failed"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: DISPATCH LOGS HISTORY */}
      {activeSubTab === "logs" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <History className="w-5 h-5 text-indigo-500" />
                <span>Email Campaign Dispatch Logs</span>
              </h3>
              <p className="text-xs text-slate-500">
                Real-time delivery status history and error reports.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={logSearchTerm}
                  onChange={(e) => setLogSearchTerm(e.target.value)}
                  placeholder="Filter logs by email or subject..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <button
                onClick={async () => {
                  if (confirm("Clear all email logs from Firebase?")) {
                    await clearEmailLogs();
                  }
                }}
                className="px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
              >
                Clear History
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Recipient Email</th>
                  <th className="p-3">Subject Line</th>
                  <th className="p-3">Delivery Status</th>
                  <th className="p-3">Message ID / Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">
                      No email dispatch logs found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                      <td className="p-3 font-bold font-mono text-slate-800 dark:text-slate-200">
                        {log.recipient}
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                        {log.subject}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            log.status === "success"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 font-mono text-[11px] max-w-xs truncate">
                        {log.status === "success" ? log.messageId : log.error}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI TEMPLATE GENERATOR MODAL */}
      <AITemplateGeneratorModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onSaveToLibrary={handleAISaveToLibrary}
        onApplyToSingle={handleAIApplyToSingle}
        onApplyToBulk={handleAIApplyToBulk}
        senderName={activeSender.senderName || activeSender.userEmail || "xMonks Team"}
        onNavigateToDeveloper={onNavigateToDeveloper}
      />
    </div>
  );
};
