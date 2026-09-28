import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

/**
 * Resolves the effective SalesQL Bearer token for API routes.
 * Priority order:
 * 1. Explicit token in client request body (e.g. from developer tester)
 * 2. Environment variable (`salesql_api` / `SALESQL_API`)
 * 3. Shared workspace config saved in Firestore by Admin (`b2b_salesql_config/default`)
 */
export async function getEffectiveSalesQLToken(requestToken?: string): Promise<string> {
  // 1. Request body token
  if (requestToken && requestToken.trim()) {
    return requestToken.trim();
  }

  // 2. Environment variable
  const envKey =
    process.env.salesql_api ||
    process.env.SALESQL_API ||
    process.env.SALESQL_API_KEY ||
    "";

  if (envKey && envKey.trim()) {
    return envKey.trim();
  }

  // 3. Shared Firestore config saved by admin in Developer Tab
  try {
    const docRef = doc(db, "b2b_salesql_config", "default");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data?.apiKey && typeof data.apiKey === "string" && data.apiKey.trim()) {
        return data.apiKey.trim();
      }
    }
  } catch (error) {
    console.warn("Failed to retrieve shared SalesQL token from Firestore:", error);
  }

  return "";
}
