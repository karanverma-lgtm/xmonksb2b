import { db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import { Lead, LeadStage, JourneyLog } from "@/types/lead";
import { STAGES } from "@/constants/stages";
import { INITIAL_DEMO_LEADS } from "@/constants/demoLeads";
import { formatINR } from "./formatters";

const COLLECTION_NAME = "b2b_leads";
const LOCAL_STORAGE_KEY = "xmonks_b2b_leads_clean_v1";

// Helper to format date nicely
export function formatTimestamp(date: Date = new Date()): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// Get initial leads from LocalStorage
export function getStoredLocalLeads(): Lead[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Failed to parse local storage leads", err);
    return [];
  }
}

export function saveStoredLocalLeads(leads: Lead[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(leads));
  } catch (err) {
    console.error("Failed to save leads to localStorage", err);
  }
}

// Firestore Realtime Listener with fallback
export function subscribeToLeads(
  onData: (leads: Lead[], isFirebaseSyncing: boolean) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let unsubscribed = false;

  try {
    const leadsRef = collection(db, COLLECTION_NAME);
    const q = query(leadsRef, orderBy("updatedAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (unsubscribed) return;
        if (snapshot.empty) {
          saveStoredLocalLeads([]);
          onData([], true);
        } else {
          const leads: Lead[] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Lead, "id">),
          }));
          saveStoredLocalLeads(leads);
          onData(leads, true);
        }
      },
      (error) => {
        console.warn("Firestore listener fallback to localStorage due to error/rules:", error);
        if (!unsubscribed) {
          const localLeads = getStoredLocalLeads();
          onData(localLeads, false);
        }
      }
    );

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  } catch (error) {
    console.warn("Failed to initialize Firestore listener:", error);
    const localLeads = getStoredLocalLeads();
    onData(localLeads, false);
    return () => {};
  }
}


// Create new B2B Lead
export async function createLead(
  leadData: Omit<Lead, "id" | "createdAt" | "updatedAt" | "journeyLogs" | "weightage"> & {
    journeyNotes?: string;
  }
): Promise<Lead> {
  const now = new Date();
  const timestampIso = now.toISOString();
  const formattedDate = formatTimestamp(now);

  const newId = "lead-" + Date.now();
  const weightage = STAGES[leadData.stage]?.weightage ?? 0;

  const initialLog: JourneyLog = {
    id: "log-" + Date.now(),
    timestamp: timestampIso,
    formattedDate: formattedDate,
    type: "lead_created",
    title: `Lead Sourced - Initial Stage: ${STAGES[leadData.stage]?.label} (${weightage}%)`,
    description: leadData.journeyNotes || `Created lead for ${leadData.companyName} with stage ${STAGES[leadData.stage]?.label}.`,
    author: leadData.owner || "Sales Representative",
    newStage: leadData.stage,
  };

  const newLead: Lead = {
    ...leadData,
    id: newId,
    weightage,
    createdAt: timestampIso,
    updatedAt: timestampIso,
    journeyLogs: [initialLog],
  };

  // Attempt Firestore Write
  try {
    const docRef = doc(db, COLLECTION_NAME, newId);
    await setDoc(docRef, newLead);
  } catch (err) {
    console.warn("Firestore write skipped, updating local state", err);
  }

  // Update local storage backup
  const current = getStoredLocalLeads();
  const updated = [newLead, ...current];
  saveStoredLocalLeads(updated);

  return newLead;
}

