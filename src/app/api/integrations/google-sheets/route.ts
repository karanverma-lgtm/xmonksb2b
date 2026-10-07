export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db, auth } from "@/lib/firebase";
import { signInAnonymously } from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  limit,
} from "firebase/firestore";
import { ColdClient, ColdClientStatus, OutreachChannel, OutreachTouchpoint } from "@/types/outreach";
import { formatTimestamp, sanitizeForFirestore } from "@/lib/leadsService";

const COLLECTION_NAME = "b2b_cold_clients";

function getExpectedToken(): string {
  return process.env.GOOGLE_SHEETS_SYNC_SECRET || "xmonks_outreach_sync_2026";
}

function verifyAuth(req: NextRequest, bodyToken?: string): boolean {
  const headerToken = req.headers.get("x-sync-token") || req.headers.get("authorization")?.replace("Bearer ", "");
  const queryToken = req.nextUrl.searchParams.get("token");
  const expected = getExpectedToken().trim();

  const supplied = (headerToken || queryToken || bodyToken || "").trim();
  return Boolean(supplied && supplied === expected);
}

// Ensure Firebase is authenticated on server
async function ensureServerAuth() {
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (e) {
      console.warn("Google Sheets API: Anonymous auth note:", e);
    }
  }
}

function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cleanOwner(val?: string): string {
  if (!val) return "Amit";
  const lower = val.toLowerCase().trim();
  if (lower === "karan") return "Amit";
  if (lower === "pooja") return "Preeti";
  if (lower === "admin") return "Admin User";
  return val.trim();
}

function parseEstimatedValue(val: unknown): number {
  if (typeof val === "number") return val;
  if (!val) return 500000;
  const str = String(val).replace(/[^0-9.]/g, "");
  const num = parseFloat(str);
  return isNaN(num) || num <= 0 ? 500000 : num;
}

const VALID_STATUSES: ColdClientStatus[] = [
  "cold_no_answer",
  "outreach_sent",
  "follow_up_in_progress",
  "interest",
  "discussion_stakeholders",
  "share_commercial",
  "pricing_negotiations",
  "closure_won",
  "not_interested_lost",
  "future_prospect",
  "uncontacted",
  "email_sent",
  "follow_up_1",
  "follow_up_2",
  "call_scheduled",
  "replied_interested",
  "unresponsive",
  "not_interested",
  "converted",
];

function normalizeStatus(val?: string): ColdClientStatus {
  if (!val) return "cold_no_answer";
  const clean = val.toLowerCase().trim().replace(/[\s/\\-]+/g, "_");
  if (VALID_STATUSES.includes(clean as ColdClientStatus)) {
    return clean as ColdClientStatus;
  }
  // Exact matches for the user's dropdown options:
  if (clean.includes("commercial")) return "share_commercial";
  if (clean.includes("stakeholder") || clean.includes("discussion") || clean.includes("meeting") || clean.includes("call")) return "interest";
  if (clean.includes("pricing") || clean.includes("negotiat")) return "pricing_negotiations";
  if (clean.includes("closure") || clean.includes("won")) return "closure_won";
  if (clean.includes("future")) return "future_prospect";
  if (clean.includes("lost") || clean.includes("not_interested") || clean.includes("reject") || clean.includes("drop")) return "not_interested_lost";
  if (clean.includes("interest") && !clean.includes("not")) return "interest";
  if (clean.includes("progress") || clean.includes("cadence") || (clean.includes("follow") && clean.includes("progress"))) return "follow_up_in_progress";
  if (clean.includes("outreach_sent") || (clean.includes("outreach") && clean.includes("sent")) || clean.includes("contacted")) return "outreach_sent";
  if (clean.includes("cold") || clean.includes("no_answer") || clean.includes("uncontacted") || clean.includes("new")) return "cold_no_answer";

  // Legacy mappings
  if (clean.includes("sent") || clean.includes("mail")) return "outreach_sent";
  if (clean.includes("follow") || clean.includes("fup")) return "follow_up_in_progress";
  if (clean.includes("unresponsive") || clean.includes("ghost")) return "future_prospect";

  return "cold_no_answer";
}

