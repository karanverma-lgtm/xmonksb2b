import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import {
  SalesQLOrganization,
  SalesQLPerson,
  ProspectHistoryRecord,
  BulkEnrichPersonQuery,
  BulkEnrichPersonItemResult,
} from "@/types/salesql";

const SALESQL_STORAGE_KEY = "xmonks_b2b_salesql_api_key";
const PROSPECTS_COLLECTION = "b2b_prospects";
const PROSPECTS_STORAGE_KEY = "xmonks_b2b_prospect_history";

// --- API KEY STORAGE & ENV ---

export function getStoredSalesQLKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(SALESQL_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function saveSalesQLKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    if (!key) {
      localStorage.removeItem(SALESQL_STORAGE_KEY);
    } else {
      localStorage.setItem(SALESQL_STORAGE_KEY, key.trim());
    }
  } catch (e) {
    console.warn("Failed to save SalesQL key to localStorage", e);
  }
}

export async function fetchEnvSalesQLConfig(): Promise<{
  hasEnvKey: boolean;
  envKey: string;
  maskedKey: string;
}> {
  try {
    const res = await fetch("/api/salesql/get-config");
    if (!res.ok) throw new Error("Failed to fetch SalesQL config");
    return await res.json();
  } catch {
    return { hasEnvKey: false, envKey: "", maskedKey: "" };
  }
}

export async function testSalesQLApiKey(apiKey?: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  sampleData?: any;
}> {
  try {
    const res = await fetch("/api/salesql/test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to reach test server." };
  }
}

// --- API ACTIONS ---

export async function enrichOrganization(params: {
  linkedin_url?: string;
  organization_name?: string;
  organization_domain?: string;
  apiKey?: string;
}): Promise<SalesQLOrganization> {
  const activeKey = params.apiKey || getStoredSalesQLKey();
  const res = await fetch("/api/salesql/enrich-organization", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...params, apiKey: activeKey }),
  });

  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error || "Failed to enrich organization.");
  }
  return json.data as SalesQLOrganization;
}

export async function enrichPerson(params: {
  linkedin_url?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  organization_name?: string;
  organization_domain?: string;
  match_if_direct_email?: boolean;
  match_if_direct_phone?: boolean;
  apiKey?: string;
}): Promise<SalesQLPerson> {
  const activeKey = params.apiKey || getStoredSalesQLKey();
  const res = await fetch("/api/salesql/enrich-person", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...params, apiKey: activeKey }),
  });

  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error || "Failed to enrich person.");
  }
  return json.data as SalesQLPerson;
}

export async function emailLookupPerson(
  email: string,
  apiKey?: string
): Promise<SalesQLPerson> {
  const activeKey = apiKey || getStoredSalesQLKey();
  const res = await fetch("/api/salesql/email-lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, apiKey: activeKey }),
  });

  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error || "Failed to lookup person by email.");
  }
  return json.data as SalesQLPerson;
}

export async function bulkEnrichPersons(
  queries: BulkEnrichPersonQuery[],
  apiKey?: string
): Promise<BulkEnrichPersonItemResult[]> {
  const activeKey = apiKey || getStoredSalesQLKey();
  const res = await fetch("/api/salesql/enrich-person-bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ queries, apiKey: activeKey }),
  });

  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error || "Failed to bulk enrich persons.");
  }
  return (json.data || []) as BulkEnrichPersonItemResult[];
}

// --- PROSPECT HISTORY (FIRESTORE + LOCAL STORAGE) ---

export function getStoredProspects(): ProspectHistoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROSPECTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveLocalProspects(records: ProspectHistoryRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROSPECTS_STORAGE_KEY, JSON.stringify(records));
  } catch {}
}

export async function saveProspectToHistory(record: ProspectHistoryRecord): Promise<void> {
  // 1. Local storage update
  const current = getStoredProspects();
  const updated = [record, ...current.filter((r) => r.id !== record.id)].slice(0, 100);
  saveLocalProspects(updated);

  // 2. Firestore sync
  if (typeof window !== "undefined") {
    try {
      const docRef = doc(db, PROSPECTS_COLLECTION, record.id);
      await setDoc(docRef, record, { merge: true });
    } catch (e) {
      console.warn("Firestore save prospect history warning:", e);
    }
  }
}

