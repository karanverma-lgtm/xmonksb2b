import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { LibraryDocument, DocumentCategory, libraryDocToEmailAttachment } from "@/types/library";
import { sanitizeForFirestore } from "./leadsService";
import { formatBytes } from "./formatters";
import { getMimeType } from "./mimeUtils";

const LIBRARY_COLLECTION = "b2b_document_library";
const LIBRARY_STORAGE_KEY = "xmonks_b2b_document_library_v1";

// Realistic default enterprise collateral for xMonks
export const SEED_LIBRARY_DOCUMENTS: LibraryDocument[] = [
  {
    id: "lib-seed-001",
    title: "xMonks Corporate Credentials & Executive Coaching Overview 2026",
    fileName: "xMonks_Corporate_Credentials_2026.pdf",
    fileSize: "4.2 MB",
    fileSizeBytes: 4404019,
    fileType: "application/pdf",
    category: "brochure",
    description: "Comprehensive corporate profile, client logos, global certifications, ICF-accredited coaching methodology, and enterprise solutions.",
    storageKey: "b2bxmonks/library/seed_xMonks_Corporate_Credentials_2026.pdf",
    downloadUrl: "/api/library/download?key=" + encodeURIComponent("b2bxmonks/library/seed_xMonks_Corporate_Credentials_2026.pdf"),
    uploadedBy: "Amit Shelly",
    uploadedByEmail: "amit@xmonks.com",
    owner: "amit",
    uploadedAt: "2026-01-10T10:00:00.000Z",
    uploadedAtMs: 1768039200000,
    tags: ["credentials", "brochure", "overview", "icf"],
    isStarred: true,
    useCount: 18,
    lastUsedAt: "2026-03-25T14:30:00.000Z",
    isPublic: true,
  },
  {
    id: "lib-seed-002",
    title: "Executive Coaching CXO Impact & Leadership Presence Master Deck",
    fileName: "Executive_Coaching_Master_Pitch_Deck.pdf",
    fileSize: "5.8 MB",
    fileSizeBytes: 6081740,
    fileType: "application/pdf",
    category: "pitch_deck",
    description: "High-stakes 1-on-1 C-suite executive coaching cohort framework, stakeholder interview protocol, and behavioural shift metrics.",
    storageKey: "b2bxmonks/library/seed_Executive_Coaching_Master_Pitch_Deck.pdf",
    downloadUrl: "/api/library/download?key=" + encodeURIComponent("b2bxmonks/library/seed_Executive_Coaching_Master_Pitch_Deck.pdf"),
    uploadedBy: "Amit Shelly",
    uploadedByEmail: "amit@xmonks.com",
    owner: "amit",
    uploadedAt: "2026-01-15T11:30:00.000Z",
    uploadedAtMs: 1768476600000,
    tags: ["pitch deck", "executive coaching", "cxo", "c-suite"],
    isStarred: true,
    useCount: 24,
    lastUsedAt: "2026-04-01T09:15:00.000Z",
    isPublic: true,
  },
  {
    id: "lib-seed-003",
    title: "L&D Transformation & Capability Architecture Master Pitch",
    fileName: "LD_Transformation_Enterprise_Architecture.pptx",
    fileSize: "8.1 MB",
    fileSizeBytes: 8493465,
    fileType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    category: "ld_transformation",
    description: "Multi-tiered learning journey design for mid-to-senior leaders, blended cohort delivery model, and measurable ROI benchmarks.",
    storageKey: "b2bxmonks/library/seed_LD_Transformation_Enterprise_Architecture.pptx",
    downloadUrl: "/api/library/download?key=" + encodeURIComponent("b2bxmonks/library/seed_LD_Transformation_Enterprise_Architecture.pptx"),
    uploadedBy: "Ruby Dayal",
    uploadedByEmail: "ruby.dayal@xmonks.com",
    owner: "ruby",
    uploadedAt: "2026-01-20T16:00:00.000Z",
    uploadedAtMs: 1768924800000,
    tags: ["l&d", "transformation", "presentation", "cohorts"],
    isStarred: false,
    useCount: 14,
    lastUsedAt: "2026-03-28T16:45:00.000Z",
    isPublic: true,
  },
  {
    id: "lib-seed-004",
    title: "TASC Inhouse Strategic Talent Solutions & Engagement Framework",
    fileName: "TASC_Inhouse_Solutions_Brochure.pdf",
    fileSize: "3.4 MB",
    fileSizeBytes: 3565158,
    fileType: "application/pdf",
    category: "tasc",
    description: "Dedicated talent advisory, custom in-house capability labs, and agile executive retention strategies.",
    storageKey: "b2bxmonks/library/seed_TASC_Inhouse_Solutions_Brochure.pdf",
    downloadUrl: "/api/library/download?key=" + encodeURIComponent("b2bxmonks/library/seed_TASC_Inhouse_Solutions_Brochure.pdf"),
    uploadedBy: "Gaurav",
    uploadedByEmail: "gaurav@xmonks.com",
    owner: "gaurav",
    uploadedAt: "2026-02-05T09:45:00.000Z",
    uploadedAtMs: 1770284700000,
    tags: ["tasc", "inhouse", "talent", "advisory"],
    isStarred: false,
    useCount: 9,
    lastUsedAt: "2026-03-14T11:20:00.000Z",
    isPublic: true,
  },
  {
    id: "lib-seed-005",
    title: "Leadership 360 & Psychometric Assessments Catalog",
    fileName: "xMonks_Assessments_Diagnostics_Catalog.pdf",
    fileSize: "2.9 MB",
    fileSizeBytes: 3040870,
    fileType: "application/pdf",
    category: "assessment",
    description: "Detailed inventory of psychometric batteries, emotional intelligence profiling, and 360-degree feedback tools.",
    storageKey: "b2bxmonks/library/seed_xMonks_Assessments_Diagnostics_Catalog.pdf",
    downloadUrl: "/api/library/download?key=" + encodeURIComponent("b2bxmonks/library/seed_xMonks_Assessments_Diagnostics_Catalog.pdf"),
    uploadedBy: "Preeti",
    uploadedByEmail: "preeti@xmonks.com",
    owner: "preeti",
    uploadedAt: "2026-02-12T14:15:00.000Z",
    uploadedAtMs: 1770905700000,
    tags: ["assessments", "psychometrics", "360", "eq"],
    isStarred: false,
    useCount: 11,
    lastUsedAt: "2026-03-22T10:10:00.000Z",
    isPublic: true,
  },
  {
    id: "lib-seed-006",
    title: "Master Enterprise Commercial Proposal Template & Service Level Agreement",
    fileName: "Enterprise_Commercial_Proposal_SLA_Template.docx",
    fileSize: "1.2 MB",
    fileSizeBytes: 1258291,
    fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    category: "proposal",
    description: "Standard commercial contract, payment milestones, NDA confidentiality clauses, and delivery governance model.",
    storageKey: "b2bxmonks/library/seed_Enterprise_Commercial_Proposal_SLA_Template.docx",
    downloadUrl: "/api/library/download?key=" + encodeURIComponent("b2bxmonks/library/seed_Enterprise_Commercial_Proposal_SLA_Template.docx"),
    uploadedBy: "Admin User",
    uploadedByEmail: "sales@xmonks.com",
    owner: "admin",
    uploadedAt: "2026-02-18T12:00:00.000Z",
    uploadedAtMs: 1771416000000,
    tags: ["proposal", "sla", "contract", "legal"],
    isStarred: true,
    useCount: 15,
    lastUsedAt: "2026-04-02T15:00:00.000Z",
    isPublic: true,
  },
  {
    id: "lib-seed-007",
    title: "Fortune 500 Enterprise Case Studies & Leadership Coaching ROI",
    fileName: "Enterprise_Case_Studies_ROI_Impact.pdf",
    fileSize: "3.7 MB",
    fileSizeBytes: 3879731,
    fileType: "application/pdf",
    category: "case_study",
    description: "Empirical impact studies, retention gains, and before-and-after leadership behavioral scores from 25+ corporate deployments.",
    storageKey: "b2bxmonks/library/seed_Enterprise_Case_Studies_ROI_Impact.pdf",
    downloadUrl: "/api/library/download?key=" + encodeURIComponent("b2bxmonks/library/seed_Enterprise_Case_Studies_ROI_Impact.pdf"),
    uploadedBy: "Amit Shelly",
    uploadedByEmail: "amit@xmonks.com",
    owner: "amit",
    uploadedAt: "2026-02-25T15:20:00.000Z",
    uploadedAtMs: 1772032800000,
    tags: ["case study", "roi", "fortune 500", "results"],
    isStarred: false,
    useCount: 13,
    lastUsedAt: "2026-03-30T17:10:00.000Z",
    isPublic: true,
  },
];

