import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, apiKey } = body;

    const token =
      apiKey?.trim() ||
      process.env.salesql_api ||
      process.env.SALESQL_API ||
      process.env.SALESQL_API_KEY ||
      "";

    if (!token) {
      return NextResponse.json(
        { error: "SalesQL API key is missing. Please configure it in Developer settings or .env (salesql_api)." },
        { status: 401 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please provide a valid email address for reverse lookup." },
        { status: 400 }
      );
    }

    const endpoint = `https://api-public.salesql.com/v1/persons/email_lookup?email=${encodeURIComponent(email.trim())}`;

    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      let errMsg = `SalesQL API error (Status ${res.status})`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.message) errMsg = parsed.message;
        if (parsed.error) errMsg = parsed.error;
      } catch {}

      if (res.status === 404) {
        errMsg = "No person found matching this email address in SalesQL.";
      } else if (res.status === 401 || res.status === 403) {
        errMsg = "SalesQL Authorization failed. Check your API token.";
      }

      return NextResponse.json({ error: errMsg }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("SalesQL email-lookup error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error performing email lookup." },
      { status: 500 }
    );
  }
}
