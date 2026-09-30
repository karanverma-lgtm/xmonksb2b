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
import { PREBUILT_TEMPLATES, EmailTemplate, EmailAttachment, AMIT_ENTERPRISE_EMAIL_BANK } from "@/constants/emailTemplates";
import { UserAccount, getUserProfile } from "@/constants/users";

export interface SMTPConfig {
  id?: string;
  userEmail: string;
  appPassword: string;
  host: string;
  port: number;
  secure: boolean;
  senderName: string;
}

export interface SMTPSenderProfile {
  id: string;
  userEmail: string;
  appPassword: string;
  senderName: string;
  host: string;
  port: number;
  secure: boolean;
  isDefault: boolean;
  isVerified?: boolean;
  lastVerifiedAt?: string;
  createdAt?: string;
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
  cc?: string | string[];
  bcc?: string | string[];
  senderUser?: UserAccount | string | null;
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
  attachments?: EmailAttachment[];
}

const TEMPLATES_COLLECTION = "b2b_email_templates";
const SMTP_COLLECTION = "b2b_smtp_config";
const SENDERS_COLLECTION = "b2b_smtp_senders";
const LOGS_COLLECTION = "b2b_email_logs";
const CAMPAIGNS_COLLECTION = "b2b_email_campaigns";
const DELETED_TEMPLATES_COLLECTION = "b2b_deleted_templates";

const SMTP_STORAGE_KEY = "xmonks_b2b_smtp_config";
const SENDERS_STORAGE_KEY = "xmonks_b2b_smtp_senders";
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

// --- MULTI-SENDER (CAPSULE MODE) PROFILE HELPERS ---

export function getDefaultSenderProfiles(): SMTPSenderProfile[] {
  return [
    {
      id: "sender-ruby-default",
      userEmail: "ruby.dayal@xmonks.com",
      appPassword: "ombg ustr bodg bxnp",
      senderName: "Ruby Dayal",
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      isDefault: true,
      isVerified: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "sender-amit-default",
      userEmail: "amit@xmonks.com",
      appPassword: "ombg ustr bodg bxnp",
      senderName: "Amit",
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      isDefault: false,
      isVerified: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ];
}

export function getDefaultSenderProfile(): SMTPSenderProfile {
  const current = getStoredSMTPConfig();
  const defaults = getDefaultSenderProfiles();
  return {
    id: "sender-ruby-default",
    userEmail: current.userEmail || defaults[0].userEmail,
    appPassword: current.appPassword || defaults[0].appPassword,
    senderName: current.senderName || defaults[0].senderName,
    host: current.host || "smtp.gmail.com",
    port: current.port || 587,
    secure: current.secure !== undefined ? current.secure : false,
    isDefault: true,
    isVerified: true,
    createdAt: new Date().toISOString(),
  };
}

export function getSenderProfileForUser(
  senders: SMTPSenderProfile[],
  currentUser?: { username?: string; name?: string } | null
): SMTPSenderProfile {
  const defaults = getDefaultSenderProfiles();
  const pool = senders && senders.length > 0 ? senders : defaults;

  if (!currentUser?.username) {
    return pool.find((s) => s.isDefault) || pool[0] || defaults[0];
  }

  const uName = currentUser.username.trim().toLowerCase();

  // 1. Allocate Amit to Amit
  if (uName === "amit") {
    const amitProfile = pool.find(
      (s) =>
        s.userEmail.toLowerCase().includes("amit@") ||
        s.senderName.toLowerCase().includes("amit") ||
        s.id.toLowerCase().includes("amit")
    );
    return amitProfile || defaults[1];
  }

  // 2. Allocate Ruby to Ruby
  if (uName === "ruby") {
    const rubyProfile = pool.find(
      (s) =>
        s.userEmail.toLowerCase().includes("ruby") ||
        s.senderName.toLowerCase().includes("ruby") ||
        s.id.toLowerCase().includes("ruby")
    );
    return rubyProfile || defaults[0];
  }

  // 3. Match any other user account by email or name
  const matched = pool.find(
    (s) =>
      s.userEmail.toLowerCase().includes(uName) ||
      s.senderName.toLowerCase().includes(uName)
  );
  if (matched) return matched;

  // 4. Return profile dynamically customized with currentUser's name & email
  const baseDefault = pool.find((s) => s.isDefault) || pool[0] || defaults[0];
  const userProf = getUserProfile(currentUser);
  return {
    ...baseDefault,
    senderName: userProf.name,
    userEmail: userProf.email || baseDefault.userEmail,
  };
}

export function getAllSenderProfiles(): SMTPSenderProfile[] {
  const defaults = getDefaultSenderProfiles();
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(SENDERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const list: SMTPSenderProfile[] = [...parsed];
        for (const def of defaults) {
          const exists = list.some(
            (s) =>
              s.id === def.id ||
              s.userEmail.toLowerCase() === def.userEmail.toLowerCase()
          );
          if (!exists) {
            list.push(def);
          }
        }
        return list;
      }
    }
  } catch (e) {
    console.warn("Error reading sender profiles from localStorage", e);
  }

  saveLocalSenderProfiles(defaults);
  return defaults;
}

