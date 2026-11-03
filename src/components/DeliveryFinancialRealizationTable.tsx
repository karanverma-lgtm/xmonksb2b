"use client";

import React, { useMemo } from "react";
import { Download, ExternalLink, Calendar } from "lucide-react";
import { DeliveryRecord, TranchePaymentStatus } from "@/types/delivery";
import { Lead } from "@/types/lead";
import { formatINR, getDateComponents } from "@/lib/formatters";
import { downloadCSV } from "@/lib/deliveryAnalytics";
import { UserAccount, canUserExport } from "@/constants/users";

interface DeliveryFinancialRealizationTableProps {
  records: DeliveryRecord[];
  allLeads?: Lead[];
  onSelectRecord?: (recordId: string) => void;
  title?: string;
  showExportButton?: boolean;
  activeRecordId?: string | null;
  selectedMonthFilter?: string;
  currentUser?: UserAccount | null;
}

interface TargetMonthInfo {
  offset: number; // 0, 1, 2
  year: number;
  monthIndex: number; // 0-11
  monthNum: number; // 1-12
  shortLabel: string; // e.g. "OCT"
  monthYearLabel: string; // e.g. "Oct 2026"
  colHeader: string; // e.g. "OCT INVOICED"
}

export const DeliveryFinancialRealizationTable: React.FC<
  DeliveryFinancialRealizationTableProps
