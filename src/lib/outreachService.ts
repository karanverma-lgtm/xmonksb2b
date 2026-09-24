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
import { ColdClient, OutreachTouchpoint, ColdClientStatus, OutreachChannel } from "@/types/outreach";
import { formatTimestamp, sanitizeForFirestore, createLead } from "./leadsService";

const COLLECTION_NAME = "b2b_cold_clients";
const LOCAL_STORAGE_KEY = "xmonks_b2b_cold_clients_v1";

function normalizeClientOwner(ownerStr?: string): string {
  if (!ownerStr) return "Amit";
  const lower = ownerStr.toLowerCase().trim();
  if (lower === "karan") return "Amit";
  if (lower === "pooja") return "Preeti";
  if (lower === "admin") return "Admin User";
  return ownerStr;
}

export function cleanLegacyColdClients(clients: ColdClient[]): { cleaned: ColdClient[]; changed: boolean } {
  let changed = false;
  const cleaned = clients.map((c) => {
    const newOwner = normalizeClientOwner(c.owner);
    if (newOwner !== c.owner) {
      changed = true;
    }
    const cleanedTouchpoints = (c.touchpoints || []).map((tp) => {
      const newAuthor = normalizeClientOwner(tp.author);
      if (newAuthor !== tp.author) changed = true;
      return { ...tp, author: newAuthor };
    });

    return {
      ...c,
      owner: newOwner,
      touchpoints: cleanedTouchpoints,
    };
  });
  return { cleaned, changed };
}

export const DEMO_COLD_CLIENT_IDS = new Set([
  "cold-101",
  "cold-102",
  "cold-103",
  "cold-104",
  "cold-105",
]);

export function isDemoColdClient(id?: string): boolean {
  if (!id) return false;
  return DEMO_COLD_CLIENT_IDS.has(id);
}

// Get initial cold clients from LocalStorage
export function getStoredLocalColdClients(): ColdClient[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: ColdClient[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [];
    }
    // Filter out all demo leads
    const realClients = parsed.filter((c) => !isDemoColdClient(c.id));
    const { cleaned, changed } = cleanLegacyColdClients(realClients);
    if (changed || realClients.length !== parsed.length) {
      saveStoredLocalColdClients(cleaned);
    }
    return cleaned;
  } catch (err) {
    console.warn("Failed to parse local cold clients", err);
    return [];
  }
}

export function saveStoredLocalColdClients(clients: ColdClient[]) {
  if (typeof window === "undefined") return;
  try {
    const nonDemos = clients.filter((c) => !isDemoColdClient(c.id));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nonDemos));
  } catch (err) {
    console.error("Failed to save cold clients to localStorage", err);
  }
}

// Subscribe to Cold Clients with real-time updates and fallback
export function subscribeToColdClients(
  onData: (clients: ColdClient[], isFirebaseSyncing: boolean) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let unsubscribed = false;

  try {
    const collRef = collection(db, COLLECTION_NAME);
    const q = query(collRef, orderBy("updatedAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (unsubscribed) return;
        if (snapshot.empty) {
          // Empty collection means 0 leads - do NOT re-seed demo data
          saveStoredLocalColdClients([]);
          onData([], true);
        } else {
          const rawClients: ColdClient[] = [];
          const demoDocIdsToDelete: string[] = [];

          snapshot.docs.forEach((docSnap) => {
            if (isDemoColdClient(docSnap.id)) {
              demoDocIdsToDelete.push(docSnap.id);
            } else {
              const data = docSnap.data() as Omit<ColdClient, "id">;
              rawClients.push({
                id: docSnap.id,
                ...data,
                touchpoints: Array.isArray(data.touchpoints) ? data.touchpoints : [],
              });
            }
          });

          // Automatically delete legacy demo docs from Firestore
          if (demoDocIdsToDelete.length > 0) {
            demoDocIdsToDelete.forEach((demoId) => {
              deleteDoc(doc(db, COLLECTION_NAME, demoId)).catch(() => {});
            });
          }

          const { cleaned, changed } = cleanLegacyColdClients(rawClients);
          saveStoredLocalColdClients(cleaned);
          if (changed && cleaned.length > 0) {
            // Sync normalized owners to Firestore
            seedInitialColdClients(cleaned).catch(() => {});
          }
          onData(cleaned, true);
        }
      },
      (error) => {
        console.warn("Firestore cold clients listener fallback to localStorage:", error);
        if (!unsubscribed) {
          const localClients = getStoredLocalColdClients();
          onData(localClients, false);
        }
      }
    );

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  } catch (error) {
    console.warn("Failed to initialize Firestore cold clients listener:", error);
    const localClients = getStoredLocalColdClients();
    onData(localClients, false);
    return () => {};
  }
}

