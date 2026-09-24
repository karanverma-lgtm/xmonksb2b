import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const context = body.context?.trim();
    const tone = body.tone || "executive";
    const program = body.program || "General";
    const senderName = body.senderName || "xMonks Team";
    const apiKey =
      body.apiKey ||
      process.env.gemini_api_key ||
      process.env.GEMINI_API_KEY ||
      "";

    if (!context) {
      return NextResponse.json(
        { success: false, error: "Please provide context or requirements for the email template." },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Gemini API key is not configured. Please add your key in the Developer tab.",
        },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an elite B2B Enterprise Copywriter and Email Template Designer for xMonks (a premier corporate leadership, executive coaching, and L&D transformation partner).

Your task is to take the user's business context, goal, or rough email draft and transform it into a stunning, responsive, high-converting HTML email template.

Key Requirements:
1. SUBJECT LINE: Create an irresistible, professional, personalized B2B subject line (can include {{contactName}} or {{companyName}} where appropriate).
2. HTML STRUCTURE:
   - Must use inline CSS on all elements for universal email client compatibility (Gmail, Outlook, Apple Mail).
   - Centered container with max-width: 600px, background: #f8fafc, card container background: #ffffff, border-radius: 16px, border: 1px solid #e2e8f0, box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05).
   - Header: Elegant branded header with subtle gradient or colored banner (indigo/purple theme: #4f46e5 to #7c3aed), displaying "xMonks" or the relevant solution title.
   - Body Copy: Thoughtful, highly persuasive copy aligned with the requested tone (${tone}) and solution focus (${program}).
   - Personalization: Naturally incorporate CRM tags: {{contactName}}, {{companyName}}, {{designation}}, {{industry}} where beneficial.
   - Call To Action (CTA): Prominent, beautifully styled CTA button with high contrast, padding (14px 28px), border-radius (8px), and hover styling.
   - Signature: Professional closing block with {{senderName}} and "xMonks Leadership & Transformation".
   - Footer: Sleek, non-intrusive footer with company info and unsubscribe/preferences links.
3. OUTPUT FORMAT:
   You MUST respond ONLY with a valid JSON object. Do not include markdown code block backticks outside the JSON. Format:
{
  "subject": "Compelling subject line here",
  "templateName": "Short descriptive template name",
  "summary": "1-sentence summary of the template",
  "htmlContent": "<!DOCTYPE html><html>...complete HTML email here...</html>"
}`;

    const userPrompt = `User Requirements / Context:
"${context}"

Parameters:
- Tone of Voice: ${tone}
- Program / Solution Area: ${program}
- Sender Name: ${senderName}

Generate the JSON response with the email subject and full HTML email template.`;

    const CANDIDATE_MODELS = [
      "gemini-flash-latest",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-3.7-flash",
    ];

    let rawOutput = "";
    let lastError = "";

    for (const model of CANDIDATE_MODELS) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `${systemPrompt}\n\n${userPrompt}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: "application/json",
            },
          }),
        });

        const data = await res.json();

        if (res.ok) {
          rawOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (rawOutput) break;
        } else {
          lastError = data?.error?.message || `Model ${model} returned status ${res.status}`;
        }
      } catch (e: unknown) {
        lastError = e instanceof Error ? e.message : `Failed connecting with ${model}`;
      }
    }

    if (!rawOutput) {
      return NextResponse.json(
        {
          success: false,
          error: lastError || "Failed to generate template from Google Gemini models. Please check your API key and quota.",
        },
        { status: 500 }
      );
    }

    // Clean potential markdown blocks
    let cleanedJson = rawOutput.trim();
    if (cleanedJson.startsWith("```json")) {
      cleanedJson = cleanedJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanedJson.startsWith("```")) {
      cleanedJson = cleanedJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    try {
      const parsed = JSON.parse(cleanedJson);
      return NextResponse.json({
        success: true,
        subject: parsed.subject || "Important update from xMonks",
        templateName: parsed.templateName || "AI Generated Template",
        summary: parsed.summary || "Custom tailored email template",
        htmlContent: parsed.htmlContent || "",
      });
    } catch {
      // Fallback if not pure JSON
      return NextResponse.json({
        success: true,
        subject: "Exclusive Leadership Collaboration with xMonks",
        templateName: "AI Generated Template",
        summary: "Custom generated template based on your prompt",
        htmlContent: rawOutput,
      });
    }
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal error generating template",
      },
      { status: 500 }
    );
  }
}
