"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Building2,
  User,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  Calendar,
  FileSpreadsheet,
  Plus,
  SendHorizontal,
  UploadCloud,
  Download,
  FileText,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Link2,
} from "lucide-react";
import { ColdClient, ColdClientStatus, OutreachChannel } from "@/types/outreach";
import { COLD_STATUS_CONFIG, OUTREACH_CHANNELS, OUTREACH_INDUSTRIES } from "@/constants/outreach";
import { PRESET_PROGRAMS } from "@/constants/programs";
import { UserAccount, VALID_USERS } from "@/constants/users";
import { formatINR } from "@/lib/formatters";

const SAMPLE_OUTREACH_CSV = `Company Name,Contact Person,Email,Designation,Phone,City,Industry,Target Program,Estimated Value,Channel,Initial Note
Acme Corporation,Vikram Malhotra,vikram@acme.com,VP Human Resources,+91 98200 11223,Mumbai,Technology & SaaS,Executive Coaching,1200000,email,Met at HR Leadership Summit
Nexus Health,Pooja Sharma,pooja.sharma@nexushealth.in,Head of L&D,+91 98111 22334,Bengaluru,Healthcare & Pharma,L&D Transformation,1500000,linkedin,Mid-level manager transformation initiative
Zenith Retail,Amitabh Sen,amitabh@zenithretail.com,Chief People Officer,+91 98300 44556,Delhi NCR,E-Commerce & Retail,Assessments,800000,call,Looking for leadership psychometric assessment suite`;

interface AddColdClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddClient: (
    client: Omit<ColdClient, "id" | "createdAt" | "updatedAt" | "touchpoints"> & {
      initialNote?: string;
    }
  ) => Promise<void>;
  onBulkAdd: (
    clients: Array<Omit<ColdClient, "id" | "createdAt" | "updatedAt" | "touchpoints">>
  ) => Promise<void>;
  currentUser?: UserAccount | null;
}