// Local storage fallback helpers
export function getStoredLocalLibraryDocs(): LibraryDocument[] {
  if (typeof window === "undefined") return SEED_LIBRARY_DOCUMENTS;
  try {
    const raw = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(SEED_LIBRARY_DOCUMENTS));
      return SEED_LIBRARY_DOCUMENTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(SEED_LIBRARY_DOCUMENTS));
    return SEED_LIBRARY_DOCUMENTS;
  } catch (err) {
    console.warn("Failed to parse local library documents:", err);
    return SEED_LIBRARY_DOCUMENTS;
  }
}

export function saveStoredLocalLibraryDocs(docs: LibraryDocument[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(docs));
  } catch (err) {
    console.error("Failed to save library docs to localStorage:", err);
  }
}

/**
 * Subscribe to Library Documents with real-time Firestore updates and offline LocalStorage fallback
 */
export function subscribeToLibraryDocuments(
  onData: (docs: LibraryDocument[], isSyncing: boolean) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let unsubscribed = false;

  try {
    const colRef = collection(db, LIBRARY_COLLECTION);
    const q = query(colRef, orderBy("uploadedAtMs", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (unsubscribed) return;
        if (!snapshot.empty) {
          const docs: LibraryDocument[] = [];
          snapshot.forEach((snap) => {
            docs.push({ id: snap.id, ...(snap.data() as Omit<LibraryDocument, "id">) });
          });
          saveStoredLocalLibraryDocs(docs);
          onData(docs, true);
        } else {
          // If Firestore collection is empty, seed it with default corporate collateral
          const local = getStoredLocalLibraryDocs();
          if (local.length === 0) {
            SEED_LIBRARY_DOCUMENTS.forEach((docItem) => {
              const docRef = doc(db, LIBRARY_COLLECTION, docItem.id);
              setDoc(docRef, sanitizeForFirestore(docItem)).catch((e) =>
                console.warn("Seeding library error:", e)
              );
            });
            onData(SEED_LIBRARY_DOCUMENTS, true);
          } else {
            // Seed local into remote
            local.forEach((docItem) => {
              const docRef = doc(db, LIBRARY_COLLECTION, docItem.id);
              setDoc(docRef, sanitizeForFirestore(docItem)).catch(() => {});
            });
            onData(local, true);
          }
        }
      },
      (error) => {
        console.warn("Firestore library listener error, using fallback:", error);
        if (!unsubscribed) {
          onData(getStoredLocalLibraryDocs(), false);
        }
      }
    );

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  } catch {
    onData(getStoredLocalLibraryDocs(), false);
    return () => {};
  }
}

