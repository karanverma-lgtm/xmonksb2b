import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
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
  createdAt?: number;
}

export interface EmailCampaignRecipient {
  email: string;
  contactName?: string;
  companyName?: string;
  designation?: string;
  industry?: string;
  dealValue?: number | string;
  status?: "success" | "failed";
  error?: string;
  messageId?: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  templateId?: string;
  templateName?: string;
  htmlContent: string;
  source: "csv" | "crm" | "single";
  recipientCount: number;
  successCount: number;
  failedCount: number;
  status: "completed" | "failed" | "partial";
  createdAt: string;
  createdAtMs: number;
  recipients: EmailCampaignRecipient[];
}

const TEMPLATES_COLLECTION = "b2b_email_templates";
const SMTP_COLLECTION = "b2b_smtp_config";
const LOGS_COLLECTION = "b2b_email_logs";
const CAMPAIGNS_COLLECTION = "b2b_email_campaigns";
const DELETED_TEMPLATES_COLLECTION = "b2b_deleted_templates";

const SMTP_STORAGE_KEY = "xmonks_b2b_smtp_config";
const CUSTOM_TEMPLATES_KEY = "xmonks_b2b_email_templates";
const DELETED_TEMPLATES_KEY = "xmonks_b2b_deleted_templates";
const EMAIL_LOGS_KEY = "xmonks_b2b_email_logs";
const CAMPAIGNS_STORAGE_KEY = "xmonks_b2b_email_campaigns";

// --- LOCAL STORAGE BACKUP HELPERS ---

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

export function saveDeletedTemplateIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DELETED_TEMPLATES_KEY, JSON.stringify(ids));
  } catch (e) {
    console.warn("Error saving deleted templates list", e);
  }
}

export function getStoredSMTPConfig(): SMTPConfig {
  const defaultConfig: SMTPConfig = {
    userEmail: process.env.gmail_id || "ruby.dayal@xmonks.com",
    appPassword: process.env.gmail_apps_password || "ombg ustr bodg bxnp",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    senderName: "xMonks B2B Sales",
  };

  if (typeof window === "undefined") return defaultConfig;

  try {
    const raw = localStorage.getItem(SMTP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        userEmail: parsed.userEmail || defaultConfig.userEmail,
        appPassword: parsed.appPassword || defaultConfig.appPassword,
        host: parsed.host || defaultConfig.host,
        port: Number(parsed.port) || 587,
        secure: parsed.secure !== undefined ? Boolean(parsed.secure) : false,
        senderName: parsed.senderName || defaultConfig.senderName,
      };
    }
  } catch (e) {
    console.warn("Error reading stored SMTP config", e);
  }

  return defaultConfig;
}

export function saveLocalSMTPConfig(config: SMTPConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SMTP_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn("Failed to save SMTP config locally", e);
  }
}

export function saveSMTPConfig(config: SMTPConfig): void {
  saveLocalSMTPConfig(config);
  if (typeof window === "undefined") return;
  try {
    const docRef = doc(db, SMTP_COLLECTION, "default");
    setDoc(docRef, config, { merge: true }).catch((err) =>
      console.warn("Firestore save SMTP config warning:", err)
    );
  } catch (e) {
    console.warn("Firestore save SMTP config error:", e);
  }
}

export function getAllTemplates(): EmailTemplate[] {
  if (typeof window === "undefined") return PREBUILT_TEMPLATES;
  try {
    const deletedIds = getDeletedTemplateIds();
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    let combined = [...PREBUILT_TEMPLATES];
    if (raw) {
      const custom: EmailTemplate[] = JSON.parse(raw);
      // Merge unique templates by ID
      const customUnique = custom.filter(
        (c) => !combined.some((t) => t.id === c.id)
      );
      combined = [...customUnique, ...combined];
    }
    return combined.filter((t) => !deletedIds.includes(t.id));
  } catch (e) {
    console.warn("Error reading local templates", e);
  }
  return PREBUILT_TEMPLATES;
}

