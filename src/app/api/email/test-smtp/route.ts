import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

function createTransporter(
  userEmail: string,
  appPassword: string,
  host: string,
  port: number,
  secure: boolean,
  usePreset = false
) {
  const cleanedPassword = appPassword.replace(/\s+/g, "");
  const isGoogle =
    usePreset ||
    host.includes("gmail") ||
    userEmail.endsWith("@gmail.com") ||
    userEmail.endsWith("@xmonks.com");

  if (isGoogle) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: userEmail,
        pass: cleanedPassword,
      },
      tls: {
        rejectUnauthorized: false,
        servername: "smtp.gmail.com",
      },
      connectionTimeout: 15000,
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: port === 587,
    auth: {
      user: userEmail,
      pass: cleanedPassword,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 15000,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userEmail = body.userEmail || process.env.gmail_id || process.env.GMAIL_ID;
    const appPassword =
      body.appPassword || process.env.gmail_apps_password || process.env.GMAIL_APPS_PASSWORD;
    const host = body.host || "smtp.gmail.com";
    const port = Number(body.port) || 587;
    const secure = body.secure !== undefined ? Boolean(body.secure) : port === 465;

    if (!userEmail || !appPassword) {
      return NextResponse.json(
        { success: false, error: "Missing Email ID or Google App Password." },
        { status: 400 }
      );
    }

    try {
      const transporter = createTransporter(userEmail, appPassword, host, port, secure);
      await transporter.verify();
    } catch (primaryErr: any) {
      console.warn("Primary SMTP verification failed, attempting Gmail service preset fallback:", primaryErr);
      const fallbackTransporter = createTransporter(userEmail, appPassword, "smtp.gmail.com", 587, false, true);
      await fallbackTransporter.verify();
    }

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
