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
import { Lead, LeadStage, JourneyLog, ApproachNote, FinancialDocument, ContactPerson } from "@/types/lead";
import { STAGES } from "@/constants/stages";
import { formatINR, formatClosureMonth } from "./formatters";
import { deleteApproachNoteFromFirebase } from "./approachNoteService";
import { deleteFinancialDocumentFromR2 } from "./financialDocumentService";

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

  // Clean up any uploaded approach notes from Cloudflare R2 / Firebase Storage / Firestore
  if (target?.approachNotes && target.approachNotes.length > 0) {
    for (const note of target.approachNotes) {
      if (note.storagePath) {
        deleteApproachNoteFromFirebase(leadId, note.storagePath).catch((err) => {
          console.warn("Could not delete approach note file during lead deletion:", err);
        });
      }
    }
  } else if (target?.approachNote) {
    try {
      await deleteApproachNoteFromFirebase(leadId, target.approachNote.storagePath);
    } catch (err) {
      console.warn("Could not delete approach note file during lead deletion:", err);
    }
  }

  // Clean up any uploaded financial documents from Cloudflare R2
  if (target?.financialDocuments && target.financialDocuments.length > 0) {
    for (const docItem of target.financialDocuments) {
      if (docItem.storagePath) {
        deleteFinancialDocumentFromR2(docItem.storagePath).catch((err) => {
          console.warn("Could not delete financial document file during lead deletion:", err);
        });
      }
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

// Attach Approach Notes (supports multi-upload of all formats) to lead in Firestore & state
export async function attachLeadApproachNotes(
  leadId: string,
  newNotes: ApproachNote[],
  author: string = "Client Partner"
): Promise<Lead | null> {
  if (!newNotes || newNotes.length === 0) return null;

  const localLeads = getStoredLocalLeads();
  const target = localLeads.find((l) => l.id === leadId);
  if (!target) return null;

  const now = new Date();
  const timestampIso = now.toISOString();
  const formattedDate = formatTimestamp(now);

  const existingNotes: ApproachNote[] =
    target.approachNotes && target.approachNotes.length > 0
      ? target.approachNotes
      : target.approachNote
      ? [target.approachNote]
      : [];

  const combinedNotes = [
    ...newNotes,
    ...existingNotes.filter(
      (n) =>
        !newNotes.some(
          (nn) =>
            (nn.id && n.id && nn.id === n.id) ||
            (nn.storagePath && n.storagePath && nn.storagePath === n.storagePath)
        )
    ),
  ];

  const noteCount = newNotes.length;
  const noteNames = newNotes.map((n) => n.fileName).join(", ");

  const noteLog: JourneyLog = {
    id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    timestamp: timestampIso,
    formattedDate: formattedDate,
    type: "approach_note",
    title:
      noteCount === 1
        ? `Approach Note Attached: ${newNotes[0].fileName}`
        : `${noteCount} Approach Notes Attached`,
    description:
      noteCount === 1
        ? `Attached approach note document (${newNotes[0].fileSize}) to client record: ${newNotes[0].fileName}`
        : `Attached ${noteCount} approach note documents to client record: ${noteNames}`,
    author: author || newNotes[0]?.uploadedBy || "Client Partner",
  };

  const updatedLead: Lead = {
    ...target,
    approachNote: combinedNotes[0] || undefined,
    approachNotes: combinedNotes,
    updatedAt: timestampIso,
    journeyLogs: [noteLog, ...target.journeyLogs],
  };

  // Firestore Update
  try {
    const docRef = doc(db, COLLECTION_NAME, leadId);
    await updateDoc(
      docRef,
      sanitizeForFirestore({
        approachNote: combinedNotes[0] || null,
        approachNotes: combinedNotes,
        updatedAt: timestampIso,
        journeyLogs: updatedLead.journeyLogs,
      })
    );
  } catch (err) {
    console.warn("Firestore approach notes update skipped, updating local state", err);
  }

  const updatedLeads = localLeads.map((l) => (l.id === leadId ? updatedLead : l));
  saveStoredLocalLeads(updatedLeads);

  return updatedLead;
}

// Backwards-compatible single note attachment
export async function attachLeadApproachNote(
  leadId: string,
  approachNote: ApproachNote,
  author: string = "Client Partner"
): Promise<Lead | null> {
  return attachLeadApproachNotes(leadId, [approachNote], author);
}

// Remove Approach Note (by note ID or legacy single removal) from lead in Firebase & state
export async function removeLeadApproachNote(
  leadId: string,
  noteIdOrPath?: string,
  author: string = "Client Partner"
): Promise<Lead | null> {
  const localLeads = getStoredLocalLeads();
  const target = localLeads.find((l) => l.id === leadId);
  if (!target) return null;

  const existingNotes: ApproachNote[] =
    target.approachNotes && target.approachNotes.length > 0
      ? target.approachNotes
      : target.approachNote
      ? [target.approachNote]
      : [];

  if (existingNotes.length === 0 && !target.approachNote) return target;

  const now = new Date();
  const timestampIso = now.toISOString();
  const formattedDate = formatTimestamp(now);

  let noteToRemove: ApproachNote | undefined;
  let remainingNotes: ApproachNote[] = [];

  if (noteIdOrPath) {
    noteToRemove = existingNotes.find(
      (n) => n.id === noteIdOrPath || n.storagePath === noteIdOrPath || n.fileName === noteIdOrPath
    );
    remainingNotes = existingNotes.filter(
      (n) => n !== noteToRemove && n.id !== noteIdOrPath && n.storagePath !== noteIdOrPath
    );
  } else {
    noteToRemove = existingNotes[0] || target.approachNote;
    remainingNotes = [];
  }

  const oldFileName = noteToRemove?.fileName || "Approach Note";

  // Delete underlying file
  if (noteToRemove?.storagePath) {
    try {
      await deleteApproachNoteFromFirebase(leadId, noteToRemove.storagePath);
    } catch (err) {
      console.warn("Could not delete approach note file from storage:", err);
    }
  }

  const removeLog: JourneyLog = {
    id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    timestamp: timestampIso,
    formattedDate: formattedDate,
    type: "approach_note",
    title: `Approach Note Removed: ${oldFileName}`,
    description: `Removed attached approach note document (${oldFileName}) from client record.`,
    author: author,
  };

  const updatedLead: Lead = {
    ...target,
    approachNote: remainingNotes[0] || undefined,
    approachNotes: remainingNotes,
    updatedAt: timestampIso,
    journeyLogs: [removeLog, ...target.journeyLogs],
  };

  // Firestore Update
  try {
    const docRef = doc(db, COLLECTION_NAME, leadId);
    await updateDoc(
      docRef,
      sanitizeForFirestore({
        approachNote: remainingNotes[0] || null,
        approachNotes: remainingNotes,
        updatedAt: timestampIso,
        journeyLogs: updatedLead.journeyLogs,
      })
    );
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

// Attach Financial Documents (supports multi-upload of all formats) to lead in Firestore & state
export async function attachLeadFinancialDocuments(
  leadId: string,
  newDocuments: FinancialDocument[],
  author: string = "Client Partner"
): Promise<Lead | null> {
  if (!newDocuments || newDocuments.length === 0) return null;

  const localLeads = getStoredLocalLeads();
  const target = localLeads.find((l) => l.id === leadId);
  if (!target) return null;

  const now = new Date();
  const timestampIso = now.toISOString();
  const formattedDate = formatTimestamp(now);

  const existingDocs = target.financialDocuments || [];
  // Deduplicate by id if needed
  const combinedDocs = [...newDocuments, ...existingDocs.filter(d => !newDocuments.some(nd => nd.id === d.id))];

  const docCount = newDocuments.length;
  const docNames = newDocuments.map((d) => d.fileName).join(", ");

  const docLog: JourneyLog = {
    id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    timestamp: timestampIso,
    formattedDate: formattedDate,
    type: "financial_document",
    title:
      docCount === 1
        ? `Financial Document Attached: ${newDocuments[0].fileName}`
        : `${docCount} Financial Documents Attached`,
    description:
      docCount === 1
        ? `Attached financial document (${newDocuments[0].fileSize}) to client record: ${newDocuments[0].fileName}`
        : `Attached ${docCount} financial documents to client record: ${docNames}`,
    author: author || newDocuments[0]?.uploadedBy || "Client Partner",
  };

  const updatedLead: Lead = {
    ...target,
    financialDocuments: combinedDocs,
    updatedAt: timestampIso,
    journeyLogs: [docLog, ...target.journeyLogs],
  };

  // Firestore Update
  try {
    const docRef = doc(db, COLLECTION_NAME, leadId);
    await updateDoc(
      docRef,
      sanitizeForFirestore({
        financialDocuments: combinedDocs,
        updatedAt: timestampIso,
        journeyLogs: updatedLead.journeyLogs,
      })
    );
  } catch (err) {
    console.warn("Firestore financial documents update skipped, updating local state", err);
  }

  const updatedLeads = localLeads.map((l) => (l.id === leadId ? updatedLead : l));
  saveStoredLocalLeads(updatedLeads);

  return updatedLead;
}

// Remove a specific Financial Document from lead in Firebase & state
export async function removeLeadFinancialDocument(
  leadId: string,
  documentId: string,
  author: string = "Client Partner"
): Promise<Lead | null> {
  const localLeads = getStoredLocalLeads();
  const target = localLeads.find((l) => l.id === leadId);
  if (!target) return null;

  const existingDocs = target.financialDocuments || [];
  const docToRemove = existingDocs.find((d) => d.id === documentId);
  if (!docToRemove) return target;

  const now = new Date();
  const timestampIso = now.toISOString();
  const formattedDate = formatTimestamp(now);

  // Clean up underlying file from Cloudflare R2
  if (docToRemove.storagePath) {
    deleteFinancialDocumentFromR2(docToRemove.storagePath).catch((err) => {
      console.warn("Could not delete financial document file from Cloudflare R2:", err);
    });
  }

  const remainingDocs = existingDocs.filter((d) => d.id !== documentId);

  const removeLog: JourneyLog = {
    id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    timestamp: timestampIso,
    formattedDate: formattedDate,
    type: "financial_document",
    title: `Financial Document Removed: ${docToRemove.fileName}`,
    description: `Removed attached financial document (${docToRemove.fileName}) from client record.`,
    author: author,
  };

  const updatedLead: Lead = {
    ...target,
    financialDocuments: remainingDocs,
    updatedAt: timestampIso,
    journeyLogs: [removeLog, ...target.journeyLogs],
  };

  // Firestore Update
  try {
    const docRef = doc(db, COLLECTION_NAME, leadId);
    await updateDoc(
      docRef,
      sanitizeForFirestore({
        financialDocuments: remainingDocs,
        updatedAt: timestampIso,
        journeyLogs: updatedLead.journeyLogs,
      })
    );
  } catch (err) {
    console.warn("Firestore remove financial document skipped, updating local state", err);
  }

  const updatedLeads = localLeads.map((l) => (l.id === leadId ? updatedLead : l));
  saveStoredLocalLeads(updatedLeads);

  return updatedLead;
}

// Add an additional person / contact stakeholder to a Lead
export async function addLeadContact(
  leadId: string,
  contactData: Omit<ContactPerson, "id" | "addedAt">,
  author: string = "Client Partner"
): Promise<Lead | null> {
  const localLeads = getStoredLocalLeads();
  const target = localLeads.find((l) => l.id === leadId);
  if (!target) return null;

  const now = new Date();
  const timestampIso = now.toISOString();
  const formattedDate = formatTimestamp(now);

  const newContact: ContactPerson = {
    id: `contact-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: contactData.name.trim(),
    contactNumber: contactData.contactNumber?.trim() || undefined,
    email: contactData.email?.trim() || undefined,
    designation: contactData.designation?.trim() || undefined,
    addedAt: timestampIso,
  };

  const existingContacts = target.additionalContacts || [];
  const updatedContacts = [...existingContacts, newContact];

  const contactLog: JourneyLog = {
    id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    timestamp: timestampIso,
    formattedDate: formattedDate,
    type: "contact_update",
    title: `Stakeholder Added: ${newContact.name}`,
    description: `Added ${newContact.name}${newContact.designation ? ` (${newContact.designation})` : ""} to client contacts list. Email: ${newContact.email || "N/A"}, Phone: ${newContact.contactNumber || "N/A"}.`,
    author: author,
  };

  const updatedLead: Lead = {
    ...target,
    additionalContacts: updatedContacts,
    updatedAt: timestampIso,
    journeyLogs: [contactLog, ...target.journeyLogs],
  };

  // Firestore Update
  try {
    const docRef = doc(db, COLLECTION_NAME, leadId);
    await updateDoc(
      docRef,
      sanitizeForFirestore({
        additionalContacts: updatedContacts,
        updatedAt: timestampIso,
        journeyLogs: updatedLead.journeyLogs,
      })
    );
  } catch (err) {
    console.warn("Firestore add contact skipped, updating local state", err);
  }

  const updatedLeads = localLeads.map((l) => (l.id === leadId ? updatedLead : l));
  saveStoredLocalLeads(updatedLeads);

  return updatedLead;
}

// Remove an additional person / contact stakeholder from a Lead
export async function removeLeadContact(
  leadId: string,
  contactId: string,
  author: string = "Client Partner"
): Promise<Lead | null> {
  const localLeads = getStoredLocalLeads();
  const target = localLeads.find((l) => l.id === leadId);
  if (!target) return null;

  const existingContacts = target.additionalContacts || [];
  const contactToRemove = existingContacts.find((c) => c.id === contactId);
  if (!contactToRemove) return target;

  const now = new Date();
  const timestampIso = now.toISOString();
  const formattedDate = formatTimestamp(now);

  const remainingContacts = existingContacts.filter((c) => c.id !== contactId);

  const removeLog: JourneyLog = {
    id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    timestamp: timestampIso,
    formattedDate: formattedDate,
    type: "contact_update",
    title: `Stakeholder Removed: ${contactToRemove.name}`,
    description: `Removed ${contactToRemove.name} from client contacts list.`,
    author: author,
  };

  const updatedLead: Lead = {
    ...target,
    additionalContacts: remainingContacts,
    updatedAt: timestampIso,
    journeyLogs: [removeLog, ...target.journeyLogs],
  };

  // Firestore Update
  try {
    const docRef = doc(db, COLLECTION_NAME, leadId);
    await updateDoc(
      docRef,
      sanitizeForFirestore({
        additionalContacts: remainingContacts,
        updatedAt: timestampIso,
        journeyLogs: updatedLead.journeyLogs,
      })
    );
  } catch (err) {
    console.warn("Firestore remove contact skipped, updating local state", err);
  }

  const updatedLeads = localLeads.map((l) => (l.id === leadId ? updatedLead : l));
  saveStoredLocalLeads(updatedLeads);

  return updatedLead;
}

// Update multiple contacts on a Lead (e.g. edit contact details)
export async function updateLeadContacts(
  leadId: string,
  contacts: ContactPerson[],
  author: string = "Client Partner"
): Promise<Lead | null> {
  const localLeads = getStoredLocalLeads();
  const target = localLeads.find((l) => l.id === leadId);
  if (!target) return null;

  const now = new Date();
  const timestampIso = now.toISOString();
  const formattedDate = formatTimestamp(now);

  const updatedLead: Lead = {
    ...target,
    additionalContacts: contacts,
    updatedAt: timestampIso,
  };

  // Firestore Update
  try {
    const docRef = doc(db, COLLECTION_NAME, leadId);
    await updateDoc(
      docRef,
      sanitizeForFirestore({
        additionalContacts: contacts,
        updatedAt: timestampIso,
      })
    );
  } catch (err) {
    console.warn("Firestore update contacts skipped, updating local state", err);
  }

  const updatedLeads = localLeads.map((l) => (l.id === leadId ? updatedLead : l));
  saveStoredLocalLeads(updatedLeads);

  return updatedLead;
}

