import { db } from "./firebase";
import { collection, doc, setDoc, onSnapshot } from "firebase/firestore";

export interface ContactSuggestion {
  id: string;
  name: string;
  email: string;
  useCount: number;
  lastUsedAt: string;
  isDefault?: boolean;
  tag?: string;
}

const CC_STORAGE_KEY = "xmonks_b2b_cc_contacts";
const CC_COLLECTION = "b2b_cc_suggestions";

export const SEED_CONTACT_SUGGESTIONS: ContactSuggestion[] = [
  {
    id: "seed-preeti-work",
    name: "Preeti Verma",
    email: "preeti.verma@xmonks.com",
    useCount: 12,
    lastUsedAt: "2026-01-01T00:00:00.000Z",
    isDefault: true,
    tag: "Core Team",
  },
  {
    id: "seed-preeti-personal",
    name: "Preeti Verma",
    email: "preeinspires@gmail.com",
    useCount: 10,
    lastUsedAt: "2026-01-01T00:00:00.000Z",
    isDefault: true,
    tag: "Preeti Direct",
  },
  {
    id: "seed-gaurav-personal",
    name: "Gaurav Arora",
    email: "gauravinspires@gmail.com",
    useCount: 12,
    lastUsedAt: "2026-01-01T00:00:00.000Z",
    isDefault: true,
    tag: "Leadership",
  },
  {
    id: "seed-gaurav-work",
    name: "Gaurav Arora",
    email: "gaurav@xmonks.com",
    useCount: 8,
    lastUsedAt: "2026-01-01T00:00:00.000Z",
    isDefault: true,
    tag: "Core Team",
  },
  {
    id: "seed-karan-work",
    name: "Karan Verma",
    email: "karan.verma@xmonks.com",
    useCount: 12,
    lastUsedAt: "2026-01-01T00:00:00.000Z",
    isDefault: true,
    tag: "Leadership",
  },
  {
    id: "seed-amit-work",
    name: "Amit Shelly",
    email: "amit@xmonks.com",
    useCount: 6,
    lastUsedAt: "2026-01-01T00:00:00.000Z",
    isDefault: true,
    tag: "Enterprise Sales",
  },
  {
    id: "seed-ruby-work",
    name: "Ruby Dayal",
    email: "ruby.dayal@xmonks.com",
    useCount: 6,
    lastUsedAt: "2026-01-01T00:00:00.000Z",
    isDefault: true,
    tag: "Sales Manager",
  },
  {
    id: "seed-nikhil-work",
    name: "Nikhil",
    email: "nikhil@xmonks.com",
    useCount: 5,
    lastUsedAt: "2026-01-01T00:00:00.000Z",
    isDefault: true,
    tag: "Core Team",
  },
  {
    id: "seed-accounts-work",
    name: "Accounts Department",
    email: "accounts@xmonks.com",
    useCount: 4,
    lastUsedAt: "2026-01-01T00:00:00.000Z",
    isDefault: true,
    tag: "Finance",
  },
  {
    id: "seed-sales-admin",
    name: "Admin / Sales",
    email: "sales@xmonks.com",
    useCount: 4,
    lastUsedAt: "2026-01-01T00:00:00.000Z",
    isDefault: true,
    tag: "Operations",
  },
];

export function getStoredContactSuggestions(): ContactSuggestion[] {
  if (typeof window === "undefined") return SEED_CONTACT_SUGGESTIONS;

  try {
    const raw = localStorage.getItem(CC_STORAGE_KEY);
    if (raw) {
      const parsed: ContactSuggestion[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge missing seeds so core team is always present
        const merged = [...parsed];
        for (const seed of SEED_CONTACT_SUGGESTIONS) {
          if (!merged.some((m) => m.email.toLowerCase() === seed.email.toLowerCase())) {
            merged.push(seed);
          }
        }
        merged.sort((a, b) => (b.useCount || 0) - (a.useCount || 0));
        return merged;
      }
    }
  } catch (e) {
    console.warn("Error reading contact suggestions from localStorage", e);
  }

  saveLocalContactSuggestions(SEED_CONTACT_SUGGESTIONS);
  return SEED_CONTACT_SUGGESTIONS;
}

export function saveLocalContactSuggestions(list: ContactSuggestion[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CC_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Error saving contact suggestions to localStorage", e);
  }
}

