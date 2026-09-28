"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Building2,
  User,
  DollarSign,
  Calendar,
  Clock,
  AlertTriangle,
  FileText,
  UploadCloud,
  CheckCircle2,
  Loader2,
  Trash2,
  Plus,
  Image as ImageIcon,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
} from "lucide-react";
import {
  BillingRecord,
  VendorInfo,
  BillingDocument,
  BillingStatus,
} from "@/types/billing";
import { Lead } from "@/types/lead";
import { uploadBillingFile } from "@/lib/billingService";
import { formatINR } from "@/lib/formatters";

interface AddBillingRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recordData: Parameters<typeof import("@/lib/billingService").saveBillingRecord>[0]) => void;
  existingRecord?: BillingRecord | null;
  leads?: Lead[];
  currentUser?: { name?: string; username?: string; role?: string } | null;
}

export const AddBillingRecordModal: React.FC<AddBillingRecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingRecord,
  leads = [],
  currentUser,
}) => {
  const [activeSection, setActiveSection] = useState<"vendor" | "financials" | "defaults" | "documents">("vendor");

  // Selected Lead Linkage
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");

  // Vendor Information
  const [companyName, setCompanyName] = useState<string>("");
  const [contactPerson, setContactPerson] = useState<string>("");
  const [designation, setDesignation] = useState<string>("");
  const [companyAddress, setCompanyAddress] = useState<string>("");
  const [contactPersonPhone, setContactPersonPhone] = useState<string>("");
  const [contactPersonEmail, setContactPersonEmail] = useState<string>("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string>("");
  const [profilePictureUrl, setProfilePictureUrl] = useState<string>("");
  const [gstin, setGstin] = useState<string>("");
  const [pan, setPan] = useState<string>("");
  const [website, setWebsite] = useState<string>("");

  // Pipeline Sync Details
  const [industry, setIndustry] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [program, setProgram] = useState<string>("");
  const [leadSource, setLeadSource] = useState<string>("");
  const [closureMonth, setClosureMonth] = useState<string>("");
  const [expectedCloseDate, setExpectedCloseDate] = useState<string>("");
  const [pipelineStage, setPipelineStage] = useState<string>("");
  const [pipelineDealValue, setPipelineDealValue] = useState<number | undefined>(undefined);
  const [approachNote, setApproachNote] = useState<any>(null);

  // Project & Financials
  const [projectName, setProjectName] = useState<string>("");
  const [contractNumber, setContractNumber] = useState<string>("");
  const [projectAmount, setProjectAmount] = useState<number | string>("");
  const [tenureMonths, setTenureMonths] = useState<number>(12);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState<string>("");
  const [billingFrequency, setBillingFrequency] = useState<BillingRecord["billingFrequency"]>("monthly");
  const [amountReceived, setAmountReceived] = useState<number | string>(0);
  const [advancePaymentAmount, setAdvancePaymentAmount] = useState<number | string>(0);
  const [status, setStatus] = useState<BillingStatus>("active");
  const [owner, setOwner] = useState<string>(existingRecord?.owner || currentUser?.name || "Amit");
  const [notes, setNotes] = useState<string>("");

  // Payment Defaults Risk
  const [hasDefaults, setHasDefaults] = useState<boolean>(false);
  const [defaultedAmount, setDefaultedAmount] = useState<number | string>("");
  const [defaultReason, setDefaultReason] = useState<string>("");

  // Company Documents
  const [documents, setDocuments] = useState<BillingDocument[]>([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState<boolean>(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);
  const [isUploadingProfile, setIsUploadingProfile] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Form validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-calculate End Date when Start Date or Tenure changes
  useEffect(() => {
    if (startDate && tenureMonths) {
      try {
        const start = new Date(startDate);
        const end = new Date(start);
        end.setMonth(start.getMonth() + Number(tenureMonths));
        end.setDate(end.getDate() - 1);
        setEndDate(end.toISOString().split("T")[0]);
      } catch {}
    }
  }, [startDate, tenureMonths]);

  // Load existing record for editing
  useEffect(() => {
    if (existingRecord) {
      setSelectedLeadId(existingRecord.leadId || "");
      setProjectName(existingRecord.projectName || "");
      setContractNumber(existingRecord.contractNumber || "");
      setStatus(existingRecord.status || "active");
      setProjectAmount(existingRecord.projectAmount || "");
      setTenureMonths(existingRecord.tenureMonths || 12);
      setStartDate(existingRecord.startDate || new Date().toISOString().split("T")[0]);
      setEndDate(existingRecord.endDate || "");
      setBillingFrequency(existingRecord.billingFrequency || "monthly");
      setAmountReceived(existingRecord.amountReceived || 0);
      setAdvancePaymentAmount(existingRecord.advancePaymentAmount || 0);
      setOwner(existingRecord.owner || currentUser?.name || "Amit");
      setNotes(existingRecord.notes || "");

      // Vendor
      const v = existingRecord.vendor || {};
      setCompanyName(v.companyName || "");
      setContactPerson(v.contactPerson || "");
      setDesignation(v.designation || existingRecord.designation || "");
      setCompanyAddress(v.companyAddress || "");
      setContactPersonPhone(v.contactPersonPhone || "");
      setContactPersonEmail(v.contactPersonEmail || "");
      setCompanyLogoUrl(v.companyLogoUrl || "");
      setProfilePictureUrl(v.profilePictureUrl || "");
      setGstin(v.gstin || "");
      setPan(v.pan || "");
      setWebsite(v.website || "");

      // Pipeline details
      setIndustry(existingRecord.industry || v.industry || "");
      setCity(existingRecord.city || v.city || "");
      setProgram(existingRecord.program || v.program || "");
      setLeadSource(existingRecord.leadSource || v.leadSource || "");
      setClosureMonth(existingRecord.closureMonth || "");
      setExpectedCloseDate(existingRecord.expectedCloseDate || "");
      setPipelineStage(existingRecord.pipelineStage || "");
      setPipelineDealValue(existingRecord.pipelineDealValue);
      setApproachNote(existingRecord.approachNote || null);

      // Defaults
      setHasDefaults(Boolean(existingRecord.hasDefaults));
      setDefaultedAmount(existingRecord.defaultedAmount || "");
      setDefaultReason(existingRecord.defaultNotes || "");

      // Documents
      setDocuments(existingRecord.documents || []);
    } else {
      resetForm();
    }
  }, [existingRecord, isOpen]);

  const resetForm = () => {
    setSelectedLeadId("");
    setProjectName("");
    setContractNumber(`XMB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setStatus("active");
    setProjectAmount("");
    setTenureMonths(12);
    const today = new Date().toISOString().split("T")[0];
    setStartDate(today);
    setBillingFrequency("monthly");
    setAmountReceived(0);
    setAdvancePaymentAmount(0);
    setNotes("");

    setCompanyName("");
    setContactPerson("");
    setDesignation("");
    setCompanyAddress("");
    setContactPersonPhone("");
    setContactPersonEmail("");
    setCompanyLogoUrl("");
    setProfilePictureUrl("");
    setGstin("");
    setPan("");
    setWebsite("");

    setIndustry("");
    setCity("");
    setProgram("");
    setLeadSource("");
    setClosureMonth("");
    setExpectedCloseDate("");
    setPipelineStage("");
    setPipelineDealValue(undefined);
    setApproachNote(null);

    setHasDefaults(false);
    setDefaultedAmount("");
    setDefaultReason("");
    setDocuments([]);
    setErrors({});
    setActiveSection("vendor");
  };

  // Pull vendor details from selected CRM Lead
  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      setCompanyName(lead.companyName || "");
      setContactPerson(lead.contactName || "");
      setDesignation(lead.designation || "");
      setContactPersonEmail(lead.contactEmail || "");
      setContactPersonPhone(lead.contactPhone || "");
      setCompanyAddress(lead.city ? `${lead.city}, India` : "");
      if (lead.companyLogo) setCompanyLogoUrl(lead.companyLogo);
      if (lead.dealValue && !projectAmount) setProjectAmount(lead.dealValue);
      if (!projectName) {
        setProjectName(`${lead.companyName} - ${lead.program || "Leadership Transformation"}`);
      }

      setIndustry(lead.industry || "");
      setCity(lead.city || "");
      setProgram(lead.program || "");
      setLeadSource(lead.leadSource || "");
      setClosureMonth(lead.closureMonth || "");
      setExpectedCloseDate(lead.expectedCloseDate || "");
      setPipelineStage(lead.stage || "");
      setPipelineDealValue(lead.dealValue);

      if (lead.approachNote) {
        setApproachNote(lead.approachNote);
        setDocuments((prev) => {
          const alreadyHas = prev.some((d) => d.name === lead.approachNote?.fileName);
          if (alreadyHas) return prev;
          return [
            ...prev,
            {
              id: `doc-pipeline-${Date.now()}`,
              name: lead.approachNote!.fileName,
              category: "proposal",
              fileSize: lead.approachNote!.fileSize,
              fileSizeBytes: lead.approachNote!.fileSizeBytes,
              fileType: "application/pdf",
              downloadUrl: lead.approachNote!.downloadUrl,
              storagePath: lead.approachNote!.storagePath,
              uploadedAt: lead.approachNote!.uploadedAt,
              uploadedBy: lead.approachNote!.uploadedBy || lead.owner || "Pipeline Lead Sync",
            },
          ];
        });
      }
    }
  };

  // Upload Logo handler
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const uploaded = await uploadBillingFile(file, "logo", currentUser?.name || "Admin");
      setCompanyLogoUrl(uploaded.downloadUrl);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to upload company logo.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Upload Profile Picture handler
  const handleProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingProfile(true);
    try {
      const uploaded = await uploadBillingFile(file, "profile", currentUser?.name || "Admin");
      setProfilePictureUrl(uploaded.downloadUrl);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to upload contact profile picture.");
    } finally {
      setIsUploadingProfile(false);
    }
  };

  // Upload Document handler
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingDoc(true);
    setUploadError(null);

    const newDocs: BillingDocument[] = [...documents];
    for (let i = 0; i < files.length; i++) {
      try {
        const uploaded = await uploadBillingFile(files[i], "document", currentUser?.name || "Admin");
        newDocs.push(uploaded);
      } catch (err: unknown) {
        setUploadError(err instanceof Error ? err.message : "Error uploading document.");
      }
    }
    setDocuments(newDocs);
    setIsUploadingDoc(false);
  };

  const handleRemoveDoc = (docId: string) => {
    setDocuments(documents.filter((d) => d.id !== docId));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!companyName.trim()) newErrors.companyName = "Company Name is required.";
    if (!contactPerson.trim()) newErrors.contactPerson = "Contact Person name is required.";
    if (!contactPersonEmail.trim()) newErrors.contactPersonEmail = "Contact Email is required.";
    if (!contactPersonPhone.trim()) newErrors.contactPersonPhone = "Contact Phone is required.";
    if (!projectName.trim()) newErrors.projectName = "Project Name is required.";
    if (!projectAmount || Number(projectAmount) <= 0) newErrors.projectAmount = "Valid Project Amount in INR is required.";
    if (!tenureMonths || Number(tenureMonths) <= 0) newErrors.tenureMonths = "Tenure in months is required.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      if (errors.companyName || errors.contactPerson || errors.contactPersonEmail || errors.contactPersonPhone) {
        setActiveSection("vendor");
      } else {
        setActiveSection("financials");
      }
      return;
    }

    const pAmt = Number(projectAmount);
    const rAmt = Number(amountReceived) || 0;
    const advAmt = Number(advancePaymentAmount) || 0;
    const dAmt = hasDefaults ? Number(defaultedAmount) || 0 : 0;

    const vendorInfo: VendorInfo = {
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim(),
      designation: designation.trim() || undefined,
      companyAddress: companyAddress.trim() || "Address on File",
      contactPersonPhone: contactPersonPhone.trim(),
      contactPersonEmail: contactPersonEmail.trim(),
      companyLogoUrl: companyLogoUrl.trim() || undefined,
      profilePictureUrl: profilePictureUrl.trim() || undefined,
      gstin: gstin.trim() || undefined,
      pan: pan.trim() || undefined,
      website: website.trim() || undefined,
      industry: industry.trim() || undefined,
      city: city.trim() || undefined,
      program: program.trim() || undefined,
      leadSource: leadSource.trim() || undefined,
    };

    onSave({
      id: existingRecord?.id,
      leadId: selectedLeadId || undefined,
      projectName: projectName.trim(),
      contractNumber: contractNumber.trim() || undefined,
      status,
      industry: industry.trim() || undefined,
      city: city.trim() || undefined,
      designation: designation.trim() || undefined,
      program: program.trim() || undefined,
      leadSource: leadSource.trim() || undefined,
      closureMonth: closureMonth.trim() || undefined,
      expectedCloseDate: expectedCloseDate.trim() || undefined,
      pipelineStage: pipelineStage.trim() || undefined,
      pipelineDealValue: pipelineDealValue,
      approachNote: approachNote || undefined,
      projectAmount: pAmt,
      tenureMonths: Number(tenureMonths),
      startDate,
      endDate: endDate || startDate,
      billingFrequency,
      amountReceived: rAmt,
      advancePaymentAmount: advAmt,
      credentials: existingRecord?.credentials || [],
      paymentHistory: existingRecord?.paymentHistory || [],
      hasDefaults: hasDefaults && dAmt > 0,
      defaultCount: hasDefaults && dAmt > 0 ? 1 : 0,
      defaultedAmount: dAmt,
      defaultNotes: hasDefaults ? defaultReason.trim() : undefined,
      defaultsHistory: existingRecord?.defaultsHistory || (hasDefaults && dAmt > 0 ? [
        {
          id: `def-${Date.now()}`,
          dueDate: startDate,
          expectedAmount: dAmt,
          daysOverdue: 30,
          reason: defaultReason.trim() || "Initial default logged",
          status: "pending_resolution",
          createdAt: new Date().toISOString(),
        }
      ] : []),
      vendor: vendorInfo,
      documents,
      notes: notes.trim() || undefined,
      owner: owner.trim() || existingRecord?.owner || currentUser?.name || currentUser?.username?.toLowerCase() || "Amit",
      createdBy: existingRecord?.createdBy || currentUser?.name || currentUser?.username || "Admin",
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Top Bar */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-900/90 via-slate-900 to-indigo-900/90 text-white flex items-center justify-between border-b border-emerald-500/20">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl text-emerald-300">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                {existingRecord ? "Edit Billing Project" : "Create New Billing Project"}
              </h2>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Configure vendor profile, project amount, tenure, payment tracking, defaults, and documents.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Navigation Pills */}
        <div className="flex items-center space-x-1 p-2 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveSection("vendor")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition whitespace-nowrap ${
              activeSection === "vendor"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
            }`}
          >
            <User className="w-4 h-4" />
            <span>1. Vendor Information</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("financials")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition whitespace-nowrap ${
              activeSection === "financials"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>2. Project & Financials</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("defaults")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition whitespace-nowrap ${
              activeSection === "defaults"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>3. Payment Defaults</span>
            {hasDefaults && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("documents")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition whitespace-nowrap ${
              activeSection === "documents"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>4. Company Documents ({documents.length})</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SECTION 1: VENDOR INFORMATION */}
          {activeSection === "vendor" && (
            <div className="space-y-5 animate-fadeIn">
              {/* Optional CRM Lead Link Picker */}
              {leads.length > 0 && !existingRecord && (
                <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center space-x-1.5">
                      <Building2 className="w-4 h-4 text-indigo-500" />
                      <span>Quick Autofill from Existing CRM Client</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Optional</span>
                  </div>
                  <select
                    value={selectedLeadId}
                    onChange={(e) => handleSelectLead(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose from CRM Leads (Or enter manually below) --</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.companyName} ({l.contactName} - {formatINR(l.dealValue)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Company Logo and Contact Profile Pic Upload Area */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                {/* Company Logo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Company Logo
                  </label>
                  <div className="flex items-center space-x-3">
                    <div className="w-14 h-14 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                      {companyLogoUrl ? (
                        <img
                          src={companyLogoUrl}
                          alt="Logo"
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <Building2 className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-200 transition shadow-xs">
                        {isUploadingLogo ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                        ) : (
                          <UploadCloud className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        <span>{companyLogoUrl ? "Change Logo" : "Upload Logo"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                          disabled={isUploadingLogo}
                        />
                      </label>
                      <input
                        type="url"
                        placeholder="Or paste Logo URL"
                        value={companyLogoUrl}
                        onChange={(e) => setCompanyLogoUrl(e.target.value)}
                        className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Person Profile Picture */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Contact Person Profile Picture
                  </label>
                  <div className="flex items-center space-x-3">
                    <div className="w-14 h-14 rounded-full border-2 border-emerald-500/30 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                      {profilePictureUrl ? (
                        <img
                          src={profilePictureUrl}
                          alt="Contact Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-200 transition shadow-xs">
                        {isUploadingProfile ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                        ) : (
                          <UploadCloud className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        <span>{profilePictureUrl ? "Change Photo" : "Upload Photo"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleProfileUpload}
                          disabled={isUploadingProfile}
                        />
                      </label>
                      <input
                        type="url"
                        placeholder="Or paste Avatar URL"
                        value={profilePictureUrl}
                        onChange={(e) => setProfilePictureUrl(e.target.value)}
                        className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Vendor Basic Info Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Enterprises Pvt Ltd"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  {errors.companyName && <p className="text-[10px] text-rose-500 mt-1">{errors.companyName}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Person Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Aarav Patel"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  {errors.contactPerson && <p className="text-[10px] text-rose-500 mt-1">{errors.contactPerson}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Person Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={contactPersonEmail}
                    onChange={(e) => setContactPersonEmail(e.target.value)}
                    placeholder="aarav@company.com"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                  {errors.contactPersonEmail && <p className="text-[10px] text-rose-500 mt-1">{errors.contactPersonEmail}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Person Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={contactPersonPhone}
                    onChange={(e) => setContactPersonPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                  {errors.contactPersonPhone && <p className="text-[10px] text-rose-500 mt-1">{errors.contactPersonPhone}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Chief Human Resources Officer"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Company Website
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://company.com"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Company Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Company Full Address
                </label>
                <textarea
                  rows={2}
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder="Street, Tower/Block, Area, City, State, PIN Code"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Tax Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="e.g. 29AABCZ9876K1Z5"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    PAN
                  </label>
                  <input
                    type="text"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    placeholder="e.g. AABCZ9876K"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: PROJECT & FINANCIALS */}
          {activeSection === "financials" && (
            <div className="space-y-5 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Project / Engagement Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Enterprise Leadership & Executive Coaching Cohort"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  {errors.projectName && <p className="text-[10px] text-rose-500 mt-1">{errors.projectName}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contract / PO Reference Number
                  </label>
                  <input
                    type="text"
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                    placeholder="e.g. XMB-2026-1049"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Project Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as BillingStatus)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="active">Active Engagement</option>
                    <option value="completed">Completed / Fully Paid</option>
                    <option value="defaulted">Defaulted / Payment Overdue</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Account Partner / Owner
                  </label>
                  {Boolean(
                    currentUser?.username?.toLowerCase() === "admin" ||
                    currentUser?.role?.toLowerCase().includes("admin") ||
                    currentUser?.username?.toLowerCase() === "accounts" ||
                    currentUser?.role?.toLowerCase().includes("accounts")
                  ) ? (
                    <select
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      {["Amit", "Ruby", "Gaurav", "Preeti", "Nikhil"].map((partner) => (
                        <option key={partner} value={partner}>
                          {partner}
                        </option>
                      ))}
                      {!["Amit", "Ruby", "Gaurav", "Preeti", "Nikhil"].includes(owner) && owner && (
                        <option value={owner}>{owner}</option>
                      )}
                    </select>
                  ) : (
                    <div className="w-full px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      {currentUser?.name || "Client Partner"} (Your Portfolio)
                    </div>
                  )}
                </div>
              </div>

              {/* Project Amount & Tenure */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Total Project Amount (INR) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      required
                      min={0}
                      step="any"
                      value={projectAmount}
                      onChange={(e) => setProjectAmount(e.target.value ? Number(e.target.value) : "")}
                      placeholder="e.g. 2400000"
                      className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  {projectAmount ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1">
                      {formatINR(Number(projectAmount))}
                    </span>
                  ) : null}
                  {errors.projectAmount && <p className="text-[10px] text-rose-500 mt-1">{errors.projectAmount}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tenure (Months) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={1}
                      max={60}
                      value={tenureMonths}
                      onChange={(e) => setTenureMonths(Number(e.target.value))}
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Duration: {tenureMonths} Months
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Billing Frequency
                  </label>
                  <select
                    value={billingFrequency}
                    onChange={(e) => setBillingFrequency(e.target.value as BillingRecord["billingFrequency"])}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="monthly">Monthly Recurring</option>
                    <option value="quarterly">Quarterly Tranches</option>
                    <option value="milestone">Milestone Based</option>
                    <option value="one_time">100% Upfront / One-Time</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tenure Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tenure End Date (Auto-calculated)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Amount Received Till Now & Advance Payment Received */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Amount Received Till Now (INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value ? Number(e.target.value) : 0)}
                      placeholder="0"
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  {Number(amountReceived) > 0 && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1">
                      {formatINR(Number(amountReceived))} ({((Number(amountReceived) / Math.max(Number(projectAmount) || 1, 1)) * 100).toFixed(1)}% Collected)
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Advance Payment Received (INR)</span>
                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                      Advance
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-amber-500">₹</span>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={advancePaymentAmount}
                      onChange={(e) => setAdvancePaymentAmount(e.target.value ? Number(e.target.value) : 0)}
                      placeholder="0"
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  {Number(advancePaymentAmount) > 0 && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block mt-1">
                      {formatINR(Number(advancePaymentAmount))} advance secured
                    </span>
                  )}
                </div>
              </div>

              {/* Pending Balance Indicator */}
              {projectAmount && (
                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Remaining Pending Balance:</span>
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
                    {formatINR(Math.max(0, Number(projectAmount) - Number(amountReceived || 0)))}
                  </span>
                </div>
              )}

              {/* Project Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contract / Project Internal Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Key milestones, renewal terms, client partners involved..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* SECTION 3: PAYMENT DEFAULTS */}
          {activeSection === "defaults" && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-extrabold text-amber-700 dark:text-amber-300 block mb-0.5">
                    Payment Defaults Tracking
                  </span>
                  <p className="text-amber-600 dark:text-amber-400/90 leading-relaxed">
                    Flag any delayed payments, overdue invoices, disputed tranches, or legal notices. Defaults are highlighted across dashboard KPIs and filtered for proactive collection.
                  </p>
                </div>
              </div>

              {/* Toggle Has Defaults */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-white block">
                    Does this project have an active payment default?
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Enable to flag overdue payments and record default metrics.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasDefaults}
                    onChange={(e) => {
                      setHasDefaults(e.target.checked);
                      if (e.target.checked && status !== "completed") {
                        setStatus("defaulted");
                      } else if (!e.target.checked && status === "defaulted") {
                        setStatus("active");
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                </label>
              </div>

              {hasDefaults && (
                <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-50/40 dark:bg-rose-950/20 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Overdue Defaulted Amount (INR) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={defaultedAmount}
                        onChange={(e) => setDefaultedAmount(e.target.value ? Number(e.target.value) : "")}
                        placeholder="e.g. 500000"
                        className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900/60 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>
                    {defaultedAmount ? (
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block mt-1">
                        Overdue: {formatINR(Number(defaultedAmount))}
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Default Reason & Overdue Explanation
                    </label>
                    <textarea
                      rows={3}
                      value={defaultReason}
                      onChange={(e) => setDefaultReason(e.target.value)}
                      placeholder="e.g. Procurement sign-off delayed due to internal finance restructuring. Follow-up meeting scheduled."
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900/60 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: COMPANY DOCUMENTS */}
          {activeSection === "documents" && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Vendor & Project Documents
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Upload Master Service Agreements, NDAs, GST certificates, Scope of Work, and Invoices.
                  </p>
                </div>

                <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition">
                  {isUploadingDoc ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload Documents</span>
                    </>
                  )}
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={handleDocumentUpload}
                    disabled={isUploadingDoc}
                  />
                </label>
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
                  {uploadError}
                </div>
              )}

              {/* Documents List */}
              {documents.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    No documents attached yet.
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Click the "Upload Documents" button above to attach contracts, NDAs, and GST certificates.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {documents.map((docItem) => (
                    <div
                      key={docItem.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={docItem.name}>
                            {docItem.name}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {docItem.fileSize} • {docItem.category.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0 ml-2">
                        {docItem.downloadUrl && docItem.downloadUrl !== "#" && (
                          <a
                            href={docItem.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-slate-400 hover:text-emerald-500 rounded"
                            title="Download / View"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(docItem.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded"
                          title="Remove document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>

        {/* Modal Bottom Action Bar */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {activeSection === "vendor" && "Step 1 of 4: Vendor Information"}
            {activeSection === "financials" && "Step 2 of 4: Project & Financials"}
            {activeSection === "defaults" && "Step 3 of 4: Payment Defaults"}
            {activeSection === "documents" && "Step 4 of 4: Company Documents"}
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>

            {activeSection !== "vendor" && (
              <button
                type="button"
                onClick={() => {
                  if (activeSection === "financials") setActiveSection("vendor");
                  if (activeSection === "defaults") setActiveSection("financials");
                  if (activeSection === "documents") setActiveSection("defaults");
                }}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition"
              >
                Back
              </button>
            )}

            {activeSection !== "documents" ? (
              <button
                type="button"
                onClick={() => {
                  if (activeSection === "vendor") setActiveSection("financials");
                  else if (activeSection === "financials") setActiveSection("defaults");
                  else if (activeSection === "defaults") setActiveSection("documents");
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition"
              >
                Next Step
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-500/30 transition flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{existingRecord ? "Save Changes" : "Create Project"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