export function saveLocalSenderProfiles(senders: SMTPSenderProfile[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SENDERS_STORAGE_KEY, JSON.stringify(senders));
  } catch (e) {
    console.warn("Failed to save senders to localStorage", e);
  }
}

export function saveSenderProfile(
  profileData: Omit<SMTPSenderProfile, "id"> & { id?: string }
): SMTPSenderProfile {
  const id = profileData.id || `sender-${Date.now()}`;
  const isDefault = Boolean(profileData.isDefault);

  const newProfile: SMTPSenderProfile = {
    ...profileData,
    id,
    isDefault,
    createdAt: profileData.createdAt || new Date().toISOString(),
  };

  const current = getAllSenderProfiles();
  const existingIdx = current.findIndex((s) => s.id === id);

  let updatedList: SMTPSenderProfile[] = [];

  if (existingIdx >= 0) {
    current[existingIdx] = newProfile;
    updatedList = [...current];
  } else {
    updatedList = [newProfile, ...current];
  }

  // If this profile is set as default (or if it's the only one), ensure others are not default
  if (isDefault || updatedList.length === 1) {
    updatedList = updatedList.map((s) => ({
      ...s,
      isDefault: s.id === id,
    }));
    // Sync to active SMTPConfig
    saveSMTPConfig({
      id: newProfile.id,
      userEmail: newProfile.userEmail,
      appPassword: newProfile.appPassword,
      senderName: newProfile.senderName,
      host: newProfile.host,
      port: newProfile.port,
      secure: newProfile.secure,
    });
  }

  saveLocalSenderProfiles(updatedList);

  // Sync to Firestore
  if (typeof window !== "undefined") {
    try {
      const docRef = doc(db, SENDERS_COLLECTION, id);
      setDoc(docRef, newProfile, { merge: true }).catch((err) =>
        console.warn("Firestore save sender warning:", err)
      );
    } catch (e) {
      console.warn("Firestore save sender error:", e);
    }
  }

  return newProfile;
}

export function setActiveSender(senderId: string): SMTPSenderProfile | null {
  const current = getAllSenderProfiles();
  const target = current.find((s) => s.id === senderId);
  if (!target) return null;

  const updatedList = current.map((s) => ({
    ...s,
    isDefault: s.id === senderId,
  }));

  saveLocalSenderProfiles(updatedList);

  // Sync to active SMTPConfig
  saveSMTPConfig({
    id: target.id,
    userEmail: target.userEmail,
    appPassword: target.appPassword,
    senderName: target.senderName,
    host: target.host,
    port: target.port,
    secure: target.secure,
  });

  // Sync isDefault flag to Firestore for all senders
  if (typeof window !== "undefined") {
    try {
      updatedList.forEach((s) => {
        const docRef = doc(db, SENDERS_COLLECTION, s.id);
        setDoc(docRef, { isDefault: s.id === senderId }, { merge: true }).catch(() => {});
      });
    } catch {}
  }

  return target;
}

