"use client";

import React, { useState } from "react";
import {
  X,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { BillingRecord, BillingPaymentDefault } from "@/types/billing";
import { formatINR } from "@/lib/formatters";

interface LogDefaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: BillingRecord | null;
  onSaveDefault: (
    recordId: string,
    defaultItem: Omit<BillingPaymentDefault, "id" | "createdAt">
  ) => void;
  flaggedBy?: string;
}

export const LogDefaultModal: React.FC<LogDefaultModalProps> = ({
  isOpen,
  onClose,
  record,
  onSaveDefault,
  flaggedBy = "Finance Admin",
}) => {
  const [expectedAmount, setExpectedAmount] = useState<number | string>("");
  const [dueDate, setDueDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [daysOverdue, setDaysOverdue] = useState<number>(30);
  const [reason, setReason] = useState<string>("");
  const [status, setStatus] = useState<BillingPaymentDefault["status"]>("pending_resolution");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !record) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(expectedAmount);
    if (!amt || amt <= 0) {
      setError("Please specify the overdue defaulted amount.");
      return;
    }
    if (!reason.trim()) {
      setError("Please describe the reason for default.");
      return;
    }

    onSaveDefault(record.id, {
      expectedAmount: amt,
      dueDate,
      daysOverdue: Number(daysOverdue) || 0,
      reason: reason.trim(),
      status,
      flaggedBy,
    });

    setExpectedAmount("");
    setReason("");
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-rose-900 via-rose-800 to-amber-900 text-white flex items-center justify-between border-b border-rose-500/20">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-rose-500/20 rounded-xl border border-rose-400/30 text-rose-300">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-tight">Flag Payment Default</h3>
              <p className="text-[11px] text-rose-200/80 truncate max-w-xs">
                {record.vendor.companyName} • {record.projectName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border-b border-rose-100 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300 flex items-center space-x-2">
          <Clock className="w-4 h-4 shrink-0 text-rose-500" />
          <span>
            Logging a default will update this project's status to <strong>Defaulted</strong> and flag it on the executive dashboard.
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Overdue / Defaulted Amount (INR) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                required
                min={1}
                step={100}
                value={expectedAmount}
                onChange={(e) => setExpectedAmount(e.target.value ? Number(e.target.value) : "")}
                placeholder="e.g. 500000"
                className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-rose-300 dark:border-rose-900/60 rounded-xl text-xs font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
            {expectedAmount ? (
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block mt-1">
                {formatINR(Number(expectedAmount))}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Original Due Date
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Days Overdue
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={daysOverdue}
                onChange={(e) => setDaysOverdue(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Current Default Resolution Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as BillingPaymentDefault["status"])}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              <option value="pending_resolution">Pending Resolution / In Followup</option>
              <option value="legal_notice">Legal Notice Issued</option>
              <option value="resolved">Resolved</option>
              <option value="written_off">Written Off / Bad Debt</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Reason for Default & Followup Details <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Client finance team requested delay until next budget approval cycle. Account manager meeting arranged."
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-500/20 transition flex items-center space-x-1.5"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Flag Default</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
