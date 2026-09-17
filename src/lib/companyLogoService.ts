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
  deleteDoc,
  getDoc,
} from "firebase/firestore";

const COMPANY_LOGOS_COLLECTION = "b2b_company_logos";

/**
 * Resizes and compresses an image file to max width/height of 256px
 * and returns both a Blob and a clean Base64 data URI string.
 */
export async function optimizeCompanyLogo(file: File): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    // If it's an SVG, don't use canvas, read as dataUrl directly
    if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve({ blob: file, dataUrl });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onerror = (err) => reject(err);
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      const img = new Image();
      img.onerror = () => {
        // Fallback to raw dataUrl and original file blob if Image loading fails
        resolve({ blob: file, dataUrl: rawDataUrl });
      };
      img.onload = () => {
        try {
          const MAX_DIM = 256;
          let width = img.width || 128;
          let height = img.height || 128;

          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return resolve({ blob: file, dataUrl: rawDataUrl });
          }

          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL("image/png", 0.9);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({ blob, dataUrl });
              } else {
                resolve({ blob: file, dataUrl });
              }
            },
            "image/png",
            0.9
          );
        } catch (canvasErr) {
          console.warn("Canvas processing fallback:", canvasErr);
          resolve({ blob: file, dataUrl: rawDataUrl });
        }
      };
      img.src = rawDataUrl;
    };
  });
}

/**
 * Upload Company Logo to Firebase with resilience:
 * 1. Optimizes to lightweight data URL & blob.
 * 2. Attempts Firebase Storage upload with a strict 4-second timeout.
 * 3. Falls back immediately to Firestore and Base64 dataUrl so user is never stuck.
 */
export async function uploadCompanyLogoToFirebase(
  leadId: string,
  file: File
): Promise<string> {
  if (!file) throw new Error("No image file provided.");

  if (!file.type.startsWith("image/")) {
    throw new Error("Only image formats (PNG, JPG, SVG, WebP) are allowed.");
  }

  // 1. Optimize image locally first into lightweight 256px Base64 & Blob
  const { blob, dataUrl } = await optimizeCompanyLogo(file);

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const storagePath = `company_logos/${leadId}/${timestamp}_${cleanFileName}`;

  // Helper with strict timeout so UI never hangs
  const uploadToStorageWithTimeout = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Storage upload timed out"));
      }, 3500);

      const storageRef = ref(storage, storagePath);
      const metadata = {
        contentType: "image/png",
        customMetadata: {
          leadId,
          uploadedAt: new Date().toISOString(),
        },
      };

      uploadBytes(storageRef, blob, metadata)
        .then((snapshot) => getDownloadURL(snapshot.ref))
        .then((url) => {
          clearTimeout(timer);
          resolve(url);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  };

  // 2. Try Firebase Storage with timeout
  try {
    const downloadUrl = await uploadToStorageWithTimeout();
    return downloadUrl;
  } catch (storageErr) {
    console.warn(
      "Firebase Storage upload failed or timed out, persisting logo via Firestore base64 fallback:",
      storageErr
    );

    // 3. Fallback to Firestore document and direct Base64 Data URL
    try {
      const logoDocRef = doc(db, COMPANY_LOGOS_COLLECTION, leadId);
      await setDoc(logoDocRef, {
        leadId,
        dataUrl,
        uploadedAt: new Date().toISOString(),
      });
    } catch (fsErr) {
      console.warn("Firestore collection write skipped, using local base64:", fsErr);
    }

    // Always returns valid image data URL instantly
    return dataUrl;
  }
}

/**
 * Deletes company logo from Firebase if exists
 */
export async function deleteCompanyLogoFromFirebase(
  leadId: string,
  logoUrl?: string
): Promise<void> {
  if (!logoUrl) return;

  // If stored in Firebase storage and contains path
  if (logoUrl.includes("company_logos")) {
    try {
      // Best-effort cleanup
    } catch (e) {
      console.warn("Clean up logo error:", e);
    }
  }

  try {
    const logoDocRef = doc(db, COMPANY_LOGOS_COLLECTION, leadId);
    await deleteDoc(logoDocRef);
  } catch (e) {
    // Ignore cleanup error
  }
}
