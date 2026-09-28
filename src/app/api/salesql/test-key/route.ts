import { NextRequest, NextResponse } from "next/server";
import { getEffectiveSalesQLToken } from "@/lib/salesqlServerHelper";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const key = await getEffectiveSalesQLToken(body.apiKey);

    if (!key) {
      return NextResponse.json(
        {
          success: false,
          error: "No SalesQL API key provided or found in .env (salesql_api).",
        },
        { status: 400 }
      );
    }

    // Ping SalesQL Organization Enrich endpoint with a common domain to verify token
    const testUrl = "https://api-public.salesql.com/v1/organizations/enrich?organization_domain=openai.com";
    const res = await fetch(testUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      let errMsg = `SalesQL API responded with HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.message) errMsg = parsed.message;
        if (parsed.error) errMsg = parsed.error;
      } catch {}

      if (res.status === 401 || res.status === 403) {
        errMsg = "Invalid or expired SalesQL API key. Please check your token.";
      }

      return NextResponse.json(
        { success: false, error: errMsg, statusCode: res.status },
        { status: res.status }
      );
    }

    const data = await res.json().catch(() => ({}));
    return NextResponse.json({
      success: true,
      message: "SalesQL API connected and authenticated successfully!",
      sampleData: {
        name: data.name || "Verified",
        domain: data.website_domain || "openai.com",
      },
    });
  } catch (error: any) {
    console.error("SalesQL test-key error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to reach SalesQL API servers.",
      },
      { status: 500 }
    );
  }
}
