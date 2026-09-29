import { NextRequest, NextResponse } from "next/server";
import { getPresignedUploadUrl, R2_FOLDER } from "@/lib/r2";
import { formatBytes } from "@/lib/formatters";
import { getMimeType } from "@/lib/mimeUtils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const fileName = (body.fileName as string) || "financial_document.pdf";
    const fileSizeBytes = Number(body.fileSizeBytes) || 0;
    const leadId = (body.leadId as string) || "unknown-lead";
    const uploadedBy = (body.uploadedBy as string) || "Client Partner";
    const requestedContentType = (body.fileType as string) || getMimeType(fileName);

    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    const docId = `findoc_${timestamp}_${Math.random().toString(36).substring(2, 8)}`;

    // Key pattern: b2bxmonks/{leadId}/financial/{timestamp}_{filename}
    const storageKey = `${R2_FOLDER}/${leadId}/financial/${timestamp}_${cleanFileName}`;

    // Generate signed upload URL directly targeting Cloudflare R2 for ANY format
    const uploadUrl = await getPresignedUploadUrl(
      storageKey,
      requestedContentType || "application/octet-stream",
      3600
    );

    const fileSizeString = formatBytes(fileSizeBytes);
    const downloadUrl = `/api/financial-documents/download?key=${encodeURIComponent(
      storageKey
    )}`;

    return NextResponse.json({
      success: true,
      uploadUrl,
      id: docId,
      storagePath: storageKey,
      downloadUrl,
      fileName,
      fileSize: fileSizeString,
      fileSizeBytes,
      fileType: requestedContentType,
      uploadedAt: new Date().toISOString(),
      uploadedBy,
    });
  } catch (error: any) {
    console.error("R2 Financial Document Presign URL Generation Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate presigned upload URL." },
      { status: 500 }
    );
  }
}
