"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FileSpreadsheet,
  Copy,
  Check,
  Zap,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
} from "lucide-react";

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { name: string } | null;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedCsvTemplate, setCopiedCsvTemplate] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [syncToken, setSyncToken] = useState("xmonks_outreach_sync_2026");
  const [activeTab, setActiveTab] = useState<"script" | "template" | "test">("script");

  // Diagnostic test states
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testResult, setTestResult] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWebhookUrl(`${window.location.origin}/api/integrations/google-sheets`);
    }
  }, []);

  if (!isOpen) return null;

  const appScriptCode = `/**
 * ==============================================================================
 * XMONKS B2B CRM - GOOGLE SHEETS REAL-TIME SYNC APPS SCRIPT
 * ==============================================================================
 * Live synchronization from Google Sheets directly into Outreach CRM tab.
 * Runs on every edit or batch sync, triggering Firebase live updates!
 *
 * HOW TO INSTALL:
 * 1. Open your Google Sheet.
 * 2. In top menu, click: Extensions > Apps Script.
 * 3. Delete any default code and paste this ENTIRE script.
 * 4. Verify WEBHOOK_URL and SYNC_TOKEN below.
 * 5. Click the Save icon (💾) or press Ctrl+S / Cmd+S.
 * 6. Refresh your Google Sheet. You will see a new menu: "🚀 Outreach CRM"!
 * 7. Click: "🚀 Outreach CRM" > "⚙️ Setup Real-Time Edit Trigger".
 * ==============================================================================
 */

// ⚙️ CONFIGURATION
const WEBHOOK_URL = "${webhookUrl || "https://YOUR_APP_DOMAIN/api/integrations/google-sheets"}";
const SYNC_TOKEN = "${syncToken}";
const TARGET_SHEET_NAME = ""; // Leave empty to sync whichever sheet you edit, or set "Outreach Leads"

/**
 * Custom Menu in Google Sheets
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🚀 Outreach CRM")
    .addItem("⚡ Sync All Rows Now", "syncAllRows")
    .addItem("📋 Insert Standard CRM Headers", "insertStandardHeaders")
    .addSeparator()
    .addItem("⚙️ Setup Real-Time Edit Trigger", "setupTriggers")
    .addItem("🔍 Test CRM Connection", "testConnection")
    .addToUi();
}

/**
 * Setup installable edit trigger so live edits stream directly into CRM
 */
function setupTriggers() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const triggers = ScriptApp.getUserTriggers(sheet);
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "handleSheetEdit") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger("handleSheetEdit")
    .forSpreadsheet(sheet)
    .onEdit()
    .create();

  SpreadsheetApp.getUi().alert(
    "✅ Real-Time Sync Activated!\\n\\nAny prospect edited or added in this sheet will now automatically appear in the Outreach Tab in real time."
  );
}

/**
 * Real-time event handler called whenever a row is modified
 */
function handleSheetEdit(e) {
  try {
    if (!e || !e.range) return;
    const sheet = e.range.getSheet();
    
    if (TARGET_SHEET_NAME && sheet.getName().toLowerCase() !== TARGET_SHEET_NAME.toLowerCase()) {
      return;
    }

    const startRow = e.range.getRow();
    const numRows = e.range.getNumRows();

    // Skip if only header row was edited
    if (startRow === 1 && numRows === 1) return;

    const actualStartRow = Math.max(2, startRow);
    const actualEndRow = startRow + numRows - 1;
    const lastCol = sheet.getLastColumn();
    if (lastCol < 2) return;

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
    const idColIdx = findHeaderIndex(headers, ["crm id", "lead id", "id"]);

    for (let r = actualStartRow; r <= actualEndRow; r++) {
      const rowValues = sheet.getRange(r, 1, 1, lastCol).getValues()[0];
      const hasContent = rowValues.some(val => val !== "" && val !== null && val !== undefined);
      if (!hasContent) continue;

      const payload = {
        action: "sync_row",
        sheetName: sheet.getName(),
        rowNumber: r,
        headers: headers,
        rowData: rowValues,
      };

      const response = sendToCrm(payload);
      if (response && response.crmId && idColIdx !== -1) {
        const currentCrmId = rowValues[idColIdx];
        if (!currentCrmId || String(currentCrmId).trim() === "") {
          sheet.getRange(r, idColIdx + 1).setValue(response.crmId);
        }
      }
    }
  } catch (err) {
    Logger.log("Error in handleSheetEdit: " + err.toString());
  }
}

/**
 * Bulk sync all rows
 */
function syncAllRows() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol < 2) {
    SpreadsheetApp.getUi().alert("No data rows found to sync.");
    return;
  }

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  const idColIdx = findHeaderIndex(headers, ["crm id", "lead id", "id"]);
  const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  const rowsToSync = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const hasContent = row.some(val => val !== "" && val !== null && val !== undefined);
    if (hasContent) {
      rowsToSync.push({
        rowNumber: i + 2,
        rowData: row
      });
    }
  }

  if (rowsToSync.length === 0) {
    SpreadsheetApp.getUi().alert("All rows are empty.");
    return;
  }

  const payload = {
    action: "sync_batch",
    sheetName: sheet.getName(),
    headers: headers,
    rows: rowsToSync
  };

  const response = sendToCrm(payload);
  if (response && response.success) {
    if (idColIdx !== -1 && Array.isArray(response.results)) {
      response.results.forEach(res => {
        if (res.rowNumber && res.crmId) {
          const currentVal = sheet.getRange(res.rowNumber, idColIdx + 1).getValue();
          if (!currentVal) {
            sheet.getRange(res.rowNumber, idColIdx + 1).setValue(res.crmId);
          }
        }
      });
    }

    SpreadsheetApp.getUi().alert(
      "🚀 Sync Complete!\\n\\n" + (response.message || "Successfully synchronized leads to CRM.")
    );
  } else {
    SpreadsheetApp.getUi().alert("❌ Sync Error:\\n" + (response?.error || "Unknown server response"));
  }
}

/**
 * Diagnostic ping test to verify endpoint connectivity
 */
function testConnection() {
  const payload = { action: "ping" };
  const res = sendToCrm(payload);
  if (res && res.success) {
    SpreadsheetApp.getUi().alert("✅ CRM Webhook Connected!\\n\\n" + res.message + "\\nServer Time: " + res.serverTime);
  } else {
    SpreadsheetApp.getUi().alert("❌ Connection Failed:\\n" + (res?.error || "Could not reach CRM endpoint. Check WEBHOOK_URL and SYNC_TOKEN."));
  }
}

/**
 * Insert standard CRM headers in Row 1
 */
function insertStandardHeaders() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const headers = [
    "CRM ID",
    "Company Name",
    "Contact Person",
    "Email",
    "Designation",
    "Phone",
    "City",
    "Industry",
    "Target Program",
    "Estimated Value",
    "Status",
    "Channel",
    "Assigned Owner",
    "Notes"
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e8f0fe");
  sheet.setFrozenRows(1);
  SpreadsheetApp.getUi().alert("Standard CRM headers inserted!");
}

function findHeaderIndex(headers, targets) {
  for (let i = 0; i < headers.length; i++) {
    const clean = headers[i].toLowerCase().replace(/[^a-z0-9]/g, "");
    for (let t of targets) {
      if (clean === t.toLowerCase().replace(/[^a-z0-9]/g, "")) return i;
    }
  }
  return -1;
}

function sendToCrm(payload) {
  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-sync-token": SYNC_TOKEN
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    const code = response.getResponseCode();
    const text = response.getContentText();

    if (!text || text.trim() === "") {
      return { error: "Empty response from server (HTTP " + code + ")" };
    }

    if (text.trim().startsWith("<")) {
      return {
        error: "Server returned HTML instead of JSON (HTTP " + code + ").\\n\\nCommon Causes:\\n1. The new Google Sheets integration code has NOT been committed & pushed to GitHub/Vercel yet.\\n2. The URL is incorrect or protected by Vercel Deployment Protection."
      };
    }

    return JSON.parse(text);
  } catch (e) {
    Logger.log("HTTP Fetch Error: " + e.toString());
    return { error: e.toString() };
  }
}`;

  const standardHeaders = [
    "CRM ID",
    "Company Name",
    "Contact Person",
    "Email",
    "Designation",
    "Phone",
    "City",
    "Industry",
    "Target Program",
    "Estimated Value",
    "Status",
    "Channel",
    "Assigned Owner",
    "Notes",
  ];

  const sampleCsvContent = `CRM ID,Company Name,Contact Person,Email,Designation,Phone,City,Industry,Target Program,Estimated Value,Status,Channel,Assigned Owner,Notes
,Acme Technologies,Vikram Malhotra,vikram@acme.com,VP Human Resources,+91 98200 11223,Mumbai,Technology & SaaS,Executive Coaching,1200000,uncontacted,email,Amit,Met at HR Leadership Summit
,Nexus Health,Pooja Sharma,pooja@nexushealth.in,Head of L&D,+91 98111 22334,Bengaluru,Healthcare & Pharma,L&D Transformation,1500000,uncontacted,linkedin,Preeti,Mid-level manager leadership initiative`;

  const copyToClipboard = (text: string, type: "script" | "url" | "token" | "template") => {
    navigator.clipboard.writeText(text);
    if (type === "script") {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } else if (type === "url") {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else if (type === "token") {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else if (type === "template") {
      setCopiedCsvTemplate(true);
      setTimeout(() => setCopiedCsvTemplate(false), 2000);
    }
  };

  const handleTestConnection = async () => {
    setTestStatus("testing");
    setTestResult("");
    try {
      const res = await fetch(`/api/integrations/google-sheets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-sync-token": syncToken,
        },
        body: JSON.stringify({ action: "ping" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestStatus("success");
        setTestResult(data.message || "Webhook reachable and authenticated successfully!");
      } else {
        setTestStatus("error");
        setTestResult(data.error || "Failed to authenticate with webhook.");
      }
    } catch (err: any) {
      setTestStatus("error");
      setTestResult(err?.message || "Network error contacting webhook.");
    }
  };

  const handleDownloadCsv = () => {
    const blob = new Blob([sampleCsvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Outreach_Google_Sheets_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 via-teal-50/20 to-transparent dark:from-emerald-950/20 dark:via-transparent">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Google Sheets Real-Time Sync
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  Live Webhook
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Automatically stream and sync Google Sheet rows into the Outreach tab in real time.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={() => setActiveTab("script")}
            className={`pb-3 px-1 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === "script"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Terminal className="w-4 h-4" />
            1. Copy Google Apps Script
          </button>
          <button
            onClick={() => setActiveTab("template")}
            className={`pb-3 px-1 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === "template"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            2. Sheet Template & Columns
          </button>
          <button
            onClick={() => setActiveTab("test")}
            className={`pb-3 px-1 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === "test"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Zap className="w-4 h-4" />
            3. Test Webhook Connection
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Setup Instructions Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-600 dark:text-emerald-400 mb-1">
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center">1</span>
                OPEN GOOGLE SHEET
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                In your Google Sheet, click <strong>Extensions &gt; Apps Script</strong> from the top menu bar.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-600 dark:text-emerald-400 mb-1">
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center">2</span>
                PASTE THE SCRIPT
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Replace all existing text with the Apps Script code below, then click <strong>Save (💾)</strong>.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-600 dark:text-emerald-400 mb-1">
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center">3</span>
                ACTIVATE REAL-TIME
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Refresh your sheet, click <strong>&quot;🚀 Outreach CRM&quot; &gt; &quot;⚙️ Setup Real-Time Edit Trigger&quot;</strong>. Done!
              </p>
            </div>
          </div>

          {/* Credentials Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Webhook URL
                </span>
                <button
                  onClick={() => copyToClipboard(webhookUrl, "url")}
                  className="text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedUrl ? "Copied" : "Copy"}
                </button>
              </div>
              <code className="block text-xs font-mono text-slate-800 dark:text-slate-200 truncate bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700">
                {webhookUrl || "Loading..."}
              </code>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Sync Secret Token
                </span>
                <button
                  onClick={() => copyToClipboard(syncToken, "token")}
                  className="text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  {copiedToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedToken ? "Copied" : "Copy"}
                </button>
              </div>
              <code className="block text-xs font-mono text-slate-800 dark:text-slate-200 truncate bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700">
                {syncToken}
              </code>
            </div>
          </div>

          {/* TAB 1: SCRIPT */}
          {activeTab === "script" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-500" />
                    Google Apps Script Code
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pre-configured with your webhook URL and token. Copy and paste directly into Google Apps Script.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(appScriptCode, "script")}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm transition"
                >
                  {copiedScript ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedScript ? "Script Copied to Clipboard!" : "Copy Entire Apps Script"}
                </button>
              </div>

              <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-200 p-4 font-mono text-xs max-h-[340px] overflow-y-auto select-all">
                <pre>{appScriptCode}</pre>
              </div>
            </div>
          )}

          {/* TAB 2: TEMPLATE & COLUMNS */}
          {activeTab === "template" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Recommended Column Order
                  </h3>
                  <p className="text-xs text-slate-500">
                    The webhook supports automatic column matching. For best results, use these header names in Row 1:
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(sampleCsvContent, "template")}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                  >
                    {copiedCsvTemplate ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCsvTemplate ? "Copied CSV" : "Copy CSV Text"}
                  </button>
                  <button
                    onClick={handleDownloadCsv}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Download CSV Template
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {standardHeaders.map((col, idx) => (
                  <div
                    key={col}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs flex items-center gap-2"
                  >
                    <span className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-mono font-bold text-[10px]">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {col}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                <div>
                  <strong>Two-way deduplication &amp; CRM ID backfilling:</strong> Column A is for <code>CRM ID</code>. When you add a new prospect row in Google Sheets, the CRM webhook will automatically generate a unique ID and write it back to Column A. Future edits to that row will reliably update that exact lead in the CRM rather than creating duplicates!
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DIAGNOSTICS */}
          {activeTab === "test" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  Webhook Endpoint Diagnostic
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Send a live test ping to verify that your CRM server is receiving and authenticating Google Sheets requests.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleTestConnection}
                    disabled={testStatus === "testing"}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white flex items-center gap-2 shadow-sm transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testStatus === "testing" ? "animate-spin" : ""}`} />
                    {testStatus === "testing" ? "Testing Connection..." : "Test Connection Now"}
                  </button>

                  {testStatus === "success" && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-4 h-4" />
                      Connected! Webhook is live and ready.
                    </div>
                  )}

                  {testStatus === "error" && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800">
                      <AlertTriangle className="w-4 h-4" />
                      Connection Failed
                    </div>
                  )}
                </div>

                {testResult && (
                  <div className="mt-3 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
                    {testResult}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Secured via SHA sync token &amp; Firestore security rules</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            Done &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};