export function subscribeToProspectHistory(
  onData: (records: ProspectHistoryRecord[]) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let unsubscribed = false;

  try {
    const ref = collection(db, PROSPECTS_COLLECTION);
    const q = query(ref, orderBy("prospectedAtMs", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (unsubscribed) return;
        if (!snapshot.empty) {
          const records: ProspectHistoryRecord[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<ProspectHistoryRecord, "id">),
          }));
          saveLocalProspects(records);
          onData(records);
        } else {
          onData(getStoredProspects());
        }
      },
      (error) => {
        console.warn("Firestore prospect history fallback to local:", error);
        if (!unsubscribed) onData(getStoredProspects());
      }
    );

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  } catch {
    onData(getStoredProspects());
    return () => {};
  }
}

export async function deleteProspectFromHistory(id: string): Promise<void> {
  const current = getStoredProspects();
  saveLocalProspects(current.filter((r) => r.id !== id));

  if (typeof window !== "undefined") {
    try {
      const docRef = doc(db, PROSPECTS_COLLECTION, id);
      await deleteDoc(docRef);
    } catch (e) {
      console.warn("Firestore delete prospect warning:", e);
    }
  }
}

export const deleteProspectRecord = deleteProspectFromHistory;

export async function clearAllProspectHistory(records?: ProspectHistoryRecord[]): Promise<void> {
  const listToClear = records && records.length > 0 ? records : getStoredProspects();
  saveLocalProspects([]);
  if (typeof window !== "undefined" && listToClear.length > 0) {
    try {
      await Promise.all(
        listToClear.map((r) => deleteDoc(doc(db, PROSPECTS_COLLECTION, r.id)).catch(() => {}))
      );
    } catch {}
  }
}

