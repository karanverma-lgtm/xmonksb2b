"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Copy,
  Eye,
  History,
  Loader2,
  Building2,
  User,
  Search,
  CheckSquare,
  Square,
  Settings,
} from "lucide-react";
import { EmailPreviewCard } from "@/components/EmailPreviewCard";
import { Lead } from "@/types/lead";
import { EmailTemplate } from "@/constants/emailTemplates";
import {
  getAllTemplates,
  saveCustomTemplate,
  deleteTemplate,
  deleteCustomTemplate,
  sendEmailCampaign,
  getEmailLogs,
  clearEmailLogs,
  getStoredSMTPConfig,
  subscribeToTemplates,
  subscribeToEmailLogs,
  EmailLogEntry,
} from "@/lib/emailService";

interface EmailCampaignTabProps {
  leads: Lead[];
  onNavigateToDeveloper?: () => void;
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
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"templates" | "single" | "bulk" | "logs">("templates");

  // Template State
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("b2b-outreach-v1");
  const [templateName, setTemplateName] = useState<string>("");
  const [templateSubject, setTemplateSubject] = useState<string>("");
  const [templateCategory, setTemplateCategory] = useState<EmailTemplate["category"]>("outreach");
  const [templateHtml, setTemplateHtml] = useState<string>("");
  const [templateSavedMsg, setTemplateSavedMsg] = useState<string>("");

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

  // Logs State
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [logSearchTerm, setLogSearchTerm] = useState<string>("");

  // Subscribe to Real-Time Templates & Email Logs via Firebase Firestore
  useEffect(() => {
    const unsubTemplates = subscribeToTemplates((updatedTemplates) => {
      setTemplates(updatedTemplates);
      if (updatedTemplates.length > 0) {
        setSelectedTemplateId((prev) => {
          if (!prev || !updatedTemplates.some((t) => t.id === prev)) {
            loadTemplateIntoEditor(updatedTemplates[0]);
            return updatedTemplates[0].id;
          }
          return prev;
        });

        const initialTpl = updatedTemplates[0];
        setSelectedSingleTemplateId((prev) => {
          if (!prev || !updatedTemplates.some((t) => t.id === prev)) {
            setSingleSubject(initialTpl.subject);
            setSingleHtmlContent(initialTpl.htmlContent);
            return initialTpl.id;
          }
          return prev;
        });

        setSelectedBulkTemplateId((prev) => {
          if (!prev || !updatedTemplates.some((t) => t.id === prev)) {
            setBulkSubject(initialTpl.subject);
            setBulkHtmlContent(initialTpl.htmlContent);
            return initialTpl.id;
          }
          return prev;
        });
      }
    });

    const unsubLogs = subscribeToEmailLogs((updatedLogs) => {
      setLogs(updatedLogs);
    });

    return () => {
      unsubTemplates();
      unsubLogs();
    };
  }, []);

  // Sync editor fields when selectedTemplateId changes
  useEffect(() => {
    const found = templates.find((t) => t.id === selectedTemplateId);
    if (found) {
      loadTemplateIntoEditor(found);
    }
  }, [selectedTemplateId, templates]);

