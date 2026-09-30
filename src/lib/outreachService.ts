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
      time: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
      activityDate: timestampIso.split("T")[0],
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
    activityDate?: string;
    activityTime?: string;
    time?: string;
    timestamp?: string;
  }
): Promise<void> {
  const current = getStoredLocalColdClients();
  const client = current.find((c) => c.id === clientId);
  if (!client) return;

  // Compute activity date & time
  let activityDateTime = new Date();
  if (touchpoint.timestamp) {
    const parsed = new Date(touchpoint.timestamp);
    if (!isNaN(parsed.getTime())) {
      activityDateTime = parsed;
    }
  } else if (touchpoint.activityDate) {
    const [y, m, d] = touchpoint.activityDate.split("-").map(Number);
    let hours = activityDateTime.getHours();
    let minutes = activityDateTime.getMinutes();
    if (touchpoint.activityTime) {
      const parts = touchpoint.activityTime.split(":").map(Number);
      if (!isNaN(parts[0])) hours = parts[0];
      if (!isNaN(parts[1])) minutes = parts[1];
    }
    activityDateTime = new Date(y, m - 1, d, hours, minutes);
  }

  const timestampIso = activityDateTime.toISOString();
  const formattedDate = formatTimestamp(activityDateTime);
  const formattedTime =
    touchpoint.time ||
    activityDateTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  const newTp: OutreachTouchpoint = {
    id: "tp-" + Date.now(),
    timestamp: timestampIso,
    formattedDate: formattedDate,
    channel: touchpoint.channel,
    summary: touchpoint.summary,
    author: touchpoint.author,
    time: formattedTime,
    activityDate: touchpoint.activityDate || timestampIso.split("T")[0],
  };

  // Sort descending by activity timestamp
  const updatedTouchpoints = [newTp, ...(client.touchpoints || [])].sort((a, b) => {
    const timeA = new Date(a.timestamp || 0).getTime();
    const timeB = new Date(b.timestamp || 0).getTime();
    return timeB - timeA;
  });

  const updates: Partial<ColdClient> = {
    touchpoints: updatedTouchpoints,
    lastContactDate: touchpoint.activityDate || timestampIso.split("T")[0],
    updatedAt: new Date().toISOString(),
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

// Bulk Update Cold Clients
export async function bulkUpdateColdClients(
  clientIds: string[],
  updates: Partial<ColdClient>,
  touchpointNote?: string,
  author?: string
): Promise<number> {
  if (clientIds.length === 0) return 0;
  const now = new Date();
  const timestampIso = now.toISOString();
  const formattedDate = formatTimestamp(now);
  const current = getStoredLocalColdClients();

  const idSet = new Set(clientIds);
  const updatedClients: ColdClient[] = [];

  const updatedLocal = current.map((client) => {
    if (!idSet.has(client.id)) return client;

    const clientUpdates: Partial<ColdClient> = {
      ...updates,
      updatedAt: timestampIso,
    };

    if (touchpointNote && touchpointNote.trim()) {
      const tpChannel = (updates.channel as OutreachChannel) || client.channel || "note";
      const newTp: OutreachTouchpoint = {
        id: "tp-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
        timestamp: timestampIso,
        formattedDate: formattedDate,
        channel: tpChannel,
        summary: touchpointNote.trim(),
        author: author || updates.owner || client.owner || "Sales Representative",
        time: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
        activityDate: timestampIso.split("T")[0],
      };
      clientUpdates.touchpoints = [newTp, ...(client.touchpoints || [])];
      clientUpdates.lastContactDate = timestampIso.split("T")[0];
    }

    const merged: ColdClient = { ...client, ...clientUpdates };
    updatedClients.push(merged);
    return merged;
  });

  // 1. Local update
  saveStoredLocalColdClients(updatedLocal);

  // 2. Firestore batch write in chunks
  try {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < updatedClients.length; i += CHUNK_SIZE) {
      const chunk = updatedClients.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const client of chunk) {
        const docRef = doc(db, COLLECTION_NAME, client.id);
        const { id, ...docData } = client;
        batch.set(docRef, sanitizeForFirestore(docData), { merge: true });
      }
      await batch.commit();
    }
  } catch (error) {
    console.warn("Updated bulk cold clients locally (Firestore offline)", error);
  }

  return updatedClients.length;
}

// Bulk Delete Cold Clients
export async function bulkDeleteColdClients(clientIds: string[]): Promise<number> {
  if (clientIds.length === 0) return 0;
  const idSet = new Set(clientIds);
  const current = getStoredLocalColdClients();
  const filtered = current.filter((c) => !idSet.has(c.id));
  saveStoredLocalColdClients(filtered);

  try {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < clientIds.length; i += CHUNK_SIZE) {
      const chunk = clientIds.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const id of chunk) {
        const docRef = doc(db, COLLECTION_NAME, id);
        batch.delete(docRef);
      }
      await batch.commit();
    }
  } catch (error) {
    console.warn("Deleted bulk cold clients locally (Firestore offline)", error);
  }

  return clientIds.length;
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
    additionalContacts: coldClient.additionalContacts,
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
    time: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
    activityDate: timestampIso.split("T")[0],
  };

  await updateColdClient(coldClient.id, {
    status: "converted",
    convertedLeadId: createdLead.id,
    touchpoints: [conversionTp, ...(coldClient.touchpoints || [])],
  });

  return createdLead.id;
}
