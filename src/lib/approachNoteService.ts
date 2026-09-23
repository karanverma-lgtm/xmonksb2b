import { storage, db } from "./firebase";
import { ref, deleteObject } from "firebase/storage";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { ApproachNote } from "@/types/lead";

const APPROACH_NOTES_COLLECTION = "b2b_approach_note_files";

/**
 * Upload an Approach Note PDF for a specific lead to Cloudflare R2 bucket under b2bxmonks/
 */
export async function uploadApproachNoteToR2(
  leadId: string,
  file: File,
  uploadedBy: string
): Promise<ApproachNote> {
  if (!file) {
    throw new Error("No file selected.");
  }

  // Validate PDF format
  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    throw new Error("Only PDF format (.pdf) is allowed for Approach Notes.");
  }

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
      errorData?.error || "Failed to upload PDF file to Cloudflare R2."
    );
  }

  const data = await res.json();
  return data.approachNote as ApproachNote;
}

// Backwards-compatible alias
export const uploadApproachNoteToFirebase = uploadApproachNoteToR2;

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
  approachNote: ApproachNote
): Promise<string> {
  if (approachNote.downloadUrl && approachNote.downloadUrl.length > 0) {
    return approachNote.downloadUrl;
  }

  // Cloudflare R2 storage path
  if (approachNote.storagePath?.startsWith("b2bxmonks/")) {
    return `/api/approach-notes/download?key=${encodeURIComponent(
      approachNote.storagePath
    )}`;
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
      console.error("Failed to load PDF from Firestore:", err);
    }
  }

  return approachNote.downloadUrl || "";
}
