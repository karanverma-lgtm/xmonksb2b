import { NextRequest, NextResponse } from "next/server";
import { deleteFileFromR2 } from "@/lib/r2";

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let key = searchParams.get("key");

    if (!key) {
      try {
        const body = await req.json();
        key = body.key;
      } catch {
        // No body provided
      }
    }

    if (!key) {
      return NextResponse.json(
        { error: "Missing required 'key' parameter." },
        { status: 400 }
      );
    }

    if (key.startsWith("b2bxmonks/")) {
      await deleteFileFromR2(key);
    }

    return NextResponse.json({ success: true, deletedKey: key });
  } catch (error: any) {
    console.error("R2 PDF Delete Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete PDF file from storage." },
      { status: 500 }
    );
  }
}
