import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey =
      body.apiKey ||
      process.env.gemini_api_key ||
      process.env.GEMINI_API_KEY ||
      "";

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "No Gemini API key provided or found in environment variables.",
        },
        { status: 400 }
      );
    }

    const CANDIDATE_MODELS = [
      "gemini-flash-latest",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-3.7-flash",
    ];

    let lastError = "";
    let successfulModel = "";

    for (const model of CANDIDATE_MODELS) {
      try {
        const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(testUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: "Respond with the single word: OK",
                  },
                ],
              },
            ],
          }),
        });

        const data = await res.json();
        if (res.ok) {
          successfulModel = model;
          break;
        } else {
          lastError = data?.error?.message || `Model ${model} returned error status ${res.status}`;
        }
      } catch (e: unknown) {
        lastError = e instanceof Error ? e.message : `Failed connecting with ${model}`;
      }
    }

    if (!successfulModel) {
      return NextResponse.json(
        {
          success: false,
          error: lastError || "Failed to authenticate Gemini API Key across available models.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Google Gemini API Key authenticated successfully using model ${successfulModel}!`,
      model: successfulModel,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to connect to Google Gemini API",
      },
      { status: 500 }
    );
  }
}