export function deleteSenderProfile(senderId: string): void {
  const current = getAllSenderProfiles();
  if (current.length <= 1) {
    console.warn("Cannot delete the only sender profile.");
    return;
  }

  const filtered = current.filter((s) => s.id !== senderId);
  const deletedWasDefault = current.find((s) => s.id === senderId)?.isDefault;

  if (deletedWasDefault && filtered.length > 0) {
    filtered[0].isDefault = true;
    saveSMTPConfig({
      id: filtered[0].id,
      userEmail: filtered[0].userEmail,
      appPassword: filtered[0].appPassword,
      senderName: filtered[0].senderName,
      host: filtered[0].host,
      port: filtered[0].port,
      secure: filtered[0].secure,
    });
  }

  saveLocalSenderProfiles(filtered);

  if (typeof window !== "undefined") {
    try {
      const docRef = doc(db, SENDERS_COLLECTION, senderId);
      deleteDoc(docRef).catch((err) => console.warn("Firestore delete sender warning:", err));
    } catch (e) {
      console.warn("Firestore delete sender error:", e);
    }
  }
}

export function subscribeToSenderProfiles(
  onData: (senders: SMTPSenderProfile[], isFirebaseSyncing: boolean) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let unsubscribed = false;

  try {
    const ref = collection(db, SENDERS_COLLECTION);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (unsubscribed) return;
        if (!snapshot.empty) {
          const firestoreSenders: SMTPSenderProfile[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<SMTPSenderProfile, "id">),
          }));

          // Ensure default profiles (Ruby & Amit) are always available
          const defaults = getDefaultSenderProfiles();
          for (const def of defaults) {
            if (
              !firestoreSenders.some(
                (s) =>
                  s.id === def.id ||
                  s.userEmail.toLowerCase() === def.userEmail.toLowerCase()
              )
            ) {
              firestoreSenders.push(def);
            }
          }

          // Sort by default first, then created
          firestoreSenders.sort((a, b) => (b.isDefault ? -1 : 1));
          saveLocalSenderProfiles(firestoreSenders);

          const defaultSender = firestoreSenders.find((s) => s.isDefault);
          if (defaultSender) {
            saveLocalSMTPConfig({
              id: defaultSender.id,
              userEmail: defaultSender.userEmail,
              appPassword: defaultSender.appPassword,
              senderName: defaultSender.senderName,
              host: defaultSender.host,
              port: defaultSender.port,
              secure: defaultSender.secure,
            });
          }

          onData(firestoreSenders, true);
        } else {
          // If Firestore collection empty, seed with local senders
          const locals = getAllSenderProfiles();
          locals.forEach((s) => {
            const docRef = doc(db, SENDERS_COLLECTION, s.id);
            setDoc(docRef, s, { merge: true }).catch(() => {});
          });
          onData(locals, true);
        }
      },
      (error) => {
        console.warn("Firestore senders listener fallback to local:", error);
        if (!unsubscribed) {
          onData(getAllSenderProfiles(), false);
        }
      }
    );

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  } catch {
    onData(getAllSenderProfiles(), false);
    return () => {};
  }
}


const RETIRED_TEMPLATE_IDS = ["amit-talent-email-10"];

export function stripBadgesFromEmailHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<td[^>]*text-align:\s*right[^>]*>[\s\S]*?<\/td>/gi, "")
    .replace(/<span[^>]*>[^<]*(?:CHRO|HR HEAD|L&D|TALENT|SUCCESSION|HRBP|DEI|WOMEN LEADERSHIP|BUSINESS HEAD|CEO|CLOSING)[^<]*<\/span>/gi, "")
    .replace(/<div[^>]*>Sequence Step:[^<]*<\/div>/gi, "");
}

