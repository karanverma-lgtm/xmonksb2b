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
import { INITIAL_COLD_CLIENTS } from "@/constants/outreach";
import { formatTimestamp, sanitizeForFirestore, createLead } from "./leadsService";

const COLLECTION_NAME = "b2b_cold_clients";
const LOCAL_STORAGE_KEY = "xmonks_b2b_cold_clients_v1";

// Get initial cold clients from LocalStorage
export function getStoredLocalColdClients(): ColdClient[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_COLD_CLIENTS));
      return INITIAL_COLD_CLIENTS;
    }
    const parsed: ColdClient[] = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_COLD_CLIENTS;
  } catch (err) {
    console.warn("Failed to parse local cold clients", err);
    return INITIAL_COLD_CLIENTS;
  }
}

export function saveStoredLocalColdClients(clients: ColdClient[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clients));
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
          // If Firestore collection has not been seeded yet, use local/initial data
          const localClients = getStoredLocalColdClients();
          if (localClients.length > 0) {
            // Seed to firestore in background
            seedInitialColdClients(localClients).catch(() => {});
          }
          onData(localClients, true);
        } else {
          const clients: ColdClient[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data() as Omit<ColdClient, "id">;
            return {
              id: docSnap.id,
              ...data,
              touchpoints: Array.isArray(data.touchpoints) ? data.touchpoints : [],
            };
          });
          saveStoredLocalColdClients(clients);
          onData(clients, true);
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
  try {
    const batch = writeBatch(db);
    for (const client of clients) {
      const docRef = doc(db, COLLECTION_NAME, client.id);
      batch.set(docRef, sanitizeForFirestore(client));
    }
    await batch.commit();
  } catch (e) {
    console.warn("Failed to auto-seed initial cold clients to Firestore:", e);
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
