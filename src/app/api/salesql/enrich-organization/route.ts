import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { linkedin_url, organization_name, organization_domain, apiKey } = body;

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

    if (!linkedin_url && !organization_name && !organization_domain) {
      return NextResponse.json(
        { error: "Please provide at least a Company Domain, Company Name, or LinkedIn URL." },
        { status: 400 }
      );
    }

    // Build URL query params
    const params = new URLSearchParams();
    if (linkedin_url) params.append("linkedin_url", linkedin_url.trim());
    if (organization_name) params.append("organization_name", organization_name.trim());
    if (organization_domain) params.append("organization_domain", organization_domain.trim());

    const endpoint = `https://api-public.salesql.com/v1/organizations/enrich?${params.toString()}`;

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
        errMsg = "Organization not found in SalesQL database. Try refining the domain or LinkedIn URL.";
      } else if (res.status === 401 || res.status === 403) {
        errMsg = "SalesQL Authorization failed. Check your API token.";
      }

      return NextResponse.json({ error: errMsg }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("SalesQL enrich-organization error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error enriching organization." },
      { status: 500 }
    );
  }
}
