import { NextRequest, NextResponse } from "next/server";
import { BulkEnrichPersonQuery } from "@/types/salesql";
import { getEffectiveSalesQLToken } from "@/lib/salesqlServerHelper";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawQueries: BulkEnrichPersonQuery[] = Array.isArray(body)
      ? body
      : Array.isArray(body?.queries)
      ? body.queries
      : [];
    const apiKey = body?.apiKey;

    const token = await getEffectiveSalesQLToken(apiKey);

    if (!token) {
      return NextResponse.json(
        { error: "SalesQL API key is missing. Please configure it in Developer settings or .env (salesql_api)." },
        { status: 401 }
      );
    }

    if (!rawQueries || rawQueries.length === 0) {
      return NextResponse.json(
        { error: "Please provide a list of queries to bulk enrich (up to 100 items)." },
        { status: 400 }
      );
    }

    if (rawQueries.length > 100) {
      return NextResponse.json(
        { error: `Maximum batch size is 100 queries. Provided: ${rawQueries.length}. Please split into batches.` },
        { status: 400 }
      );
    }

    // Clean and validate each query per SalesQL Group rules:
    // Group 1: linkedin_url
    // Group 2: email
    // Group 3: name + organization
    const validQueries = rawQueries.map((q) => {
      const clean: BulkEnrichPersonQuery = {};
      if (q.linkedin_url?.trim()) clean.linkedin_url = q.linkedin_url.trim();
      if (q.email?.trim()) clean.email = q.email.trim();
      if (q.first_name?.trim()) clean.first_name = q.first_name.trim();
      if (q.last_name?.trim()) clean.last_name = q.last_name.trim();
      if (q.full_name?.trim()) clean.full_name = q.full_name.trim();
      if (q.organization_name?.trim()) clean.organization_name = q.organization_name.trim();
      if (q.organization_domain?.trim()) clean.organization_domain = q.organization_domain.trim();
      return clean;
    });

    const endpoint = "https://api-public.salesql.com/v1/persons/enrich/bulk";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validQueries),
    });

    const rawData = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg =
        (typeof rawData === "object" && rawData?.error) ||
        (typeof rawData === "string" ? rawData : null) ||
        `SalesQL API error (${res.status}): ${res.statusText}`;

      return NextResponse.json({ error: errorMsg }, { status: res.status });
    }

    // SalesQL bulk endpoint returns an array where each index corresponds to the input query
    return NextResponse.json({ data: rawData, count: Array.isArray(rawData) ? rawData.length : 0 });
  } catch (error: any) {
    console.error("SalesQL Bulk Enrich Person API Route Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error connecting to SalesQL bulk enrich." },
      { status: 500 }
    );
  }
}