/**
 * Parses email strings like "karan.verma@xmonks.com, Preeti Verma <preeinspires@gmail.com>"
 * and records newly used or existing contacts to increase frequency ranking.
 */
export function recordUsedEmails(input?: string | string[] | null): void {
  if (!input) return;
  const rawList = Array.isArray(input) ? input : [input];
  const itemsToProcess: Array<{ email: string; name?: string }> = [];

  for (const raw of rawList) {
    if (!raw || typeof raw !== "string") continue;
    // Split by comma or semicolon
    const tokens = raw.split(/[,;]+/);
    for (const token of tokens) {
      const trimmed = token.trim();
      if (!trimmed || !trimmed.includes("@")) continue;

      // Check if format is: "Name <email@domain.com>"
      const match = trimmed.match(/^(?:([^<]+)<)?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s*>?$/);
      if (match) {
        const name = match[1]?.trim() || "";
        const email = match[2].trim().toLowerCase();
        itemsToProcess.push({ email, name: name || undefined });
      } else {
        // Simple email extraction
        const emailMatch = trimmed.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
          itemsToProcess.push({ email: emailMatch[1].trim().toLowerCase() });
        }
      }
    }
  }

  if (itemsToProcess.length === 0) return;

  const current = getStoredContactSuggestions();
  const updated = [...current];

  for (const item of itemsToProcess) {
    const existingIndex = updated.findIndex(
      (c) => c.email.toLowerCase() === item.email.toLowerCase()
    );

    if (existingIndex >= 0) {
      const existing = updated[existingIndex];
      const updatedContact: ContactSuggestion = {
        ...existing,
        name: item.name || existing.name,
        useCount: (existing.useCount || 0) + 1,
        lastUsedAt: new Date().toISOString(),
      };
      updated[existingIndex] = updatedContact;

      // Sync updated item to Firestore
      if (typeof window !== "undefined") {
        try {
          const docRef = doc(db, CC_COLLECTION, updatedContact.id);
          setDoc(docRef, updatedContact, { merge: true }).catch(() => {});
        } catch {}
      }
    } else {
      // Create new contact entry
      const autoName =
        item.name ||
        item.email
          .split("@")[0]
          .replace(/[._-]/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());

      const newId = `contact-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newContact: ContactSuggestion = {
        id: newId,
        name: autoName,
        email: item.email,
        useCount: 1,
        lastUsedAt: new Date().toISOString(),
        tag: "Recent",
      };
      updated.push(newContact);

      // Sync new item to Firestore
      if (typeof window !== "undefined") {
        try {
          const docRef = doc(db, CC_COLLECTION, newId);
          setDoc(docRef, newContact, { merge: true }).catch(() => {});
        } catch {}
      }
    }
  }

  // Sort by useCount descending
  updated.sort((a, b) => (b.useCount || 0) - (a.useCount || 0));
  saveLocalContactSuggestions(updated);
}

/**
 * Real-time listener for team CC contacts from Firestore
 */
export function subscribeToContactSuggestions(
  onData: (suggestions: ContactSuggestion[]) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let unsubscribed = false;

  try {
    const ref = collection(db, CC_COLLECTION);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (unsubscribed) return;
        if (!snapshot.empty) {
          const firestoreContacts: ContactSuggestion[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<ContactSuggestion, "id">),
          }));

          // Merge seeds
          for (const seed of SEED_CONTACT_SUGGESTIONS) {
            if (!firestoreContacts.some((c) => c.email.toLowerCase() === seed.email.toLowerCase())) {
              firestoreContacts.push(seed);
            }
          }

          firestoreContacts.sort((a, b) => (b.useCount || 0) - (a.useCount || 0));
          saveLocalContactSuggestions(firestoreContacts);
          onData(firestoreContacts);
        } else {
          // If collection empty, seed it
          const locals = getStoredContactSuggestions();
          locals.forEach((c) => {
            const docRef = doc(db, CC_COLLECTION, c.id);
            setDoc(docRef, c, { merge: true }).catch(() => {});
          });
          onData(locals);
        }
      },
      (error) => {
        console.warn("Firestore contact suggestions listener fallback:", error);
        if (!unsubscribed) {
          onData(getStoredContactSuggestions());
        }
      }
    );

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  } catch {
    onData(getStoredContactSuggestions());
    return () => {};
  }
}
