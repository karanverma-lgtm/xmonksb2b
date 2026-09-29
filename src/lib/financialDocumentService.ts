import { FinancialDocument } from "@/types/lead";
import { getMimeType } from "./mimeUtils";

/**
 * Upload a single Financial Document of ANY format (PDF, DOCX, XLSX, CSV, PPTX, etc.)
 * to Cloudflare R2 bucket under b2bxmonks/{leadId}/financial/
 * Uses direct Presigned PUT URL first (bypassing Vercel 4.5MB limit), falling back to server route.
 */
export async function uploadFinancialDocumentToR2(
  leadId: string,
  file: File,
  uploadedBy: string
): Promise<FinancialDocument> {
  if (!file) {
    throw new Error("No file selected.");
  }

  const fileType = file.type || getMimeType(file.name);

  // Strategy 1: Direct-to-R2 Presigned Upload
  try {
    const presignRes = await fetch("/api/financial-documents/presign", {
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
        return metadata as FinancialDocument;
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

  // Strategy 2: Fallback to server route /api/financial-documents/upload
  const formData = new FormData();
  formData.append("file", file);
  formData.append("leadId", leadId);
  formData.append("uploadedBy", uploadedBy);

  const res = await fetch("/api/financial-documents/upload", {
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
  return data.document as FinancialDocument;
}

/**
 * Upload multiple Financial Documents concurrently or sequentially with progress callback
 */
export async function uploadMultipleFinancialDocumentsToR2(
  leadId: string,
  files: File[],
  uploadedBy: string,
  onProgress?: (completed: number, total: number, currentFileName: string) => void
): Promise<{ successful: FinancialDocument[]; errors: { fileName: string; error: string }[] }> {
  const successful: FinancialDocument[] = [];
  const errors: { fileName: string; error: string }[] = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    if (onProgress) {
      onProgress(i, total, file.name);
    }

    try {
      const doc = await uploadFinancialDocumentToR2(leadId, file, uploadedBy);
      successful.push(doc);
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
 * Delete a Financial Document from Cloudflare R2
 */
export async function deleteFinancialDocumentFromR2(
  storagePath?: string
): Promise<void> {
  if (!storagePath) return;

  if (storagePath.startsWith("b2bxmonks/")) {
    try {
      await fetch(
        `/api/financial-documents/delete?key=${encodeURIComponent(storagePath)}`,
        {
          method: "DELETE",
        }
      );
    } catch (err) {
      console.warn("Could not delete financial document from Cloudflare R2:", err);
    }
  }
}

/**
 * Generate active view/download URL for a financial document
 */
export function getFinancialDocumentContentUrl(
  doc: FinancialDocument,
  download: boolean = false
): string {
  if (doc.downloadUrl) {
    if (download) {
      return doc.downloadUrl.includes("?")
        ? `${doc.downloadUrl}&download=1`
        : `${doc.downloadUrl}?download=1`;
    }
    return doc.downloadUrl;
  }

  if (doc.storagePath?.startsWith("b2bxmonks/")) {
    const base = `/api/financial-documents/download?key=${encodeURIComponent(
      doc.storagePath
    )}`;
    return download ? `${base}&download=1` : base;
  }

  return "#";
}
