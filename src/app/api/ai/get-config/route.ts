import { NextResponse } from "next/server";

export async function GET() {
  try {
    const envKey =
      process.env.gemini_api_key ||
      process.env.GEMINI_API_KEY ||
      "";

    const hasEnvKey = Boolean(envKey && envKey.trim().length > 0);
    const maskedKey = hasEnvKey
      ? `${envKey.slice(0, 6)}...${envKey.slice(-4)}`
      : "";

    return NextResponse.json({
      hasEnvKey,
      envKey: envKey ? envKey.trim() : "",
      maskedKey,
      recommendedModel: "gemini-flash-latest",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        hasEnvKey: false,
        envKey: "",
        error: err instanceof Error ? err.message : "Error fetching AI config",
      },
      { status: 500 }
    );
  }
}
