import { NextRequest, NextResponse } from "next/server";
import { getPresignedUploadUrl, R2_FOLDER } from "@/lib/r2";

// Maximum attachment size: 25MB (Gmail SMTP limit)
const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const fileName = (body.fileName as string) || "attachment";
    const fileSizeBytes = Number(body.fileSizeBytes) || 0;
    const requestedContentType = (body.fileType as string) || "application/octet-stream";

    if (fileSizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds the 25MB limit (${(fileSizeBytes / (1024 * 1024)).toFixed(1)}MB).`,
        },
        { status: 400 }
      );
    }

    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    const storageKey = `${R2_FOLDER}/email-attachments/${timestamp}_${cleanFileName}`;

    // Generate signed upload URL directly targeting Cloudflare R2
    const uploadUrl = await getPresignedUploadUrl(
      storageKey,
      requestedContentType || "application/octet-stream",
      3600
    );

    const downloadUrl = `/api/email/attachments/download?key=${encodeURIComponent(
      storageKey
    )}`;

    return NextResponse.json({
      success: true,
      uploadUrl,
      attachment: {
        id: `att-${timestamp}-${Math.random().toString(36).substring(2, 7)}`,
        name: fileName,
        size: fileSizeBytes,
        type: requestedContentType,
        storageKey,
        downloadUrl,
      },
    });
  } catch (error: unknown) {
    console.error("Email attachment presign error:", error);
    const msg = error instanceof Error ? error.message : "Failed to generate presigned upload URL.";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