async function seedInitialColdClients(clients: ColdClient[]): Promise<void> {
  const realClients = clients.filter((c) => !isDemoColdClient(c.id));
  if (realClients.length === 0) return;

  try {
    const batch = writeBatch(db);
    for (const client of realClients) {
      const docRef = doc(db, COLLECTION_NAME, client.id);
      batch.set(docRef, sanitizeForFirestore(client));
    }
    await batch.commit();
  } catch (e) {
    console.warn("Failed to sync cold clients to Firestore:", e);
  }
}

// Add new Cold Client
export async function addColdClient(
  clientData: Omit<ColdClient, "id" | "createdAt" | "updatedAt" | "touchpoints"> & {
    initialNote?: string;
  }
): Promise<ColdClient> {
  const now = new Date();
  const timestampIso = now.toISOString();
  const formattedDate = formatTimestamp(now);
  const newId = "cold-" + Date.now();

  const touchpoints: OutreachTouchpoint[] = [];
  if (clientData.initialNote?.trim()) {
    touchpoints.push({
      id: "tp-" + Date.now(),
      timestamp: timestampIso,
      formattedDate: formattedDate,
      channel: clientData.channel || "note",
      summary: clientData.initialNote.trim(),
      author: clientData.owner || "Sales Representative",
    });
  }

  const newClient: ColdClient = {
    ...clientData,
    id: newId,
    touchpoints,
    createdAt: timestampIso,
    updatedAt: timestampIso,
  };

  // 1. Save local
  const current = getStoredLocalColdClients();
  saveStoredLocalColdClients([newClient, ...current]);

  // 2. Save Firestore
  try {
    const docRef = doc(db, COLLECTION_NAME, newId);
    await setDoc(docRef, sanitizeForFirestore(newClient));
  } catch (error) {
    console.warn("Saved cold client locally (Firestore offline or restricted)", error);
  }

  return newClient;
}

// Update Cold Client
export async function updateColdClient(
  id: string,
  updates: Partial<ColdClient>
): Promise<void> {
  const now = new Date().toISOString();
  const fullUpdates = {
    ...updates,
    updatedAt: now,
  };

  // 1. Update local
  const current = getStoredLocalColdClients();
  const updated = current.map((c) => (c.id === id ? { ...c, ...fullUpdates } : c));
  saveStoredLocalColdClients(updated);

  // 2. Update Firestore
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, sanitizeForFirestore(fullUpdates));
  } catch (error) {
    console.warn("Updated cold client locally (Firestore offline)", error);
  }
}

// Delete Cold Client
export async function deleteColdClient(id: string): Promise<void> {
  // 1. Delete local
  const current = getStoredLocalColdClients();
  saveStoredLocalColdClients(current.filter((c) => c.id !== id));

  // 2. Delete Firestore
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn("Deleted cold client locally (Firestore offline)", error);
  }
}

