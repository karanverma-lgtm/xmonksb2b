import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userEmail = body.userEmail || process.env.gmail_id || process.env.GMAIL_ID;
    const appPassword = body.appPassword || process.env.gmail_apps_password || process.env.GMAIL_APPS_PASSWORD;
    const host = body.host || "smtp.gmail.com";
    const port = Number(body.port) || 465;
    const secure = body.secure !== undefined ? Boolean(body.secure) : port === 465;

    if (!userEmail || !appPassword) {
      return NextResponse.json(
        { success: false, error: "Missing Email ID or Google App Password." },
        { status: 400 }
      );
    }

    // Clean space formatting in Google app password if present (e.g. "ombg ustr bodg bxnp" -> "ombgustrbodgbxnp")
    const cleanedPassword = appPassword.replace(/\s+/g, "");

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: userEmail,
        pass: cleanedPassword,
      },
      connectionTimeout: 10000, // 10s
    });

    // Verify SMTP configuration
    await transporter.verify();

    return NextResponse.json({
      success: true,
      message: `SMTP Connection verified successfully for ${userEmail}!`,
    });
  } catch (error: any) {
    console.error("SMTP verification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to connect to SMTP server. Check credentials.",
      },
      { status: 500 }
    );
  }
}
