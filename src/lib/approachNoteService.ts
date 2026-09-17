import { storage, db } from "./firebase";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { ApproachNote } from "@/types/lead";
import { formatBytes } from "./formatters";

const APPROACH_NOTES_COLLECTION = "b2b_approach_note_files";

/**
 * Converts a File or Blob into a Base64 data URI
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Upload an Approach Note PDF for a specific lead to Firebase.
 * Primary method: Firebase Storage bucket.
 * Secondary fallback: Firestore document storage as base64 if Storage bucket rules/CORS are restricted.
 */
export async function uploadApproachNoteToFirebase(
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

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const storagePath = `approach_notes/${leadId}/${timestamp}_${cleanFileName}`;
  const fileSizeString = formatBytes(file.size);

  let downloadUrl = "";
  let finalStoragePath = storagePath;

  // 1. Attempt upload to Firebase Storage
  try {
    const storageRef = ref(storage, storagePath);
    const metadata = {
      contentType: "application/pdf",
      customMetadata: {
        leadId,
        uploadedBy,
        uploadedAt: new Date().toISOString(),
      },
    };

    const snapshot = await uploadBytes(storageRef, file, metadata);
    downloadUrl = await getDownloadURL(snapshot.ref);
  } catch (storageError) {
    console.warn(
      "Firebase Storage upload encountered an issue, storing PDF payload in Firestore as fallback:",
      storageError
    );

    // Fallback: Encode as Base64 and store in Firestore collection
    try {
      const base64Content = await fileToBase64(file);
      finalStoragePath = `firestore:${APPROACH_NOTES_COLLECTION}/${leadId}`;
      downloadUrl = base64Content;

      const noteDocRef = doc(db, APPROACH_NOTES_COLLECTION, leadId);
      await setDoc(noteDocRef, {
        leadId,
        fileName: file.name,
        fileSize: fileSizeString,
        fileSizeBytes: file.size,
        base64Content,
        uploadedAt: new Date().toISOString(),
        uploadedBy,
      });
    } catch (firestoreError) {
      console.error("Firestore PDF fallback upload also failed:", firestoreError);
      throw new Error(
        "Failed to upload approach note to Firebase. Please check your network connection and file size."
      );
    }
  }

  const approachNote: ApproachNote = {
    fileName: file.name,
    fileSize: fileSizeString,
    fileSizeBytes: file.size,
    uploadedAt: new Date().toISOString(),
    uploadedBy,
    downloadUrl,
    storagePath: finalStoragePath,
  };

  return approachNote;
}

/**
 * Delete an Approach Note from Firebase (both Storage and Firestore fallback if present)
 */
export async function deleteApproachNoteFromFirebase(
  leadId: string,
  storagePath?: string
): Promise<void> {
  // If stored in Firebase Storage
  if (storagePath && !storagePath.startsWith("firestore:")) {
    try {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    } catch (err) {
      console.warn("Could not delete from Firebase Storage (may already be removed):", err);
    }
  }

  // Also clean up any Firestore fallback document for this lead
  try {
    const noteDocRef = doc(db, APPROACH_NOTES_COLLECTION, leadId);
    await deleteDoc(noteDocRef);
  } catch (err) {
    console.warn("Could not delete from Firestore notes collection:", err);
  }
}

/**
 * Retrieve the active download / view URL for an Approach Note, resolving Firestore documents if necessary
 */
export async function getApproachNoteContentUrl(
  leadId: string,
  approachNote: ApproachNote
): Promise<string> {
  if (approachNote.downloadUrl && approachNote.downloadUrl.length > 0) {
    return approachNote.downloadUrl;
  }

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
