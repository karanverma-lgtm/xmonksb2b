# 🚀 Google Sheets Real-Time Sync Guide for Outreach CRM

This guide explains how to connect any Google Sheet to stream prospective clients directly into the **Outreach Tab** in real time.

---

## ⚡ How It Works Under The Hood
1. When anyone edits or pastes new rows into your Google Sheet, **Google Apps Script** catches the edit event.
2. It sends an authenticated HTTP webhook payload to `/api/integrations/google-sheets`.
3. The server validates the request and upserts the lead directly into **Firebase Firestore** (`b2b_cold_clients`).
4. Because the Outreach tab has a real-time Firestore listener (`onSnapshot`), the **Kanban cards and table list update live on screen in ~1 second without refreshing!**
5. The CRM generates a unique ID (e.g. `cold-174000...`) and writes it back into **Column A (CRM ID)** of your Google Sheet. Future edits to that row update that exact lead rather than duplicating it.

---

## 🛠️ Step-by-Step Setup (Takes 2 minutes)

### Step 1: Open Google Sheets Apps Script
1. Open your target Google Sheet.
2. In the top menu, click **Extensions** > **Apps Script**.
3. Delete any default code in the editor (`function myFunction() {...}`).

### Step 2: Paste the Apps Script
Copy and paste the script below into the Apps Script editor:

