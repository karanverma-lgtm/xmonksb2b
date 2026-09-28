import { NextResponse } from "next/server";
import { getEffectiveSalesQLToken } from "@/lib/salesqlServerHelper";

export async function GET() {
  const effectiveKey = await getEffectiveSalesQLToken();

  if (!effectiveKey) {
    return NextResponse.json({
      hasEnvKey: false,
      envKey: "",
      maskedKey: "",
    });
  }

  const clean = effectiveKey.trim();
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
