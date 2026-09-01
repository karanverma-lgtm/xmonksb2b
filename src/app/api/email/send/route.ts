import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

interface EmailRecipient {
  email: string;
  contactName?: string;
  name?: string;
  companyName?: string;
  designation?: string;
  industry?: string;
  dealValue?: number | string;
  [key: string]: any;
}

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
    const { recipients, subject, htmlContent, smtpConfig } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: "No email recipients provided." },
        { status: 400 }
      );
    }

    if (!subject || !htmlContent) {
      return NextResponse.json(
        { success: false, error: "Subject and HTML body content are required." },
        { status: 400 }
      );
    }

    // SMTP Config resolution
    const userEmail =
      smtpConfig?.userEmail || process.env.gmail_id || process.env.GMAIL_ID;
    const appPassword =
      smtpConfig?.appPassword ||
      process.env.gmail_apps_password ||
      process.env.GMAIL_APPS_PASSWORD;
    const host = smtpConfig?.host || "smtp.gmail.com";
    const port = Number(smtpConfig?.port) || 587;
    const secure = smtpConfig?.secure !== undefined ? Boolean(smtpConfig?.secure) : port === 465;
    const senderName = smtpConfig?.senderName || "xMonks B2B Sales";

    if (!userEmail || !appPassword) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing SMTP credentials. Please configure your User Email and Google App Password in the Developer tab.",
        },
        { status: 400 }
      );
    }

    const results: Array<{ recipient: string; success: boolean; messageId?: string; error?: string }> = [];

    // Create primary transporter
    let transporter = createTransporter(userEmail, appPassword, host, port, secure);

    for (const item of recipients as EmailRecipient[]) {
      const recipientEmail = item.email || item.contactEmail;
      if (!recipientEmail || !recipientEmail.includes("@")) {
        results.push({
          recipient: recipientEmail || "Invalid",
          success: false,
          error: "Invalid email address format.",
        });
        continue;
      }

      const recipientName = item.contactName || item.name || recipientEmail.split("@")[0];
      const companyName = item.companyName || "your organization";
      const designation = item.designation || "Valued Executive";
      const industry = item.industry || "B2B Industry";
      const dealValue = item.dealValue ? String(item.dealValue) : "";

      // Perform dynamic placeholder replacement
      let personalizedHtml = htmlContent
        .replace(/\{\{\s*contactName\s*\}\}/gi, recipientName)
        .replace(/\{\{\s*name\s*\}\}/gi, recipientName)
        .replace(/\{\{\s*companyName\s*\}\}/gi, companyName)
        .replace(/\{\{\s*designation\s*\}\}/gi, designation)
        .replace(/\{\{\s*industry\s*\}\}/gi, industry)
        .replace(/\{\{\s*dealValue\s*\}\}/gi, dealValue)
        .replace(/\{\{\s*email\s*\}\}/gi, recipientEmail);

      let personalizedSubject = subject
        .replace(/\{\{\s*contactName\s*\}\}/gi, recipientName)
        .replace(/\{\{\s*name\s*\}\}/gi, recipientName)
        .replace(/\{\{\s*companyName\s*\}\}/gi, companyName)
        .replace(/\{\{\s*designation\s*\}\}/gi, designation)
        .replace(/\{\{\s*industry\s*\}\}/gi, industry);

      const mailOptions = {
        from: `"${senderName}" <${userEmail}>`,
        to: recipientEmail,
        subject: personalizedSubject,
        html: personalizedHtml,
      };

      try {
        const info = await transporter.sendMail(mailOptions);
        results.push({
          recipient: recipientEmail,
          success: true,
          messageId: info.messageId,
        });
      } catch (sendErr: any) {
        console.warn(`Initial send to ${recipientEmail} failed:`, sendErr?.message);

        // Check if error is Google 451 temporary rejection or serverless timeout
        const isTemporaryError =
          sendErr?.message?.includes("451") ||
          sendErr?.message?.includes("temporarily rejected") ||
          sendErr?.code === "ETIMEDOUT" ||
          sendErr?.code === "ECONNECTION";

        if (isTemporaryError) {
          console.log(`Retrying send to ${recipientEmail} with Gmail fallback preset after 1.5s delay...`);
          await new Promise((resolve) => setTimeout(resolve, 1500));

          try {
            const fallbackTransporter = createTransporter(
              userEmail,
              appPassword,
              "smtp.gmail.com",
              587,
              false,
              true
            );
            const info = await fallbackTransporter.sendMail(mailOptions);
            results.push({
              recipient: recipientEmail,
              success: true,
              messageId: info.messageId,
            });
            continue;
          } catch (retryErr: any) {
            console.error(`Retry send to ${recipientEmail} failed:`, retryErr);
            results.push({
              recipient: recipientEmail,
              success: false,
              error: retryErr?.message || sendErr?.message || "Failed to dispatch email",
            });
            continue;
          }
        }

        results.push({
          recipient: recipientEmail,
          success: false,
          error: sendErr?.message || "Failed to dispatch email",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    return NextResponse.json({
      success: successCount > 0,
      totalCount: results.length,
      successCount,
      failureCount,
      results,
    });
  } catch (error: any) {
    console.error("Bulk email route error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error dispatching emails." },
      { status: 500 }
    );
  }
}
