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

// Seed default users to Firestore ensuring all VALID_USERS exist
export async function seedInitialUsers(): Promise<void> {
  try {
    for (const u of VALID_USERS) {
      const docRef = doc(db, USERS_COLLECTION, u.username.toLowerCase());
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        await setDoc(docRef, u);
      }
    }
  } catch (e) {
    console.warn("Error seeding users to Firestore:", e);
  }
}

// Authenticate user against Firestore (with local fallback and auto-sync)
export async function authenticateUserFromFirestore(
  usernameInput: string,
  passwordInput: string
): Promise<UserAccount | null> {
  const cleanUser = usernameInput.trim().toLowerCase();
  const cleanPass = passwordInput.trim();

  // Find static config match
  const staticMatch = VALID_USERS.find(
    (u) =>
      u.username.toLowerCase() === cleanUser &&
      (u.password === cleanPass || u.password.toLowerCase() === cleanPass.toLowerCase())
  );

  try {
    const userDocRef = doc(db, USERS_COLLECTION, cleanUser);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const user = docSnap.data() as UserAccount;
      if (user.password === cleanPass || user.password.toLowerCase() === cleanPass.toLowerCase()) {
        return user;
      }
      return null;
    }

    // If not in Firestore but in static config, write to Firestore and log in
    if (staticMatch) {
      try {
        await setDoc(userDocRef, staticMatch);
      } catch (writeErr) {
        console.warn("Failed to write user to Firestore:", writeErr);
      }
      return staticMatch;
    }

    return null;
  } catch (err) {
    console.warn("Firestore authentication check fallback to local cache:", err);
    if (staticMatch) return staticMatch;
    const cached = getCachedUsers();
    const found = cached.find(
      (u) =>
        u.username.toLowerCase() === cleanUser &&
        (u.password === cleanPass || u.password.toLowerCase() === cleanPass.toLowerCase())
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

export interface ChangePasswordResult {
  success: boolean;
  message?: string;
  error?: string;
}

// Change user password in Firestore, local cache, and active session
export async function changeUserPassword(
  username: string,
  currentPassInput: string,
  newPassInput: string
): Promise<ChangePasswordResult> {
  const cleanUser = username.trim().toLowerCase();
  const currentPass = currentPassInput.trim();
  const newPass = newPassInput.trim();

  if (!cleanUser) {
    return { success: false, error: "Username is required." };
  }
  if (!currentPass) {
    return { success: false, error: "Please enter your current password." };
  }
  if (!newPass) {
    return { success: false, error: "Please enter a new password." };
  }
  if (newPass.length < 3) {
    return { success: false, error: "New password must be at least 3 characters long." };
  }
  if (currentPass === newPass) {
    return { success: false, error: "New password must be different from your current password." };
  }

  try {
    // 1. Check against Firestore
    const userDocRef = doc(db, USERS_COLLECTION, cleanUser);
    const docSnap = await getDoc(userDocRef);
    let userAccount: UserAccount | null = null;

    if (docSnap.exists()) {
      userAccount = docSnap.data() as UserAccount;
    } else {
      // Check static users fallback
      const staticMatch = VALID_USERS.find(
        (u) => u.username.toLowerCase() === cleanUser
      );
      if (staticMatch) {
        userAccount = { ...staticMatch };
      }
    }

    if (!userAccount) {
      // Check local cache
      const cached = getCachedUsers();
      const cachedMatch = cached.find(
        (u) => u.username.toLowerCase() === cleanUser
      );
      if (cachedMatch) userAccount = { ...cachedMatch };
    }

    if (!userAccount) {
      return { success: false, error: "User account could not be found." };
    }

    // Verify current password
    if (
      userAccount.password !== currentPass &&
      userAccount.password.toLowerCase() !== currentPass.toLowerCase()
    ) {
      return { success: false, error: "Current password does not match our records." };
    }

    // Update password
    const updatedUser: UserAccount = {
      ...userAccount,
      password: newPass,
    };

    // Update Firestore
    try {
      await setDoc(userDocRef, updatedUser, { merge: true });
    } catch (fsErr) {
      console.warn("Firestore password update warning:", fsErr);
    }

    // Update local cached users list
    const currentCached = getCachedUsers();
    const updatedCached = currentCached.map((u) =>
      u.username.toLowerCase() === cleanUser ? { ...u, password: newPass } : u
    );
    if (!updatedCached.some((u) => u.username.toLowerCase() === cleanUser)) {
      updatedCached.push(updatedUser);
    }
    cacheUsersLocally(updatedCached);

    // Update in-memory VALID_USERS if present
    const staticIdx = VALID_USERS.findIndex((u) => u.username.toLowerCase() === cleanUser);
    if (staticIdx >= 0) {
      VALID_USERS[staticIdx].password = newPass;
    }

    // Update active user in localStorage if matching
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("xmonks_b2b_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.username && parsed.username.toLowerCase() === cleanUser) {
            localStorage.setItem(
              "xmonks_b2b_user",
              JSON.stringify({ ...parsed, password: newPass })
            );
          }
        }
      } catch (lsErr) {
        console.warn("Failed to update active user password in localStorage", lsErr);
      }
    }

    return {
      success: true,
      message: "Password changed successfully! You can now use your new password.",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update password. Please try again.",
    };
  }
}