export function saveLocalTemplates(templates: EmailTemplate[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
  } catch (e) {
    console.warn("Failed to save templates to localStorage", e);
  }
}

// Seed prebuilt templates into Firestore if collection is empty
async function seedPrebuiltTemplates() {
  try {
    for (const tpl of PREBUILT_TEMPLATES) {
      const docRef = doc(db, TEMPLATES_COLLECTION, tpl.id);
      await setDoc(docRef, tpl, { merge: true });
    }
  } catch (e) {
    console.warn("Error seeding prebuilt templates into Firestore:", e);
  }
}

// Save Template to both Firestore and LocalStorage
export function saveCustomTemplate(
  template: Omit<EmailTemplate, "id"> & { id?: string }
): EmailTemplate {
  const templateId = template.id || `custom-${Date.now()}`;
  const newTemplate: EmailTemplate = {
    ...template,
    id: templateId,
  };

  // 1. Update local storage
  const current = getAllTemplates();
  const existingIdx = current.findIndex((t) => t.id === templateId);
  if (existingIdx >= 0) {
    current[existingIdx] = newTemplate;
  } else {
    current.unshift(newTemplate);
  }
  saveLocalTemplates(current);

  // 2. Sync to Firestore Real-Time DB
  if (typeof window !== "undefined") {
    try {
      const docRef = doc(db, TEMPLATES_COLLECTION, templateId);
      setDoc(docRef, newTemplate, { merge: true }).catch((err) =>
        console.warn("Firestore save template warning:", err)
      );
    } catch (e) {
      console.warn("Firestore save template error:", e);
    }
  }

  return newTemplate;
}

// Delete Template from both Firestore and LocalStorage
export function deleteTemplate(templateId: string): void {
  // 1. Local storage update
  const current = getAllTemplates();
  const filtered = current.filter((t) => t.id !== templateId);
  saveLocalTemplates(filtered);

  const deletedIds = getDeletedTemplateIds();
  if (!deletedIds.includes(templateId)) {
    deletedIds.push(templateId);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(DELETED_TEMPLATES_KEY, JSON.stringify(deletedIds));
      } catch (e) {}
    }
  }

  // 2. Firestore deletion and deleted template tracker
  if (typeof window !== "undefined") {
    try {
      const docRef = doc(db, TEMPLATES_COLLECTION, templateId);
      deleteDoc(docRef).catch((err) =>
        console.warn("Firestore delete template warning:", err)
      );

      const delRef = doc(db, DELETED_TEMPLATES_COLLECTION, templateId);
      setDoc(delRef, { id: templateId, deletedAt: new Date().toISOString() }).catch((err) =>
        console.warn("Firestore save deleted template warning:", err)
      );
    } catch (e) {
      console.warn("Firestore delete template error:", e);
    }
  }
}

export function deleteCustomTemplate(templateId: string): void {
  deleteTemplate(templateId);
}

// --- CAMPAIGN STORAGE & FIREBASE HELPERS ---

export function getStoredCampaigns(): EmailCampaign[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading stored campaigns", e);
  }
  return [];
}

export function saveLocalCampaigns(campaigns: EmailCampaign[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(campaigns));
  } catch (e) {
    console.warn("Failed to save campaigns locally", e);
  }
}

export function saveCampaignRecord(
  campaignData: Omit<EmailCampaign, "id" | "createdAt" | "createdAtMs"> & {
    id?: string;
    createdAt?: string;
    createdAtMs?: number;
  }
): EmailCampaign {
  const now = Date.now();
  const id = campaignData.id || `campaign-${now}-${Math.random().toString(36).substring(2, 7)}`;
  const createdAtMs = campaignData.createdAtMs || now;
  const createdAt =
    campaignData.createdAt ||
    new Date(createdAtMs).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });

  const campaignRecord: EmailCampaign = {
    ...campaignData,
    id,
    createdAt,
    createdAtMs,
  };

  // 1. Update Local Storage
  const current = getStoredCampaigns();
  const filtered = current.filter((c) => c.id !== id);
  const updated = [campaignRecord, ...filtered].slice(0, 100);
  saveLocalCampaigns(updated);

  // 2. Sync to Firestore
  if (typeof window !== "undefined") {
    try {
      const docRef = doc(db, CAMPAIGNS_COLLECTION, id);
      setDoc(docRef, campaignRecord, { merge: true }).catch((err) =>
        console.warn("Firestore save campaign warning:", err)
      );
    } catch (e) {
      console.warn("Firestore save campaign error:", e);
    }
  }

  return campaignRecord;
}

