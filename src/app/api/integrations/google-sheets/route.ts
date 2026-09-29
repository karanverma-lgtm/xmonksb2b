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
  if (!val) return "uncontacted";
  const clean = val.toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (VALID_STATUSES.includes(clean as ColdClientStatus)) {
    return clean as ColdClientStatus;
  }
  // Common colloquial matches
  if (clean.includes("sent") || clean.includes("mail")) return "email_sent";
  if (clean.includes("call") || clean.includes("meeting")) return "call_scheduled";
  if (clean.includes("interested") && !clean.includes("not")) return "replied_interested";
  if (clean.includes("not_interested")) return "not_interested";
  if (clean.includes("follow") || clean.includes("fup")) return "follow_up_1";
  if (clean.includes("convert") || clean.includes("won") || clean.includes("deal")) return "converted";
  return "uncontacted";
}

const VALID_CHANNELS: OutreachChannel[] = ["email", "linkedin", "call", "referral", "event", "other"];

function normalizeChannel(val?: string): OutreachChannel {
  if (!val) return "email";
  const clean = val.toLowerCase().trim();
  if (VALID_CHANNELS.includes(clean as OutreachChannel)) {
    return clean as OutreachChannel;
  }
  if (clean.includes("in") || clean.includes("link")) return "linkedin";
  if (clean.includes("phone") || clean.includes("call")) return "call";
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
      // [CRM ID, Company, Contact, Email, Designation, Phone, City, Industry, Program, Value, Status, Channel, Owner, Notes]
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
  const companyName = findVal("companyname", "company", "organization", "account", "client") || "Unknown Organization";
  const contactName = findVal("contactname", "contactperson", "contact", "name", "fullname", "leadname") || "Prospect Contact";
  const email = (findVal("email", "contactemail", "emailaddress", "mail") || "").toLowerCase().trim();
  const phone = findVal("phone", "contactphone", "mobile", "phonenumber", "telephone", "cell");
  const designation = findVal("designation", "title", "jobtitle", "role", "position");
  const city = findVal("city", "location", "headquarters", "hq");
  const industry = findVal("industry", "sector", "domain") || "Technology & SaaS";
  const targetProgram = findVal("targetprogram", "program", "offering", "service") || "Executive Coaching";
  const linkedinUrl = findVal("linkedinurl", "linkedin", "profile");
  const website = findVal("website", "domain", "companywebsite", "web");
  const owner = cleanOwner(findVal("owner", "assignedto", "salesrep", "rep", "executive"));
  const status = normalizeStatus(findVal("status", "leadstatus", "stage"));
  const channel = normalizeChannel(findVal("channel", "source", "outreachchannel"));
  const initialNote = findVal("initialnote", "notes", "note", "comment", "comments", "remarks");
  const rawValue = normalizedKeys["estimatedvalue"] ?? normalizedKeys["dealvalue"] ?? normalizedKeys["value"] ?? normalizedKeys["potentialvalue"] ?? normalizedKeys["estimatedpotentialvalue"];
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
    estimatedPotentialValue,
    initialNote,
    notes: initialNote,
  };
}

// Upsert a single client record into Firestore
async function upsertColdClient(
  clientData: Partial<ColdClient> & { initialNote?: string },
  sourceMeta?: { sheetRowNumber?: number; sheetName?: string }
): Promise<{ id: string; action: "created" | "updated" }> {
  const collRef = collection(db, COLLECTION_NAME);
  const now = new Date();
  const nowIso = now.toISOString();

  let targetDocId: string | null = null;
  let existingClient: ColdClient | null = null;

  // 1. Try resolving by explicit CRM ID
  if (clientData.id && clientData.id.trim() !== "") {
    const docRef = doc(db, COLLECTION_NAME, clientData.id.trim());
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      targetDocId = snap.id;
      existingClient = { id: snap.id, ...(snap.data() as Omit<ColdClient, "id">) };
    }
  }

  // 2. Try resolving by Email if no ID matched
  if (!targetDocId && clientData.email && clientData.email.includes("@")) {
    const q = query(collRef, where("email", "==", clientData.email), limit(1));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      const firstDoc = querySnap.docs[0];
      targetDocId = firstDoc.id;
      existingClient = { id: firstDoc.id, ...(firstDoc.data() as Omit<ColdClient, "id">) };
    }
  }

  if (targetDocId && existingClient) {
    // UPDATE existing record
    const updatedClient: ColdClient = {
      ...existingClient,
      companyName: clientData.companyName || existingClient.companyName,
      contactName: clientData.contactName || existingClient.contactName,
      email: clientData.email || existingClient.email,
      phone: clientData.phone || existingClient.phone,
      designation: clientData.designation || existingClient.designation,
      city: clientData.city || existingClient.city,
      industry: clientData.industry || existingClient.industry,
      targetProgram: clientData.targetProgram || existingClient.targetProgram,
      linkedinUrl: clientData.linkedinUrl || existingClient.linkedinUrl,
      website: clientData.website || existingClient.website,
      owner: clientData.owner || existingClient.owner,
      status: clientData.status || existingClient.status,
      channel: clientData.channel || existingClient.channel,
      estimatedPotentialValue: clientData.estimatedPotentialValue ?? existingClient.estimatedPotentialValue,
      notes: clientData.initialNote || existingClient.notes,
      sheetRowNumber: sourceMeta?.sheetRowNumber ?? existingClient.sheetRowNumber,
      sourceSheet: sourceMeta?.sheetName ?? existingClient.sourceSheet,
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
      estimatedPotentialValue: clientData.estimatedPotentialValue || 500000,
      notes: clientData.initialNote || "",
      touchpoints,
      sheetRowNumber: sourceMeta?.sheetRowNumber,
      sourceSheet: sourceMeta?.sheetName,
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

      // Require at least companyName or email or contactName
      if (!clientPartial.companyName && !clientPartial.email && !clientPartial.contactName) {
        return NextResponse.json(
          { error: "Row is empty or lacks minimum required fields (Company, Name, or Email)." },
          { status: 400 }
        );
      }

      const result = await upsertColdClient(clientPartial, {
        sheetRowNumber: rowNumber > 0 ? rowNumber : undefined,
        sheetName,
      });

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
        if (clientPartial.companyName || clientPartial.email || clientPartial.contactName) {
          const res = await upsertColdClient(clientPartial, {
            sheetRowNumber: rowNum || i + 2,
            sheetName,
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

    return NextResponse.json(
      { error: `Unrecognized action '${action}'. Expected 'sync_row', 'sync_batch', or 'ping'.` },
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