```javascript
/**
 * ==============================================================================
 * XMONKS B2B CRM - GOOGLE SHEETS REAL-TIME SYNC APPS SCRIPT (v2 - Anti-Duplicate)
 * ==============================================================================
 * Live synchronization from Google Sheets directly into Outreach CRM tab.
 * Includes concurrency locking, trigger cleanup, and auto CRM ID detection
 * to permanently prevent duplicate leads!
 */

// ⚙️ CONFIGURATION
// Replace with your public CRM domain (e.g., https://xmonksb2b.vercel.app or ngrok URL for localhost)
const WEBHOOK_URL = "https://YOUR_CRM_DOMAIN/api/integrations/google-sheets";
const SYNC_TOKEN = "xmonks_outreach_sync_2026";
const TARGET_SHEET_NAME = ""; // Leave blank to sync any active sheet, or specify e.g. "Outreach Leads"

/**
 * Creates custom CRM menu inside Google Sheets
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🚀 Outreach CRM")
    .addItem("⚡ Sync All Rows Now", "syncAllRows")
    .addItem("📋 Insert Standard CRM Headers", "insertStandardHeaders")
    .addSeparator()
    .addItem("⚙️ Setup Real-Time Edit Trigger", "setupTriggers")
    .addItem("🧹 Remove All Triggers (Reset)", "removeAllTriggers")
    .addItem("🔍 Test CRM Connection", "testConnection")
    .addToUi();
}

/**
 * Cleans up existing triggers to prevent multiple executions
 */
function removeAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    const fn = triggers[i].getHandlerFunction();
    if (fn === "handleSheetEdit" || fn === "onEdit" || fn === "syncRow") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

/**
 * Installs real-time edit trigger with clean trigger isolation
 */
function setupTriggers() {
  removeAllTriggers();

  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.newTrigger("handleSheetEdit")
    .forSpreadsheet(sheet)
    .onEdit()
    .create();

  SpreadsheetApp.getUi().alert(
    "✅ Real-Time Sync Activated!\n\nTrigger installed cleanly. Any prospect edited or added in this sheet will now automatically sync without duplicate leads."
  );
}

/**
 * Real-time event handler called whenever a row is modified.
 * Features concurrency locks, minimum field checks, and auto CRM ID column insertion.
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

    // Skip if header row
    if (startRow === 1 && numRows === 1) return;

    const actualStartRow = Math.max(2, startRow);
    const actualEndRow = startRow + numRows - 1;
    let lastCol = sheet.getLastColumn();
    if (lastCol < 2) return;

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
    let idColIdx = findHeaderIndex(headers, ["crm id", "lead id", "id", "prospect id", "outreach id", "client id"]);

    // If edit was solely in the CRM ID column, do not re-sync
    if (idColIdx !== -1 && e.range.getColumn() === (idColIdx + 1) && e.range.getNumColumns() === 1) {
      return;
    }

    // Auto-create CRM ID column if sheet doesn't have one, ensuring IDs are permanently stored
    if (idColIdx === -1) {
      lastCol = lastCol + 1;
      sheet.getRange(1, lastCol).setValue("CRM ID").setFontWeight("bold").setBackground("#e8f0fe");
      headers.push("CRM ID");
      idColIdx = lastCol - 1;
    }

    // Concurrency lock: multiple rapid keystrokes/cell edits wait for preceding write to finish
    const lock = LockService.getDocumentLock();
    if (!lock.tryLock(10000)) {
      Logger.log("Document lock busy, skipping overlapping edit execution.");
      return;
    }

    try {
      const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
      const currentLastCol = sheet.getLastColumn();

      for (let r = actualStartRow; r <= actualEndRow; r++) {
        const rowValues = sheet.getRange(r, 1, 1, currentLastCol).getValues()[0];
        const currentCrmId = idColIdx !== -1 ? String(rowValues[idColIdx] || "").trim() : "";

        // Check if row has minimum viable prospect data before creating a brand new lead
        if (!currentCrmId) {
          const companyIdx = findHeaderIndex(headers, ["company name", "company", "organization", "account"]);
          const contactIdx = findHeaderIndex(headers, ["contact person", "contact name", "contact", "name", "full name"]);
          const emailIdx = findHeaderIndex(headers, ["email", "email id", "mail", "mail id"]);
          const phoneIdx = findHeaderIndex(headers, ["phone", "mobile", "contact no", "contact number"]);

          const companyVal = companyIdx !== -1 ? String(rowValues[companyIdx] || "").trim() : "";
          const contactVal = contactIdx !== -1 ? String(rowValues[contactIdx] || "").trim() : "";
          const emailVal = emailIdx !== -1 ? String(rowValues[emailIdx] || "").trim() : "";
          const phoneVal = phoneIdx !== -1 ? String(rowValues[phoneIdx] || "").trim() : "";

          // Require at least: (Company + Contact) OR (Company + Email) OR (Email) OR (Contact + Phone)
          const hasMinimumInfo =
            (Boolean(companyVal) && (Boolean(contactVal) || Boolean(emailVal) || Boolean(phoneVal))) ||
            (Boolean(emailVal) && emailVal.includes("@")) ||
            (Boolean(contactVal) && Boolean(phoneVal));

          if (!hasMinimumInfo) {
            // User is still typing first cell of new row, skip premature lead creation
            continue;
          }
        }

        const payload = {
          action: "sync_row",
          spreadsheetId: spreadsheetId,
          sheetName: sheet.getName(),
          rowNumber: r,
          headers: headers,
          rowData: rowValues,
        };

        const response = sendToCrm(payload);
        if (response && response.crmId && idColIdx !== -1) {
          if (!currentCrmId || currentCrmId !== response.crmId) {
            sheet.getRange(r, idColIdx + 1).setValue(response.crmId);
          }
        }
      }
    } finally {
      lock.releaseLock();
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
  let lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol < 2) {
    SpreadsheetApp.getUi().alert("No data rows found to sync.");
    return;
  }

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  let idColIdx = findHeaderIndex(headers, ["crm id", "lead id", "id", "prospect id", "outreach id", "client id"]);

  if (idColIdx === -1) {
    lastCol = lastCol + 1;
    sheet.getRange(1, lastCol).setValue("CRM ID").setFontWeight("bold").setBackground("#e8f0fe");
    headers.push("CRM ID");
    idColIdx = lastCol - 1;
  }

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

  const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
  const payload = {
    action: "sync_batch",
    spreadsheetId: spreadsheetId,
    sheetName: sheet.getName(),
    headers: headers,
    rows: rowsToSync
  };

  const response = sendToCrm(payload);
  if (response && response.success) {
    if (idColIdx !== -1 && Array.isArray(response.results) && response.results.length > 0) {
      // High-performance batch writeback for all CRM IDs: executes in 50ms instead of 30+ seconds
      const numDataRows = lastRow - 1;
      const idRange = sheet.getRange(2, idColIdx + 1, numDataRows, 1);
      const idMatrix = idRange.getValues();
      let hasUpdates = false;

      response.results.forEach(res => {
        if (res.rowNumber && res.crmId) {
          const matrixIdx = res.rowNumber - 2;
          if (matrixIdx >= 0 && matrixIdx < idMatrix.length) {
            if (String(idMatrix[matrixIdx][0] || "").trim() !== res.crmId) {
              idMatrix[matrixIdx][0] = res.crmId;
              hasUpdates = true;
            }
          }
        }
      });

      if (hasUpdates) {
        idRange.setValues(idMatrix);
      }
    }

    SpreadsheetApp.getUi().alert(
      "🚀 Sync Complete!\n\n" + (response.message || "Successfully synchronized leads to Outreach tab.")
    );
  } else {
    SpreadsheetApp.getUi().alert("❌ Sync Error:\n" + (response?.error || "Unknown server response"));
  }
}

/**
 * Diagnostic ping test to verify endpoint connectivity
 */
function testConnection() {
  const payload = { action: "ping" };
  const res = sendToCrm(payload);
  if (res && res.success) {
    SpreadsheetApp.getUi().alert("✅ CRM Webhook Connected!\n\n" + res.message + "\nServer Time: " + res.serverTime);
  } else {
    SpreadsheetApp.getUi().alert("❌ Connection Failed:\n" + (res?.error || "Could not reach CRM endpoint. Check WEBHOOK_URL and SYNC_TOKEN."));
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
        error: "Server returned HTML instead of JSON (HTTP " + code + ").\n\nCommon Causes:\n1. The new Google Sheets integration code has NOT been committed & pushed to GitHub/Vercel yet.\n2. The URL is incorrect or protected by Vercel Deployment Protection."
      };
    }

    return JSON.parse(text);
  } catch (e) {
    Logger.log("HTTP Fetch Error: " + e.toString());
    return { error: e.toString() };
  }
}
```

