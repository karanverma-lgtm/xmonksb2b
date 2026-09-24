import { db } from "./firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

const GEMINI_STORAGE_KEY = "xmonks_b2b_gemini_api_key";
const AI_CONFIG_COLLECTION = "b2b_ai_config";

export function getStoredGeminiKey(): string {
  if (typeof window === "undefined") {
    return process.env.gemini_api_key || process.env.GEMINI_API_KEY || "";
  }
  try {
    const key = localStorage.getItem(GEMINI_STORAGE_KEY);
    if (key && key.trim()) {
      return key.trim();
    }
  } catch (e) {
    console.warn("Error reading gemini key from localStorage", e);
  }
  return "";
}

export function saveLocalGeminiKey(apiKey: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GEMINI_STORAGE_KEY, apiKey.trim());
  } catch (e) {
    console.warn("Failed to save gemini key locally", e);
  }
}

export function saveGeminiKey(apiKey: string): void {
  const clean = apiKey.trim();
  saveLocalGeminiKey(clean);

  if (typeof window !== "undefined") {
    try {
      const docRef = doc(db, AI_CONFIG_COLLECTION, "default");
      setDoc(docRef, { apiKey: clean, updatedAt: new Date().toISOString() }, { merge: true }).catch(
        (err) => console.warn("Firestore save gemini key warning:", err)
      );
    } catch (e) {
      console.warn("Firestore save gemini key error:", e);
    }
  }
}

export function subscribeToGeminiKey(
  onData: (apiKey: string, isSyncing: boolean) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let unsubscribed = false;

  try {
    const docRef = doc(db, AI_CONFIG_COLLECTION, "default");
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (unsubscribed) return;
        if (snap.exists()) {
          const data = snap.data();
          const remoteKey = data?.apiKey || "";
          if (remoteKey) {
            saveLocalGeminiKey(remoteKey);
            onData(remoteKey, true);
            return;
          }
        }
        onData(getStoredGeminiKey(), true);
      },
      (error) => {
        console.warn("Firestore gemini key listener fallback:", error);
        if (!unsubscribed) {
          onData(getStoredGeminiKey(), false);
        }
      }
    );

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  } catch {
    onData(getStoredGeminiKey(), false);
    return () => {};
  }
}

export async function fetchEnvGeminiConfig(): Promise<{ hasEnvKey: boolean; envKey: string; maskedKey: string }> {
  try {
    const res = await fetch("/api/ai/get-config");
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Failed to check env gemini config", e);
  }
  return { hasEnvKey: false, envKey: "", maskedKey: "" };
}

export async function testGeminiApiKey(apiKey?: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const keyToTest = apiKey?.trim() || getStoredGeminiKey();
    const res = await fetch("/api/ai/test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: keyToTest }),
    });
    return await res.json();
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to connect to AI test endpoint",
    };
  }
}

export interface GenerateTemplateParams {
  context: string;
  tone?: string;
  program?: string;
  senderName?: string;
  includeTags?: boolean;
  apiKey?: string;
}

export interface GeneratedTemplateResult {
  success: boolean;
  subject: string;
  htmlContent: string;
  templateName: string;
  summary: string;
  error?: string;
}

export async function generateAIEmailTemplate(
  params: GenerateTemplateParams
): Promise<GeneratedTemplateResult> {
  const apiKey = params.apiKey || getStoredGeminiKey();
  const res = await fetch("/api/email/generate-template", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...params,
      apiKey,
    }),
  });

  return await res.json();
}
