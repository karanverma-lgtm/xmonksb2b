"use client";

import React, { useState } from "react";
import {
  X,
  CreditCard,
  DollarSign,
  Calendar,
  CheckCircle2,
  Building2,
  FileCheck,
} from "lucide-react";
import { BillingRecord, BillingPayment } from "@/types/billing";
import { formatINR } from "@/lib/formatters";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: BillingRecord | null;
  onSavePayment: (
    recordId: string,
    payment: Omit<BillingPayment, "id" | "createdAt">
  ) => void;
  recordedBy?: string;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  record,
  onSavePayment,
  recordedBy = "Finance Admin",
}) => {
  const [amount, setAmount] = useState<number | string>("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<BillingPayment["paymentMethod"]>("bank_transfer");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isAdvance, setIsAdvance] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !record) return null;

  const pendingBalance = Math.max(0, record.projectAmount - record.amountReceived);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Please enter a valid payment amount.");
      return;
    }

    onSavePayment(record.id, {
      amount: numAmount,
      date,
      paymentMethod,
      referenceNumber: referenceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      recordedBy,
      isAdvance,
    });

    // Reset and close
    setAmount("");
    setReferenceNumber("");
    setNotes("");
    setIsAdvance(false);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between border-b border-emerald-500/20">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-400/30 text-emerald-300">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-tight">Record Received Payment</h3>
              <p className="text-[11px] text-emerald-200/80 truncate max-w-xs">
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

        {/* Financial Context Pill */}
        <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Amount</span>
            <span className="font-extrabold text-slate-800 dark:text-slate-200 font-mono">
              {formatINR(record.projectAmount)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Received</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {formatINR(record.amountReceived)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Pending</span>
            <span className="font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
              {formatINR(pendingBalance)}
            </span>
          </div>
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
              Payment Amount (INR) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                required
                min={0}
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
                placeholder={`e.g. ${pendingBalance || 100000}`}
                className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            {amount ? (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1">
                {formatINR(Number(amount))}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as BillingPayment["paymentMethod"])}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="bank_transfer">Bank Transfer (IMPS)</option>
                <option value="neft_rtgs">NEFT / RTGS</option>
                <option value="cheque">Cheque Deposit</option>
                <option value="upi">UPI Transfer</option>
                <option value="card">Corporate Card</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              UTR / Reference / Cheque Number
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. HDFC0091823719"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Payment Remarks / Milestone Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Q2 milestone installment 2 of 4"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Advance Payment Checkbox */}
          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
            <div>
              <label htmlFor="isAdvanceCheckbox" className="text-xs font-bold text-slate-800 dark:text-slate-200 block cursor-pointer">
                Tag as Advance Payment Received
              </label>
              <span className="text-[10px] text-slate-400 block">
                Flag this transaction as initial upfront advance / mobilization fee.
              </span>
            </div>
            <input
              id="isAdvanceCheckbox"
              type="checkbox"
              checked={isAdvance}
              onChange={(e) => setIsAdvance(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700 cursor-pointer"
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Record</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