### Step 3: Update `WEBHOOK_URL` & Save
1. In the script, set `WEBHOOK_URL` to your app URL followed by `/api/integrations/google-sheets`.
2. Click the **Save** button (💾) or press `Ctrl + S` / `Cmd + S`.

### Step 4: Authorize & Activate in Google Sheets
1. Switch back to your Google Sheet tab and **refresh the browser**.
2. A new menu **"🚀 Outreach CRM"** will appear in the top toolbar!
3. Click **"🚀 Outreach CRM"** > **"📋 Insert Standard CRM Headers"** (if starting fresh).
4. Click **"🚀 Outreach CRM"** > **"⚙️ Setup Real-Time Edit Trigger"**.
   - Google will prompt for a one-time script authorization ("Advanced" > "Go to Outreach Script (unsafe)" > "Allow").
5. That's it! Every time someone enters or edits a row, it instantly streams to the Outreach tab in your CRM.

---

## 📊 Recommended Column Names (Row 1)

| Column | Header Name | Description |
| :--- | :--- | :--- |
| **A** | `CRM ID` | Auto-populated by CRM upon first sync to prevent duplicates |
| **B** | `Company Name` | Target company / client |
| **C** | `Contact Person` | Name of the prospect |
| **D** | `Email` | Email address (used for deduplication) |
| **E** | `Designation` | Job title (e.g. VP Human Resources) |
| **F** | `Phone` | Phone / Mobile number |
| **G** | `City` | Location (e.g. Mumbai, Delhi NCR, Bengaluru) |
| **H** | `Industry` | Industry (e.g. Technology & SaaS, Healthcare) |
| **I** | `Target Program` | Offering (e.g. Executive Coaching) |
| **J** | `Estimated Value` | Potential INR value (e.g. 1200000) |
| **K** | `Status` | `uncontacted`, `email_sent`, `call_scheduled`, etc. |
| **L** | `Channel` | `email`, `linkedin`, `call`, `referral`, `event` |
| **M** | `Assigned Owner` | `Amit`, `Preeti`, etc. |
| **N** | `Notes` | Initial notes / context |
