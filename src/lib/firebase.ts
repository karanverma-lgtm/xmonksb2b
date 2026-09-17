import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, Auth } from "firebase/auth";
import { getStorage, FirebaseStorage } from "firebase/storage";

// B2B CRM Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyB3MdBpNZViKjiknIm7KdJ6w7cCgi0yQwo",
  authDomain: "xmonksb2b2.firebaseapp.com",
  projectId: "xmonksb2b2",
  storageBucket: "xmonksb2b2.firebasestorage.app",
  messagingSenderId: "1091689757358",
  appId: "1:1091689757358:web:a5fd624e481711c2838b3f",
  measurementId: "G-1SVQB1XFHS",
};

// Initialize Firebase App safely for Next.js SSR
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth: Auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(app);

// Client-side anonymous authentication using enabled Anonymous provider
if (typeof window !== "undefined") {
  signInAnonymously(auth).catch((err) => {
    console.warn("Firebase Anonymous Auth status:", err?.message || err);
  });
}

let analyticsInstance: Analytics | null = null;

if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analyticsInstance = getAnalytics(app);
    }
  });
}

export { analyticsInstance as analytics };
