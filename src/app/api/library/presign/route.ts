import { NextRequest, NextResponse } from "next/server";
import { getPresignedUploadUrl, R2_FOLDER } from "@/lib/r2";
import { formatBytes } from "@/lib/formatters";
import { getMimeType } from "@/lib/mimeUtils";

// Max upload size: 100MB for library assets (PDFs, Videos, ZIPs, PPTXs, etc.)
const MAX_LIBRARY_SIZE_BYTES = 100 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const fileName = (body.fileName as string) || "document";
    const fileSizeBytes = Number(body.fileSizeBytes) || 0;
    const uploadedBy = (body.uploadedBy as string) || "xMonks Team";
    const requestedContentType = (body.fileType as string) || getMimeType(fileName);

    if (fileSizeBytes > MAX_LIBRARY_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds the 100MB limit (${(fileSizeBytes / (1024 * 1024)).toFixed(1)}MB).`,
        },
        { status: 400 }
      );
    }

    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    const docId = `lib-${timestamp}-${Math.random().toString(36).substring(2, 7)}`;
    // Storage Key pattern: b2bxmonks/library/{timestamp}_{cleanFileName}
    const storageKey = `${R2_FOLDER}/library/${timestamp}_${cleanFileName}`;

    // Direct presigned upload to Cloudflare R2
    const uploadUrl = await getPresignedUploadUrl(
      storageKey,
      requestedContentType || "application/octet-stream",
      3600
    );

    const downloadUrl = `/api/library/download?key=${encodeURIComponent(storageKey)}`;

    return NextResponse.json({
      success: true,
      uploadUrl,
      id: docId,
      storageKey,
      downloadUrl,
      fileName,
      fileSize: formatBytes(fileSizeBytes),
      fileSizeBytes,
      fileType: requestedContentType,
      uploadedAt: new Date().toISOString(),
      uploadedBy,
    });
  } catch (error: unknown) {
    console.error("Library presign error:", error);
    const msg = error instanceof Error ? error.message : "Failed to generate presigned upload URL.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