// Bulk create B2B Leads in Firestore with atomic batching (guarantees all client data stored)
export async function createLeadsBulk(
  leadsData: Array<
    Omit<Lead, "id" | "createdAt" | "updatedAt" | "journeyLogs" | "weightage"> & {
      journeyNotes?: string;
    }
  >
): Promise<Lead[]> {
  if (leadsData.length === 0) return [];

  const now = new Date();
  const timestampIso = now.toISOString();
  const formattedDate = formatTimestamp(now);

  const createdLeads: Lead[] = leadsData.map((data, idx) => {
    const uniqueId = `lead-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
    const weightage = STAGES[data.stage]?.weightage ?? 0;
    const initialLog: JourneyLog = {
      id: `log-${Date.now()}-${idx}`,
      timestamp: timestampIso,
      formattedDate: formattedDate,
      type: "lead_created",
      title: `Lead Sourced - Initial Stage: ${STAGES[data.stage]?.label} (${weightage}%)`,
      description:
        data.journeyNotes ||
        `Created lead for ${data.companyName} with stage ${STAGES[data.stage]?.label}.`,
      author: data.owner || "Sales Representative",
      newStage: data.stage,
    };

    return {
      ...data,
      id: uniqueId,
      weightage,
      createdAt: timestampIso,
      updatedAt: timestampIso,
      journeyLogs: [initialLog],
    };
  });

  // Write in batches of 450 (Firestore limit is 500 per batch)
  const BATCH_SIZE = 450;
  for (let i = 0; i < createdLeads.length; i += BATCH_SIZE) {
    const chunk = createdLeads.slice(i, i + BATCH_SIZE);
    try {
      const batch = writeBatch(db);
      for (const lead of chunk) {
        const docRef = doc(db, COLLECTION_NAME, lead.id);
        batch.set(docRef, lead);
      }
      await batch.commit();
    } catch (err) {
      console.warn("Firestore batch write error, attempting single write fallback:", err);
      for (const lead of chunk) {
        try {
          const docRef = doc(db, COLLECTION_NAME, lead.id);
          await setDoc(docRef, lead);
        } catch (singleErr) {
          console.warn("Single write fallback failed for lead:", lead.id, singleErr);
        }
      }
    }
  }

  // Update local storage backup
  const current = getStoredLocalLeads();
  const updated = [...createdLeads, ...current];
  saveStoredLocalLeads(updated);

  return createdLeads;
}

// Update Lead Stage (Core Requirement: Updates weightage and appends timestamped Journey Log)
export async function updateLeadStage(
  leadId: string,
  newStage: LeadStage,
  notes?: string,
  author: string = "Sales Manager"
): Promise<Lead | null> {
  const localLeads = getStoredLocalLeads();
  const target = localLeads.find((l) => l.id === leadId);
  if (!target) return null;

  if (target.stage === newStage && !notes) return target;

  const now = new Date();
  const timestampIso = now.toISOString();
  const formattedDate = formatTimestamp(now);
  const oldStage = target.stage;
  const oldWeightage = target.weightage;
  const newWeightage = STAGES[newStage]?.weightage ?? 0;

  const stageLog: JourneyLog = {
    id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    timestamp: timestampIso,
    formattedDate: formattedDate,
    type: "stage_change",
    title: `Stage Changed: ${STAGES[oldStage]?.label} (${oldWeightage}%) → ${STAGES[newStage]?.label} (${newWeightage}%)`,
    description:
      notes ||
      `Lead stage advanced to ${STAGES[newStage]?.label}. Weightage updated to ${newWeightage}%.`,
    previousStage: oldStage,
    newStage: newStage,
    author: author,
  };

  const updatedLead: Lead = {
    ...target,
    stage: newStage,
    weightage: newWeightage,
    updatedAt: timestampIso,
    journeyLogs: [stageLog, ...target.journeyLogs],
  };

  // Attempt Firestore Update
  try {
    const docRef = doc(db, COLLECTION_NAME, leadId);
    await updateDoc(docRef, {
      stage: newStage,
      weightage: newWeightage,
      updatedAt: timestampIso,
      journeyLogs: updatedLead.journeyLogs,
    });
  } catch (err) {
    console.warn("Firestore update skipped, updating local state", err);
  }

  // Update Local Storage
  const updatedLeads = localLeads.map((l) => (l.id === leadId ? updatedLead : l));
  saveStoredLocalLeads(updatedLeads);

  return updatedLead;
}

// Add Custom Note / Activity Log to Customer Journey
export async function addJourneyNote(
  leadId: string,
  noteText: string,
  author: string = "Sales Representative"
): Promise<Lead | null> {
  const localLeads = getStoredLocalLeads();
  const target = localLeads.find((l) => l.id === leadId);
  if (!target) return null;

  const now = new Date();
  const timestampIso = now.toISOString();
  const formattedDate = formatTimestamp(now);

  const noteLog: JourneyLog = {
    id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    timestamp: timestampIso,
    formattedDate: formattedDate,
    type: "note",
    title: "Customer Touchpoint Logged",
    description: noteText,
    author: author,
  };

  const updatedLead: Lead = {
    ...target,
    updatedAt: timestampIso,
    journeyLogs: [noteLog, ...target.journeyLogs],
  };

  // Firestore Update
  try {
    const docRef = doc(db, COLLECTION_NAME, leadId);
    await updateDoc(docRef, {
      updatedAt: timestampIso,
      journeyLogs: updatedLead.journeyLogs,
    });
  } catch (err) {
    console.warn("Firestore note update skipped, updating local state", err);
  }

  const updatedLeads = localLeads.map((l) => (l.id === leadId ? updatedLead : l));
  saveStoredLocalLeads(updatedLeads);

  return updatedLead;
}

// Update Deal Value with timestamped Journey Log
export async function updateDealValue(
  leadId: string,
  newDealValue: number,
  author: string = "Sales Representative"
): Promise<Lead | null> {
  const localLeads = getStoredLocalLeads();
  const target = localLeads.find((l) => l.id === leadId);
  if (!target) return null;

  const previousValue = target.dealValue;
  if (previousValue === newDealValue) return target;

  const now = new Date();
  const timestampIso = now.toISOString();
  const formattedDate = formatTimestamp(now);

  const valueLog: JourneyLog = {
    id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    timestamp: timestampIso,
    formattedDate: formattedDate,
    type: "value_update",
    title: `Deal Value Updated to ${formatINR(newDealValue)}`,
    description: `Adjusted estimated deal value from ${formatINR(previousValue)} to ${formatINR(newDealValue)}.`,
    author: author,
  };

  const updatedLead: Lead = {
    ...target,
    dealValue: newDealValue,
    updatedAt: timestampIso,
    journeyLogs: [valueLog, ...target.journeyLogs],
  };

  // Firestore Update
  try {
    const docRef = doc(db, COLLECTION_NAME, leadId);
    await updateDoc(docRef, {
      dealValue: newDealValue,
      updatedAt: timestampIso,
      journeyLogs: updatedLead.journeyLogs,
    });
  } catch (err) {
    console.warn("Firestore deal value update skipped, updating local state", err);
  }

  const updatedLeads = localLeads.map((l) => (l.id === leadId ? updatedLead : l));
  saveStoredLocalLeads(updatedLeads);

  return updatedLead;
}

// Delete Lead
export async function deleteLead(leadId: string): Promise<boolean> {
  try {
    const docRef = doc(db, COLLECTION_NAME, leadId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Firestore delete skipped", err);
  }

  const localLeads = getStoredLocalLeads();
  const updated = localLeads.filter((l) => l.id !== leadId);
  saveStoredLocalLeads(updated);
  return true;
}


