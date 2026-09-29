import { storage, db } from "./firebase";
import { ref, deleteObject } from "firebase/storage";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { ApproachNote } from "@/types/lead";
import { getMimeType } from "./mimeUtils";

const APPROACH_NOTES_COLLECTION = "b2b_approach_note_files";

/**
 * Upload an Approach Note of ANY format (PDF, DOCX, XLSX, CSV, PPTX, Images, etc.)
 * for a specific lead to Cloudflare R2 bucket under b2bxmonks/
 * Uses Direct-to-R2 Presigned Upload (bypasses all 413 Payload Too Large / Vercel 4.5MB limits)
 */
export async function uploadApproachNoteToR2(
  leadId: string,
  file: File,
  uploadedBy: string
): Promise<ApproachNote> {
  if (!file) {
    throw new Error("No file selected.");
  }

  const fileType = file.type || getMimeType(file.name);

  // Strategy 1: Direct-to-R2 Presigned Upload (Bypasses server payload limits like Vercel 4.5MB / Nginx 1MB)
  try {
    const presignRes = await fetch("/api/approach-notes/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileSizeBytes: file.size,
        fileType,
        leadId,
        uploadedBy,
      }),
    });

    if (presignRes.ok) {
      const presignData = await presignRes.json();
      const { uploadUrl, success, ...metadata } = presignData;

      // Direct upload from browser to Cloudflare R2
      const r2Res = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": fileType || "application/octet-stream",
        },
        body: file,
      });

      if (r2Res.ok) {
        return metadata as ApproachNote;
      }
      console.warn(
        "Direct R2 presigned upload failed with status:",
        r2Res.status,
        "falling back to server upload route"
      );
    }
  } catch (presignErr) {
    console.warn("Presigned direct upload error, attempting server fallback:", presignErr);
  }

  // Strategy 2: Fallback to server route /api/approach-notes/upload
  const formData = new FormData();
  formData.append("file", file);
  formData.append("leadId", leadId);
  formData.append("uploadedBy", uploadedBy);

  const res = await fetch("/api/approach-notes/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(
      errorData?.error || `Failed to upload "${file.name}" to Cloudflare R2.`
    );
  }

  const data = await res.json();
  return data.approachNote as ApproachNote;
}

// Backwards-compatible alias
export const uploadApproachNoteToFirebase = uploadApproachNoteToR2;

/**
 * Upload multiple Approach Notes concurrently or sequentially with progress callback
 */
export async function uploadMultipleApproachNotesToR2(
  leadId: string,
  files: File[],
  uploadedBy: string,
  onProgress?: (completed: number, total: number, currentFileName: string) => void
): Promise<{ successful: ApproachNote[]; errors: { fileName: string; error: string }[] }> {
  const successful: ApproachNote[] = [];
  const errors: { fileName: string; error: string }[] = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    if (onProgress) {
      onProgress(i, total, file.name);
    }

    try {
      const note = await uploadApproachNoteToR2(leadId, file, uploadedBy);
      successful.push(note);
    } catch (err: any) {
      console.error(`Failed to upload ${file.name}:`, err);
      errors.push({
        fileName: file.name,
        error: err?.message || "Upload failed",
      });
    }

    if (onProgress) {
      onProgress(i + 1, total, file.name);
    }
  }

  return { successful, errors };
}

/**
 * Delete an Approach Note from Cloudflare R2 or legacy Firebase
 */
export async function deleteApproachNoteFromR2(
  leadId: string,
  storagePath?: string
): Promise<void> {
  if (!storagePath) return;

  // 1. If stored in Cloudflare R2 (starts with b2bxmonks/)
  if (storagePath.startsWith("b2bxmonks/")) {
    try {
      await fetch(
        `/api/approach-notes/delete?key=${encodeURIComponent(storagePath)}`,
        {
          method: "DELETE",
        }
      );
    } catch (err) {
      console.warn("Could not delete from Cloudflare R2:", err);
    }
    return;
  }

  // 2. Legacy: If stored in Firebase Storage
  if (!storagePath.startsWith("firestore:")) {
    try {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    } catch (err) {
      console.warn("Could not delete from Firebase Storage (may already be removed):", err);
    }
  }

  // 3. Legacy: Clean up any Firestore fallback document for this lead
  try {
    const noteDocRef = doc(db, APPROACH_NOTES_COLLECTION, leadId);
    await deleteDoc(noteDocRef);
  } catch (err) {
    console.warn("Could not delete from Firestore notes collection:", err);
  }
}

// Backwards-compatible alias
export const deleteApproachNoteFromFirebase = deleteApproachNoteFromR2;

/**
 * Retrieve the active download / view URL for an Approach Note, resolving legacy Firestore documents if necessary
 */
export async function getApproachNoteContentUrl(
  leadId: string,
  approachNote: ApproachNote,
  download: boolean = false
): Promise<string> {
  let url = approachNote.downloadUrl;

  if (!url && approachNote.storagePath?.startsWith("b2bxmonks/")) {
    url = `/api/approach-notes/download?key=${encodeURIComponent(
      approachNote.storagePath
    )}`;
  }

  if (url) {
    if (download) {
      return url.includes("?") ? `${url}&download=1` : `${url}?download=1`;
    }
    return url;
  }

  // Legacy Firestore base64 fallback
  if (approachNote.storagePath?.startsWith("firestore:")) {
    try {
      const noteDocRef = doc(db, APPROACH_NOTES_COLLECTION, leadId);
      const snapshot = await getDoc(noteDocRef);
      if (snapshot.exists() && snapshot.data()?.base64Content) {
        return snapshot.data().base64Content;
      }
    } catch (err) {
      console.error("Failed to load document from Firestore:", err);
    }
  }

  return "";
}