/**
 * Upload a Document of ANY format to Cloudflare R2 and save to Library
 */
export async function uploadLibraryDocument(
  file: File,
  metadata: {
    title?: string;
    category?: DocumentCategory;
    description?: string;
    tags?: string[];
    uploadedBy: string;
    uploadedByEmail?: string;
    owner?: string;
  }
): Promise<LibraryDocument> {
  if (!file) {
    throw new Error("No file selected.");
  }

  const fileType = file.type || getMimeType(file.name);
  let uploadResult: {
    id: string;
    storageKey: string;
    downloadUrl: string;
    fileName: string;
    fileSize: string;
    fileSizeBytes: number;
    uploadedAt: string;
    uploadedBy: string;
  } | null = null;

  // Strategy 1: Direct-to-R2 Presigned Upload (Bypasses server payload limits)
  try {
    const presignRes = await fetch("/api/library/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileSizeBytes: file.size,
        fileType,
        uploadedBy: metadata.uploadedBy,
      }),
    });

    if (presignRes.ok) {
      const presignData = await presignRes.json();
      if (presignData.uploadUrl) {
        const r2Res = await fetch(presignData.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": fileType || "application/octet-stream",
          },
          body: file,
        });

        if (r2Res.ok) {
          uploadResult = {
            id: presignData.id,
            storageKey: presignData.storageKey,
            downloadUrl: presignData.downloadUrl,
            fileName: presignData.fileName,
            fileSize: presignData.fileSize,
            fileSizeBytes: presignData.fileSizeBytes,
            uploadedAt: presignData.uploadedAt,
            uploadedBy: presignData.uploadedBy,
          };
        }
      }
    }
  } catch (presignErr) {
    console.warn("Direct R2 presign upload failed, falling back to server route:", presignErr);
  }

  // Strategy 2: Server Upload Route fallback
  if (!uploadResult) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("uploadedBy", metadata.uploadedBy);

    const res = await fetch("/api/library/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      let errorJson: any = null;
      try {
        errorJson = JSON.parse(errorText);
      } catch {}
      throw new Error(errorJson?.error || "Failed to upload file to storage.");
    }

    uploadResult = await res.json();
  }

  if (!uploadResult) {
    throw new Error("Upload process failed.");
  }

  // Construct complete LibraryDocument record
  const title =
    metadata.title?.trim() ||
    file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");

  const newDoc: LibraryDocument = {
    id: uploadResult.id,
    title,
    fileName: uploadResult.fileName,
    fileSize: uploadResult.fileSize,
    fileSizeBytes: uploadResult.fileSizeBytes,
    fileType,
    category: metadata.category || "other",
    description: metadata.description?.trim() || "",
    storageKey: uploadResult.storageKey,
    downloadUrl: uploadResult.downloadUrl,
    uploadedBy: metadata.uploadedBy,
    uploadedByEmail: metadata.uploadedByEmail || "",
    owner: metadata.owner || metadata.uploadedBy.toLowerCase(),
    uploadedAt: uploadResult.uploadedAt,
    uploadedAtMs: Date.now(),
    tags: metadata.tags || [],
    isStarred: false,
    useCount: 0,
    isPublic: true,
  };

  // Save to Firestore
  try {
    const docRef = doc(db, LIBRARY_COLLECTION, newDoc.id);
    await setDoc(docRef, sanitizeForFirestore(newDoc));
  } catch (err) {
    console.warn("Firestore save library document warning:", err);
  }

  // Update Local Storage cache
  const local = getStoredLocalLibraryDocs();
  const updated = [newDoc, ...local.filter((d) => d.id !== newDoc.id)];
  saveStoredLocalLibraryDocs(updated);

  return newDoc;
}

