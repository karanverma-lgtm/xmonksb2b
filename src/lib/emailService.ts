import { PREBUILT_TEMPLATES, EmailTemplate } from "@/constants/emailTemplates";

export interface SMTPConfig {
  userEmail: string;
  appPassword: string;
  host: string;
  port: number;
  secure: boolean;
  senderName: string;
}

export interface EmailLogEntry {
  id: string;
  recipient: string;
  subject: string;
  status: "success" | "failed";
  timestamp: string;
  error?: string;
  messageId?: string;
}

const SMTP_STORAGE_KEY = "xmonks_b2b_smtp_config";
const CUSTOM_TEMPLATES_KEY = "xmonks_b2b_email_templates";
const DELETED_TEMPLATES_KEY = "xmonks_b2b_deleted_templates";
const EMAIL_LOGS_KEY = "xmonks_b2b_email_logs";

export function getDeletedTemplateIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DELETED_TEMPLATES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading deleted templates list", e);
  }
  return [];
}

// Default SMTP configuration (falling back to user defaults)
export function getStoredSMTPConfig(): SMTPConfig {
  if (typeof window === "undefined") {
    return {
      userEmail: process.env.gmail_id || "ruby.dayal@xmonks.com",
      appPassword: process.env.gmail_apps_password || "ombg ustr bodg bxnp",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      senderName: "xMonks B2B Sales",
    };
  }

  try {
    const raw = localStorage.getItem(SMTP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        userEmail: parsed.userEmail || "ruby.dayal@xmonks.com",
        appPassword: parsed.appPassword || "ombg ustr bodg bxnp",
        host: parsed.host || "smtp.gmail.com",
        port: Number(parsed.port) || 465,
        secure: parsed.secure !== undefined ? Boolean(parsed.secure) : true,
        senderName: parsed.senderName || "xMonks B2B Sales",
      };
    }
  } catch (e) {
    console.warn("Error reading stored SMTP config", e);
  }

  return {
    userEmail: "ruby.dayal@xmonks.com",
    appPassword: "ombg ustr bodg bxnp",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    senderName: "xMonks B2B Sales",
  };
}

export function saveSMTPConfig(config: SMTPConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SMTP_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn("Failed to save SMTP config", e);
  }
}

// Templates helper
export function getAllTemplates(): EmailTemplate[] {
  if (typeof window === "undefined") return PREBUILT_TEMPLATES;
  try {
    const deletedIds = getDeletedTemplateIds();
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    let combined = [...PREBUILT_TEMPLATES];
    if (raw) {
      const custom: EmailTemplate[] = JSON.parse(raw);
      combined = [...combined, ...custom];
    }
    return combined.filter((t) => !deletedIds.includes(t.id));
  } catch (e) {
    console.warn("Error reading custom templates", e);
  }
  return PREBUILT_TEMPLATES;
}

export function saveCustomTemplate(template: Omit<EmailTemplate, "id"> & { id?: string }): EmailTemplate {
  const allTemplates = getAllTemplates();
  const templateId = template.id || `custom-${Date.now()}`;
  const newTemplate: EmailTemplate = {
    ...template,
    id: templateId,
  };

  if (typeof window !== "undefined") {
    try {
      const customOnly = allTemplates.filter((t) => t.id.startsWith("custom-"));
      const existingIdx = customOnly.findIndex((t) => t.id === templateId);
      if (existingIdx >= 0) {
        customOnly[existingIdx] = newTemplate;
      } else {
        customOnly.unshift(newTemplate);
      }
      localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(customOnly));
    } catch (e) {
      console.warn("Error saving custom template", e);
    }
  }
  return newTemplate;
}

export function deleteTemplate(templateId: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    if (raw) {
      const custom: EmailTemplate[] = JSON.parse(raw);
      const filtered = custom.filter((t) => t.id !== templateId);
      localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(filtered));
    }
    const deletedIds = getDeletedTemplateIds();
    if (!deletedIds.includes(templateId)) {
      deletedIds.push(templateId);
      localStorage.setItem(DELETED_TEMPLATES_KEY, JSON.stringify(deletedIds));
    }
  } catch (e) {
    console.warn("Error deleting template", e);
  }
}

export function deleteCustomTemplate(templateId: string): void {
  deleteTemplate(templateId);
}

// Email Dispatch Logs helper
export function getEmailLogs(): EmailLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EMAIL_LOGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Error reading email logs", e);
  }
  return [];
}

export function addEmailLogs(entries: Omit<EmailLogEntry, "id" | "timestamp">[]): void {
  if (typeof window === "undefined") return;
  try {
    const current = getEmailLogs();
    const newEntries: EmailLogEntry[] = entries.map((entry) => ({
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "medium",
      }),
    }));
    const updated = [...newEntries, ...current].slice(0, 200); // Keep last 200 logs
    localStorage.setItem(EMAIL_LOGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Error saving email logs", e);
  }
}

export function clearEmailLogs(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(EMAIL_LOGS_KEY);
  } catch (e) {
    console.warn("Error clearing email logs", e);
  }
}

// Call Server API to verify SMTP Connection
export async function testSMTPConnection(config?: Partial<SMTPConfig>) {
  const currentConfig = config ? { ...getStoredSMTPConfig(), ...config } : getStoredSMTPConfig();
  const response = await fetch("/api/email/test-smtp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(currentConfig),
  });

  const data = await response.json();
  return data;
}

// Call Server API to send emails
export async function sendEmailCampaign(payload: {
  recipients: Array<{
    email: string;
    contactName?: string;
    companyName?: string;
    designation?: string;
    industry?: string;
    dealValue?: number | string;
  }>;
  subject: string;
  htmlContent: string;
  smtpConfig?: SMTPConfig;
}) {
  const activeSmtp = payload.smtpConfig || getStoredSMTPConfig();
  const response = await fetch("/api/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipients: payload.recipients,
      subject: payload.subject,
      htmlContent: payload.htmlContent,
      smtpConfig: activeSmtp,
    }),
  });

  const data = await response.json();

  if (data.results && Array.isArray(data.results)) {
    const logsToSave = data.results.map((r: any) => ({
      recipient: r.recipient,
      subject: payload.subject,
      status: r.success ? ("success" as const) : ("failed" as const),
      error: r.error,
      messageId: r.messageId,
    }));
    addEmailLogs(logsToSave);
  }

  return data;
}
