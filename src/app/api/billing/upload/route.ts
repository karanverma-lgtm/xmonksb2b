import { NextRequest, NextResponse } from "next/server";
import { uploadFileToR2, R2_FOLDER } from "@/lib/r2";
import { formatBytes } from "@/lib/formatters";

// Maximum upload size for billing documents/images: 30MB
const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "document";
    const uploadedBy = (formData.get("uploadedBy") as string) || "Finance Admin";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file was uploaded." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds the 30MB limit (File is ${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
        },
        { status: 400 }
      );
    }

    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    const storageKey = `${R2_FOLDER}/billing/${timestamp}_${cleanFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = file.type || "application/octet-stream";

    try {
      // 1. Primary Strategy: Upload to Cloudflare R2
      await uploadFileToR2(storageKey, buffer, contentType);

      const downloadUrl = `/api/approach-notes/download?key=${encodeURIComponent(
        storageKey
      )}`;

      return NextResponse.json({
        success: true,
        file: {
          id: `doc-${timestamp}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          category,
          fileSize: formatBytes(file.size),
          fileSizeBytes: file.size,
          fileType: contentType,
          storagePath: storageKey,
          downloadUrl,
          uploadedAt: new Date().toISOString(),
          uploadedBy,
        },
      });
    } catch (r2Error: unknown) {
      console.warn("R2 billing file upload warning, using base64 fallback:", r2Error);

      // 2. Fallback Strategy: if file is <= 5MB, return base64 data URL
      if (file.size <= 5 * 1024 * 1024) {
        const base64Data = buffer.toString("base64");
        const dataUrl = `data:${contentType};base64,${base64Data}`;

        return NextResponse.json({
          success: true,
          file: {
            id: `doc-${timestamp}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            category,
            fileSize: formatBytes(file.size),
            fileSizeBytes: file.size,
            fileType: contentType,
            storagePath: undefined,
            downloadUrl: dataUrl,
            uploadedAt: new Date().toISOString(),
            uploadedBy,
          },
        });
      }

      throw r2Error;
    }
  } catch (error: unknown) {
    console.error("Billing upload route error:", error);
    const msg = error instanceof Error ? error.message : "Failed to upload file.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
