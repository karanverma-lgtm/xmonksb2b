import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      linkedin_url,
      email,
      first_name,
      last_name,
      full_name,
      organization_name,
      organization_domain,
      match_if_direct_email = false,
      match_if_direct_phone = false,
      apiKey,
    } = body;

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

    if (!linkedin_url && !email && !full_name && !(first_name && last_name)) {
      return NextResponse.json(
        { error: "Please provide a LinkedIn URL, Email, or Name to enrich person." },
        { status: 400 }
      );
    }

    // Build URL query params
    const params = new URLSearchParams();
    if (linkedin_url) params.append("linkedin_url", linkedin_url.trim());
    if (email) params.append("email", email.trim());
    if (first_name) params.append("first_name", first_name.trim());
    if (last_name) params.append("last_name", last_name.trim());
    if (full_name) params.append("full_name", full_name.trim());
    if (organization_name) params.append("organization_name", organization_name.trim());
    if (organization_domain) params.append("organization_domain", organization_domain.trim());
    params.append("match_if_direct_email", match_if_direct_email ? "true" : "false");
    params.append("match_if_direct_phone", match_if_direct_phone ? "true" : "false");

    const endpoint = `https://api-public.salesql.com/v1/persons/enrich?${params.toString()}`;

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
        errMsg = "Person not found in SalesQL. Verify the LinkedIn profile URL or corporate email.";
      } else if (res.status === 401 || res.status === 403) {
        errMsg = "SalesQL Authorization failed. Check your API token.";
      }

      return NextResponse.json({ error: errMsg }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("SalesQL enrich-person error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error enriching person." },
      { status: 500 }
    );
  }
}
