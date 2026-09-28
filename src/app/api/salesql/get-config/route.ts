import { NextResponse } from "next/server";

export async function GET() {
  const envKey =
    process.env.salesql_api ||
    process.env.SALESQL_API ||
    process.env.SALESQL_API_KEY ||
    "";

  if (!envKey) {
    return NextResponse.json({
      hasEnvKey: false,
      envKey: "",
      maskedKey: "",
    });
  }

  const clean = envKey.trim();
  const masked =
    clean.length > 8
      ? `${clean.slice(0, 4)}••••••••${clean.slice(-4)}`
      : "••••••••";

  return NextResponse.json({
    hasEnvKey: true,
    envKey: clean,
    maskedKey: masked,
  });
}