export function getAllTemplates(): EmailTemplate[] {
  const allDefaults = [...PREBUILT_TEMPLATES, ...AMIT_ENTERPRISE_EMAIL_BANK].map((t) => ({
    ...t,
    htmlContent: stripBadgesFromEmailHtml(t.htmlContent),
  }));
  if (typeof window === "undefined") return allDefaults.filter((t) => !RETIRED_TEMPLATE_IDS.includes(t.id));
  try {
    const deletedIds = getDeletedTemplateIds();
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    let combined = [...allDefaults];
    if (raw) {
      const custom: EmailTemplate[] = JSON.parse(raw);
      // Merge unique templates by ID
      const customUnique = custom.filter(
        (c) => !combined.some((t) => t.id === c.id)
      );
      combined = [...customUnique, ...combined];
    }
    return combined
      .filter((t) => !deletedIds.includes(t.id) && !RETIRED_TEMPLATE_IDS.includes(t.id))
      .map((t) => ({ ...t, htmlContent: stripBadgesFromEmailHtml(t.htmlContent) }));
  } catch (e) {
    console.warn("Error reading local templates", e);
  }
  return allDefaults.filter((t) => !RETIRED_TEMPLATE_IDS.includes(t.id));
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
    const allDefaults = [...PREBUILT_TEMPLATES, ...AMIT_ENTERPRISE_EMAIL_BANK];
    for (const tpl of allDefaults) {
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
      } catch {}
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
      const allDefaults = [...PREBUILT_TEMPLATES, ...AMIT_ENTERPRISE_EMAIL_BANK];
      const isExcluded = (id: string) => latestDeletedIds.includes(id) || RETIRED_TEMPLATE_IDS.includes(id);
      const prebuiltMissing = allDefaults.filter(
        (pt) =>
          !latestFirestoreTemplates.some((ft) => ft.id === pt.id) &&
          !isExcluded(pt.id)
      );
      const combined = [
        ...latestFirestoreTemplates.filter((t) => !isExcluded(t.id)),
        ...prebuiltMissing,
      ].map((t) => ({
        ...t,
        htmlContent: stripBadgesFromEmailHtml(t.htmlContent),
      }));
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
  } catch {
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
  } catch {
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
  } catch {
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
      } catch {}
    }
  }
}

export async function clearEmailLogs(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(EMAIL_LOGS_KEY);
  } catch {}

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
    cc?: string | string[];
    bcc?: string | string[];
    senderUser?: UserAccount | string | null;
  }>;
  subject: string;
  htmlContent: string;
  smtpConfig?: SMTPConfig;
  attachments?: EmailAttachment[];
  cc?: string | string[];
  bcc?: string | string[];
  senderUser?: UserAccount | string | null;
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
      attachments: payload.attachments,
      cc: payload.cc,
      bcc: payload.bcc,
      senderUser: payload.senderUser,
    }),
  });

  const data = await response.json();

  if (data.results && Array.isArray(data.results)) {
    const logsToSave = data.results.map((r: { recipient: string; success: boolean; error?: string; messageId?: string }) => ({
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

// Upload Email Template or Campaign Attachment
// Uses Direct-to-R2 Presigned Upload (bypasses Vercel 4.5MB / server payload limits, supports up to 25MB)
export async function uploadEmailAttachment(file: File): Promise<EmailAttachment> {
  if (!file) {
    throw new Error("No file selected.");
  }

  // Strategy 1: Direct-to-R2 Presigned Upload (Bypasses server payload limits like Vercel 4.5MB)
  try {
    const presignRes = await fetch("/api/email/attachments/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileSizeBytes: file.size,
        fileType: file.type || "application/octet-stream",
      }),
    });

    if (presignRes.ok) {
      const presignText = await presignRes.text();
      let presignData: any = null;
      try {
        presignData = JSON.parse(presignText);
      } catch {
        console.warn("Presign response was not JSON:", presignText.slice(0, 100));
      }

      if (presignData && presignData.uploadUrl) {
        // Direct PUT from browser to Cloudflare R2
        const r2Res = await fetch(presignData.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        });

        if (r2Res.ok) {
          return presignData.attachment as EmailAttachment;
        }

        console.warn("Direct R2 upload failed with HTTP status:", r2Res.status, "trying server upload fallback");
      }
    }
  } catch (presignErr) {
    console.warn("Presigned direct upload error, attempting server fallback:", presignErr);
  }

  // Strategy 2: Server Upload Route fallback (with safe text & 413 error parsing)
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/email/attachments/upload", {
    method: "POST",
    body: formData,
  });

  const responseText = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(responseText);
  } catch {
    if (res.status === 413 || responseText.includes("Request Entity Too Large") || responseText.includes("Payload Too Large")) {
      throw new Error(`"${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds serverless payload limits. Please use direct Cloudflare R2 or a file under 25MB.`);
    }
    throw new Error(`Upload failed (${res.status}): ${responseText.slice(0, 100) || "Server error"}`);
  }

  if (!res.ok || !data.success) {
    throw new Error(data?.error || "Failed to upload file attachment.");
  }

  return data.attachment as EmailAttachment;
}

