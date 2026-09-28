import { NextRequest, NextResponse } from "next/server";
import { uploadFileToR2, R2_FOLDER } from "@/lib/r2";

// Maximum attachment size: 25MB (Gmail SMTP limit)
const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file was uploaded." },
        { status: 400 }
      );
    }

    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds the 25MB limit (File is ${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
        },
        { status: 400 }
      );
    }

    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    const storageKey = `${R2_FOLDER}/email-attachments/${timestamp}_${cleanFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = file.type || "application/octet-stream";

    try {
      // 1. Primary Strategy: Upload to Cloudflare R2
      await uploadFileToR2(storageKey, buffer, contentType);

      const downloadUrl = `/api/email/attachments/download?key=${encodeURIComponent(
        storageKey
      )}`;

      return NextResponse.json({
        success: true,
        attachment: {
          id: `att-${timestamp}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          type: contentType,
          storageKey,
          downloadUrl,
        },
      });
    } catch (r2Error: unknown) {
      console.warn("R2 upload error, falling back to base64 encoding:", r2Error);

      // 2. Fallback Strategy: if file is <= 4.5MB, return base64 payload
      if (file.size <= 4.5 * 1024 * 1024) {
        const base64Data = buffer.toString("base64");
        const dataUrl = `data:${contentType};base64,${base64Data}`;

        return NextResponse.json({
          success: true,
          attachment: {
            id: `att-${timestamp}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            size: file.size,
            type: contentType,
            data: dataUrl,
            downloadUrl: dataUrl,
          },
        });
      }

      throw r2Error;
    }
  } catch (error: unknown) {
    console.error("Email attachment upload error:", error);
    const msg = error instanceof Error ? error.message : "Failed to upload file attachment.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
