import { NextRequest, NextResponse } from "next/server";
import { deleteFileFromR2 } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const storageKey = body.storageKey as string;

    if (!storageKey) {
      return NextResponse.json(
        { success: false, error: "Missing required 'storageKey' parameter." },
        { status: 400 }
      );
    }

    if (!storageKey.startsWith("b2bxmonks/")) {
      return NextResponse.json(
        { success: false, error: "Access denied. Invalid storage path." },
        { status: 403 }
      );
    }

    await deleteFileFromR2(storageKey);

    return NextResponse.json({ success: true, message: "File removed from storage." });
  } catch (error: unknown) {
    console.error("Library file delete error:", error);
    const msg = error instanceof Error ? error.message : "Failed to delete document from storage.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