const VALID_CHANNELS: OutreachChannel[] = ["email", "linkedin", "call", "referral", "event", "other"];

function normalizeChannel(val?: string): OutreachChannel {
  if (!val) return "email";
  const clean = val.toLowerCase().trim();
  if (VALID_CHANNELS.includes(clean as OutreachChannel)) {
    return clean as OutreachChannel;
  }
  if (clean.includes("in") || clean.includes("link")) return "linkedin";
  if (clean.includes("phone") || clean.includes("call") || clean.includes("contact")) return "call";
  if (clean.includes("event") || clean.includes("summit") || clean.includes("conf")) return "event";
  if (clean.includes("ref")) return "referral";
  return "email";
}

// Convert arbitrary sheet row (object or array) into normalized ColdClient partial
function mapRowToColdClient(
  row: Record<string, unknown> | unknown[],
  headers?: string[]
): Partial<ColdClient> & { initialNote?: string } {
  const rowObj: Record<string, unknown> = {};

  if (Array.isArray(row)) {
    if (headers && headers.length > 0) {
      headers.forEach((h, idx) => {
        rowObj[h] = row[idx];
      });
    } else {
      // Default fallback column positions:
      const defaultHeaders = [
        "id",
        "companyName",
        "contactName",
        "email",
        "designation",
        "phone",
        "city",
        "industry",
        "targetProgram",
        "estimatedPotentialValue",
        "status",
        "channel",
        "owner",
        "dataset",
        "notes",
      ];
      defaultHeaders.forEach((h, idx) => {
        if (row[idx] !== undefined) rowObj[h] = row[idx];
      });
    }
  } else if (typeof row === "object" && row !== null) {
    Object.assign(rowObj, row);
  }

  // Key-normalizing dictionary
  const normalizedKeys: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rowObj)) {
    normalizedKeys[normalizeKey(k)] = v;
  }

  const findVal = (...aliases: string[]): string | undefined => {
    for (const a of aliases) {
      const cleanA = normalizeKey(a);
      if (normalizedKeys[cleanA] !== undefined && normalizedKeys[cleanA] !== null) {
        const valStr = String(normalizedKeys[cleanA]).trim();
        if (valStr !== "") return valStr;
      }
    }
    return undefined;
  };

  const id = findVal("crmid", "leadid", "id", "clientid", "documentid");
  const companyName =
    findVal("companyname", "company", "organization", "account", "client", "accountname") ||
    "Unknown Organization";

  // Contact Person: supports First Name + Last Name, or single Contact Person / Full Name
  const firstName = findVal("firstname", "first", "fname");
  const lastName = findVal("lastname", "last", "lname", "surname");
  let contactName = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (!contactName) {
    contactName =
      findVal("contactperson", "contactname", "fullname", "name", "leadname", "decisionmaker") || "";
  }

  // Fallback check on 'contact' header only if it doesn't look like a phone number
  if (!contactName) {
    const rawContact = findVal("contact");
    if (rawContact && !/[0-9]{4,}/.test(rawContact)) {
      contactName = rawContact;
    }
  }
  if (!contactName) contactName = "Prospect Contact";

  // Email / Mail Id: supports 'Mail Id', 'Email', 'Email Id', 'Email Address', etc.
  const email = (
    findVal(
      "mailid",
      "emailid",
      "email",
      "contactemail",
      "emailaddress",
      "mail",
      "workemail",
      "primaryemail"
    ) || ""
  )
    .toLowerCase()
    .trim();

  // Phone / Contact: supports 'Contact', 'Phone', 'Mobile', 'Contact No', 'Phone Number', etc.
  const phone = findVal(
    "contact",
    "contactno",
    "contactnumber",
    "phone",
    "phonenumber",
    "mobile",
    "mobileno",
    "mobilenumber",
    "contactphone",
    "telephone",
    "cell",
    "tel"
  );

  const designation = findVal("designation", "title", "jobtitle", "role", "position");
  
  // Location / City: supports 'Location', 'City', 'Headquarters', 'HQ', 'Address', 'Region'
  const city = findVal("location", "city", "headquarters", "hq", "address", "region", "state");
  
  const industry = findVal("industry", "sector", "domain") || "Technology & SaaS";
  const targetProgram = findVal("targetprogram", "program", "offering", "service") || "Executive Coaching";
  const linkedinUrl = findVal("linkedinurl", "linkedin", "profile");
  const website = findVal("website", "domain", "companywebsite", "web");
  const owner = cleanOwner(findVal("owner", "assignedto", "salesrep", "rep", "executive"));
  
  // Status: supports 'Account Status', 'Status', 'Lead Status', 'Stage'
  const status = normalizeStatus(
    findVal("accountstatus", "status", "leadstatus", "stage", "accountstate")
  );
  
  const channel = normalizeChannel(findVal("channel", "source", "outreachchannel"));

  // Dataset / Cohort: supports 'Dataset', 'Cohort', 'Segment', 'Batch', 'List'
  const dataset = findVal("dataset", "cohort", "segment", "batch", "list");

  // Company Size: supports 'Company Size', 'Size', 'Employees', 'Headcount'
  const companySize = findVal("companysize", "size", "employees", "headcount", "teamsize");

  // Comments / Notes: supports 'Comments', 'Comment', 'Notes', 'Note', 'Initial Note', 'Remarks'
  const comments = findVal("comments", "comment", "initialnote", "notes", "note", "remarks", "description");

  let initialNote = comments || "";
  if (companySize && !initialNote.includes(companySize)) {
    initialNote = initialNote ? `${initialNote} (Company Size: ${companySize})` : `Company Size: ${companySize}`;
  }

  const rawValue =
    normalizedKeys["estimatedvalue"] ??
    normalizedKeys["dealvalue"] ??
    normalizedKeys["value"] ??
    normalizedKeys["potentialvalue"] ??
    normalizedKeys["estimatedpotentialvalue"];
  const estimatedPotentialValue = parseEstimatedValue(rawValue);

  return {
    id,
    companyName,
    contactName,
    email,
    phone,
    designation,
    city,
    industry,
    targetProgram,
    linkedinUrl,
    website,
    owner,
    status,
    channel,
    dataset: dataset || undefined,
    companySize,
    estimatedPotentialValue,
    initialNote,
    notes: initialNote,
  };
}

