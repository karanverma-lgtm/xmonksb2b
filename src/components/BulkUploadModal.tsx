"use client";

import React, { useState } from "react";
import { LeadStage } from "@/types/lead";
import { STAGES } from "@/constants/stages";
import { formatINR } from "@/lib/formatters";
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

import { UserAccount } from "@/constants/users";

interface ParsedCSVLead {
  companyName: string;
  contactName: string;
  designation?: string;
  contactEmail: string;
  contactPhone?: string;
  city?: string;
  industry: string;
  program?: string;
  leadSource?: string;
  dealValue: number;
  stage: LeadStage;
  expectedCloseDate: string;
  closureMonth?: string;
  owner: string;
  journeyNotes?: string;
}

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAccount | null;
  onBulkImport: (leads: ParsedCSVLead[]) => Promise<void>;
}

const SAMPLE_CSV_CONTENT = `Company Name,Contact Name,Designation,Contact Email,Contact Phone,City,Industry,Deal Value,Stage,Expected Close Date,Owner,Notes
Zenith Cloud Tech,Aarav Patel,VP of Infrastructure,aarav@zenithcloud.in,+91 98111 22334,Bengaluru,SaaS & Software,1500000,interest,2026-10-31,Ruby,Inbound web demo request for enterprise cloud suite.
Titan Financial Services,Priya Sharma,Chief Risk Officer,psharma@titanfin.com,+91 98765 12345,Mumbai,Fintech & Banking,2500000,discussion,2026-11-15,Ruby,Discussion with shareholders & team completed.
Quantum Medical Systems,Dr. Vikram Sethi,Head of R&D,v.sethi@quantummed.org,+91 99000 88776,Delhi,Healthcare & Biotech,950000,proposal,2026-09-30,Admin User,Commercial proposal and quotation shared.
`;

