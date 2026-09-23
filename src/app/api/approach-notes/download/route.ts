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
        { error: "File not found or empty." },
        { status: 404 }
      );
    }

    // Extract filename from key
    const rawFileName = key.split("/").pop() || "approach_note.pdf";
    // Strip leading timestamp e.g. 1789634212_myfile.pdf -> myfile.pdf
    const cleanFileName = rawFileName.replace(/^\d+_/, "");

    const byteArray = await r2Response.Body.transformToByteArray();

    const dispositionType = isDownload ? "attachment" : "inline";
    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
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
    console.error("R2 PDF Download Error:", error);
    if (error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404) {
      return NextResponse.json({ error: "PDF file not found in storage." }, { status: 404 });
    }
    return NextResponse.json(
      { error: error?.message || "Failed to retrieve PDF file from storage." },
      { status: 500 }
    );
  }
}
