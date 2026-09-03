import { db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { UserAccount, VALID_USERS } from "@/constants/users";

const USERS_COLLECTION = "b2b_users";
const LOCAL_USERS_KEY = "xmonks_b2b_cached_users";

export function getCachedUsers(): UserAccount[] {
  if (typeof window === "undefined") return VALID_USERS;
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading cached users:", e);
  }
  return VALID_USERS;
}

export function cacheUsersLocally(users: UserAccount[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn("Failed to cache users locally:", e);
  }
}

// Seed default users to Firestore if collection is empty
export async function seedInitialUsers(): Promise<void> {
  try {
    const ref = collection(db, USERS_COLLECTION);
    const snap = await getDocs(ref);
    if (snap.empty) {
      for (const u of VALID_USERS) {
        await setDoc(doc(db, USERS_COLLECTION, u.username.toLowerCase()), u);
      }
    }
  } catch (e) {
    console.warn("Error seeding users to Firestore:", e);
  }
}

// Authenticate user against Firestore (with local fallback)
export async function authenticateUserFromFirestore(
  usernameInput: string,
  passwordInput: string
): Promise<UserAccount | null> {
  const cleanUser = usernameInput.trim().toLowerCase();

  try {
    const userDocRef = doc(db, USERS_COLLECTION, cleanUser);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const user = docSnap.data() as UserAccount;
      if (user.password === passwordInput) {
        return user;
      }
      return null;
    }

    // If Firestore collection hasn't been seeded yet, seed and check fallback
    await seedInitialUsers();
    const fallbackMatch = VALID_USERS.find(
      (u) => u.username.toLowerCase() === cleanUser && u.password === passwordInput
    );
    return fallbackMatch || null;
  } catch (err) {
    console.warn("Firestore authentication check fallback to local cache:", err);
    const cached = getCachedUsers();
    const found = cached.find(
      (u) => u.username.toLowerCase() === cleanUser && u.password === passwordInput
    );
    return found || null;
  }
}

// Subscribe to all users in Firestore
export function subscribeToUsers(
  onData: (users: UserAccount[]) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let unsubscribed = false;

  try {
    const ref = collection(db, USERS_COLLECTION);
    const unsubscribe = onSnapshot(
      ref,
      async (snapshot) => {
        if (unsubscribed) return;
        if (snapshot.empty) {
          await seedInitialUsers();
          onData(VALID_USERS);
        } else {
          const users: UserAccount[] = snapshot.docs.map(
            (d) => d.data() as UserAccount
          );
          cacheUsersLocally(users);
          onData(users);
        }
      },
      (error) => {
        console.warn("Firestore users subscription fallback to cached:", error);
        if (!unsubscribed) {
          onData(getCachedUsers());
        }
      }
    );

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  } catch {
    onData(getCachedUsers());
    return () => {};
  }
}

// Create or update user account in Firestore
export async function saveUserToFirestore(user: UserAccount): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, user.username.toLowerCase());
    await setDoc(docRef, user, { merge: true });
    
    // Update local cache
    const current = getCachedUsers();
    const filtered = current.filter((u) => u.username.toLowerCase() !== user.username.toLowerCase());
    cacheUsersLocally([user, ...filtered]);
  } catch (err) {
    console.warn("Failed to save user to Firestore:", err);
  }
}