/**
 * Update document metadata (title, category, description, tags, isStarred)
 */
export async function updateLibraryDocument(
  id: string,
  updates: Partial<LibraryDocument>
): Promise<void> {
  const local = getStoredLocalLibraryDocs();
  const updated = local.map((d) => (d.id === id ? { ...d, ...updates } : d));
  saveStoredLocalLibraryDocs(updated);

  try {
    const docRef = doc(db, LIBRARY_COLLECTION, id);
    await updateDoc(docRef, sanitizeForFirestore(updates));
  } catch (err) {
    console.warn("Firestore update library document error:", err);
  }
}

/**
 * Increment use count when attached to an email
 */
export async function incrementDocumentUseCount(id: string): Promise<void> {
  const local = getStoredLocalLibraryDocs();
  const found = local.find((d) => d.id === id);
  const newCount = (found?.useCount || 0) + 1;
  const now = new Date().toISOString();

  await updateLibraryDocument(id, {
    useCount: newCount,
    lastUsedAt: now,
  });
}

/**
 * Toggle starred status of document
 */
export async function toggleStarDocument(id: string, isStarred: boolean): Promise<void> {
  await updateLibraryDocument(id, { isStarred });
}

/**
 * Delete a document from Library and Cloudflare R2
 */
export async function deleteLibraryDocument(
  id: string,
  storageKey?: string
): Promise<void> {
  // Update local storage
  const local = getStoredLocalLibraryDocs();
  saveStoredLocalLibraryDocs(local.filter((d) => d.id !== id));

  // Delete from Firestore
  try {
    const docRef = doc(db, LIBRARY_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Firestore delete library document error:", err);
  }

  // Delete file from Cloudflare R2
  if (storageKey && !storageKey.includes("seed_")) {
    try {
      await fetch("/api/library/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storageKey }),
      });
    } catch (e) {
      console.warn("Failed to delete file from R2:", e);
    }
  }
}

/**
 * Export Library metadata list to CSV
 */
export function exportLibraryMetadataToCSV(docs: LibraryDocument[]): void {
  if (!docs || docs.length === 0) return;

  const headers = [
    "Title",
    "File Name",
    "Category",
    "File Size",
    "File Type",
    "Uploaded By",
    "Uploaded Date",
    "Times Used In Emails",
    "Tags",
    "Description",
  ];

  const rows = docs.map((d) => [
    `"${(d.title || "").replace(/"/g, '""')}"`,
    `"${(d.fileName || "").replace(/"/g, '""')}"`,
    `"${(d.category || "").replace(/"/g, '""')}"`,
    `"${d.fileSize || ""}"`,
    `"${(d.fileType || "").replace(/"/g, '""')}"`,
    `"${(d.uploadedBy || "").replace(/"/g, '""')}"`,
    `"${d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : ""}"`,
    d.useCount || 0,
    `"${(d.tags || []).join(", ").replace(/"/g, '""')}"`,
    `"${(d.description || "").replace(/"/g, '""')}"`,
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `xmonks_library_catalog_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