  const loadTemplateIntoEditor = (tpl: EmailTemplate) => {
    setTemplateName(tpl.name);
    setTemplateSubject(tpl.subject);
    setTemplateCategory(tpl.category);
    setTemplateHtml(tpl.htmlContent);
  };

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
    const saved = saveCustomTemplate({
      id: selectedTemplateId || undefined,
      name: templateName,
      subject: templateSubject,
      category: templateCategory,
      htmlContent: templateHtml,
      description: "Custom user-created HTML template",
    });
    setSelectedTemplateId(saved.id);
    setTemplateSavedMsg("Template saved successfully!");
    setTimeout(() => setTemplateSavedMsg(""), 3000);
  };

  const handleDeleteTemplate = (id?: string) => {
    const targetId = id || selectedTemplateId;
    if (!targetId) return;
    if (confirm("Are you sure you want to delete this HTML email template?")) {
      deleteTemplate(targetId);
      const remaining = getAllTemplates();
      setTemplates(remaining);
      if (remaining.length > 0) {
        setSelectedTemplateId(remaining[0].id);
        loadTemplateIntoEditor(remaining[0]);
      } else {
        handleCreateNewTemplate();
      }
      setTemplateSavedMsg("Template deleted successfully.");
      setTimeout(() => setTemplateSavedMsg(""), 3000);
    }
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
      });

      if (res.success && res.successCount > 0) {
        setSingleStatusMsg({
          type: "success",
          text: `Email successfully delivered to ${singleRecipientEmail}!`,
        });
      } else {
        setSingleStatusMsg({
          type: "error",
          text: res.error || res.results?.[0]?.error || "Failed to send email. Verify SMTP settings.",
        });
      }
    } catch (err: any) {
      setSingleStatusMsg({
        type: "error",
        text: err?.message || "Failed to send email.",
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
      });

      setBulkProgress({ current: targetRecipients.length, total: targetRecipients.length });

      if (res.successCount > 0) {
        setBulkStatusMsg({
          type: "success",
          text: `Bulk Email Campaign Completed! Successfully dispatched ${res.successCount} of ${res.totalCount} emails.`,
        });
      } else {
        setBulkStatusMsg({
          type: "error",
          text: res.error || "Bulk campaign dispatch failed. Check Developer SMTP settings.",
        });
      }
    } catch (err: any) {
      setBulkStatusMsg({
        type: "error",
        text: err?.message || "Failed to dispatch bulk emails.",
      });
    } finally {
      setIsSendingBulk(false);
    }
  };

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

  const smtpConfig = getStoredSMTPConfig();

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-950 text-white shadow-xl border border-purple-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
          <div className="px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <span className="text-slate-400 block text-[10px]">Connected Sender:</span>
            <span className="font-bold text-indigo-300 font-mono">{smtpConfig.userEmail}</span>
          </div>

          {onNavigateToDeveloper && (
            <button
              onClick={onNavigateToDeveloper}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
              title="Configure SMTP Settings in Developer Tab"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveSubTab("templates")}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
            activeSubTab === "templates"
              ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>HTML Templates ({templates.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab("single");
            const currentTpl = templates.find((t) => t.id === selectedTemplateId) || templates[0];
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
            const currentTpl = templates.find((t) => t.id === selectedTemplateId) || templates[0];
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
            setActiveSubTab("logs");
          }}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
            activeSubTab === "logs"
              ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Dispatch History ({logs.length})</span>
        </button>
      </div>

      {/* TAB 1: HTML TEMPLATE BUILDER & EDITOR */}
      {activeSubTab === "templates" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar: Template Selection */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Select HTML Template
              </h3>
              <button
                onClick={handleCreateNewTemplate}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Template</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedTemplateId(tpl.id)}
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
                    <span className="text-[10px] text-slate-400">
                      {tpl.id.startsWith("custom-") ? "User Custom" : "System Template"}
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
                    <Sparkles className="w-4 h-4" />
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

            {/* Quick Pick CRM Lead dropdown */}
            <div className="w-64">
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
                <span className="text-[10px] text-slate-400 font-normal">
                  Templates can be edited in the HTML Templates tab
                </span>
              </label>
              <select
                value={selectedSingleTemplateId}
                onChange={(e) => {
                  const tplId = e.target.value;
                  setSelectedSingleTemplateId(tplId);
                  const tpl = templates.find((t) => t.id === tplId);
                  if (tpl) {
                    setSingleSubject(tpl.subject);
                    setSingleHtmlContent(tpl.htmlContent);
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="" disabled>-- Select Saved HTML Email Template --</option>
                {templates.map((t) => (
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
                  <span className="text-[10px] text-slate-400 font-normal">
                    Templates can be edited in the HTML Templates tab
                  </span>
                </label>
                <select
                  value={selectedBulkTemplateId}
                  onChange={(e) => {
                    const tplId = e.target.value;
                    setSelectedBulkTemplateId(tplId);
                    const tpl = templates.find((t) => t.id === tplId);
                    if (tpl) {
                      setBulkSubject(tpl.subject);
                      setBulkHtmlContent(tpl.htmlContent);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="" disabled>-- Select Saved HTML Email Template --</option>
                  {templates.map((t) => (
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

      {/* TAB 4: DISPATCH LOGS HISTORY */}
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
                onClick={() => {
                  clearEmailLogs();
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
    </div>
  );
};
