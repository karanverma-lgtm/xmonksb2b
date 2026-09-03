import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  getDoc,
  writeBatch,
} from "firebase/firestore";

export interface CSVUploadRecord {
  id: string;
  fileName: string;
  fileSize: number;
  rowCount: number;
  uploadedBy: string;
  uploadedAt: string;
  uploadedAtMs: number;
  rawContent: string;
  importedCount: number;
  sampleRows?: string[];
  isChunked?: boolean;
  chunkCount?: number;
}

const UPLOADS_COLLECTION = "b2b_csv_uploads";
const LOCAL_STORAGE_KEY = "xmonks_b2b_csv_uploads";
// Safe threshold well below Firestore's 1MB (1,048,576 bytes) limit per document
const MAX_DOC_RAW_CHARS = 600_000;

export function getLocalCSVUploads(): CSVUploadRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading local CSV uploads:", e);
  }
  return [];
}

export function saveLocalCSVUploads(records: CSVUploadRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    // Keep local cache lightweight by omitting full rawContent if massive
    const light = records.slice(0, 50).map((r) => ({
      ...r,
      rawContent: r.rawContent && r.rawContent.length > 50000 ? r.rawContent.slice(0, 50000) : r.rawContent,
    }));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(light));
  } catch (e) {
    console.warn("Failed to cache CSV upload records locally:", e);
  }
}

// Archive a raw CSV upload to Firestore with automatic chunking for files > 600KB
export async function saveCSVUploadArchive(
  data: Omit<CSVUploadRecord, "id" | "uploadedAt" | "uploadedAtMs"> & {
    id?: string;
  }
): Promise<CSVUploadRecord> {
  const now = Date.now();
  const id = data.id || `csv-${now}-${Math.random().toString(36).substring(2, 7)}`;
  const uploadedAt = new Date(now).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "medium",
  });

  const fullContent = data.rawContent || "";
  const isLarge = fullContent.length > MAX_DOC_RAW_CHARS;

  let chunks: string[] = [];
  if (isLarge) {
    for (let i = 0; i < fullContent.length; i += MAX_DOC_RAW_CHARS) {
      chunks.push(fullContent.slice(i, i + MAX_DOC_RAW_CHARS));
    }
  }

  const record: CSVUploadRecord = {
    ...data,
    id,
    uploadedAt,
    uploadedAtMs: now,
    isChunked: isLarge,
    chunkCount: isLarge ? chunks.length : 1,
    // If large, store only preview in parent doc to guarantee staying well under 1MB
    rawContent: isLarge ? fullContent.slice(0, 5000) : fullContent,
  };

  // 1. Cache locally
  const current = getLocalCSVUploads();
  const updated = [record, ...current.filter((r) => r.id !== id)];
  saveLocalCSVUploads(updated);

  // 2. Persist to Firestore
  if (typeof window !== "undefined") {
    try {
      const docRef = doc(db, UPLOADS_COLLECTION, id);
      await setDoc(docRef, record, { merge: true });

      // If chunked, write all chunks to subcollection
      if (isLarge && chunks.length > 0) {
        const batch = writeBatch(db);
        chunks.forEach((chunkText, idx) => {
          const chunkRef = doc(db, UPLOADS_COLLECTION, id, "chunks", `chunk-${idx}`);
          batch.set(chunkRef, { chunkIndex: idx, content: chunkText });
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn("Failed to save CSV upload to Firestore:", err);
    }
  }

  return record;
}

// Retrieve complete raw CSV content, reassembling chunks if chunked
export async function getCSVUploadRawContent(record: CSVUploadRecord): Promise<string> {
  if (!record.isChunked) {
    return record.rawContent;
  }

  if (typeof window === "undefined") return record.rawContent;

  try {
    const chunksRef = collection(db, UPLOADS_COLLECTION, record.id, "chunks");
    const snap = await getDocs(chunksRef);
    if (!snap.empty) {
      const sorted = snap.docs
        .map((d) => d.data() as { chunkIndex: number; content: string })
        .sort((a, b) => a.chunkIndex - b.chunkIndex);
      return sorted.map((s) => s.content).join("");
    }
  } catch (err) {
    console.warn("Failed to fetch CSV chunks from Firestore:", err);
  }

  return record.rawContent;
}

// Subscribe to real-time CSV uploads
export function subscribeToCSVUploads(
  onData: (records: CSVUploadRecord[]) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let unsubscribed = false;

  try {
    const ref = collection(db, UPLOADS_COLLECTION);
    const q = query(ref, orderBy("uploadedAtMs", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (unsubscribed) return;
        const records: CSVUploadRecord[] = snapshot.docs.map(
          (d) => d.data() as CSVUploadRecord
        );
        saveLocalCSVUploads(records);
        onData(records);
      },
      (error) => {
        console.warn("Firestore CSV uploads listener fallback to local:", error);
        if (!unsubscribed) {
          onData(getLocalCSVUploads());
        }
      }
    );

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  } catch (error) {
    onData(getLocalCSVUploads());
    return () => {};
  }
}

// Delete CSV upload archive from Firestore
export async function deleteCSVUploadArchive(uploadId: string): Promise<void> {
  const current = getLocalCSVUploads();
  saveLocalCSVUploads(current.filter((r) => r.id !== uploadId));

  if (typeof window !== "undefined") {
    try {
      // Delete any chunks in subcollection first
      const chunksRef = collection(db, UPLOADS_COLLECTION, uploadId, "chunks");
      const chunkSnaps = await getDocs(chunksRef);
      if (!chunkSnaps.empty) {
        const batch = writeBatch(db);
        chunkSnaps.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      // Delete parent document
      const docRef = doc(db, UPLOADS_COLLECTION, uploadId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn("Failed to delete CSV upload from Firestore:", err);
    }
  }
}
