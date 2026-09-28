import { NextRequest, NextResponse } from "next/server";
import { getFileFromR2 } from "@/lib/r2";

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
        { error: "File not found or empty." },
        { status: 404 }
      );
    }

    // Extract filename from key
    const rawFileName = key.split("/").pop() || "attachment";
    // Strip leading timestamp e.g. 1789634212_myfile.pdf -> myfile.pdf
    const cleanFileName = rawFileName.replace(/^\d+_/, "");

    const byteArray = await r2Response.Body.transformToByteArray();
    const dispositionType = isDownload ? "attachment" : "inline";

    const headers = new Headers();
    headers.set(
      "Content-Type",
      r2Response.ContentType || "application/octet-stream"
    );
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
  } catch (error: unknown) {
    console.error("Email attachment download error:", error);
    const errObj = error as { name?: string; $metadata?: { httpStatusCode?: number }; message?: string };
    if (errObj?.name === "NoSuchKey" || errObj?.$metadata?.httpStatusCode === 404) {
      return NextResponse.json(
        { error: "File not found in storage." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: errObj?.message || "Failed to download attachment." },
      { status: 500 }
    );
  }
}
