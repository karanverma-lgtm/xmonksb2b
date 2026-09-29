import { NextRequest, NextResponse } from "next/server";
import { uploadFileToR2, R2_FOLDER } from "@/lib/r2";
import { formatBytes } from "@/lib/formatters";
import { getMimeType } from "@/lib/mimeUtils";
import { ApproachNote } from "@/types/lead";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const leadId = (formData.get("leadId") as string) || "unknown-lead";
    const uploadedBy = (formData.get("uploadedBy") as string) || "Client Partner";

    if (!file) {
      return NextResponse.json(
        { error: "No file was provided in upload request." },
        { status: 400 }
      );
    }

    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    const noteId = `note_${timestamp}_${Math.random().toString(36).substring(2, 8)}`;
    // Key pattern: b2bxmonks/{leadId}/{timestamp}_{filename}
    const storageKey = `${R2_FOLDER}/${leadId}/${timestamp}_${cleanFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = file.type || getMimeType(file.name);

    // Upload to Cloudflare R2
    await uploadFileToR2(storageKey, buffer, contentType);

    const fileSizeString = formatBytes(file.size);
    const downloadUrl = `/api/approach-notes/download?key=${encodeURIComponent(
      storageKey
    )}`;

    const approachNote: ApproachNote = {
      id: noteId,
      fileName: file.name,
      fileSize: fileSizeString,
      fileSizeBytes: file.size,
      fileType: contentType,
      uploadedAt: new Date().toISOString(),
      uploadedBy,
      downloadUrl,
      storagePath: storageKey,
    };

    return NextResponse.json({
      success: true,
      approachNote,
    });
  } catch (error: any) {
    console.error("R2 Approach Note Upload Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload document to Cloudflare R2." },
      { status: 500 }
    );
  }
}