interface SourceMeta {
  sheetRowNumber?: number;
  sheetName?: string;
  spreadsheetId?: string;
}

// In-flight operation mutex to prevent concurrent Firestore writes for the same row
const inFlightSyncs = new Map<string, Promise<unknown>>();

// Upsert a single client record into Firestore with multi-tier deduplication
async function upsertColdClient(
  clientData: Partial<ColdClient> & { initialNote?: string },
  sourceMeta?: SourceMeta
): Promise<{ id: string; action: "created" | "updated" }> {
  const collRef = collection(db, COLLECTION_NAME);
  const now = new Date();
  const nowIso = now.toISOString();

  let targetDocId: string | null = null;
  let existingClient: ColdClient | null = null;

  // 1. Tier 1: Try resolving by explicit CRM ID
  if (clientData.id && clientData.id.trim() !== "") {
    const docRef = doc(db, COLLECTION_NAME, clientData.id.trim());
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      targetDocId = snap.id;
      existingClient = { id: snap.id, ...(snap.data() as Omit<ColdClient, "id">) };
    }
  }

  // 2. Tier 2: Try resolving by Sheet + Row Number (matches when user types cell-by-cell in the same row)
  if (!targetDocId && sourceMeta?.sheetRowNumber && sourceMeta?.sheetName) {
    try {
      const q = query(
        collRef,
        where("sourceSheet", "==", sourceMeta.sheetName),
        where("sheetRowNumber", "==", sourceMeta.sheetRowNumber),
        limit(1)
      );
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const foundDoc = querySnap.docs[0];
        const foundData = { id: foundDoc.id, ...(foundDoc.data() as Omit<ColdClient, "id">) };

        // Safety verification: only match if it's the same spreadsheet or same company
        const sameSpreadsheet =
          !sourceMeta.spreadsheetId ||
          !foundData.sourceSpreadsheetId ||
          foundData.sourceSpreadsheetId === sourceMeta.spreadsheetId;

        const incomingCompany = (clientData.companyName || "").trim().toLowerCase();
        const existingCompany = (foundData.companyName || "").trim().toLowerCase();
        const companyMatches =
          !incomingCompany ||
          incomingCompany === "unknown organization" ||
          !existingCompany ||
          existingCompany === "unknown organization" ||
          incomingCompany === existingCompany ||
          incomingCompany.includes(existingCompany) ||
          existingCompany.includes(incomingCompany);

        if (sameSpreadsheet && companyMatches) {
          targetDocId = foundDoc.id;
          existingClient = foundData;
        }
      }
    } catch (err) {
      console.warn("Sheet/Row deduplication query note:", err);
    }
  }

  // 3. Tier 3: Try resolving by Email if no ID/Row matched
  if (!targetDocId && clientData.email && clientData.email.includes("@")) {
    const cleanEmail = clientData.email.toLowerCase().trim();
    const q = query(collRef, where("email", "==", cleanEmail), limit(1));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      const firstDoc = querySnap.docs[0];
      targetDocId = firstDoc.id;
      existingClient = { id: firstDoc.id, ...(firstDoc.data() as Omit<ColdClient, "id">) };
    }
  }

  // 4. Tier 4: Try resolving by Phone Number if present & length >= 8
  if (!targetDocId && clientData.phone) {
    const rawPhone = clientData.phone.trim();
    const cleanDigits = rawPhone.replace(/[^0-9]/g, "");
    if (cleanDigits.length >= 8) {
      try {
        const q = query(collRef, where("phone", "==", rawPhone), limit(1));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          const firstDoc = querySnap.docs[0];
          targetDocId = firstDoc.id;
          existingClient = { id: firstDoc.id, ...(firstDoc.data() as Omit<ColdClient, "id">) };
        }
      } catch (err) {
        console.warn("Phone deduplication query note:", err);
      }
    }
  }

  // 5. Tier 5: Try resolving by Company Name + Contact Person (exact / case-insensitive)
  if (
    !targetDocId &&
    clientData.companyName &&
    clientData.companyName !== "Unknown Organization" &&
    clientData.contactName &&
    clientData.contactName !== "Prospect Contact" &&
    clientData.contactName.length >= 3
  ) {
    try {
      const q = query(collRef, where("companyName", "==", clientData.companyName.trim()), limit(5));
      const querySnap = await getDocs(q);
      for (const d of querySnap.docs) {
        const data = d.data() as Omit<ColdClient, "id">;
        if (
          data.contactName &&
          data.contactName.toLowerCase().trim() === clientData.contactName.toLowerCase().trim()
        ) {
          targetDocId = d.id;
          existingClient = { id: d.id, ...data };
          break;
        }
      }
    } catch (err) {
      console.warn("Company/Contact query note:", err);
    }
  }

  if (targetDocId && existingClient) {
    // UPDATE existing record
    // Protect good existing data from being overwritten by generic fallback defaults
    const safeCompany =
      clientData.companyName && clientData.companyName !== "Unknown Organization"
        ? clientData.companyName
        : existingClient.companyName;

    const safeContact =
      clientData.contactName && clientData.contactName !== "Prospect Contact"
        ? clientData.contactName
        : existingClient.contactName;

    const updatedClient: ColdClient = {
      ...existingClient,
      companyName: safeCompany,
      contactName: safeContact,
      email: clientData.email || existingClient.email,
      phone: clientData.phone || existingClient.phone,
      designation: clientData.designation || existingClient.designation,
      city: clientData.city || existingClient.city,
      industry:
        clientData.industry && clientData.industry !== "Technology & SaaS"
          ? clientData.industry
          : existingClient.industry,
      targetProgram:
        clientData.targetProgram && clientData.targetProgram !== "Executive Coaching"
          ? clientData.targetProgram
          : existingClient.targetProgram,
      linkedinUrl: clientData.linkedinUrl || existingClient.linkedinUrl,
      website: clientData.website || existingClient.website,
      owner: clientData.owner || existingClient.owner,
      status: clientData.status || existingClient.status,
      channel: clientData.channel || existingClient.channel,
      dataset: clientData.dataset !== undefined ? clientData.dataset : existingClient.dataset,
      estimatedPotentialValue: clientData.estimatedPotentialValue ?? existingClient.estimatedPotentialValue,
      notes: clientData.initialNote || existingClient.notes,
      companySize: clientData.companySize || existingClient.companySize,
      sheetRowNumber: sourceMeta?.sheetRowNumber ?? existingClient.sheetRowNumber,
      sourceSheet: sourceMeta?.sheetName ?? existingClient.sourceSheet,
      sourceSpreadsheetId: sourceMeta?.spreadsheetId ?? existingClient.sourceSpreadsheetId,
      updatedAt: nowIso,
    };

    const docRef = doc(db, COLLECTION_NAME, targetDocId);
    await setDoc(docRef, sanitizeForFirestore(updatedClient), { merge: true });
    return { id: targetDocId, action: "updated" };
  } else {
    // CREATE brand new record
    const newId = "cold-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const touchpoints: OutreachTouchpoint[] = [];

    if (clientData.initialNote?.trim()) {
      touchpoints.push({
        id: "tp-" + Date.now(),
        timestamp: nowIso,
        formattedDate: formatTimestamp(now),
        channel: clientData.channel || "note",
        summary: clientData.initialNote.trim(),
        author: clientData.owner || "Google Sheets Sync",
      });
    }

    const newClient: ColdClient = {
      id: newId,
      companyName: clientData.companyName || "Unknown Organization",
      contactName: clientData.contactName || "Prospect Contact",
      email: clientData.email || "",
      phone: clientData.phone || "",
      designation: clientData.designation || "",
      city: clientData.city || "",
      industry: clientData.industry || "Technology & SaaS",
      targetProgram: clientData.targetProgram || "Executive Coaching",
      linkedinUrl: clientData.linkedinUrl || "",
      website: clientData.website || "",
      owner: clientData.owner || "Amit",
      status: clientData.status || "uncontacted",
      channel: clientData.channel || "email",
      dataset: clientData.dataset || undefined,
      estimatedPotentialValue: clientData.estimatedPotentialValue || 500000,
      notes: clientData.initialNote || "",
      companySize: clientData.companySize || undefined,
      touchpoints,
      sheetRowNumber: sourceMeta?.sheetRowNumber,
      sourceSheet: sourceMeta?.sheetName,
      sourceSpreadsheetId: sourceMeta?.spreadsheetId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const docRef = doc(db, COLLECTION_NAME, newId);
    await setDoc(docRef, sanitizeForFirestore(newClient));
    return { id: newId, action: "created" };
  }
}

