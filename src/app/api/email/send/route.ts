import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

interface EmailRecipient {
  email: string;
  contactName?: string;
  name?: string;
  companyName?: string;
  designation?: string;
  industry?: string;
  dealValue?: number | string;
  [key: string]: unknown;
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
    const transporter = createTransporter(userEmail, appPassword, host, port, secure);

    for (const item of recipients as EmailRecipient[]) {
      const recipientEmail = (item.email || item.contactEmail) as string | undefined;
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
        .replace(/\{\{\s*contactName\s*\}\}|\[\s*First Name\s*\]/gi, recipientName)
        .replace(/\{\{\s*name\s*\}\}/gi, recipientName)
        .replace(/\{\{\s*companyName\s*\}\}|\[\s*Company Name\s*\]/gi, companyName)
        .replace(/\{\{\s*designation\s*\}\}/gi, designation)
        .replace(/\{\{\s*industry\s*\}\}/gi, industry)
        .replace(/\{\{\s*dealValue\s*\}\}/gi, dealValue)
        .replace(/\{\{\s*email\s*\}\}/gi, recipientEmail);

      const personalizedSubject = subject
        .replace(/\{\{\s*contactName\s*\}\}|\[\s*First Name\s*\]/gi, recipientName)
        .replace(/\{\{\s*name\s*\}\}/gi, recipientName)
        .replace(/\{\{\s*companyName\s*\}\}|\[\s*Company Name\s*\]/gi, companyName)
        .replace(/\{\{\s*designation\s*\}\}/gi, designation)
        .replace(/\{\{\s*industry\s*\}\}/gi, industry);

      // Check if local public images are referenced and attach inline CID
      const attachments: Array<{ filename: string; path: string; cid: string }> = [];
      const publicDir = path.join(process.cwd(), "public");

      if (personalizedHtml.includes("xmonks-logo.png") || personalizedHtml.includes("xMonks Logo")) {
        const logoPath = path.join(publicDir, "xmonks-logo.png");
        if (fs.existsSync(logoPath)) {
          attachments.push({
            filename: "xmonks-logo.png",
            path: logoPath,
            cid: "xmonks-logo",
          });
          personalizedHtml = personalizedHtml
            .replace(/\/xmonks-logo\.png/g, "cid:xmonks-logo")
            .replace(/\/xMonks%20Logo-01%202%20\(4\)\.png/g, "cid:xmonks-logo");
        }
      }

      if (personalizedHtml.includes("amit-signature.png") || personalizedHtml.includes("signature-amit")) {
        const sigPath = path.join(publicDir, "amit-signature.png");
        if (fs.existsSync(sigPath)) {
          attachments.push({
            filename: "amit-signature.png",
            path: sigPath,
            cid: "amit-signature",
          });
          personalizedHtml = personalizedHtml
            .replace(/\/amit-signature\.png/g, "cid:amit-signature")
            .replace(/\/signature-amit-shelly%20\(2\)\.png/g, "cid:amit-signature");
        }
      }

      const mailOptions = {
        from: `"${senderName}" <${userEmail}>`,
        to: recipientEmail,
        subject: personalizedSubject,
        html: personalizedHtml,
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      try {
        const info = await transporter.sendMail(mailOptions);
        results.push({
          recipient: recipientEmail,
          success: true,
          messageId: info.messageId,
        });
      } catch (sendErr: unknown) {
        const errObj = sendErr as { message?: string; code?: string };
        console.warn(`Initial send to ${recipientEmail} failed:`, errObj?.message);

        // Check if error is Google 451 temporary rejection or serverless timeout
        const isTemporaryError =
          errObj?.message?.includes("451") ||
          errObj?.message?.includes("temporarily rejected") ||
          errObj?.code === "ETIMEDOUT" ||
          errObj?.code === "ECONNECTION";

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
          } catch (retryErr: unknown) {
            const retryObj = retryErr as { message?: string };
            console.error(`Retry send to ${recipientEmail} failed:`, retryErr);
            results.push({
              recipient: recipientEmail,
              success: false,
              error: retryObj?.message || errObj?.message || "Failed to dispatch email",
            });
            continue;
          }
        }

        results.push({
          recipient: recipientEmail,
          success: false,
          error: errObj?.message || "Failed to dispatch email",
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
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Internal server error dispatching emails.";
    console.error("Bulk email route error:", errMessage);
    return NextResponse.json(
      { success: false, error: errMessage },
      { status: 500 }
    );
  }
}
