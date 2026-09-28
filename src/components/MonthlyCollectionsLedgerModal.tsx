"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Calendar,
  DollarSign,
  Receipt,
  TrendingUp,
  Building2,
  Download,
  CreditCard,
  Search,
  Filter,
  ArrowUpRight,
  CheckCircle2,
  Layers,
  ArrowUpDown,
} from "lucide-react";
import { BillingRecord, BillingPayment } from "@/types/billing";
import { formatINR } from "@/lib/formatters";

interface MonthlyCollectionsLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: BillingRecord[];
  onSelectMonthFilter?: (monthKey: string) => void;
}

export const MonthlyCollectionsLedgerModal: React.FC<MonthlyCollectionsLedgerModalProps> = ({
  isOpen,
  onClose,
  records,
  onSelectMonthFilter,
}) => {
  const [activeTab, setActiveTab] = useState<"monthly_summary" | "all_transactions">("monthly_summary");
  const [txSearchTerm, setTxSearchTerm] = useState<string>("");
  const [txMethodFilter, setTxMethodFilter] = useState<string>("all");
  const [txMonthFilter, setTxMonthFilter] = useState<string>("all");

  // Flatten all transactions with client details
  const allTransactions = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      amount: number;
      paymentMethod: string;
      referenceNumber?: string;
      notes?: string;
      recordedBy?: string;
      companyName: string;
      projectName: string;
      companyLogoUrl?: string;
      recordId: string;
    }> = [];

    records.forEach((r) => {
      (r.paymentHistory || []).forEach((p) => {
        list.push({
          id: p.id,
          date: p.date,
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          referenceNumber: p.referenceNumber,
          notes: p.notes,
          recordedBy: p.recordedBy,
          companyName: r.vendor?.companyName || "Unknown Company",
          projectName: r.projectName,
          companyLogoUrl: r.vendor?.companyLogoUrl,
          recordId: r.id,
        });
      });
    });

    // Sort descending by transaction date
    return list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [records]);

  // Aggregate by Month (YYYY-MM)
  const monthlyStats = useMemo(() => {
    const map = new Map<
      string,
      {
        monthKey: string;
        monthLabel: string;
        totalAmount: number;
        transactionCount: number;
        clientSet: Set<string>;
        topClients: Map<string, number>;
        methods: Record<string, number>;
      }
    >();

    allTransactions.forEach((tx) => {
      const monthKey = tx.date ? tx.date.slice(0, 7) : "Unknown";
      if (!map.has(monthKey)) {
        // Parse friendly label
        let label = monthKey;
        if (monthKey.includes("-")) {
          const [y, m] = monthKey.split("-");
          const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
          label = dateObj.toLocaleString("en-US", { month: "short", year: "numeric" });
        }

        map.set(monthKey, {
          monthKey,
          monthLabel: label,
          totalAmount: 0,
          transactionCount: 0,
          clientSet: new Set(),
          topClients: new Map(),
          methods: {},
        });
      }

      const item = map.get(monthKey)!;
      item.totalAmount += tx.amount || 0;
      item.transactionCount += 1;
      item.clientSet.add(tx.companyName);

      const clientTotal = (item.topClients.get(tx.companyName) || 0) + (tx.amount || 0);
      item.topClients.set(tx.companyName, clientTotal);

      const methodKey = tx.paymentMethod || "other";
      item.methods[methodKey] = (item.methods[methodKey] || 0) + (tx.amount || 0);
    });

    // Sort months descending (e.g. 2026-12 down to 2026-01)
    return Array.from(map.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [allTransactions]);

  // Overall Financial KPIs
  const overallKPIs = useMemo(() => {
    const totalCollected = allTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
    const uniqueClientsCount = new Set(allTransactions.map((t) => t.companyName)).size;
    const avgTicket = allTransactions.length > 0 ? Math.round(totalCollected / allTransactions.length) : 0;
    return {
      totalCollected,
      txCount: allTransactions.length,
      uniqueClientsCount,
      avgTicket,
    };
  }, [allTransactions]);

  // Filtered transactions for tab 2
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      if (txMonthFilter !== "all" && !tx.date?.startsWith(txMonthFilter)) return false;
      if (txMethodFilter !== "all" && tx.paymentMethod !== txMethodFilter) return false;
      if (txSearchTerm.trim()) {
        const q = txSearchTerm.toLowerCase();
        const comp = tx.companyName.toLowerCase();
        const proj = tx.projectName.toLowerCase();
        const ref = (tx.referenceNumber || "").toLowerCase();
        const notes = (tx.notes || "").toLowerCase();
        if (!comp.includes(q) && !proj.includes(q) && !ref.includes(q) && !notes.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [allTransactions, txMonthFilter, txMethodFilter, txSearchTerm]);

  // Export ledger to CSV
  const handleExportCSV = () => {
    if (allTransactions.length === 0) {
      alert("No transaction entries to export.");
      return;
    }

    const headers = [
      "Date",
      "Month",
      "Company Name",
      "Project Name",
      "Amount Received (INR)",
      "Payment Method",
      "Reference / UTR",
      "Remarks / Notes",
      "Recorded By",
    ];

    const escapeCSV = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = allTransactions.map((t) => [
      escapeCSV(t.date),
      escapeCSV(t.date ? t.date.slice(0, 7) : ""),
      escapeCSV(t.companyName),
      escapeCSV(t.projectName),
      t.amount || 0,
      escapeCSV(t.paymentMethod),
      escapeCSV(t.referenceNumber || ""),
      escapeCSV(t.notes || ""),
      escapeCSV(t.recordedBy || ""),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `xMonks_Monthly_Collections_Ledger_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-b border-emerald-500/20 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-400/30 text-emerald-300">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-black tracking-tight">Month-Wise Payment Ledger</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Accounts Department View
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Comprehensive month-by-month cashflow collection statement and individual payment transactions.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
              title="Download full collections statement as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 4 Financial Inflow Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Total Inflow Collected
            </span>
            <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
              {formatINR(overallKPIs.totalCollected)}
            </span>
            <span className="text-[10px] text-slate-400">Lifetime realized revenue</span>
          </div>

          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Transactions Logged
            </span>
            <span className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1 block">
              {overallKPIs.txCount}
            </span>
            <span className="text-[10px] text-slate-400">Total payment receipts</span>
          </div>

          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Contributing Clients
            </span>
            <span className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1 block">
              {overallKPIs.uniqueClientsCount}
            </span>
            <span className="text-[10px] text-slate-400">Unique paying accounts</span>
          </div>

          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Average Ticket Size
            </span>
            <span className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1 block">
              {formatINR(overallKPIs.avgTicket)}
            </span>
            <span className="text-[10px] text-slate-400">Per payment tranche</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-4 bg-white dark:bg-slate-900">
          <button
            onClick={() => setActiveTab("monthly_summary")}
            className={`pb-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 ${
              activeTab === "monthly_summary"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-black"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Monthly Cashflow Summary ({monthlyStats.length} Months)</span>
          </button>

          <button
            onClick={() => setActiveTab("all_transactions")}
            className={`pb-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 ${
              activeTab === "all_transactions"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-black"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>All Payment Transactions ({allTransactions.length})</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === "monthly_summary" ? (
            /* TAB 1: MONTHLY CASHFLOW BREAKDOWN */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Month-by-month cashflow aggregated across all client projects</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {monthlyStats.length} Billing Periods
                </span>
              </div>

              {monthlyStats.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                  <Receipt className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    No payment collections recorded yet.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="p-3.5">Month / Period</th>
                        <th className="p-3.5 text-right">Cash Received</th>
                        <th className="p-3.5 text-center">Share of Total</th>
                        <th className="p-3.5 text-center">Transactions</th>
                        <th className="p-3.5">Paying Clients</th>
                        <th className="p-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {monthlyStats.map((item) => {
                        const percentOfTotal = overallKPIs.totalCollected > 0
                          ? Math.round((item.totalAmount / overallKPIs.totalCollected) * 100)
                          : 0;

                        // Top 2 clients
                        const topClientsArray = Array.from(item.topClients.entries())
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 2);

                        return (
                          <tr
                            key={item.monthKey}
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition group"
                          >
                            <td className="p-3.5">
                              <div className="flex items-center space-x-2">
                                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                  <Calendar className="w-4 h-4" />
                                </div>
                                <div>
                                  <span className="font-extrabold text-slate-900 dark:text-white block text-sm">
                                    {item.monthLabel}
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-400">
                                    {item.monthKey}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="p-3.5 text-right">
                              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm block">
                                {formatINR(item.totalAmount)}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Across {item.clientSet.size} client{item.clientSet.size === 1 ? "" : "s"}
                              </span>
                            </td>

                            <td className="p-3.5 text-center">
                              <div className="inline-flex flex-col items-center">
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                  {percentOfTotal}%
                                </span>
                                <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full"
                                    style={{ width: `${percentOfTotal}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            <td className="p-3.5 text-center">
                              <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-[11px]">
                                {item.transactionCount} payment{item.transactionCount === 1 ? "" : "s"}
                              </span>
                            </td>

                            <td className="p-3.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {topClientsArray.map(([clientName, amt]) => (
                                  <span
                                    key={clientName}
                                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 max-w-[150px] truncate"
                                    title={`${clientName}: ${formatINR(amt)}`}
                                  >
                                    <span className="truncate">{clientName}</span>
                                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                                      ({formatINR(amt)})
                                    </span>
                                  </span>
                                ))}
                                {item.clientSet.size > 2 && (
                                  <span className="text-[10px] text-slate-400 font-bold">
                                    +{item.clientSet.size - 2} more
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => {
                                  onSelectMonthFilter?.(item.monthKey);
                                  onClose();
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white dark:bg-slate-800 dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center space-x-1 ml-auto"
                                title={`Filter billing projects for ${item.monthLabel}`}
                              >
                                <span>Filter This Month</span>
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: DETAILED TRANSACTIONS STREAM */
            <div className="space-y-4">
              {/* Filter controls inside Tab 2 */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={txSearchTerm}
                    onChange={(e) => setTxSearchTerm(e.target.value)}
                    placeholder="Search client, project, or reference number..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    value={txMonthFilter}
                    onChange={(e) => setTxMonthFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    <option value="all">All Months</option>
                    {monthlyStats.map((m) => (
                      <option key={m.monthKey} value={m.monthKey}>
                        {m.monthLabel} ({formatINR(m.totalAmount)})
                      </option>
                    ))}
                  </select>

                  <select
                    value={txMethodFilter}
                    onChange={(e) => setTxMethodFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    <option value="all">All Methods</option>
                    <option value="neft_rtgs">NEFT / RTGS</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                  </select>
                </div>
              </div>

              {filteredTransactions.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                  <CreditCard className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    No transactions match your search or filter criteria.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Payment Date</th>
                        <th className="p-3">Client & Project</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3">Method</th>
                        <th className="p-3">Reference / UTR</th>
                        <th className="p-3">Remarks</th>
                        <th className="p-3">Recorded By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredTransactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                        >
                          <td className="p-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {tx.date}
                          </td>

                          <td className="p-3">
                            <span className="font-bold text-slate-900 dark:text-white block truncate max-w-[200px]">
                              {tx.companyName}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate max-w-[200px]">
                              {tx.projectName}
                            </span>
                          </td>

                          <td className="p-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            {formatINR(tx.amount)}
                          </td>

                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {tx.paymentMethod.replace("_", " ")}
                            </span>
                          </td>

                          <td className="p-3 font-mono text-[11px] text-slate-500">
                            {tx.referenceNumber || "-"}
                          </td>

                          <td className="p-3 text-slate-600 dark:text-slate-400 max-w-[180px] truncate" title={tx.notes}>
                            {tx.notes || "-"}
                          </td>

                          <td className="p-3 text-slate-400 text-[11px]">
                            {tx.recordedBy || "Admin"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Total realized cash inflow:{" "}
            <strong className="text-slate-700 dark:text-slate-200 font-mono">
              {formatINR(overallKPIs.totalCollected)}
            </strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition"
          >
            Close Ledger
          </button>
        </div>
      </div>
    </div>
  );
};