// GET: Health check & connection validation endpoint
export async function GET(req: NextRequest) {
  const isAuthed = verifyAuth(req);
  return NextResponse.json({
    status: "online",
    authenticated: isAuthed,
    serverTime: new Date().toISOString(),
    expectedHeaders: [
      "CRM ID",
      "Company Name",
      "Contact Person",
      "Email",
      "Designation",
      "Phone",
      "City",
      "Industry",
      "Target Program",
      "Estimated Value",
      "Status",
      "Channel",
      "Assigned Owner",
      "Notes",
    ],
    message: isAuthed
      ? "Google Sheets Sync Webhook is live, authenticated, and ready to accept live edits."
      : "Endpoint reachable. To authenticate, pass 'x-sync-token' header or '?token=YOUR_SECRET'.",
  });
}

// POST: Main Webhook ingestion endpoint
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const secretInBody = rawBody?.secret || rawBody?.token;

    if (!verifyAuth(req, secretInBody)) {
      return NextResponse.json(
        {
          error: "Unauthorized. Invalid or missing sync token.",
          hint: "Set header 'x-sync-token' or body 'token' matching GOOGLE_SHEETS_SYNC_SECRET in your .env.",
        },
        { status: 401 }
      );
    }

    await ensureServerAuth();

    const action = rawBody?.action || (Array.isArray(rawBody?.rows) ? "sync_batch" : "sync_row");
    const spreadsheetId = rawBody?.spreadsheetId || "";
    const sheetName = rawBody?.sheetName || "Outreach Leads";

    // 1. Single Row Sync (triggered on sheet onEdit / row change)
    if (action === "sync_row") {
      const rowData = rawBody?.row || rawBody?.rowData || rawBody?.data;
      const headers = rawBody?.headers;
      const rowNumber = Number(rawBody?.rowNumber || rawBody?.rowIndex || 0);

      if (!rowData) {
        return NextResponse.json(
          { error: "Missing 'row' or 'rowData' payload." },
          { status: 400 }
        );
      }

      const clientPartial = mapRowToColdClient(rowData, headers);

      // Require real viable data (prevent creating leads from empty cells or placeholder defaults)
      const hasRealCompany = Boolean(clientPartial.companyName && clientPartial.companyName.trim() !== "" && clientPartial.companyName !== "Unknown Organization");
      const hasRealContact = Boolean(clientPartial.contactName && clientPartial.contactName.trim() !== "" && clientPartial.contactName !== "Prospect Contact");
      const hasRealEmail = Boolean(clientPartial.email && clientPartial.email.includes("@"));
      const hasRealPhone = Boolean(clientPartial.phone && clientPartial.phone.replace(/\D/g, "").length >= 8);

      if (!clientPartial.id && !hasRealCompany && !hasRealContact && !hasRealEmail && !hasRealPhone) {
        return NextResponse.json(
          { error: "Row is empty or lacks minimum required prospect data (Company, Contact, Email, or Phone)." },
          { status: 400 }
        );
      }

      // Concurrency lock for rapid cell-by-cell keystrokes in the same row
      const lockKey = `${spreadsheetId}_${sheetName}_${rowNumber}`;
      if (rowNumber > 0) {
        const prevOp = inFlightSyncs.get(lockKey);
        if (prevOp) {
          try {
            await prevOp;
          } catch {}
        }
      }

      const syncOperation = (async () => {
        return await upsertColdClient(clientPartial, {
          sheetRowNumber: rowNumber > 0 ? rowNumber : undefined,
          sheetName,
          spreadsheetId: spreadsheetId || undefined,
        });
      })();

      if (rowNumber > 0) {
        inFlightSyncs.set(lockKey, syncOperation);
      }

      let result;
      try {
        result = await syncOperation;
      } finally {
        if (rowNumber > 0 && inFlightSyncs.get(lockKey) === syncOperation) {
          inFlightSyncs.delete(lockKey);
        }
      }

      return NextResponse.json({
        success: true,
        crmId: result.id,
        action: result.action,
        rowNumber: rowNumber > 0 ? rowNumber : undefined,
        message: `Successfully ${result.action} prospect '${clientPartial.companyName || clientPartial.email}' in Outreach tab.`,
      });
    }

    // 2. Batch Sync (Bulk Sheet Import / Sync All)
    if (action === "sync_batch") {
      const rows: unknown[] = rawBody?.rows || [];
      const headers: string[] | undefined = rawBody?.headers;

      if (!Array.isArray(rows) || rows.length === 0) {
        return NextResponse.json(
          { error: "No rows provided in batch sync." },
          { status: 400 }
        );
      }

      const results = [];
      for (let i = 0; i < rows.length; i++) {
        const item = rows[i];
        let rowData: Record<string, unknown> | unknown[] = {};
        let rowNum: number | undefined = undefined;

        if (typeof item === "object" && item !== null && "rowData" in item) {
          rowData = (item as { rowData: Record<string, unknown> | unknown[] }).rowData;
          rowNum = (item as { rowNumber?: number }).rowNumber;
        } else {
          rowData = item as Record<string, unknown> | unknown[];
        }

        const clientPartial = mapRowToColdClient(rowData, headers);
        const hasRealCompany = Boolean(clientPartial.companyName && clientPartial.companyName.trim() !== "" && clientPartial.companyName !== "Unknown Organization");
        const hasRealContact = Boolean(clientPartial.contactName && clientPartial.contactName.trim() !== "" && clientPartial.contactName !== "Prospect Contact");
        const hasRealEmail = Boolean(clientPartial.email && clientPartial.email.includes("@"));
        const hasRealPhone = Boolean(clientPartial.phone && clientPartial.phone.replace(/\D/g, "").length >= 8);

        // Only upsert rows that have actual data or an existing CRM ID
        if (clientPartial.id || hasRealCompany || hasRealContact || hasRealEmail || hasRealPhone) {
          const res = await upsertColdClient(clientPartial, {
            sheetRowNumber: rowNum || i + 2,
            sheetName,
            spreadsheetId: spreadsheetId || undefined,
          });
          results.push({
            rowNumber: rowNum || i + 2,
            crmId: res.id,
            action: res.action,
            company: clientPartial.companyName,
          });
        }
      }

      return NextResponse.json({
        success: true,
        totalReceived: rows.length,
        syncedCount: results.length,
        results,
        message: `Successfully synchronized ${results.length} leads into Outreach tab in real time.`,
      });
    }

    // 3. Ping / Test
    if (action === "ping") {
      return NextResponse.json({
        success: true,
        message: "Google Sheets Webhook connection test successful! Ready for real-time sync.",
        serverTime: new Date().toISOString(),
      });
    }

    // 4. Clean up / Deduplicate leads across Outreach CRM
    if (action === "deduplicate" || action === "cleanup_duplicates") {
      const collRef = collection(db, COLLECTION_NAME);
      const snap = await getDocs(collRef);
      const allDocs = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ColdClient, "id">),
      }));

      const visited = new Set<string>();
      const duplicateGroups: Array<{ primary: ColdClient; duplicates: ColdClient[] }> = [];

      for (let i = 0; i < allDocs.length; i++) {
        const a = allDocs[i];
        if (visited.has(a.id)) continue;

        const group: ColdClient[] = [a];
        const aEmail = (a.email || "").toLowerCase().trim();
        const aCompany = (a.companyName || "").toLowerCase().trim();
        const aContact = (a.contactName || "").toLowerCase().trim();
        const aSheet = (a.sourceSheet || "").toLowerCase().trim();
        const aRow = a.sheetRowNumber;

        for (let j = i + 1; j < allDocs.length; j++) {
          const b = allDocs[j];
          if (visited.has(b.id)) continue;

          const bEmail = (b.email || "").toLowerCase().trim();
          const bCompany = (b.companyName || "").toLowerCase().trim();
          const bContact = (b.contactName || "").toLowerCase().trim();
          const bSheet = (b.sourceSheet || "").toLowerCase().trim();
          const bRow = b.sheetRowNumber;

          let isMatch = false;

          // Criterion 1: Valid email match
          if (aEmail && bEmail && aEmail.includes("@") && aEmail === bEmail) {
            isMatch = true;
          }
          // Criterion 2: Exact sheet + row number match
          else if (aSheet && bSheet && aRow && bRow && aSheet === bSheet && aRow === bRow) {
            isMatch = true;
          }
          // Criterion 3: Company + Contact match (if not generic placeholder)
          else if (
            aCompany &&
            bCompany &&
            aCompany !== "unknown organization" &&
            aCompany === bCompany &&
            aContact &&
            bContact &&
            aContact !== "prospect contact" &&
            aContact === bContact
          ) {
            isMatch = true;
          }

          if (isMatch) {
            group.push(b);
            visited.add(b.id);
          }
        }

        if (group.length > 1) {
          visited.add(a.id);
          // Pick the primary doc: highest completeness score
          const score = (c: ColdClient) => {
            let s = 0;
            if (c.email && c.email.includes("@")) s += 10;
            if (c.phone) s += 5;
            if (c.companyName && c.companyName !== "Unknown Organization") s += 5;
            if (c.contactName && c.contactName !== "Prospect Contact") s += 5;
            if (c.designation) s += 3;
            if (c.city) s += 2;
            if (c.status && c.status !== "uncontacted" && c.status !== "cold_no_answer") s += 4;
            if (c.touchpoints && c.touchpoints.length > 0) s += c.touchpoints.length * 2;
            if (c.sheetRowNumber) s += 2;
            return s;
          };

          group.sort((x, y) => score(y) - score(x));
          const primary = group[0];
          const duplicates = group.slice(1);
          duplicateGroups.push({ primary, duplicates });
        }
      }

      let removedCount = 0;
      for (const { primary, duplicates } of duplicateGroups) {
        const existingTouchpointSummaries = new Set(
          (primary.touchpoints || []).map((tp) => tp.summary + tp.timestamp)
        );
        const mergedTouchpoints = [...(primary.touchpoints || [])];

        for (const dup of duplicates) {
          if (!primary.email && dup.email) primary.email = dup.email;
          if (!primary.phone && dup.phone) primary.phone = dup.phone;
          if (!primary.designation && dup.designation) primary.designation = dup.designation;
          if (!primary.city && dup.city) primary.city = dup.city;
          if (!primary.linkedinUrl && dup.linkedinUrl) primary.linkedinUrl = dup.linkedinUrl;
          if (!primary.website && dup.website) primary.website = dup.website;
          if (!primary.sheetRowNumber && dup.sheetRowNumber) primary.sheetRowNumber = dup.sheetRowNumber;
          if (!primary.sourceSheet && dup.sourceSheet) primary.sourceSheet = dup.sourceSheet;
          if (!primary.sourceSpreadsheetId && dup.sourceSpreadsheetId) {
            primary.sourceSpreadsheetId = dup.sourceSpreadsheetId;
          }
          if ((!primary.companyName || primary.companyName === "Unknown Organization") && dup.companyName) {
            primary.companyName = dup.companyName;
          }
          if ((!primary.contactName || primary.contactName === "Prospect Contact") && dup.contactName) {
            primary.contactName = dup.contactName;
          }

          for (const tp of dup.touchpoints || []) {
            const key = tp.summary + tp.timestamp;
            if (!existingTouchpointSummaries.has(key)) {
              existingTouchpointSummaries.add(key);
              mergedTouchpoints.push(tp);
            }
          }

          await deleteDoc(doc(db, COLLECTION_NAME, dup.id));
          removedCount++;
        }

        primary.touchpoints = mergedTouchpoints;
        primary.updatedAt = new Date().toISOString();
        await setDoc(doc(db, COLLECTION_NAME, primary.id), sanitizeForFirestore(primary), { merge: true });
      }

      return NextResponse.json({
        success: true,
        message: `Deduplication complete. Cleaned up ${removedCount} duplicate lead(s) across ${duplicateGroups.length} unique prospect(s).`,
        removedCount,
        mergedCount: duplicateGroups.length,
      });
    }

    return NextResponse.json(
      {
        error: `Unrecognized action '${action}'. Expected 'sync_row', 'sync_batch', 'ping', or 'deduplicate'.`,
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Google Sheets webhook error:", error);
    return NextResponse.json(
      {
        error: "Failed to process Google Sheets sync.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
