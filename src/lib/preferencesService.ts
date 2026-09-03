import { db } from "./firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

export interface UserPreferences {
  activeTab?: string;
  searchTerm?: string;
  fromDate?: string;
  toDate?: string;
  selectedStage?: string;
  selectedWeightage?: string;
  updatedAt?: string;
}

const PREFERENCES_COLLECTION = "b2b_user_preferences";
const LOCAL_PREF_PREFIX = "xmonks_b2b_pref_";

export function getLocalPreferences(username: string): UserPreferences | null {
  if (typeof window === "undefined" || !username) return null;
  try {
    const raw = localStorage.getItem(`${LOCAL_PREF_PREFIX}${username.toLowerCase()}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to read local preferences:", e);
  }
  return null;
}

export function saveLocalPreferences(username: string, prefs: UserPreferences): void {
  if (typeof window === "undefined" || !username) return;
  try {
    localStorage.setItem(
      `${LOCAL_PREF_PREFIX}${username.toLowerCase()}`,
      JSON.stringify(prefs)
    );
  } catch (e) {
    console.warn("Failed to save local preferences:", e);
  }
}

// Persist user preferences to Firestore
export async function saveUserPreferencesToFirestore(
  username: string,
  prefs: Partial<UserPreferences>
): Promise<void> {
  if (!username) return;
  const cleanUser = username.toLowerCase();
  const current = getLocalPreferences(cleanUser) || {};
  const updated: UserPreferences = {
    ...current,
    ...prefs,
    updatedAt: new Date().toISOString(),
  };

  saveLocalPreferences(cleanUser, updated);

  if (typeof window !== "undefined") {
    try {
      const docRef = doc(db, PREFERENCES_COLLECTION, cleanUser);
      await setDoc(docRef, updated, { merge: true });
    } catch (err) {
      console.warn("Failed to sync preferences to Firestore:", err);
    }
  }
}

// Subscribe to real-time user preferences from Firestore
export function subscribeToUserPreferences(
  username: string,
  onData: (prefs: UserPreferences) => void
): () => void {
  if (typeof window === "undefined" || !username) return () => {};

  const cleanUser = username.toLowerCase();
  let unsubscribed = false;

  try {
    const docRef = doc(db, PREFERENCES_COLLECTION, cleanUser);
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (unsubscribed) return;
        if (snap.exists()) {
          const data = snap.data() as UserPreferences;
          saveLocalPreferences(cleanUser, data);
          onData(data);
        } else {
          const local = getLocalPreferences(cleanUser);
          if (local) onData(local);
        }
      },
      (error) => {
        console.warn("Firestore preferences listener fallback to local:", error);
        if (!unsubscribed) {
          const local = getLocalPreferences(cleanUser);
          if (local) onData(local);
        }
      }
    );

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  } catch (error) {
    const local = getLocalPreferences(cleanUser);
    if (local) onData(local);
    return () => {};
  }
}