import { saveCSVUploadArchive } from "@/lib/uploadService";
import { VALID_USERS } from "@/constants/users";
import { getStoredLocalLeads } from "@/lib/leadsService";
import { parseCSVToRows } from "@/lib/csvParser";

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onBulkImport,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [rawCsvText, setRawCsvText] = useState<string>("");
  const [parsedLeads, setParsedLeads] = useState<ParsedCSVLead[]>([]);
  const [duplicateCount, setDuplicateCount] = useState<number>(0);
  const [skipDuplicates, setSkipDuplicates] = useState<boolean>(true);
  const [selectedAssignee, setSelectedAssignee] = useState<string>(
    currentUser?.name || "Amit"
  );
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen) return null;

  // Trigger browser download for sample CSV
  const handleDownloadSampleCSV = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "b2b_leads_sample_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to map stage text to valid LeadStage key
  const parseStageKey = (rawStage: string): LeadStage => {
    const s = (rawStage || "").toLowerCase().trim();
    if (s.includes("shareholder") || s.includes("discuss") || s.includes("team")) return "discussion";
    if (s.includes("commercial") || s.includes("proposal")) return "proposal";
    if (s.includes("negotiat") || s.includes("pric")) return "negotiation";
    if (s.includes("closure") || s.includes("won")) return "closure";
    if (s.includes("lost")) return "closed_lost";
    return "interest";
  };

  // Parse CSV Text with duplicate detection and dynamic header detection
  const parseCSVText = (text: string, currentAssignee: string) => {
    const rows = parseCSVToRows(text);
    if (rows.length <= 1) {
      setError("CSV file is empty or missing data rows.");
      return;
    }

    // Existing leads map for duplicate checking
    const existingLeads = getStoredLocalLeads();
    const existingEmails = new Set<string>();
    const existingPhones = new Set<string>();
    const existingCompCont = new Set<string>();

    existingLeads.forEach((l) => {
      if (l.contactEmail && l.contactEmail.includes("@")) {
        existingEmails.add(l.contactEmail.toLowerCase().trim());
      }
      const ph = (l.contactPhone || "").replace(/\D/g, "");
      if (ph.length >= 8) {
        existingPhones.add(ph.slice(-10));
      }
      const comp = (l.companyName || "").toLowerCase().trim();
      const cont = (l.contactName || "").toLowerCase().trim();
      if (comp && cont) {
        existingCompCont.add(`${comp}|${cont}`);
      }
    });

    const headerRow = rows[0].map((h) => h.toLowerCase().trim());
    const hasHeader =
      headerRow.some(
        (h) =>
          h.includes("company") ||
          h.includes("contact") ||
          h.includes("email") ||
          h.includes("phone")
      );

    let startIdx = 0;
    let companyIdx = 0;
    let contactIdx = 1;
    let desigIdx = 2;
    let emailIdx = 3;
    let phoneIdx = 4;
    let cityIdx = 5;
    let indIdx = 6;
    let dealIdx = 7;
    let stageIdx = 8;
    let closeDateIdx = 9;
    let ownerIdx = 10;
    let notesIdx = 11;
    let programIdx = -1;

    if (hasHeader) {
      startIdx = 1;
      headerRow.forEach((h, idx) => {
        if (h.includes("company") || h.includes("organization") || h.includes("account")) {
          companyIdx = idx;
        } else if (
          h.includes("contact") ||
          (h.includes("person") && !h.includes("company")) ||
          (h.includes("name") && !h.includes("company"))
        ) {
          contactIdx = idx;
        } else if (h.includes("email") || h.includes("mail")) {
          emailIdx = idx;
        } else if (
          h.includes("designation") ||
          h.includes("role") ||
          h.includes("title") ||
          h.includes("position")
        ) {
          desigIdx = idx;
        } else if (
          h.includes("phone") ||
          h.includes("mobile") ||
          h.includes("cell") ||
          h.includes("tel")
        ) {
          phoneIdx = idx;
        } else if (h.includes("city") || h.includes("location")) {
          cityIdx = idx;
        } else if (h.includes("industry") || h.includes("sector")) {
          indIdx = idx;
        } else if (h.includes("program") || h.includes("offering") || h.includes("service")) {
          programIdx = idx;
        } else if (
          h.includes("deal") ||
          h.includes("value") ||
          h.includes("budget") ||
          h.includes("amount")
        ) {
          dealIdx = idx;
        } else if (h.includes("stage") || h.includes("status")) {
          stageIdx = idx;
        } else if (h.includes("date") || h.includes("close")) {
          closeDateIdx = idx;
        } else if (h.includes("owner") || h.includes("assigned") || h.includes("rep")) {
          ownerIdx = idx;
        } else if (h.includes("note") || h.includes("comment") || h.includes("remark")) {
          notesIdx = idx;
        }
      });
    }

    const leads: ParsedCSVLead[] = [];
    let dupCount = 0;
    const seenInBatch = new Set<string>();

    for (let i = startIdx; i < rows.length; i++) {
      const cols = rows[i];
      if (!cols || cols.length === 0) continue;

      const rawComp = cols[companyIdx] || (cols[0] ? cols[0] : "");
      const rawContact = cols[contactIdx] || (cols[1] ? cols[1] : "");
      const rawEmail = cols[emailIdx] || "";

      if (!rawComp && !rawContact && !rawEmail) continue;

      const companyName = rawComp.trim() || `Imported Company ${i}`;
      const contactName = rawContact.trim() || "Primary Contact";
      const designation = (desigIdx !== -1 && cols[desigIdx] ? cols[desigIdx].trim() : undefined) || undefined;
      const contactEmail =
        rawEmail && rawEmail.includes("@")
          ? rawEmail.trim()
          : `${contactName.toLowerCase().replace(/\s+/g, ".")}@${companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
      const contactPhone = phoneIdx !== -1 && cols[phoneIdx] ? cols[phoneIdx].trim() : "";
      const city = cityIdx !== -1 && cols[cityIdx] ? cols[cityIdx].trim() : "";
      const industry = indIdx !== -1 && cols[indIdx] ? cols[indIdx].trim() : "SaaS & Software";
      const rawVal = dealIdx !== -1 && cols[dealIdx] ? cols[dealIdx].replace(/[^\d.-]/g, "") : "";
      const dealValue = rawVal ? Math.round(parseFloat(rawVal)) || 500000 : 500000;
      const stage = stageIdx !== -1 && cols[stageIdx] ? parseStageKey(cols[stageIdx]) : "interest";
      const expectedCloseDate =
        closeDateIdx !== -1 && cols[closeDateIdx] && cols[closeDateIdx].includes("-")
          ? cols[closeDateIdx].trim()
          : "2026-10-31";
      const ownerCol = ownerIdx !== -1 && cols[ownerIdx] ? cols[ownerIdx].trim() : "";
      const journeyNotes =
        notesIdx !== -1 && cols[notesIdx] ? cols[notesIdx].trim() : "Bulk imported from CSV file.";
      const targetProgram =
        programIdx !== -1 && cols[programIdx] ? cols[programIdx].trim() : "Executive Coaching";

      const cleanEmail = contactEmail.toLowerCase().trim();
      const cleanPh = contactPhone.replace(/\D/g, "").slice(-10);
      const compContKey = `${companyName.toLowerCase().trim()}|${contactName.toLowerCase().trim()}`;

      // Check if duplicate
      const isDuplicate =
        (cleanEmail && !cleanEmail.includes("company.com") && existingEmails.has(cleanEmail)) ||
        (cleanPh && cleanPh.length >= 8 && existingPhones.has(cleanPh)) ||
        existingCompCont.has(compContKey) ||
        seenInBatch.has(cleanEmail || compContKey);

      if (cleanEmail && !cleanEmail.includes("company.com")) {
        seenInBatch.add(cleanEmail);
      } else {
        seenInBatch.add(compContKey);
      }

      if (isDuplicate) {
        dupCount++;
      }

      // Assigned Owner priority:
      // 1. If user picked a specific owner from dropdown, use it!
      // 2. Otherwise fallback to CSV row owner or current user
      const owner = currentAssignee || ownerCol || currentUser?.name || "Amit";

      leads.push({
        companyName,
        contactName,
        designation,
        contactEmail,
        contactPhone,
        city,
        industry,
        program: targetProgram,
        leadSource: "Event Based",
        dealValue,
        stage,
        expectedCloseDate,
        closureMonth: expectedCloseDate ? expectedCloseDate.substring(0, 7) : undefined,
        owner,
        journeyNotes,
      });
    }

    setDuplicateCount(dupCount);

    if (leads.length === 0) {
      setError("Could not parse any valid lead records from CSV.");
    } else {
      setError("");
      setParsedLeads(leads);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.endsWith(".csv")) {
      setError("Please select a valid .csv file.");
      return;
    }

    setFile(selected);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setRawCsvText(content || "");
      parseCSVText(content, selectedAssignee);
    };
    reader.readAsText(selected);
  };

  // Re-parse when user changes the assignee dropdown
  const handleAssigneeChange = (newAssignee: string) => {
    setSelectedAssignee(newAssignee);
    if (rawCsvText) {
      parseCSVText(rawCsvText, newAssignee);
    }
  };

  const handleImportSubmit = async () => {
    if (parsedLeads.length === 0) return;
    setIsProcessing(true);
    try {
      // If skipDuplicates is enabled, filter out duplicate records
      let finalLeadsToImport = parsedLeads;
      if (skipDuplicates) {
        const existingLeads = getStoredLocalLeads();
        const existingEmails = new Set<string>();
        const existingPhones = new Set<string>();
        const existingCompCont = new Set<string>();

        existingLeads.forEach((l) => {
          if (l.contactEmail && l.contactEmail.includes("@")) {
            existingEmails.add(l.contactEmail.toLowerCase().trim());
          }
          const ph = (l.contactPhone || "").replace(/\D/g, "");
          if (ph.length >= 8) {
            existingPhones.add(ph.slice(-10));
          }
          const comp = (l.companyName || "").toLowerCase().trim();
          const cont = (l.contactName || "").toLowerCase().trim();
          if (comp && cont) {
            existingCompCont.add(`${comp}|${cont}`);
          }
        });

        const seenInBatch = new Set<string>();
        finalLeadsToImport = parsedLeads.filter((l) => {
          const email = (l.contactEmail || "").toLowerCase().trim();
          const ph = (l.contactPhone || "").replace(/\D/g, "").slice(-10);
          const compContKey = `${(l.companyName || "").toLowerCase().trim()}|${(l.contactName || "").toLowerCase().trim()}`;

          if (email && email !== "contact@company.com" && existingEmails.has(email)) return false;
          if (ph && ph.length >= 8 && existingPhones.has(ph)) return false;
          if (existingCompCont.has(compContKey)) return false;

          if (email && email !== "contact@company.com") {
            if (seenInBatch.has(email)) return false;
            seenInBatch.add(email);
          } else {
            if (seenInBatch.has(compContKey)) return false;
            seenInBatch.add(compContKey);
          }

          return true;
        });
      }

      if (finalLeadsToImport.length === 0) {
        setError("All leads in this file were identified as duplicates and skipped.");
        setIsProcessing(false);
        return;
      }

      // 1. Archive raw CSV file to Firestore b2b_csv_uploads
      if (file && rawCsvText) {
        await saveCSVUploadArchive({
          fileName: file.name,
          fileSize: file.size,
          rowCount: parsedLeads.length,
          uploadedBy: currentUser?.name || selectedAssignee,
          rawContent: rawCsvText,
          importedCount: finalLeadsToImport.length,
          sampleRows: finalLeadsToImport.slice(0, 3).map((l) => `${l.companyName} (${l.contactName})`),
        });
      }

      // 2. Import parsed leads into Firestore b2b_leads
      await onBulkImport(finalLeadsToImport);
      setIsProcessing(false);
      setParsedLeads([]);
      setFile(null);
      setRawCsvText("");
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to import leads. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-md shadow-purple-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Bulk Upload B2B Leads via CSV
              </h3>
              <p className="text-xs text-slate-500">
                Import multiple accounts and auto-generate timestamped journey logs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Sample CSV Download Banner */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>Need a CSV Template?</span>
              </div>
              <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80">
                Download the sample CSV file containing all formatted columns & headers.
              </p>
            </div>

            <button
              onClick={handleDownloadSampleCSV}
              className="flex items-center space-x-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Sample CSV Template</span>
            </button>
          </div>

          {/* File Upload Drag & Drop Area */}
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 rounded-2xl p-6 text-center bg-slate-50/50 dark:bg-slate-950/40 transition">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              id="csv-file-input"
              className="hidden"
            />
            <label
              htmlFor="csv-file-input"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <div className="p-3.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <UploadCloud className="w-8 h-8" />
              </div>
              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                {file ? file.name : "Click to select or drop your .CSV file here"}
              </span>
              <span className="text-xs text-slate-400">Supports standard UTF-8 .csv files</span>
            </label>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Import Settings & Duplicate Alert */}
          {parsedLeads.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {/* Specific User Assignment */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Assign All Imported Leads To:
                  </label>
                  <select
                    value={selectedAssignee}
                    onChange={(e) => handleAssigneeChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    {VALID_USERS.map((u) => (
                      <option key={u.username} value={u.name}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duplicate Handling Option */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Duplicate Protection:
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(e) => setSkipDuplicates(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                    />
                    <span>Automatically skip existing duplicate leads</span>
                  </label>
                </div>
              </div>

              {/* Duplicate Detection Alert */}
              {duplicateCount > 0 ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span>
                      <strong>{duplicateCount} duplicate lead(s)</strong> detected matching existing database records (by Email, Phone, or Company + Contact).
                    </span>
                  </div>
                  <span className="font-bold text-[11px] bg-amber-500/20 px-2 py-0.5 rounded-full">
                    {skipDuplicates ? "Will be skipped safely" : "Will be imported as duplicate"}
                  </span>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>All {parsedLeads.length} leads are unique! No duplicates detected against database.</span>
                </div>
              )}
            </div>
          )}

          {/* Preview Parsed Table */}
          {parsedLeads.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>
                    Previewing {parsedLeads.length} Leads &bull; Assigned to:{" "}
                    <span className="text-purple-600 dark:text-purple-400 font-extrabold">{selectedAssignee}</span>
                    {duplicateCount > 0 && skipDuplicates && (
                      <span className="text-amber-600 text-[11px] font-normal ml-2">
                        ({parsedLeads.length - duplicateCount} will be imported, {duplicateCount} skipped)
                      </span>
                    )}
                  </span>
                </h4>
              </div>

              <div className="overflow-x-auto max-h-60 rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold">
                    <tr>
                      <th className="p-2.5">Company</th>
                      <th className="p-2.5">Contact</th>
                      <th className="p-2.5">Industry</th>
                      <th className="p-2.5">Stage</th>
                      <th className="p-2.5 text-right">Deal Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {parsedLeads.map((lead, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">
                          {lead.companyName}
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400">
                          {lead.contactName} ({lead.contactEmail})
                        </td>
                        <td className="p-2.5 text-slate-500">{lead.industry}</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            {STAGES[lead.stage]?.label} ({STAGES[lead.stage]?.weightage}%)
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">
                          {formatINR(lead.dealValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={parsedLeads.length === 0 || isProcessing}
            onClick={handleImportSubmit}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-500/20 transition flex items-center space-x-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>
              {isProcessing
                ? "Importing Leads..."
                : `Confirm Import (${parsedLeads.length} Leads)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