export const AddColdClientModal: React.FC<AddColdClientModalProps> = ({
  isOpen,
  onClose,
  onAddClient,
  onBulkAdd,
  currentUser,
}) => {
  const [mode, setMode] = useState<"single" | "upload" | "bulk">("single");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Single form states
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [designation, setDesignation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState(OUTREACH_INDUSTRIES[0]);
  const [targetProgram, setTargetProgram] = useState(PRESET_PROGRAMS[0]?.name || "Executive Coaching");
  const [estimatedValue, setEstimatedValue] = useState<string>("500000");
  const [status, setStatus] = useState<ColdClientStatus>("uncontacted");
  const [channel, setChannel] = useState<OutreachChannel>("email");
  const [assignedOwner, setAssignedOwner] = useState(currentUser?.name || "Amit");
  const [nextFollowUpDate, setNextFollowUpDate] = useState<string>(
    new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0]
  );
  const [initialNote, setInitialNote] = useState("");

  // CSV File Upload states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [parsedUploadClients, setParsedUploadClients] = useState<
    Array<Omit<ColdClient, "id" | "createdAt" | "updatedAt" | "touchpoints">>
  >([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<ColdClientStatus>("uncontacted");
  const [uploadChannel, setUploadChannel] = useState<OutreachChannel>("email");
  const [uploadOwner, setUploadOwner] = useState(currentUser?.name || "Amit");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk Paste states
  const [bulkText, setBulkText] = useState("");
  const [bulkStatus, setBulkStatus] = useState<ColdClientStatus>("uncontacted");
  const [bulkChannel, setBulkChannel] = useState<OutreachChannel>("email");

  if (!isOpen) return null;

  // Single prospect submission
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!companyName.trim()) {
      setFormError("Company Name is required.");
      return;
    }
    if (!contactName.trim()) {
      setFormError("Contact Person Name is required.");
      return;
    }
    if (!email.trim()) {
      setFormError("Email Address is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddClient({
        companyName: companyName.trim(),
        contactName: contactName.trim(),
        designation: designation.trim() || undefined,
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        linkedinUrl: linkedinUrl.trim() || undefined,
        website: website.trim() || undefined,
        city: city.trim() || undefined,
        industry: industry,
        targetProgram: targetProgram,
        estimatedPotentialValue: estimatedValue ? parseInt(estimatedValue.replace(/\D/g, ""), 10) : 0,
        status: status,
        channel: channel,
        owner: assignedOwner,
        notes: initialNote.trim() || undefined,
        nextFollowUpDate: nextFollowUpDate || undefined,
        initialNote: initialNote.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to add cold prospect.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // CSV File parser
  const parseUploadedCsv = (text: string) => {
    try {
      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        setFormError("The uploaded CSV file contains no rows.");
        setParsedUploadClients([]);
        return;
      }

      const headerLine = lines[0].toLowerCase();
      const hasHeader =
        headerLine.includes("company") ||
        headerLine.includes("contact") ||
        headerLine.includes("email") ||
        headerLine.includes("name");

      let startIdx = 0;
      let companyIdx = 0;
      let contactIdx = 1;
      let emailIdx = 2;
      let desigIdx = 3;
      let phoneIdx = 4;
      let cityIdx = 5;
      let indIdx = 6;
      let progIdx = 7;
      let valIdx = 8;
      let chanIdx = 9;
      let noteIdx = 10;

      if (hasHeader) {
        startIdx = 1;
        const headers = lines[0]
          .split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/)
          .map((h) => h.replace(/^"|"$/g, "").trim().toLowerCase());

        headers.forEach((h, idx) => {
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
            progIdx = idx;
          } else if (
            h.includes("value") ||
            h.includes("deal") ||
            h.includes("budget") ||
            h.includes("amount") ||
            h.includes("potential")
          ) {
            valIdx = idx;
          } else if (h.includes("channel") || h.includes("medium")) {
            chanIdx = idx;
          } else if (h.includes("note") || h.includes("comment") || h.includes("remark")) {
            noteIdx = idx;
          }
        });
      }

      const parsed: Array<Omit<ColdClient, "id" | "createdAt" | "updatedAt" | "touchpoints">> = [];

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line
          .split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/)
          .map((col) => col.replace(/^"|"$/g, "").trim());

        const company = cols[companyIdx] || (cols[0] ? cols[0] : "");
        const contact = cols[contactIdx] || (cols[1] ? cols[1] : "");
        const email = cols[emailIdx] || (cols[2] ? cols[2] : "");

        if (!company && !contact && !email) continue;

        const rawVal = cols[valIdx] ? cols[valIdx].replace(/[^\d.-]/g, "") : "";
        const estVal = rawVal ? Math.round(parseFloat(rawVal)) || 500000 : 500000;

        const parsedChannelRaw = cols[chanIdx]?.toLowerCase();
        const validChannel: OutreachChannel = [
          "email",
          "linkedin",
          "call",
          "referral",
          "event",
          "other",
        ].includes(parsedChannelRaw || "")
          ? (parsedChannelRaw as OutreachChannel)
          : uploadChannel;

        parsed.push({
          companyName: company || "Unnamed Company",
          contactName: contact || "Key Stakeholder",
          email:
            email ||
            `${(contact || "contact").toLowerCase().replace(/\s+/g, ".")}@${(company || "company").toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
          designation: cols[desigIdx] || undefined,
          phone: cols[phoneIdx] || undefined,
          city: cols[cityIdx] || undefined,
          industry: cols[indIdx] || OUTREACH_INDUSTRIES[0],
          targetProgram: cols[progIdx] || PRESET_PROGRAMS[0]?.name || "Executive Coaching",
          estimatedPotentialValue: estVal,
          status: uploadStatus,
          channel: validChannel,
          owner: uploadOwner,
          notes: cols[noteIdx] || undefined,
          nextFollowUpDate: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
        });
      }

      if (parsed.length === 0) {
        setFormError("Could not extract any valid prospect rows. Please verify CSV formatting.");
        setParsedUploadClients([]);
      } else {
        setFormError("");
        setParsedUploadClients(parsed);
      }
    } catch {
      setFormError("Failed to parse CSV file. Ensure valid comma-separated format.");
      setParsedUploadClients([]);
    }
  };

  const handleFileProcess = (file: File) => {
    setFormError("");
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFormError("Please select a valid .csv file.");
      return;
    }
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (!content || !content.trim()) {
        setFormError("The uploaded CSV file is empty.");
        setParsedUploadClients([]);
        return;
      }
      parseUploadedCsv(content);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleClearUpload = () => {
    setUploadFile(null);
    setParsedUploadClients([]);
    setFormError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDownloadSampleTemplate = () => {
    const blob = new Blob([SAMPLE_OUTREACH_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "sample_cold_outreach_prospects.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (parsedUploadClients.length === 0) {
      setFormError("Please select or drop a valid CSV file containing prospects.");
      return;
    }

    try {
      setIsSubmitting(true);
      const finalClients = parsedUploadClients.map((c) => ({
        ...c,
        owner: uploadOwner,
        status: uploadStatus,
      }));
      await onBulkAdd(finalClients);
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to import uploaded prospects.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk CSV text paste submission
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!bulkText.trim()) {
      setFormError("Please enter prospect details in CSV format.");
      return;
    }

    const lines = bulkText.trim().split("\n");
    const parsedClients: Array<Omit<ColdClient, "id" | "createdAt" | "updatedAt" | "touchpoints">> = [];

    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length >= 2 && parts[0]) {
        parsedClients.push({
          companyName: parts[0],
          contactName: parts[1] || "Key Stakeholder",
          email:
            parts[2] ||
            `${parts[1]?.toLowerCase().replace(/\s+/g, ".")}@${parts[0]?.toLowerCase().replace(/\s+/g, "")}.com`,
          designation: parts[3] || "Director / HR Leader",
          phone: parts[4] || undefined,
          industry: OUTREACH_INDUSTRIES[0],
          targetProgram: PRESET_PROGRAMS[0]?.name || "Executive Coaching",
          status: bulkStatus,
          channel: bulkChannel,
          owner: assignedOwner,
          nextFollowUpDate: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
        });
      }
    }

    if (parsedClients.length === 0) {
      setFormError("No valid rows could be parsed. Check comma separation.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onBulkAdd(parsedClients);
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to import prospects.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <SendHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Add Cold Prospect
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  Outreach CRM
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Register a new cold account, upload a CSV spreadsheet, or paste bulk rows
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-3 bg-slate-50/50 dark:bg-slate-900/50 gap-2">
          <button
            onClick={() => setMode("single")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors ${
              mode === "single"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Single Prospect</span>
          </button>

          <button
            onClick={() => setMode("upload")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors ${
              mode === "upload"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload CSV File</span>
            <span className="text-[9px] px-1.5 py-0.2 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 font-extrabold rounded-full ml-1">
              New
            </span>
          </button>

          <button
            onClick={() => setMode("bulk")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors ${
              mode === "bulk"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Bulk CSV Paste</span>
          </button>
        </div>

        {formError && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-medium">
            {formError}
          </div>
        )}

        {/* 1. Single Add Form */}
        {mode === "single" && (
          <form onSubmit={handleSingleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Row 1: Company & Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Person <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Designation & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Designation / Role
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. VP Human Resources / Head of L&D"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rajesh@acme.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Phone & LinkedIn */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phone / Mobile
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  LinkedIn Profile URL
                </label>
                <div className="relative">
                  <Link2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/prospect"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Row 4: Industry & Target Program */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Industry
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {OUTREACH_INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Offering / Program
                </label>
                <select
                  value={targetProgram}
                  onChange={(e) => setTargetProgram(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {PRESET_PROGRAMS.map((prog) => (
                    <option key={prog.id} value={prog.name}>
                      {prog.name}
                    </option>
                  ))}
                  <option value="General Leadership">General Leadership</option>
                </select>
              </div>
            </div>

            {/* Row 5: Status, Channel & Follow-Up Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ColdClientStatus)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {Object.entries(COLD_STATUS_CONFIG).map(([k, cfg]) => (
                    <option key={k} value={k}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Outreach Channel
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as OutreachChannel)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {OUTREACH_CHANNELS.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Next Follow-Up Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="date"
                    value={nextFollowUpDate}
                    onChange={(e) => setNextFollowUpDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Row 6: Est Potential Value, City & Assigned Owner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Estimated Value (INR)
                </label>
                <input
                  type="number"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  placeholder="500000"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Location / City
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Mumbai, Bengaluru"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Owner
                </label>
                <select
                  value={assignedOwner}
                  onChange={(e) => setAssignedOwner(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                >
                  {VALID_USERS.map((u) => (
                    <option key={u.username} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 7: Initial Notes / Touchpoint */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Initial Outreach Note / Context
              </label>
              <textarea
                rows={2}
                value={initialNote}
                onChange={(e) => setInitialNote(e.target.value)}
                placeholder="Log where you found this prospect, initial touchpoint context, or pitch thesis..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving Prospect...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save Cold Prospect</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* 2. CSV File Upload Form */}
        {mode === "upload" && (
          <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Top Info Banner & Template Download */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-2xl">
              <div>
                <p className="text-xs font-bold text-blue-900 dark:text-blue-200">
                  Upload CSV Spreadsheet
                </p>
                <p className="text-[11px] text-blue-700 dark:text-blue-300">
                  Upload cold accounts in bulk with automatic column header detection.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadSampleTemplate}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 hover:bg-blue-100/50 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample CSV</span>
              </button>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/50 scale-[0.99]"
                  : uploadFile
                  ? "border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20"
                  : "border-slate-300 dark:border-slate-700 hover:border-blue-400 bg-slate-50/50 dark:bg-slate-900/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />

              {!uploadFile ? (
                <div className="space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Drag & Drop your CSV file here, or{" "}
                      <span className="text-blue-600 underline">browse computer</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Supports .csv files with company, contact name, email, role, phone, value
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-xl border border-emerald-300 dark:border-emerald-800">
                  <div className="flex items-center space-x-3 text-left">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[280px]">
                        {uploadFile.name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {(uploadFile.size / 1024).toFixed(1)} KB •{" "}
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {parsedUploadClients.length} records parsed
                        </span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearUpload();
                    }}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="Remove File"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Parsed Preview Table */}
            {parsedUploadClients.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Previewing First {Math.min(5, parsedUploadClients.length)} of {parsedUploadClients.length} Prospects
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Ready to populate Outreach board
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="px-3 py-2">Company</th>
                        <th className="px-3 py-2">Contact</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Role</th>
                        <th className="px-3 py-2">Program</th>
                        <th className="px-3 py-2">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {parsedUploadClients.slice(0, 5).map((cl, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                          <td className="px-3 py-2 font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                            {cl.companyName}
                          </td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                            {cl.contactName}
                          </td>
                          <td className="px-3 py-2 text-blue-600 dark:text-blue-400 truncate max-w-[150px]">
                            {cl.email}
                          </td>
                          <td className="px-3 py-2 text-slate-500 truncate max-w-[120px]">
                            {cl.designation || "-"}
                          </td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                            {cl.targetProgram}
                          </td>
                          <td className="px-3 py-2 font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatINR(cl.estimatedPotentialValue || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Default Import Settings Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Default Outreach Status
                </label>
                <select
                  value={uploadStatus}
                  onChange={(e) => setUploadStatus(e.target.value as ColdClientStatus)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {Object.entries(COLD_STATUS_CONFIG).map(([k, cfg]) => (
                    <option key={k} value={k}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Default Outreach Channel
                </label>
                <select
                  value={uploadChannel}
                  onChange={(e) => setUploadChannel(e.target.value as OutreachChannel)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {OUTREACH_CHANNELS.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Owner
                </label>
                <select
                  value={uploadOwner}
                  onChange={(e) => setUploadOwner(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                >
                  {VALID_USERS.map((u) => (
                    <option key={u.username} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || parsedUploadClients.length === 0}
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>
                      {parsedUploadClients.length > 0
                        ? `Import ${parsedUploadClients.length} Prospects`
                        : "Upload & Import Prospects"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* 3. Bulk CSV Paste Form */}
        {mode === "bulk" && (
          <form onSubmit={handleBulkSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Paste Prospects Data (CSV Format)
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                Format:{" "}
                <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                  Company, Contact Person, Email, Designation, Phone
                </code>{" "}
                (one per line)
              </p>
              <textarea
                rows={8}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Google India, Sundar P, sundar@google.com, VP Engineering, +91 9800000001&#10;Microsoft India, Satya N, satya@microsoft.com, Director HR, +91 9800000002"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Default Outreach Status
                </label>
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value as ColdClientStatus)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {Object.entries(COLD_STATUS_CONFIG).map(([k, cfg]) => (
                    <option key={k} value={k}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Default Outreach Channel
                </label>
                <select
                  value={bulkChannel}
                  onChange={(e) => setBulkChannel(e.target.value as OutreachChannel)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {OUTREACH_CHANNELS.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Owner
                </label>
                <select
                  value={assignedOwner}
                  onChange={(e) => setAssignedOwner(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                >
                  {VALID_USERS.map((u) => (
                    <option key={u.username} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Import Prospects</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
