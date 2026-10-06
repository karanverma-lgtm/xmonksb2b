import { NextRequest, NextResponse } from "next/server";
import { getFileFromR2, uploadFileToR2 } from "@/lib/r2";
import { getMimeType } from "@/lib/mimeUtils";
import { generateSampleDocument } from "@/lib/sampleDocumentBuilder";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const isDownload =
      searchParams.get("download") === "1" ||
      searchParams.get("download") === "true";

    if (!key) {
      return NextResponse.json(
        { error: "Missing required 'key' parameter." },
        { status: 400 }
      );
    }

    // Security check: ensure key belongs to b2bxmonks folder
    if (!key.startsWith("b2bxmonks/")) {
      return NextResponse.json(
        { error: "Access denied. Invalid storage path." },
        { status: 403 }
      );
    }

    // Extract filename from key
    const rawFileName = key.split("/").pop() || "library_document";
    // Strip leading timestamp and seed prefix
    const cleanFileName = rawFileName.replace(/^\d+_/, "").replace(/^seed_/, "");

    let byteArray: Uint8Array | null = null;
    let contentType = "";

    try {
      const r2Response = await getFileFromR2(key);
      if (r2Response.Body) {
        byteArray = await r2Response.Body.transformToByteArray();
        contentType =
          r2Response.ContentType && r2Response.ContentType !== "application/octet-stream"
            ? r2Response.ContentType
            : getMimeType(cleanFileName, "application/octet-stream");
      }
    } catch (r2Err: unknown) {
      console.warn(`File "${key}" not found in R2 storage, generating valid document fallback:`, r2Err);
    }

    // If file was not in R2 (e.g. unseeded demo file, missing key), generate on-the-fly valid document
    if (!byteArray || byteArray.length === 0) {
      const docTitle = cleanFileName.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");
      const sample = generateSampleDocument(cleanFileName, {
        title: docTitle,
        fileName: cleanFileName,
        author: "xMonks Enterprise Team",
        date: "2026",
      });

      byteArray = sample.buffer;
      contentType = sample.contentType;

      // Asynchronously cache this generated file back to R2 so future requests hit R2 directly
      uploadFileToR2(key, sample.buffer, sample.contentType).catch((err) => {
        console.warn("Background R2 cache error:", err);
      });
    }

    const dispositionType = isDownload ? "attachment" : "inline";
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set(
      "Content-Disposition",
      `${dispositionType}; filename="${encodeURIComponent(cleanFileName)}"; filename*=UTF-8''${encodeURIComponent(cleanFileName)}`
    );
    headers.set("Content-Length", byteArray.length.toString());
    headers.set("Cache-Control", "public, max-age=3600");

    return new NextResponse(byteArray as any, {
      status: 200,
      headers,
    });
  } catch (error: unknown) {
    console.error("Library file download error:", error);
    const msg = error instanceof Error ? error.message : "Failed to retrieve document from storage.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