export function deleteCampaignRecord(campaignId: string): void {
  // Local storage update
  const current = getStoredCampaigns();
  const filtered = current.filter((c) => c.id !== campaignId);
  saveLocalCampaigns(filtered);

  // Firestore deletion
  if (typeof window !== "undefined") {
    try {
      const docRef = doc(db, CAMPAIGNS_COLLECTION, campaignId);
      deleteDoc(docRef).catch((err) =>
        console.warn("Firestore delete campaign warning:", err)
      );
    } catch (e) {
      console.warn("Firestore delete campaign error:", e);
    }
  }
}

export async function clearAllCampaigns(): Promise<void> {
  saveLocalCampaigns([]);
  if (typeof window !== "undefined") {
    try {
      const ref = collection(db, CAMPAIGNS_COLLECTION);
      const snap = await getDocs(ref);
      for (const d of snap.docs) {
        await deleteDoc(doc(db, CAMPAIGNS_COLLECTION, d.id)).catch(() => {});
      }
    } catch (e) {
      console.warn("Error clearing campaigns in Firestore", e);
    }
  }
}

// --- REAL-TIME FIRESTORE SUBSCRIPTIONS ---

// Real-Time Listener for Global Email Templates
export function subscribeToTemplates(
  onData: (templates: EmailTemplate[], isFirebaseSyncing: boolean) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let unsubscribed = false;

  try {
    const templatesRef = collection(db, TEMPLATES_COLLECTION);
    const deletedRef = collection(db, DELETED_TEMPLATES_COLLECTION);

    let latestFirestoreTemplates: EmailTemplate[] = [];
    let latestDeletedIds: string[] = getDeletedTemplateIds();

    const combineAndNotify = (isSyncing: boolean) => {
      const prebuiltMissing = PREBUILT_TEMPLATES.filter(
        (pt) =>
          !latestFirestoreTemplates.some((ft) => ft.id === pt.id) &&
          !latestDeletedIds.includes(pt.id)
      );
      const combined = [
        ...latestFirestoreTemplates.filter((t) => !latestDeletedIds.includes(t.id)),
        ...prebuiltMissing,
      ];
      saveLocalTemplates(combined);
      onData(combined, isSyncing);
    };

    // 1. Listen to deleted templates tracker from Firestore
    const unsubDeleted = onSnapshot(
      deletedRef,
      (snap) => {
        if (unsubscribed) return;
        latestDeletedIds = snap.docs.map((d) => d.id);
        saveDeletedTemplateIds(latestDeletedIds);
        combineAndNotify(true);
      },
      (error) => {
        console.warn("Firestore deleted templates listener fallback:", error);
      }
    );

    // 2. Listen to active templates from Firestore
    const unsubTemplates = onSnapshot(
      templatesRef,
      (snapshot) => {
        if (unsubscribed) return;
        if (snapshot.empty) {
          seedPrebuiltTemplates();
          latestFirestoreTemplates = getAllTemplates();
        } else {
          latestFirestoreTemplates = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<EmailTemplate, "id">),
          }));
        }
        combineAndNotify(true);
      },
      (error) => {
        console.warn("Firestore templates subscription fallback to local:", error);
        if (!unsubscribed) {
          onData(getAllTemplates(), false);
        }
      }
    );

    return () => {
      unsubscribed = true;
      unsubDeleted();
      unsubTemplates();
    };
  } catch (error) {
    console.warn("Failed to initialize templates Firestore listener:", error);
    onData(getAllTemplates(), false);
    return () => {};
  }
}

