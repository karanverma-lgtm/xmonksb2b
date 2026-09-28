"use client";

import React, { useState } from "react";
import {
  X,
  Building2,
  User,
  CreditCard,
  AlertTriangle,
  FileText,
  DollarSign,
  Calendar,
  Clock,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle2,
  Download,
  UploadCloud,
  Loader2,
  FileCheck,
  ShieldCheck,
  Globe,
  Receipt,
  Edit,
} from "lucide-react";
import {
  BillingRecord,
  BillingPayment,
  BillingPaymentDefault,
  BillingDocument,
} from "@/types/billing";
import { formatINR } from "@/lib/formatters";
import { uploadBillingFile } from "@/lib/billingService";

interface BillingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: BillingRecord | null;
  onEdit: (record: BillingRecord) => void;
  onOpenRecordPayment: (record: BillingRecord) => void;
  onOpenLogDefault: (record: BillingRecord) => void;
  onResolveDefault: (recordId: string, defaultId: string, notes?: string) => void;
  onAddDocument: (recordId: string, document: BillingDocument) => void;
  onRemoveDocument: (recordId: string, documentId: string) => void;
  currentUser?: { name?: string; username?: string } | null;
}

export const BillingDetailModal: React.FC<BillingDetailModalProps> = ({
  isOpen,
  onClose,
  record,
  onEdit,
  onOpenRecordPayment,
  onOpenLogDefault,
  onResolveDefault,
  onAddDocument,
  onRemoveDocument,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "payments" | "defaults" | "documents">("overview");
  const [isUploadingDoc, setIsUploadingDoc] = useState<boolean>(false);
  const [resolvingDefaultId, setResolvingDefaultId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>("");

  if (!isOpen || !record) return null;

  const v = record.vendor || {};
  const percentCollected = record.projectAmount > 0
    ? Math.min(100, Math.round(((record.amountReceived || 0) / record.projectAmount) * 100))
    : 0;

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingDoc(true);

    for (let i = 0; i < files.length; i++) {
      try {
        const uploaded = await uploadBillingFile(files[i], "document", currentUser?.name || "Admin");
        onAddDocument(record.id, uploaded);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Failed to upload document.");
      }
    }
    setIsUploadingDoc(false);
  };

  const handleConfirmResolve = (defaultId: string) => {
    onResolveDefault(record.id, defaultId, resolutionNotes.trim() || undefined);
    setResolvingDefaultId(null);
    setResolutionNotes("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header Card */}
        <div className="p-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white border-b border-emerald-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              {/* Company Logo or Initials */}
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                {v.companyLogoUrl ? (
                  <img
                    src={v.companyLogoUrl}
                    alt={v.companyName}
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <Building2 className="w-7 h-7 text-emerald-400" />
                )}
              </div>

              <div>
                <div className="flex items-center space-x-2.5">
                  <h2 className="text-xl font-black tracking-tight">{v.companyName}</h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      record.status === "completed"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : record.status === "defaulted"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : record.status === "on_hold"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    }`}
                  >
                    {record.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-semibold mt-0.5">
                  {record.projectName}
                </p>
                {record.contractNumber && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    Ref: {record.contractNumber}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onEdit(record)}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Project</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10 text-center">
            <div className="p-2 rounded-xl bg-white/5">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Contract Value</span>
              <span className="text-sm font-black font-mono text-white">
                {formatINR(record.projectAmount)}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-emerald-500/10">
              <span className="text-[10px] text-emerald-400 uppercase font-bold block">Received Till Now</span>
              <span className="text-sm font-black font-mono text-emerald-400">
                {formatINR(record.amountReceived)}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-indigo-500/10">
              <span className="text-[10px] text-indigo-300 uppercase font-bold block">Pending Balance</span>
              <span className="text-sm font-black font-mono text-indigo-300">
                {formatINR(record.pendingAmount)}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-white/5">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Tenure / Duration</span>
              <span className="text-sm font-black font-mono text-white">
                {record.tenureMonths} Months
              </span>
            </div>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center space-x-1 p-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition ${
              activeTab === "overview"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Overview & Vendor</span>
          </button>

          <button
            onClick={() => setActiveTab("payments")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition ${
              activeTab === "payments"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payment History ({record.paymentHistory?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("defaults")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition ${
              activeTab === "defaults"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Defaults & Risk</span>
            {record.hasDefaults && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500 text-white font-black">
                {record.defaultCount || 1}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("documents")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition ${
              activeTab === "documents"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Company Documents ({record.documents?.length || 0})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW & VENDOR */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Financial Progress Bar */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300">
                    Collection Progress ({percentCollected}% Collected)
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatINR(record.amountReceived)} / {formatINR(record.projectAmount)}
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 transition-all duration-500"
                    style={{ width: `${percentCollected}%` }}
                  />
                </div>
              </div>

              {/* Vendor & Contact Information Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <User className="w-4 h-4 text-emerald-500" />
                  <span>Vendor & Contact Information</span>
                </h3>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-full border-2 border-emerald-500/30 overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                      {v.profilePictureUrl ? (
                        <img
                          src={v.profilePictureUrl}
                          alt={v.contactPerson}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        {v.contactPerson}
                      </h4>
                      {v.designation && (
                        <p className="text-xs text-slate-500">{v.designation}</p>
                      )}
                      <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        {v.companyName}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs font-mono">
                    <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-emerald-500" />
                      <a href={`tel:${v.contactPersonPhone}`} className="hover:underline">
                        {v.contactPersonPhone}
                      </a>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
                      <Mail className="w-3.5 h-3.5 text-emerald-500" />
                      <a href={`mailto:${v.contactPersonEmail}`} className="hover:underline">
                        {v.contactPersonEmail}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Company Address and Legal identifiers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>Company Address</span>
                    </span>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                      {v.companyAddress || "No address provided"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Tax & Compliance Identifiers
                    </span>
                    <div className="space-y-1 font-mono text-[11px]">
                      <div>
                        <span className="text-slate-400">GSTIN: </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {v.gstin || "Not provided"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">PAN: </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {v.pan || "Not provided"}
                        </span>
                      </div>
                      {v.website && (
                        <div className="flex items-center space-x-1">
                          <Globe className="w-3 h-3 text-slate-400" />
                          <a
                            href={v.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                          >
                            {v.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tenure & Timeline Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  <span>Tenure & Billing Schedule</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Start Date</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {record.startDate || "N/A"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">End Date</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {record.endDate || "N/A"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Billing Frequency</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                      {record.billingFrequency}
                    </span>
                  </div>
                </div>

                {record.notes && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Internal Notes</span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{record.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PAYMENT HISTORY */}
          {activeTab === "payments" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Received Payments Ledger
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Total amount collected: {formatINR(record.amountReceived)}
                  </p>
                </div>

                <button
                  onClick={() => onOpenRecordPayment(record)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Payment</span>
                </button>
              </div>

              {!record.paymentHistory || record.paymentHistory.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                  <CreditCard className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    No payment transactions recorded yet.
                  </p>
                  <button
                    onClick={() => onOpenRecordPayment(record)}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    + Record First Payment
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px]">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Method</th>
                        <th className="p-3">Reference / UTR</th>
                        <th className="p-3">Remarks</th>
                        <th className="p-3">Recorded By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {record.paymentHistory.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="p-3 font-mono text-slate-800 dark:text-slate-200 font-semibold">
                            {pay.date}
                          </td>
                          <td className="p-3 font-mono font-black text-emerald-600 dark:text-emerald-400">
                            {formatINR(pay.amount)}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {pay.paymentMethod.replace("_", " ")}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-500">
                            {pay.referenceNumber || "-"}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">
                            {pay.notes || "-"}
                          </td>
                          <td className="p-3 text-slate-400 text-[11px]">
                            {pay.recordedBy || "Admin"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PAYMENT DEFAULTS & RISK */}
          {activeTab === "defaults" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Payment Defaults & Overdue Log
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Total flagged default amount: {formatINR(record.defaultedAmount || 0)}
                  </p>
                </div>

                <button
                  onClick={() => onOpenLogDefault(record)}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center space-x-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Flag Default</span>
                </button>
              </div>

              {!record.defaultsHistory || record.defaultsHistory.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-emerald-500/20 bg-emerald-500/5 rounded-2xl space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    Clean Payment History - No Defaults Recorded
                  </p>
                  <p className="text-[11px] text-slate-400">
                    This account is in healthy financial standing with 0 overdue defaults.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {record.defaultsHistory.map((defItem) => (
                    <div
                      key={defItem.id}
                      className={`p-4 rounded-2xl border transition ${
                        defItem.status === "resolved"
                          ? "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                          : "bg-rose-50/50 dark:bg-rose-950/20 border-rose-500/30"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
                        <div className="flex items-center space-x-2.5">
                          <div className={`p-2 rounded-xl ${
                            defItem.status === "resolved"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-rose-500/20 text-rose-500"
                          }`}>
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                              Overdue: {formatINR(defItem.expectedAmount)}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              Due Date: {defItem.dueDate} ({defItem.daysOverdue} days overdue)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            defItem.status === "resolved"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          }`}>
                            {defItem.status.replace("_", " ")}
                          </span>

                          {defItem.status !== "resolved" && (
                            <button
                              onClick={() => setResolvingDefaultId(defItem.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                            >
                              Mark Resolved
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 text-xs space-y-1.5">
                        <p className="text-slate-700 dark:text-slate-300">
                          <span className="font-bold text-slate-500">Reason: </span>
                          {defItem.reason}
                        </p>
                        {defItem.resolutionNotes && (
                          <p className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg">
                            <span className="font-bold">Resolution Notes: </span>
                            {defItem.resolutionNotes} (Resolved on {defItem.resolvedDate})
                          </p>
                        )}
                      </div>

                      {/* Inline Resolution Box */}
                      {resolvingDefaultId === defItem.id && (
                        <div className="mt-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-500/40 space-y-2 animate-fadeIn">
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            Resolution Notes (e.g. Payment cleared via NEFT / settled)
                          </label>
                          <input
                            type="text"
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            placeholder="Enter settlement details..."
                            className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                          />
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => setResolvingDefaultId(null)}
                              className="px-3 py-1 text-xs font-bold text-slate-400 hover:text-slate-600"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleConfirmResolve(defItem.id)}
                              className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                            >
                              Confirm Resolution
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: COMPANY DOCUMENTS */}
          {activeTab === "documents" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Company & Contract Documents
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Master service agreements, NDAs, GST certificates, invoices, and purchase orders.
                  </p>
                </div>

                <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition">
                  {isUploadingDoc ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload Document</span>
                    </>
                  )}
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg"
                    className="hidden"
                    onChange={handleDocumentUpload}
                    disabled={isUploadingDoc}
                  />
                </label>
              </div>

              {!record.documents || record.documents.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    No documents uploaded yet.
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Attach contracts, NDAs, or GST certificates for compliance and billing audit.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {record.documents.map((docItem) => (
                    <div
                      key={docItem.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between hover:border-emerald-400 transition"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate" title={docItem.name}>
                            {docItem.name}
                          </h5>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {docItem.fileSize} • Category: {docItem.category.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0 ml-2">
                        {docItem.downloadUrl && docItem.downloadUrl !== "#" && (
                          <a
                            href={docItem.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                            title="Download / View"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(`Remove "${docItem.name}"?`)) {
                              onRemoveDocument(record.id, docItem.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 font-mono">
            Created by {record.createdBy || "Admin"} • {record.createdAt}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onOpenRecordPayment(record)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
