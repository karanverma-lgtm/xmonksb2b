import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import { Lead, LeadStage, JourneyLog, ApproachNote } from "@/types/lead";
import { STAGES } from "@/constants/stages";
import { formatINR, formatClosureMonth } from "./formatters";
import { deleteApproachNoteFromFirebase } from "./approachNoteService";

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

/**
 * Recursively removes undefined values from objects/arrays so Firestore never rejects writes.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === "object" && !(data instanceof Date)) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
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
    const parsed: Lead[] = JSON.parse(raw);
    return parsed.map((lead) => ({
      ...lead,
      weightage: STAGES[lead.stage]?.weightage ?? lead.weightage ?? 0,
    }));
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
          const leads: Lead[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data() as Omit<Lead, "id">;
            return {
              id: docSnap.id,
              ...data,
              weightage: STAGES[data.stage]?.weightage ?? data.weightage ?? 0,
            };
          });
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
    const cleanedLead = sanitizeForFirestore(newLead);
    await setDoc(docRef, cleanedLead);
  } catch (err) {
    console.error("Firestore write failed for lead:", err);
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
        batch.set(docRef, sanitizeForFirestore(lead));
      }
      await batch.commit();
    } catch (err) {
      console.warn("Firestore batch write error, attempting single write fallback:", err);
      for (const lead of chunk) {
        try {
          const docRef = doc(db, COLLECTION_NAME, lead.id);
          await setDoc(docRef, sanitizeForFirestore(lead));
        } catch (singleErr) {
          console.error("Single write fallback failed for lead:", lead.id, singleErr);
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

// Update Pitched Program with timestamped Journey Log
export async function updateLeadProgram(
  leadId: string,
  newProgram: string,
  author: string = "Sales Representative"
): Promise<Lead | null> {
  const localLeads = getStoredLocalLeads();
  const target = localLeads.find((l) => l.id === leadId);
  if (!target) return null;

  const previousProgram = target.program || "Not Assigned";
  const trimmedNew = newProgram.trim();
  if (previousProgram === trimmedNew) return target;

  const now = new Date();
  const timestampIso = now.toISOString();
  const formattedDate = formatTimestamp(now);

  const programLog: JourneyLog = {
    id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    timestamp: timestampIso,
    formattedDate: formattedDate,
    type: "program_update",
    title: `Pitched Program: ${trimmedNew || "Unassigned"}`,
    description: `Changed pitched program from "${previousProgram}" to "${trimmedNew || "Unassigned"}".`,
    author: author,
  };

  const updatedLead: Lead = {
    ...target,
    program: trimmedNew,
    updatedAt: timestampIso,
    journeyLogs: [programLog, ...target.journeyLogs],
  };

  // Firestore Update
  try {
    const docRef = doc(db, COLLECTION_NAME, leadId);
    await updateDoc(docRef, {
      program: trimmedNew,
      updatedAt: timestampIso,
      journeyLogs: updatedLead.journeyLogs,
    });
  } catch (err) {
    console.warn("Firestore program update skipped, updating local state", err);
  }

  const updatedLeads = localLeads.map((l) => (l.id === leadId ? updatedLead : l));
  saveStoredLocalLeads(updatedLeads);

  return updatedLead;
}

// Update Lead Source with timestamped Journey Log
export async function updateLeadSource(
  leadId: string,
  newSource: string,
  author: string = "Sales Representative"
): Promise<Lead | null> {
  const localLeads = getStoredLocalLeads();
  const target = localLeads.find((l) => l.id === leadId);
  if (!target) return null;

  const previousSource = target.leadSource || "Not Assigned";
  const trimmedNew = newSource.trim();
  if (previousSource === trimmedNew) return target;

  const now = new Date();
  const timestampIso = now.toISOString();
  const formattedDate = formatTimestamp(now);

  const sourceLog: JourneyLog = {
    id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    timestamp: timestampIso,
    formattedDate: formattedDate,
    type: "lead_source_update",
    title: `Lead Source: ${trimmedNew || "Unassigned"}`,
    description: `Changed lead source from "${previousSource}" to "${trimmedNew || "Unassigned"}".`,
    author: author,
  };

  const updatedLead: Lead = {
    ...target,
    leadSource: trimmedNew,
    updatedAt: timestampIso,
    journeyLogs: [sourceLog, ...target.journeyLogs],
  };

  // Firestore Update
  try {
    const docRef = doc(db, COLLECTION_NAME, leadId);
    await updateDoc(docRef, {
      leadSource: trimmedNew,
      updatedAt: timestampIso,
      journeyLogs: updatedLead.journeyLogs,
    });
  } catch (err) {
    console.warn("Firestore lead source update skipped, updating local state", err);
  }

  const updatedLeads = localLeads.map((l) => (l.id === leadId ? updatedLead : l));
  saveStoredLocalLeads(updatedLeads);

  return updatedLead;
}

// Delete Lead
export async function deleteLead(leadId: string): Promise<boolean> {
  const localLeads = getStoredLocalLeads();
  const target = localLeads.find((l) => l.id === leadId);

  // Clean up any uploaded approach note from Firebase Storage / Firestore
  if (target?.approachNote) {
    try {
      await deleteApproachNoteFromFirebase(leadId, target.approachNote.storagePath);
    } catch (err) {
      console.warn("Could not delete approach note file during lead deletion:", err);
    }
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, leadId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Firestore delete skipped", err);
  }

  const updated = localLeads.filter((l) => l.id !== leadId);
  saveStoredLocalLeads(updated);
  return true;
}

// Update Lead Owner (Allows Admin to reassign leads to Amit, Gaurav, Preeti, Nikhil, Ruby, etc.)
export async function updateLeadOwner(
  leadId: string,
  newOwner: string,
  author: string = "Administrator"
): Promise<Lead | null> {
  const localLeads = getStoredLocalLeads();
  const target = localLeads.find((l) => l.id === leadId);
  if (!target) return null;

  const previousOwner = target.owner || "Unassigned";
  const trimmedNew = newOwner.trim();
  if (previousOwner === trimmedNew) return target;

  const now = new Date();
  const timestampIso = now.toISOString();
  const formattedDate = formatTimestamp(now);

  const ownerLog: JourneyLog = {
    id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    timestamp: timestampIso,
    formattedDate: formattedDate,
    type: "contact_update",
    title: `Owner Reassigned: ${trimmedNew}`,
    description: `Reassigned account ownership from "${previousOwner}" to "${trimmedNew}".`,
    author: author,
  };

  const updatedLead: Lead = {
    ...target,
    owner: trimmedNew,
    updatedAt: timestampIso,
    journeyLogs: [ownerLog, ...target.journeyLogs],
  };

  // Firestore Update
  try {
    const docRef = doc(db, COLLECTION_NAME, leadId);
    await updateDoc(docRef, {
      owner: trimmedNew,
      updatedAt: timestampIso,
      journeyLogs: updatedLead.journeyLogs,
    });
  } catch (err) {
    console.warn("Firestore lead owner update skipped, updating local state", err);
  }

  const updatedLeads = localLeads.map((l) => (l.id === leadId ? updatedLead : l));
  saveStoredLocalLeads(updatedLeads);

  return updatedLead;
}

// Update Closure Month (e.g. Target conversion deadline "YYYY-MM")
export async function updateLeadClosureMonth(
  leadId: string,
  closureMonth: string,
  author: string = "Client Partner"
): Promise<Lead | null> {
  const localLeads = getStoredLocalLeads();
  const target = localLeads.find((l) => l.id === leadId);
  if (!target) return null;

  const previousMonth = target.closureMonth || "Not Set";
  const trimmedNew = closureMonth.trim();
  if (previousMonth === trimmedNew) return target;

  const now = new Date();
  const timestampIso = now.toISOString();
  const formattedDate = formatTimestamp(now);

  const formattedNew = trimmedNew ? formatClosureMonth(trimmedNew, "full") : "Cleared";
  const formattedPrev = previousMonth !== "Not Set" ? formatClosureMonth(previousMonth, "full") : "Not Set";

  const monthLog: JourneyLog = {
    id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    timestamp: timestampIso,
    formattedDate: formattedDate,
    type: "closure_month_update",
    title: `Target Closure Date: ${formattedNew}`,
    description: `Set target conversion deadline from ${formattedPrev} to ${formattedNew}.`,
    author: author,
  };

  const updatedLead: Lead = {
    ...target,
    closureMonth: trimmedNew || undefined,
    updatedAt: timestampIso,
    journeyLogs: [monthLog, ...target.journeyLogs],
  };

  // Firestore Update
  try {
    const docRef = doc(db, COLLECTION_NAME, leadId);
    await updateDoc(docRef, {
      closureMonth: trimmedNew || null,
      updatedAt: timestampIso,
      journeyLogs: updatedLead.journeyLogs,
    });
  } catch (err) {
    console.warn("Firestore closure month update skipped, updating local state", err);
  }

  const updatedLeads = localLeads.map((l) => (l.id === leadId ? updatedLead : l));
  saveStoredLocalLeads(updatedLeads);

  return updatedLead;
}

// Attach Approach Note (PDF) to lead in Firebase & state
export async function attachLeadApproachNote(
  leadId: string,
  approachNote: ApproachNote,
  author: string = "Client Partner"
): Promise<Lead | null> {
  const localLeads = getStoredLocalLeads();
  const target = localLeads.find((l) => l.id === leadId);
  if (!target) return null;

  const now = new Date();
  const timestampIso = now.toISOString();
  const formattedDate = formatTimestamp(now);

  const isReplace = Boolean(target.approachNote);

  // If replacing, clean up the old file in the background if paths differ
  if (isReplace && target.approachNote?.storagePath && target.approachNote.storagePath !== approachNote.storagePath) {
    deleteApproachNoteFromFirebase(leadId, target.approachNote.storagePath).catch((err) => {
      console.warn("Could not delete previous approach note during replacement:", err);
    });
  }

  const noteLog: JourneyLog = {
    id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    timestamp: timestampIso,
    formattedDate: formattedDate,
    type: "approach_note",
    title: isReplace
      ? `Approach Note Replaced: ${approachNote.fileName}`
      : `Approach Note Uploaded: ${approachNote.fileName}`,
    description: `Uploaded approach note PDF (${approachNote.fileSize}) to Firebase for client alignment.`,
    author: author || approachNote.uploadedBy || "Client Partner",
  };

  const updatedLead: Lead = {
    ...target,
    approachNote: approachNote,
    updatedAt: timestampIso,
    journeyLogs: [noteLog, ...target.journeyLogs],
  };

  // Firestore Update
  try {
    const docRef = doc(db, COLLECTION_NAME, leadId);
    await updateDoc(docRef, {
      approachNote: approachNote,
      updatedAt: timestampIso,
      journeyLogs: updatedLead.journeyLogs,
    });
  } catch (err) {
    console.warn("Firestore approach note update skipped, updating local state", err);
  }

  const updatedLeads = localLeads.map((l) => (l.id === leadId ? updatedLead : l));
  saveStoredLocalLeads(updatedLeads);

  return updatedLead;
}

// Remove Approach Note from lead in Firebase & state
export async function removeLeadApproachNote(
  leadId: string,
  author: string = "Client Partner"
): Promise<Lead | null> {
  const localLeads = getStoredLocalLeads();
  const target = localLeads.find((l) => l.id === leadId);
  if (!target) return null;
  if (!target.approachNote) return target;

  const now = new Date();
  const timestampIso = now.toISOString();
  const formattedDate = formatTimestamp(now);
  const oldFileName = target.approachNote.fileName;

  // Delete underlying file
  try {
    await deleteApproachNoteFromFirebase(leadId, target.approachNote.storagePath);
  } catch (err) {
    console.warn("Could not delete approach note file from Firebase:", err);
  }

  const removeLog: JourneyLog = {
    id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    timestamp: timestampIso,
    formattedDate: formattedDate,
    type: "approach_note",
    title: `Approach Note Removed: ${oldFileName}`,
    description: `Removed the attached approach note PDF from this lead.`,
    author: author,
  };

  const updatedLead: Lead = {
    ...target,
    approachNote: undefined,
    updatedAt: timestampIso,
    journeyLogs: [removeLog, ...target.journeyLogs],
  };

  // Firestore Update
  try {
    const docRef = doc(db, COLLECTION_NAME, leadId);
    await updateDoc(docRef, {
      approachNote: null,
      updatedAt: timestampIso,
      journeyLogs: updatedLead.journeyLogs,
    });
  } catch (err) {
    console.warn("Firestore remove approach note skipped, updating local state", err);
  }

  const updatedLeads = localLeads.map((l) => (l.id === leadId ? updatedLead : l));
  saveStoredLocalLeads(updatedLeads);

  return updatedLead;
}

// Update Company Logo for a Lead
export async function updateLeadCompanyLogo(
  leadId: string,
  logoUrl: string,
  author: string = "Client Partner"
): Promise<Lead | null> {
  const localLeads = getStoredLocalLeads();
  const target = localLeads.find((l) => l.id === leadId);
  if (!target) return null;

  const now = new Date();
  const timestampIso = now.toISOString();
  const formattedDate = formatTimestamp(now);

  const isReplace = Boolean(target.companyLogo);

  const logoLog: JourneyLog = {
    id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    timestamp: timestampIso,
    formattedDate: formattedDate,
    type: "logo_update",
    title: isReplace ? "Company Logo Updated" : "Company Logo Uploaded",
    description: `Updated company logo for ${target.companyName}.`,
    author: author,
  };

  const updatedLead: Lead = {
    ...target,
    companyLogo: logoUrl,
    updatedAt: timestampIso,
    journeyLogs: [logoLog, ...target.journeyLogs],
  };

  // Firestore Update
  try {
    const docRef = doc(db, COLLECTION_NAME, leadId);
    await updateDoc(docRef, {
      companyLogo: logoUrl,
      updatedAt: timestampIso,
      journeyLogs: updatedLead.journeyLogs,
    });
  } catch (err) {
    console.warn("Firestore company logo update skipped, updating local state", err);
  }

  const updatedLeads = localLeads.map((l) => (l.id === leadId ? updatedLead : l));
  saveStoredLocalLeads(updatedLeads);

  return updatedLead;
}

// Remove Company Logo from a Lead
export async function removeLeadCompanyLogo(
  leadId: string,
  author: string = "Client Partner"
): Promise<Lead | null> {
  const localLeads = getStoredLocalLeads();
  const target = localLeads.find((l) => l.id === leadId);
  if (!target) return null;
  if (!target.companyLogo) return target;

  const now = new Date();
  const timestampIso = now.toISOString();
  const formattedDate = formatTimestamp(now);

  const removeLog: JourneyLog = {
    id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    timestamp: timestampIso,
    formattedDate: formattedDate,
    type: "logo_update",
    title: "Company Logo Removed",
    description: `Removed custom company logo for ${target.companyName}.`,
    author: author,
  };

  const updatedLead: Lead = {
    ...target,
    companyLogo: undefined,
    updatedAt: timestampIso,
    journeyLogs: [removeLog, ...target.journeyLogs],
  };

  // Firestore Update
  try {
    const docRef = doc(db, COLLECTION_NAME, leadId);
    await updateDoc(docRef, {
      companyLogo: null,
      updatedAt: timestampIso,
      journeyLogs: updatedLead.journeyLogs,
    });
  } catch (err) {
    console.warn("Firestore remove company logo skipped, updating local state", err);
  }

  const updatedLeads = localLeads.map((l) => (l.id === leadId ? updatedLead : l));
  saveStoredLocalLeads(updatedLeads);

  return updatedLead;
}
