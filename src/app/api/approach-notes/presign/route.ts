import { NextRequest, NextResponse } from "next/server";
import { getPresignedUploadUrl, R2_FOLDER } from "@/lib/r2";
import { formatBytes } from "@/lib/formatters";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const fileName = (body.fileName as string) || "document.pdf";
    const fileSizeBytes = Number(body.fileSizeBytes) || 0;
    const leadId = (body.leadId as string) || "unknown-lead";
    const uploadedBy = (body.uploadedBy as string) || "Client Partner";

    if (!fileName.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF format files (.pdf) are allowed." },
        { status: 400 }
      );
    }

    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    // Key pattern: b2bxmonks/{leadId}/{timestamp}_{filename}
    const storageKey = `${R2_FOLDER}/${leadId}/${timestamp}_${cleanFileName}`;

    // Generate signed upload URL directly targeting Cloudflare R2
    const uploadUrl = await getPresignedUploadUrl(storageKey, "application/pdf", 3600);

    const fileSizeString = formatBytes(fileSizeBytes);
    const downloadUrl = `/api/approach-notes/download?key=${encodeURIComponent(
      storageKey
    )}`;

    return NextResponse.json({
      success: true,
      uploadUrl,
      storagePath: storageKey,
      downloadUrl,
      fileName,
      fileSize: fileSizeString,
      fileSizeBytes,
      uploadedAt: new Date().toISOString(),
      uploadedBy,
    });
  } catch (error: any) {
    console.error("R2 Presign URL Generation Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate presigned upload URL." },
      { status: 500 }
    );
  }
}
