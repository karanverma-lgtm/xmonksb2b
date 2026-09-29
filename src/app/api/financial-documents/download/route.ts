import { NextRequest, NextResponse } from "next/server";
import { getFileFromR2 } from "@/lib/r2";
import { getMimeType } from "@/lib/mimeUtils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const isDownload =
      searchParams.get("download") === "1" ||
      searchParams.get("download") === "true";

    if (!key) {
      return NextResponse.json(
        { error: "Missing required 'key' query parameter." },
        { status: 400 }
      );
    }

    // Security check: ensure key belongs to b2bxmonks prefix
    if (!key.startsWith("b2bxmonks/")) {
      return NextResponse.json(
        { error: "Access denied. Invalid storage path." },
        { status: 403 }
      );
    }

    const r2Response = await getFileFromR2(key);

    if (!r2Response.Body) {
      return NextResponse.json(
        { error: "Document not found or empty." },
        { status: 404 }
      );
    }

    // Extract filename from key
    const rawFileName = key.split("/").pop() || "document";
    // Strip leading timestamp e.g. 1789634212_myfile.docx -> myfile.docx
    const cleanFileName = rawFileName.replace(/^\d+_/, "");

    const mimeType =
      r2Response.ContentType && r2Response.ContentType !== "application/octet-stream"
        ? r2Response.ContentType
        : getMimeType(cleanFileName);

    const byteArray = await r2Response.Body.transformToByteArray();

    const dispositionType = isDownload ? "attachment" : "inline";
    const headers = new Headers();
    headers.set("Content-Type", mimeType);
    headers.set(
      "Content-Disposition",
      `${dispositionType}; filename="${encodeURIComponent(cleanFileName)}"`
    );
    headers.set("Content-Length", byteArray.length.toString());
    headers.set("Cache-Control", "public, max-age=3600");

    return new NextResponse(byteArray as any, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("R2 Document Download Error:", error);
    if (error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404) {
      return NextResponse.json({ error: "Document not found in storage." }, { status: 404 });
    }
    return NextResponse.json(
      { error: error?.message || "Failed to retrieve document from storage." },
      { status: 500 }
    );
  }
}
