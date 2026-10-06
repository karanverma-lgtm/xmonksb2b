import { NextRequest, NextResponse } from "next/server";
import { uploadFileToR2, R2_FOLDER } from "@/lib/r2";
import { formatBytes } from "@/lib/formatters";
import { getMimeType } from "@/lib/mimeUtils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const uploadedBy = (formData.get("uploadedBy") as string) || "xMonks Team";

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided in form data." }, { status: 400 });
    }

    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    const docId = `lib-${timestamp}-${Math.random().toString(36).substring(2, 7)}`;
    const storageKey = `${R2_FOLDER}/library/${timestamp}_${cleanFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = file.type || getMimeType(file.name);

    await uploadFileToR2(storageKey, buffer, contentType);

    const downloadUrl = `/api/library/download?key=${encodeURIComponent(storageKey)}`;

    return NextResponse.json({
      success: true,
      id: docId,
      storageKey,
      downloadUrl,
      fileName: file.name,
      fileSize: formatBytes(file.size),
      fileSizeBytes: file.size,
      fileType: contentType,
      uploadedAt: new Date().toISOString(),
      uploadedBy,
    });
  } catch (error: unknown) {
    console.error("Library server upload error:", error);
    const msg = error instanceof Error ? error.message : "Failed to upload document to storage.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