export interface PersonalizeEmailOptions {
  recipientName?: string;
  companyName?: string;
  designation?: string;
  industry?: string;
  dealValue?: string | number;
  currentUser?: UserAccount | string | null;
  senderProfile?: SMTPSenderProfile | null;
}

export function personalizeEmailTemplate(
  content: string,
  options: PersonalizeEmailOptions
): string {
  if (!content) return "";

  const repName = options.recipientName || "Valued Executive";
  const compName = options.companyName || "your organization";
  const desig = options.designation || "Valued Executive";
  const ind = options.industry || "B2B Industry";
  const dealVal = options.dealValue ? String(options.dealValue) : "";

  // Resolve sender details dynamically based on logged in user or sender profile
  const userProfile = getUserProfile(
    options.currentUser || options.senderProfile?.senderName || null
  );
  const senderName = options.senderProfile?.senderName || userProfile.name || "xMonks Team";
  const senderEmail = options.senderProfile?.userEmail || userProfile.email || "sales@xmonks.com";
  const senderDesignation = userProfile.designation || userProfile.role || "Enterprise Solutions";
  const senderPhone = userProfile.phone || "";
  const cleanPhone = senderPhone.replace(/[^0-9+]/g, "");

  let result = content
    // Recipient dynamic tags
    .replace(/\{\{\s*contactName\s*\}\}|\[\s*First Name\s*\]/gi, repName)
    .replace(/\{\{\s*name\s*\}\}/gi, repName)
    .replace(/\{\{\s*companyName\s*\}\}|\[\s*Company Name\s*\]/gi, compName)
    .replace(/\{\{\s*designation\s*\}\}/gi, desig)
    .replace(/\{\{\s*industry\s*\}\}/gi, ind)
    .replace(/\{\{\s*dealValue\s*\}\}/gi, dealVal)
    // Sender dynamic tags
    .replace(/\{\{\s*senderName\s*\}\}/gi, senderName)
    .replace(/\{\{\s*senderEmail\s*\}\}/gi, senderEmail)
    .replace(/\{\{\s*senderRole\s*\}\}/gi, senderDesignation)
    .replace(/\{\{\s*senderDesignation\s*\}\}/gi, senderDesignation)
    .replace(/\{\{\s*senderPhone\s*\}\}/gi, senderPhone);

  const isAmit = senderName.toLowerCase().includes("amit");

  if (!isAmit) {
    // Dynamically replace Amit Shelly references with logged-in user
    result = result
      .replace(/Amit Shelly/g, senderName)
      .replace(/amit@xmonks\.com/gi, senderEmail)
      .replace(/Senior Business Lead – Enterprise/g, senderDesignation)
      .replace(/Senior Business Lead Enterprise/g, senderDesignation);

    // Handle phone number dynamically (show only if available)
    if (senderPhone && cleanPhone) {
      result = result
        .replace(/tel:\+919711266420/g, `tel:${cleanPhone}`)
        .replace(/\+91 9711266420/g, senderPhone)
        .replace(/919711266420/g, cleanPhone.replace(/^\+/, ""));
    } else {
      // Cleanly remove phone link if phone is empty
      result = result
        .replace(/<a[^>]*href=["']tel:[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, "")
        .replace(/📞\s*\+91\s*9711266420/g, "");
    }

    // If no phone, smoothly adjust WhatsApp consultation block to direct email consultation
    if (!senderPhone) {
      result = result
        .replace(
          /https:\/\/wa\.me\/[^\s"']+/g,
          `mailto:${senderEmail}?subject=${encodeURIComponent(`Strategic Discussion for ${compName}`)}`
        )
        .replace(
          /Connects directly to [^•<]+ on WhatsApp • Quick 20-min slot/g,
          `Connect directly with ${senderName} • Schedule 20-min slot`
        )
        .replace(/💬 Book 20-Min Consultation Call/g, `✉️ Schedule 20-Min Consultation`);
    }

    // Replace Amit's signature block and contact table with dynamic executive warm sign-off card
    const dynamicSignOffHtml = `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin-top: 16px;">
        <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569; font-weight: 500;">Warm regards,</p>
        <p style="margin: 0; font-size: 17px; font-weight: 800; color: #233F4D;">${senderName}</p>
        <p style="margin: 3px 0 12px 0; font-size: 13px; font-weight: 600; color: #F15A24;">${senderDesignation} • xMonks</p>
        <table style="font-size: 12.5px; color: #475569; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: middle;">
              <a href="mailto:${senderEmail}" style="color: #233F4D; text-decoration: none; font-weight: 700;">✉️ ${senderEmail}</a>
            </td>
            ${
              senderPhone
                ? `<td style="vertical-align: middle; padding-left: 18px;"><a href="tel:${cleanPhone}" style="color: #F15A24; text-decoration: none; font-weight: 700;">📞 ${senderPhone}</a></td>`
                : ""
            }
          </tr>
        </table>
      </div>`;

    // 1. Try replacing full signature container (image + contact table)
    result = result.replace(
      /<div style="border-top:\s*1px solid #e2e8f0;\s*padding-top:\s*20px;">[\s\S]*?(?:amit-signature|\/signature-amit)[\s\S]*?<\/table>\s*<\/div>/gi,
      `<div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">${dynamicSignOffHtml}</div>`
    );

    // 2. Fallback image replacements if structure differs
    result = result.replace(
      /<a[^>]*href=["'][^"']*["'][^>]*>\s*<img[^>]*src=["'][^"']*(?:amit-signature|\/signature-amit)[^"']*["'][^>]*>\s*<\/a>/gi,
      dynamicSignOffHtml
    );
    result = result.replace(
      /<img[^>]*src=["'][^"']*(?:amit-signature|\/signature-amit)[^"']*["'][^>]*>/gi,
      dynamicSignOffHtml
    );

    // 3. Replace generic system team signatures in prebuilt templates
    result = result
      .replace(
        /<strong>Sales Director,\s*xMonks B2B Team<\/strong>/gi,
        `<strong>${senderName}</strong><br/><span style="color: #64748b; font-size: 13px;">${senderDesignation} • xMonks</span>`
      )
      .replace(
        /<p>Best regards,<br\/>\s*xMonks Sales Team<\/p>/gi,
        `<p style="margin: 0 0 4px 0;">Warm regards,</p><p style="margin: 0; font-weight: 700; color: #233F4D;">${senderName}</p><p style="margin: 2px 0 0 0; font-size: 13px; color: #F15A24; font-weight: 600;">${senderDesignation} • xMonks</p>`
      );
  } else {
    result = result
      .replace(/\{\{\s*senderName\s*\}\}/gi, "Amit Shelly")
      .replace(/\{\{\s*senderEmail\s*\}\}/gi, "amit@xmonks.com")
      .replace(/\{\{\s*senderRole\s*\}\}/gi, "Senior Business Lead – Enterprise")
      .replace(/\{\{\s*senderPhone\s*\}\}/gi, "+91 9711266420");
  }

  // Also replace any legacy "Ruby Dayal" sign-off if another user is sending
  if (!senderName.toLowerCase().includes("ruby")) {
    result = result.replace(/Ruby Dayal/g, senderName);
  }

  return result;
}


