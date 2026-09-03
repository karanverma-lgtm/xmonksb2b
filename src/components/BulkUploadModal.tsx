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
  dealValue: number;
  stage: LeadStage;
  expectedCloseDate: string;
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
Titan Financial Services,Priya Sharma,Chief Risk Officer,psharma@titanfin.com,+91 98765 12345,Mumbai,Fintech & Banking,2500000,proposal,2026-11-15,Ruby,Customized B2B banking integration proposal shared.
Quantum Medical Systems,Dr. Vikram Sethi,Head of R&D,v.sethi@quantummed.org,+91 99000 88776,Delhi,Healthcare & Biotech,950000,discussion,2026-09-30,Admin User,Technical compliance review call scheduled.
`;

import { saveCSVUploadArchive } from "@/lib/uploadService";

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onBulkImport,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [rawCsvText, setRawCsvText] = useState<string>("");
  const [parsedLeads, setParsedLeads] = useState<ParsedCSVLead[]>([]);
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const assignToCurrentAccount = true;

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
    if (s.includes("proposal")) return "proposal";
    if (s.includes("discuss") || s.includes("team")) return "discussion";
    if (s.includes("negotiat") || s.includes("pric")) return "negotiation";
    if (s.includes("closure") || s.includes("won")) return "closure";
    if (s.includes("lost")) return "closed_lost";
    return "interest";
  };

  // Parse CSV Text
  const parseCSVText = (text: string) => {
    const lines = text.split(/\r\n|\n/).filter((line) => line.trim().length > 0);
    if (lines.length <= 1) {
      setError("CSV file is empty or missing data rows.");
      return;
    }

    const leads: ParsedCSVLead[] = [];
    const activeUserName = currentUser?.name || "Ruby";

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle simple CSV splitting (supporting quoted strings)
      const cols = line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map((col) =>
        col.replace(/^"|"$/g, "").trim()
      );

      if (cols.length >= 3) {
        const companyName = cols[0] || `Imported Company ${i}`;
        const contactName = cols[1] || "Primary Contact";

        let designation: string | undefined = undefined;
        let contactEmail = "contact@company.com";
        let contactPhone = "";
        let city = "";
        let industry = "SaaS & Software";
        let dealValue = 500000;
        let stage: LeadStage = "interest";
        let expectedCloseDate = "2026-10-31";
        let ownerCol = "";
        let journeyNotes = "Bulk imported from CSV file.";

        if (cols[2] && cols[2].includes("@")) {
          // Legacy format without Designation column
          contactEmail = cols[2];
          contactPhone = cols[3] || "";
          city = cols[4] || "";
          industry = cols[5] || "SaaS & Software";
          dealValue = parseFloat(cols[6]) || 500000;
          stage = parseStageKey(cols[7]);
          expectedCloseDate = cols[8] || "2026-10-31";
          ownerCol = cols[9];
          journeyNotes = cols[10] || "Bulk imported from CSV file.";
        } else {
          // Format with Designation column
          designation = cols[2] || undefined;
          contactEmail = cols[3] || "contact@company.com";
          contactPhone = cols[4] || "";
          city = cols[5] || "";
          industry = cols[6] || "SaaS & Software";
          dealValue = parseFloat(cols[7]) || 500000;
          stage = parseStageKey(cols[8]);
          expectedCloseDate = cols[9] || "2026-10-31";
          ownerCol = cols[10];
          journeyNotes = cols[11] || "Bulk imported from CSV file.";
        }

        // Owner determination
        let owner = ownerCol;
        if (assignToCurrentAccount || !owner || owner.length === 0) {
          owner = activeUserName;
        }

        leads.push({
          companyName,
          contactName,
          designation,
          contactEmail,
          contactPhone,
          city,
          industry,
          program: "Executive Coaching & Leadership Presence",
          dealValue,
          stage,
          expectedCloseDate,
          owner,
          journeyNotes,
        });
      }
    }

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
      parseCSVText(content);
    };
    reader.readAsText(selected);
  };

  const handleImportSubmit = async () => {
    if (parsedLeads.length === 0) return;
    setIsProcessing(true);
    try {
      // 1. Archive raw CSV file to Firestore b2b_csv_uploads
      if (file && rawCsvText) {
        await saveCSVUploadArchive({
          fileName: file.name,
          fileSize: file.size,
          rowCount: parsedLeads.length,
          uploadedBy: currentUser?.name || "Ruby",
          rawContent: rawCsvText,
          importedCount: parsedLeads.length,
          sampleRows: parsedLeads.slice(0, 3).map((l) => `${l.companyName} (${l.contactName})`),
        });
      }

      // 2. Import parsed leads into Firestore b2b_leads
      await onBulkImport(parsedLeads);
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

          {/* Preview Parsed Table */}
          {parsedLeads.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Preview Parsed Records ({parsedLeads.length} leads)</span>
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
