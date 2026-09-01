"use client";

import React, { useState, useMemo } from "react";
import { Monitor, Smartphone, Maximize2, X, Eye } from "lucide-react";

interface EmailPreviewCardProps {
  html: string;
  subject?: string;
  recipientName?: string;
  recipientEmail?: string;
  senderEmail?: string;
  height?: string;
}

export const EmailPreviewCard: React.FC<EmailPreviewCardProps> = ({
  html,
  subject = "B2B Outreach Opportunity",
  recipientName = "Aarav Patel",
  recipientEmail = "aarav@zenithcloud.in",
  senderEmail = "ruby.dayal@xmonks.com",
  height = "h-[450px]",
}) => {
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Perform dynamic variable tag replacement
  const processedHtml = useMemo(() => {
    return (html || "")
      .replace(/\{\{\s*contactName\s*\}\}/gi, recipientName)
      .replace(/\{\{\s*name\s*\}\}/gi, recipientName)
      .replace(/\{\{\s*companyName\s*\}\}/gi, "Zenith Cloud Tech")
      .replace(/\{\{\s*designation\s*\}\}/gi, "VP of Infrastructure")
      .replace(/\{\{\s*industry\s*\}\}/gi, "SaaS & Software")
      .replace(/\{\{\s*dealValue\s*\}\}/gi, "₹15,00,000")
      .replace(/\{\{\s*email\s*\}\}/gi, recipientEmail);
  }, [html, recipientName, recipientEmail]);

  // Create isolated responsive iframe HTML content
  const iframeSrcDoc = useMemo(() => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #ffffff;
      color: #0f172a;
      line-height: 1.5;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    img, svg, video, canvas { max-width: 100% !important; height: auto !important; }
    table { max-width: 100% !important; border-collapse: collapse; margin-left: auto; margin-right: auto; }
    td, th { word-break: break-word; }
  </style>
</head>
<body>
  ${processedHtml}
</body>
</html>`;
  }, [processedHtml]);

  return (
    <>
      {/* Standard In-Page Live Preview Container */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col">
        {/* Mock Client Top Bar */}
        <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="flex space-x-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate ml-2">
              Subject: {subject}
            </span>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Desktop / Mobile Switcher */}
            <div className="flex items-center p-0.5 bg-slate-200 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setDeviceMode("desktop")}
                className={`p-1 rounded-md transition ${
                  deviceMode === "desktop"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
                title="Desktop Layout Preview"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode("mobile")}
                className={`p-1 rounded-md transition ${
                  deviceMode === "mobile"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
                title="Mobile Device Preview"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Expand Fullscreen Button */}
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="flex items-center space-x-1 px-2 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition border border-indigo-500/20"
              title="Expand to Fullscreen Modal View"
            >
              <Maximize2 className="w-3 h-3" />
              <span className="hidden sm:inline">Expand</span>
            </button>
          </div>
        </div>

        {/* Sender / Recipient Sub-Header */}
        <div className="px-4 py-1.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
          <div>
            From: <span className="font-semibold text-slate-700 dark:text-slate-300">{senderEmail}</span>
          </div>
          <div>
            To: <span className="font-semibold text-slate-700 dark:text-slate-300">{recipientName} &lt;{recipientEmail}&gt;</span>
          </div>
        </div>

        {/* Viewport Render Area */}
        <div className={`w-full ${height} bg-slate-100 dark:bg-slate-950 p-3 sm:p-4 flex justify-center items-center overflow-auto`}>
          <div
            className={`h-full transition-all duration-300 bg-white shadow-xl rounded-xl overflow-hidden ${
              deviceMode === "mobile" ? "w-[375px] border-8 border-slate-900 rounded-[28px]" : "w-full max-w-[750px]"
            }`}
          >
            <iframe
              srcDoc={iframeSrcDoc}
              title="Live Visual Email Preview"
              className="w-full h-full border-0"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>

      {/* FULLSCREEN PREVIEW MODAL */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-5xl h-[90vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Top Bar */}
            <div className="p-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Full-Size Email Client Preview</h3>
                  <p className="text-xs text-slate-400">Subject: {subject}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Device Mode Switcher */}
                <div className="flex items-center p-1 bg-slate-800 rounded-xl">
                  <button
                    onClick={() => setDeviceMode("desktop")}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      deviceMode === "desktop"
                        ? "bg-purple-600 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Desktop (750px)</span>
                  </button>

                  <button
                    onClick={() => setDeviceMode("mobile")}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      deviceMode === "mobile"
                        ? "bg-purple-600 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile (375px)</span>
                  </button>
                </div>

                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Close Fullscreen Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Email Body Area */}
            <div className="flex-1 bg-slate-950 p-6 overflow-y-auto flex justify-center items-center">
              <div
                className={`h-full transition-all duration-300 bg-white shadow-2xl rounded-2xl overflow-hidden ${
                  deviceMode === "mobile"
                    ? "w-[375px] max-h-[680px] border-8 border-slate-900 rounded-[36px]"
                    : "w-full max-w-[800px]"
                }`}
              >
                <iframe
                  srcDoc={iframeSrcDoc}
                  title="Full Email Preview Modal"
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