// Log Outreach Touchpoint
export async function logOutreachTouchpoint(
  clientId: string,
  touchpoint: {
    channel: OutreachChannel | "note";
    summary: string;
    author: string;
    nextStatus?: ColdClientStatus;
    nextFollowUpDate?: string;
  }
): Promise<void> {
  const current = getStoredLocalColdClients();
  const client = current.find((c) => c.id === clientId);
  if (!client) return;

  const now = new Date();
  const timestampIso = now.toISOString();
  const formattedDate = formatTimestamp(now);

  const newTp: OutreachTouchpoint = {
    id: "tp-" + Date.now(),
    timestamp: timestampIso,
    formattedDate: formattedDate,
    channel: touchpoint.channel,
    summary: touchpoint.summary,
    author: touchpoint.author,
  };

  const updatedTouchpoints = [newTp, ...(client.touchpoints || [])];
  const updates: Partial<ColdClient> = {
    touchpoints: updatedTouchpoints,
    lastContactDate: timestampIso.split("T")[0],
    updatedAt: timestampIso,
  };

  if (touchpoint.nextStatus) {
    updates.status = touchpoint.nextStatus;
  }
  if (touchpoint.nextFollowUpDate !== undefined) {
    updates.nextFollowUpDate = touchpoint.nextFollowUpDate;
  }

  await updateColdClient(clientId, updates);
}

// Bulk Add Cold Clients
export async function bulkAddColdClients(
  clientsData: Array<Omit<ColdClient, "id" | "createdAt" | "updatedAt" | "touchpoints">>
): Promise<number> {
  const now = new Date().toISOString();
  const newClients: ColdClient[] = clientsData.map((data, index) => ({
    ...data,
    id: "cold-" + (Date.now() + index),
    touchpoints: [],
    createdAt: now,
    updatedAt: now,
  }));

  // 1. Local update
  const current = getStoredLocalColdClients();
  saveStoredLocalColdClients([...newClients, ...current]);

  // 2. Firestore batch write
  try {
    const batch = writeBatch(db);
    for (const client of newClients) {
      const docRef = doc(db, COLLECTION_NAME, client.id);
      batch.set(docRef, sanitizeForFirestore(client));
    }
    await batch.commit();
  } catch (error) {
    console.warn("Saved bulk cold clients locally (Firestore offline)", error);
  }

  return newClients.length;
}

// Convert Cold Client to Active Pipeline Lead
export async function convertColdClientToLead(
  coldClient: ColdClient,
  dealValue: number,
  author: string,
  targetClosureMonth?: string
): Promise<string> {
  // 1. Create the lead in the main pipeline at stage 'interest'
  const createdLead = await createLead({
    companyName: coldClient.companyName,
    companyLogo: coldClient.companyLogo,
    contactName: coldClient.contactName,
    designation: coldClient.designation,
    contactEmail: coldClient.email,
    contactPhone: coldClient.phone,
    city: coldClient.city,
    industry: coldClient.industry || "Technology & SaaS",
    program: coldClient.targetProgram || "Executive Coaching",
    leadSource: "Direct Outreach / Cold Prospect",
    dealValue: dealValue || coldClient.estimatedPotentialValue || 500000,
    stage: "interest",
    expectedCloseDate: new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0],
    closureMonth: targetClosureMonth || new Date().toISOString().slice(0, 7),
    owner: coldClient.owner || author,
    journeyNotes: `Converted from Cold Outreach prospect. Previous channel: ${coldClient.channel}. Notes: ${coldClient.notes || "None"}`,
  });

  // 2. Update cold client as converted and link leadId
  const now = new Date();
  const timestampIso = now.toISOString();
  const formattedDate = formatTimestamp(now);

  const conversionTp: OutreachTouchpoint = {
    id: "tp-" + Date.now(),
    timestamp: timestampIso,
    formattedDate: formattedDate,
    channel: "note",
    summary: `Converted to Active CRM Pipeline Deal (${createdLead.id}) with initial deal value ₹${(dealValue || 0).toLocaleString("en-IN")}.`,
    author: author,
  };

  await updateColdClient(coldClient.id, {
    status: "converted",
    convertedLeadId: createdLead.id,
    touchpoints: [conversionTp, ...(coldClient.touchpoints || [])],
  });

  return createdLead.id;
}