// Export Enriched Prospects to CSV
export function exportProspectsToCSV(
  records: ProspectHistoryRecord[],
  filename = "xMonks_B2B_Prospects_Export"
): void {
  if (records.length === 0) {
    alert("No prospect records to export.");
    return;
  }

  const headers = [
    "Type",
    "Full Name / Company",
    "Title / Headline",
    "Current Organization",
    "Verified Work Email",
    "All Emails",
    "Direct Phone Numbers",
    "LinkedIn URL",
    "Company Website",
    "Company Size",
    "Prospected By",
    "Prospected Date",
  ];

  const escapeCSV = (val: unknown) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = records.map((r) => {
    const isPerson = r.type === "person";
    const p = r.personData;
    const o = r.orgData;

    const name = isPerson ? p?.full_name || `${p?.first_name || ""} ${p?.last_name || ""}`.trim() : o?.name || "";
    const title = isPerson ? p?.title || p?.headline || "" : o?.type || "";
    const org = isPerson ? p?.organization?.name || "" : o?.name || "";
    const workEmail = isPerson ? p?.emails?.find((e) => e.type === "Work")?.email || p?.emails?.[0]?.email || "" : "";
    const allEmails = isPerson ? p?.emails?.map((e) => e.email).join("; ") || "" : "";
    const phones = isPerson ? p?.phones?.map((ph) => ph.phone).join("; ") || "" : "";
    const linkedin = isPerson ? p?.linkedin_url || "" : o?.linkedin_url || "";
    const website = isPerson ? p?.organization?.website || "" : o?.website || "";
    const size = isPerson ? p?.organization?.number_of_employees || "" : o?.number_of_employees || "";

    return [
      escapeCSV(r.type.toUpperCase()),
      escapeCSV(name),
      escapeCSV(title),
      escapeCSV(org),
      escapeCSV(workEmail),
      escapeCSV(allEmails),
      escapeCSV(phones),
      escapeCSV(linkedin),
      escapeCSV(website),
      escapeCSV(size),
      escapeCSV(r.prospectedBy || "Sales Rep"),
      escapeCSV(r.prospectedAt || ""),
    ];
  });

  const csvContent =
    "data:text/csv;charset=utf-8,\uFEFF" +
    [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute(
    "download",
    `${filename}_${new Date().toISOString().split("T")[0]}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Parse freeform text, raw URLs, emails, or CSV into BulkEnrichPersonQuery array
export function parseTextToBulkQueries(rawText: string): BulkEnrichPersonQuery[] {
  if (!rawText || !rawText.trim()) return [];

  // Try JSON parse first
  const trimmed = rawText.trim();
  if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr.map((item) => ({
        linkedin_url: item.linkedin_url || item.linkedin || undefined,
        email: item.email || undefined,
        first_name: item.first_name || item.firstName || undefined,
        last_name: item.last_name || item.lastName || undefined,
        full_name: item.full_name || item.fullName || item.name || undefined,
        organization_name: item.organization_name || item.company_name || item.company || undefined,
        organization_domain: item.organization_domain || item.domain || item.company_domain || undefined,
      }));
    } catch {}
  }

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Check if first line is CSV header
  let startIndex = 0;
  const headerLine = lines[0].toLowerCase();
  let headers: string[] = [];

  if (
    headerLine.includes("linkedin") ||
    headerLine.includes("email") ||
    headerLine.includes("name") ||
    headerLine.includes("company") ||
    headerLine.includes("domain")
  ) {
    headers = lines[0].split(/[,\t]/).map((h) => h.replace(/^["']|["']$/g, "").trim().toLowerCase());
    startIndex = 1;
  }

  const queries: BulkEnrichPersonQuery[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // If we have CSV headers
    if (headers.length > 0) {
      const cols = line.split(/[,\t]/).map((c) => c.replace(/^["']|["']$/g, "").trim());
      const query: BulkEnrichPersonQuery = {};
      headers.forEach((h, idx) => {
        const val = cols[idx] || "";
        if (!val) return;
        if (h.includes("linkedin")) query.linkedin_url = val;
        else if (h.includes("email")) query.email = val;
        else if (h.includes("first") && h.includes("name")) query.first_name = val;
        else if (h.includes("last") && h.includes("name")) query.last_name = val;
        else if (h.includes("full") || h === "name") query.full_name = val;
        else if (h.includes("domain") || h.includes("website")) query.organization_domain = val;
        else if (h.includes("org") || h.includes("company")) query.organization_name = val;
      });

      if (
        query.linkedin_url ||
        query.email ||
        query.full_name ||
        (query.first_name && query.last_name)
      ) {
        queries.push(query);
      }
      continue;
    }

    // Line without headers: smart detection
    // 1. Is it a LinkedIn URL?
    if (line.includes("linkedin.com/in/")) {
      const match = line.match(/https?:\/\/[^\s,]+/);
      queries.push({ linkedin_url: match ? match[0] : line });
      continue;
    }

    // 2. Is it an email address?
    if (line.includes("@") && !line.includes(",")) {
      queries.push({ email: line.trim() });
      continue;
    }

    // 3. Comma-separated: Name, Company (or Name, Domain)
    if (line.includes(",")) {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length >= 2) {
        const firstPart = parts[0];
        const secondPart = parts[1];
        if (secondPart.includes(".") && !secondPart.includes(" ")) {
          queries.push({ full_name: firstPart, organization_domain: secondPart });
        } else {
          queries.push({ full_name: firstPart, organization_name: secondPart });
        }
        continue;
      }
    }

    // 4. Fallback: single value (could be email or name)
    if (line.includes("@")) {
      queries.push({ email: line });
    } else {
      queries.push({ full_name: line });
    }
  }

  return queries.slice(0, 100);
}

// Export Bulk Enriched Results to CSV
export function exportBulkEnrichResultsToCSV(
  items: { query: BulkEnrichPersonQuery; person?: SalesQLPerson; error?: string }[],
  filename = "salesql_bulk_enriched"
): void {
  if (typeof window === "undefined" || !items || items.length === 0) return;

  const headers = [
    "Status",
    "Full Name",
    "Job Title",
    "Organization",
    "Work Email",
    "All Emails",
    "Phone Numbers",
    "LinkedIn Profile",
    "Website",
    "Company Headcount",
    "Error Details",
  ];

  const escapeCSV = (str?: string | number | null) => {
    if (str === undefined || str === null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = items.map((item) => {
    const p = item.person;
    const isFound = Boolean(p && !item.error);

    const name = p?.full_name || `${p?.first_name || ""} ${p?.last_name || ""}`.trim() || item.query.full_name || "";
    const title = p?.title || p?.headline || "";
    const org = p?.organization?.name || item.query.organization_name || "";
    const workEmail = p?.emails?.find((e) => e.type === "Work")?.email || p?.emails?.[0]?.email || item.query.email || "";
    const allEmails = p?.emails?.map((e) => `${e.email} (${e.status || "unverified"})`).join("; ") || "";
    const phones = p?.phones?.map((ph) => ph.phone).join("; ") || "";
    const linkedin = p?.linkedin_url || item.query.linkedin_url || "";
    const website = p?.organization?.website || p?.organization?.website_domain || item.query.organization_domain || "";
    const headcount = p?.organization?.number_of_employees || "";
    const err = item.error || "";

    return [
      escapeCSV(isFound ? "FOUND" : "NOT FOUND"),
      escapeCSV(name),
      escapeCSV(title),
      escapeCSV(org),
      escapeCSV(workEmail),
      escapeCSV(allEmails),
      escapeCSV(phones),
      escapeCSV(linkedin),
      escapeCSV(website),
      escapeCSV(headcount),
      escapeCSV(err),
    ];
  });

  const csvContent =
    "data:text/csv;charset=utf-8,\uFEFF" +
    [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