> = ({
  records,
  allLeads = [],
  onSelectRecord,
  title = "DELIVERY ACCOUNTS & INVOICING TABLE",
  showExportButton = true,
  activeRecordId,
  selectedMonthFilter,
  currentUser,
}) => {
  // Determine the 3 target months: Month 0 (Current / Chosen month), Month 1 (+1 month), Month 2 (+2 months)
  const targetMonths: TargetMonthInfo[] = useMemo(() => {
    let baseYear = 2026;
    let baseMonthIndex = 9; // October (0-indexed)

    if (selectedMonthFilter && selectedMonthFilter.toLowerCase() !== "all") {
      const s = selectedMonthFilter.trim().toLowerCase();
      const MONTH_NAMES = [
        "january", "february", "march", "april", "may", "june",
        "july", "august", "september", "october", "november", "december"
      ];
      const MONTH_SHORT = [
        "jan", "feb", "mar", "apr", "may", "jun",
        "jul", "aug", "sep", "oct", "nov", "dec"
      ];

      let found = false;
      for (let i = 0; i < 12; i++) {
        if (s.includes(MONTH_NAMES[i]) || s.includes(MONTH_SHORT[i])) {
          const yearMatch = s.match(/\b(20\d\d)\b/);
          baseYear = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
          baseMonthIndex = i;
          found = true;
          break;
        }
      }

      if (!found) {
        const isoMatch = s.match(/^(20\d\d)-(\d{1,2})/);
        if (isoMatch) {
          baseYear = parseInt(isoMatch[1], 10);
          baseMonthIndex = parseInt(isoMatch[2], 10) - 1;
        }
      }
    } else {
      const now = new Date();
      baseYear = now.getFullYear();
      baseMonthIndex = now.getMonth();
    }

    const months: TargetMonthInfo[] = [];
    for (let offset = 0; offset < 3; offset++) {
      const d = new Date(baseYear, baseMonthIndex + offset, 1);
      const y = d.getFullYear();
      const mIdx = d.getMonth();
      const shortLabel = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
      const monthYearLabel = `${d.toLocaleString("en-US", { month: "short" })} ${y}`;
      const colHeader = `${shortLabel} INVOICED`;

      months.push({
        offset,
        year: y,
        monthIndex: mIdx,
        monthNum: mIdx + 1,
        shortLabel,
        monthYearLabel,
        colHeader,
      });
    }

    return months;
  }, [selectedMonthFilter]);

  // Helper for computing single record financial values across Project Cost & 3 Invoicing Months
  const getRecordFinancialBreakdown = (record: DeliveryRecord) => {
    const dealVal = record.dealValue || 0;
    let totalInv = 0;
    let m0Inv = 0;
    let m1Inv = 0;
    let m2Inv = 0;

    interface ExtractedTranche {
      amount: number;
      paymentStatus: TranchePaymentStatus;
      dateStr?: string;
      invoiceNumber?: string;
      isAdvance?: boolean;
    }

    const tranches: ExtractedTranche[] = [];

    if (record.tenureType === "payment_terms" || record.tenureType === "contract") {
      (record.paymentTerms || []).forEach((t) => {
        tranches.push({
          amount: t.amount || 0,
          paymentStatus: t.paymentStatus,
          dateStr: t.invoiceDate || t.paymentReceivedDate || t.dueDate,
          invoiceNumber: t.invoiceNumber,
          isAdvance: t.isAdvance,
        });
      });
    }

    if (record.tenureType === "delivery" || record.tenureType === "contract") {
      (record.deliveryMilestones || []).forEach((m) => {
        tranches.push({
          amount: m.amount || 0,
          paymentStatus: m.paymentStatus,
          dateStr: m.invoiceDate || m.paymentReceivedDate || m.targetDate || m.completionDate,
          invoiceNumber: m.invoiceNumber,
          isAdvance: false,
        });
      });
    }

    // 1. Calculate Total Invoiced across all time
    tranches.forEach((t) => {
      if (t.paymentStatus === "received" || t.paymentStatus === "invoiced" || Boolean(t.invoiceNumber)) {
        totalInv += t.amount;
      }
    });

    // 2. Distribute tranches into Month 0 (Current / Chosen), Month 1 (+1 month), Month 2 (+2 months)
    tranches.forEach((t, idx) => {
      let tYear: number | null = null;
      let tMonthIndex: number | null = null;

      if (t.dateStr) {
        const comps = getDateComponents(t.dateStr);
        if (comps.isValid) {
          tYear = comps.year;
          tMonthIndex = comps.monthNum - 1;
        }
      }

      // Fallback if no explicit date on tranche
      if (tYear === null || tMonthIndex === null) {
        if (t.isAdvance || idx === 0) {
          const comps = getDateComponents(record.startDate || record.createdAt);
          if (comps.isValid) {
            tYear = comps.year;
            tMonthIndex = comps.monthNum - 1;
          }
        } else if (idx === tranches.length - 1 && record.targetCompletionDate) {
          const comps = getDateComponents(record.targetCompletionDate);
          if (comps.isValid) {
            tYear = comps.year;
            tMonthIndex = comps.monthNum - 1;
          }
        } else if (record.startDate) {
          const comps = getDateComponents(record.startDate);
          if (comps.isValid) {
            const offset = Math.min(idx, 2);
            const interp = new Date(comps.year, comps.monthNum - 1 + offset, 1);
            tYear = interp.getFullYear();
            tMonthIndex = interp.getMonth();
          }
        }
      }

      // Match against Month 0 (e.g. October 2026)
      if (tYear === targetMonths[0].year && tMonthIndex === targetMonths[0].monthIndex) {
        if (t.paymentStatus === "received" || t.paymentStatus === "invoiced" || Boolean(t.invoiceNumber)) {
          m0Inv += t.amount;
        }
      }

      // Match against Month 1 (e.g. November 2026) - includes scheduled / upcoming invoicing
      if (tYear === targetMonths[1].year && tMonthIndex === targetMonths[1].monthIndex) {
        m1Inv += t.amount;
      }

      // Match against Month 2 (e.g. December 2026) - includes scheduled / upcoming invoicing
      if (tYear === targetMonths[2].year && tMonthIndex === targetMonths[2].monthIndex) {
        m2Inv += t.amount;
      }
    });

    // Safeguard: If a specific month is selected (e.g. Oct 2026) and this record was matched to it,
    // and totalInv > 0 but m0Inv was 0 due to missing tranche date, attribute to m0Inv
    if (selectedMonthFilter && selectedMonthFilter.toLowerCase() !== "all") {
      if (m0Inv === 0 && totalInv > 0) {
        m0Inv = totalInv;
      }
    }

    return {
      dealVal,
      m0Inv,
      m1Inv,
      m2Inv,
      totalInv,
    };
  };

  // Helper to extract lead owner for a delivery record
  const getRecordLeadOwner = (record: DeliveryRecord): string => {
    if (record.clientPartner && record.clientPartner.trim()) {
      return record.clientPartner.trim();
    }
    const matchingLead = allLeads.find(
      (l) =>
        l.id === record.leadId ||
        l.companyName.trim().toLowerCase() === record.companyName.trim().toLowerCase()
    );
    return matchingLead?.owner?.trim() || "Unassigned";
  };

  // Portfolio Scope Totals
  const totals = useMemo(() => {
    let totalDealValue = 0;
    let totalM0Invoiced = 0;
    let totalM1Invoiced = 0;
    let totalM2Invoiced = 0;
    let totalInvoiced = 0;

    records.forEach((r) => {
      const b = getRecordFinancialBreakdown(r);
      totalDealValue += b.dealVal;
      totalM0Invoiced += b.m0Inv;
      totalM1Invoiced += b.m1Inv;
      totalM2Invoiced += b.m2Inv;
      totalInvoiced += b.totalInv;
    });

    return {
      totalDealValue,
      totalM0Invoiced,
      totalM1Invoiced,
      totalM2Invoiced,
      totalInvoiced,
    };
  }, [records, targetMonths]);

  // CSV Exporter
  const handleExportCSV = () => {
    if (!canUserExport(currentUser)) {
      alert("Access Restricted: Only Administrator and Preeti are authorized to export data.");
      return;
    }
    const headers = [
      "Company Name",
      "Program",
      "Lead Owner",
      "Delivery Lead",
      "Start Date",
      "Target Date",
      "Delivery Status",
      "Completion (%)",
      "Project Cost (INR)",
      `${targetMonths[0].monthYearLabel} Invoiced (INR)`,
      `${targetMonths[1].monthYearLabel} Invoiced (INR)`,
      `${targetMonths[2].monthYearLabel} Invoiced (INR)`,
      "Total Invoiced (INR)",
    ];

    const rows = records.map((record) => {
      const b = getRecordFinancialBreakdown(record);
      const ownerName = getRecordLeadOwner(record);

      return [
        `"${record.companyName.replace(/"/g, '""')}"`,
        `"${(record.program || "Executive Coaching").replace(/"/g, '""')}"`,
        `"${ownerName.replace(/"/g, '""')}"`,
        `"${(record.deliveryLead || "Delivery Lead").replace(/"/g, '""')}"`,
        `"${record.startDate || ""}"`,
        `"${record.targetCompletionDate || ""}"`,
        `"${record.deliveryStatus}"`,
        record.overallCompletionPercent || 0,
        b.dealVal,
        b.m0Inv,
        b.m1Inv,
        b.m2Inv,
        b.totalInv,
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const dateStr = new Date().toISOString().split("T")[0];
    downloadCSV(`xmonks-delivery-financial-table-${dateStr}.csv`, csvContent);
  };

  if (records.length === 0) {
    return (
      <div className="py-12 text-center p-6 rounded-3xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-2xl">
          📋
        </div>
        <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
          No Delivery Accounts in Selection
        </h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          No active delivery contracts match your selected filters. Adjust your owner, month, or tenure filters to view data.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-850 border-2 border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
      {/* Table Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 gap-2">
        <div className="flex items-center space-x-2 flex-wrap">
          <span className="text-base">📋</span>
          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
            {title}
          </h4>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            {records.length} Accounts
          </span>
        </div>

        {showExportButton && canUserExport(currentUser) && (
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs cursor-pointer self-end sm:self-auto"
            title="Export Table as CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        )}
      </div>

      {/* Scrollable Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-500 dark:text-slate-400">
              <th className="py-3 px-4">Client Account & Program</th>
              <th className="py-3 px-3">Lead Owner</th>
              <th className="py-3 px-3">Project Tenure</th>
              <th className="py-3 px-3">Status & Progress</th>
              <th className="py-3 px-3 text-right text-slate-900 dark:text-white whitespace-nowrap">
                Project Cost
              </th>
              <th className="py-3 px-3 text-right text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                <div>{targetMonths[0].shortLabel} Invoiced</div>
                <div className="text-[9px] font-bold text-slate-400 tracking-normal normal-case">
                  {targetMonths[0].monthYearLabel}
                </div>
              </th>
              <th className="py-3 px-3 text-right text-cyan-700 dark:text-cyan-400 whitespace-nowrap">
                <div>{targetMonths[1].shortLabel} Invoiced</div>
                <div className="text-[9px] font-bold text-slate-400 tracking-normal normal-case">
                  {targetMonths[1].monthYearLabel}
                </div>
              </th>
              <th className="py-3 px-3 text-right text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
                <div>{targetMonths[2].shortLabel} Invoiced</div>
                <div className="text-[9px] font-bold text-slate-400 tracking-normal normal-case">
                  {targetMonths[2].monthYearLabel}
                </div>
              </th>
              <th className="py-3 px-3 text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">
                Total Invoiced
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {records.map((record) => {
              const b = getRecordFinancialBreakdown(record);
              const ownerName = getRecordLeadOwner(record);
              const isSelected = activeRecordId === record.id;

              return (
                <tr
                  key={record.id}
                  onClick={() => onSelectRecord?.(record.id)}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer select-none ${
                    isSelected ? "bg-indigo-50/70 dark:bg-indigo-950/40" : ""
                  }`}
                  title={onSelectRecord ? "Click to view and manage delivery project" : undefined}
                >
                  {/* Account & Program */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black flex items-center justify-center text-xs shrink-0 shadow-xs">
                        {record.companyName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-black text-slate-900 dark:text-white text-xs truncate">
                            {record.companyName}
                          </span>
                          {onSelectRecord && (
                            <span className="p-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition inline-block">
                              <ExternalLink className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {record.program || "Executive Coaching"}
                          {record.deliveryLead && record.deliveryLead !== ownerName ? ` • Delivery: ${record.deliveryLead}` : ""}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Lead Owner */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-black text-[10px] flex items-center justify-center shrink-0">
                        {ownerName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">
                          {ownerName}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          Lead Partner
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Project Tenure */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      {record.startDate || "2026-10-01"}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      to {record.targetCompletionDate || "2026-12-31"}
                    </div>
                  </td>

                  {/* Status & Progress */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          record.deliveryStatus === "delivered"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                        }`}
                      >
                        {record.deliveryStatus === "delivered" ? "Delivered" : "In Progress"}
                      </span>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        {record.overallCompletionPercent || 0}%
                      </span>
                    </div>
                    <div className="w-20 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, record.overallCompletionPercent || 0)}%`,
                        }}
                      />
                    </div>
                  </td>

                  {/* Project Cost (formerly Delivery Book) */}
                  <td className="py-3.5 px-3 text-right font-black text-slate-900 dark:text-white text-xs whitespace-nowrap">
                    {formatINR(b.dealVal)}
                  </td>

                  {/* Month 0 Invoiced */}
                  <td className="py-3.5 px-3 text-right font-bold text-emerald-700 dark:text-emerald-400 text-xs whitespace-nowrap">
                    {formatINR(b.m0Inv)}
                  </td>

                  {/* Month 1 Invoiced */}
                  <td className="py-3.5 px-3 text-right font-bold text-cyan-700 dark:text-cyan-400 text-xs whitespace-nowrap">
                    {formatINR(b.m1Inv)}
                  </td>

                  {/* Month 2 Invoiced */}
                  <td className="py-3.5 px-3 text-right font-bold text-indigo-700 dark:text-indigo-400 text-xs whitespace-nowrap">
                    {formatINR(b.m2Inv)}
                  </td>

                  {/* Total Invoiced */}
                  <td className="py-3.5 px-3 text-right font-black text-slate-800 dark:text-slate-200 text-xs whitespace-nowrap">
                    {formatINR(b.totalInv)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100/90 dark:bg-slate-900/90 font-black text-xs border-t-2 border-slate-300 dark:border-slate-700">
              <td
                className="py-3.5 px-4 uppercase text-slate-600 dark:text-slate-300"
                colSpan={4}
              >
                Total Portfolio Scope ({records.length} Accounts)
              </td>
              <td className="py-3.5 px-3 text-right text-slate-900 dark:text-white">
                {formatINR(totals.totalDealValue)}
              </td>
              <td className="py-3.5 px-3 text-right text-emerald-700 dark:text-emerald-400">
                {formatINR(totals.totalM0Invoiced)}
              </td>
              <td className="py-3.5 px-3 text-right text-cyan-700 dark:text-cyan-400">
                {formatINR(totals.totalM1Invoiced)}
              </td>
              <td className="py-3.5 px-3 text-right text-indigo-700 dark:text-indigo-400">
                {formatINR(totals.totalM2Invoiced)}
              </td>
              <td className="py-3.5 px-3 text-right text-slate-800 dark:text-slate-200">
                {formatINR(totals.totalInvoiced)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