// Real-Time Listener for Global SMTP Config
export function subscribeToSMTPConfig(
  onData: (config: SMTPConfig, isFirebaseSyncing: boolean) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let unsubscribed = false;

  try {
    const docRef = doc(db, SMTP_COLLECTION, "default");
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (unsubscribed) return;
        if (snap.exists()) {
          const data = snap.data() as SMTPConfig;
          saveLocalSMTPConfig(data);
          onData(data, true);
        } else {
          onData(getStoredSMTPConfig(), true);
        }
      },
      (error) => {
        console.warn("Firestore SMTP listener fallback to local:", error);
        if (!unsubscribed) {
          onData(getStoredSMTPConfig(), false);
        }
      }
    );

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  } catch (error) {
    onData(getStoredSMTPConfig(), false);
    return () => {};
  }
}

// Real-Time Listener for Global Email Campaigns
export function subscribeToCampaigns(
  onData: (campaigns: EmailCampaign[], isFirebaseSyncing: boolean) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let unsubscribed = false;

  try {
    const ref = collection(db, CAMPAIGNS_COLLECTION);
    const q = query(ref, orderBy("createdAtMs", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (unsubscribed) return;
        const firestoreCampaigns: EmailCampaign[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<EmailCampaign, "id">),
        }));
        saveLocalCampaigns(firestoreCampaigns);
        onData(firestoreCampaigns, true);
      },
      (error) => {
        console.warn("Firestore campaigns listener fallback to local:", error);
        if (!unsubscribed) {
          onData(getStoredCampaigns(), false);
        }
      }
    );

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  } catch (error) {
    onData(getStoredCampaigns(), false);
    return () => {};
  }
}

// Real-Time Listener for Global Email Dispatch Logs
export function subscribeToEmailLogs(
  onData: (logs: EmailLogEntry[], isFirebaseSyncing: boolean) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let unsubscribed = false;

  try {
    const ref = collection(db, LOGS_COLLECTION);
    const q = query(ref, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (unsubscribed) return;
        const firestoreLogs: EmailLogEntry[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<EmailLogEntry, "id">),
        }));
        saveLocalLogs(firestoreLogs);
        onData(firestoreLogs, true);
      },
      (error) => {
        console.warn("Firestore logs listener fallback to local:", error);
        if (!unsubscribed) {
          onData(getEmailLogs(), false);
        }
      }
    );

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  } catch (error) {
    onData(getEmailLogs(), false);
    return () => {};
  }
}

// --- LOGS HELPERS ---

export function getEmailLogs(): EmailLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EMAIL_LOGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading email logs", e);
  }
  return [];
}

export function saveLocalLogs(logs: EmailLogEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EMAIL_LOGS_KEY, JSON.stringify(logs));
  } catch (e) {
    console.warn("Error saving logs locally", e);
  }
}

export function addEmailLogs(
  entries: Omit<EmailLogEntry, "id" | "timestamp">[]
): void {
  const now = Date.now();
  const formattedTime = new Date(now).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "medium",
  });

  const newEntries: EmailLogEntry[] = entries.map((entry) => ({
    ...entry,
    id: `log-${now}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: formattedTime,
    createdAt: now,
  }));

  // 1. Update local storage
  const current = getEmailLogs();
  const updated = [...newEntries, ...current].slice(0, 200);
  saveLocalLogs(updated);

  // 2. Sync each log entry to Firestore
  if (typeof window !== "undefined") {
    for (const item of newEntries) {
      try {
        const docRef = doc(db, LOGS_COLLECTION, item.id);
        setDoc(docRef, item).catch((err) =>
          console.warn("Firestore log write warning:", err)
        );
      } catch (e) {}
    }
  }
}

export async function clearEmailLogs(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(EMAIL_LOGS_KEY);
  } catch (e) {}

  try {
    const ref = collection(db, LOGS_COLLECTION);
    const snap = await getDocs(ref);
    for (const d of snap.docs) {
      await deleteDoc(doc(db, LOGS_COLLECTION, d.id)).catch(() => {});
    }
  } catch (e) {
    console.warn("Error clearing email logs from Firestore:", e);
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

