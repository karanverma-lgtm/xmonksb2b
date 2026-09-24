"use client";

import React from "react";
import { Lead } from "@/types/lead";
import { STAGES } from "@/constants/stages";
import { formatINR } from "@/lib/formatters";
import { X, Printer, Download, Sparkles, Building2, Trophy, Target, ShieldCheck } from "lucide-react";
import { exportAnalyticsToCSV } from "./exportAnalyticsReport";

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  totalPipelineValue: number;
  totalWeightedValue: number;
  winRate: number;
  avgDealSize: number;
  closingThisMonthValue: number;
  closingThisMonthCount: number;
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({
  isOpen,
  onClose,
  leads,
  totalPipelineValue,
  totalWeightedValue,
  winRate,
  avgDealSize,
  closingThisMonthValue,
  closingThisMonthCount,
}) => {
  if (!isOpen) return null;

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const wonLeads = leads.filter((l) => l.stage === "closure");
  const wonValue = wonLeads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    exportAnalyticsToCSV({
      leads,
      totalPipelineValue,
      totalWeightedValue,
      winRate,
      avgDealSize,
      closingThisMonthValue,
      closingThisMonthCount,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/80">
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
              xMonks B2B
            </span>
            <span className="font-bold text-sm text-slate-900 dark:text-white">
              Executive Pipeline Briefing & Revenue Report
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-500" />
              <span>Print / PDF</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200 print:p-0">
          {/* Document Header */}
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Pipeline Health & Revenue Forecast
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Confidential Management Report • Generated for Sales & Leadership Operations
                </p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div>Date: <strong className="text-slate-800 dark:text-slate-200">{dateStr}</strong></div>
                <div>Accounts: <strong className="text-slate-800 dark:text-slate-200">{leads.length} Active</strong></div>
              </div>
            </div>
          </div>

          {/* Section 1: Executive KPI Strip */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              1. Executive Performance Metrics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 font-medium">Total Pipeline Value</div>
                <div className="font-mono text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {formatINR(totalPipelineValue)}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 font-medium">Weighted Forecast</div>
                <div className="font-mono text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {formatINR(totalWeightedValue)}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 font-medium">Win Rate %</div>
                <div className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {winRate.toFixed(1)}% ({wonLeads.length} won)
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 font-medium">Avg Deal Ticket (ACV)</div>
                <div className="font-mono text-lg font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                  {formatINR(avgDealSize)}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Stage Distribution Summary */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              2. Pipeline Stage Distribution
            </h3>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-2.5">Journey Stage</th>
                    <th className="p-2.5 text-center">Probability</th>
                    <th className="p-2.5 text-center">Deals</th>
                    <th className="p-2.5 text-right">Unweighted Value</th>
                    <th className="p-2.5 text-right">Weighted Forecast</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(["interest", "discussion", "proposal", "negotiation", "closure", "closed_lost"] as const).map(
                    (stageKey) => {
                      const stageInfo = STAGES[stageKey];
                      const stageLeads = leads.filter((l) => l.stage === stageKey);
                      const total = stageLeads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);
                      const weighted = total * ((stageInfo?.weightage ?? 0) / 100);
                      return (
                        <tr key={stageKey} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-medium">{stageInfo?.label || stageKey}</td>
                          <td className="p-2.5 text-center text-slate-500">{stageInfo?.weightage ?? 0}%</td>
                          <td className="p-2.5 text-center font-bold">{stageLeads.length}</td>
                          <td className="p-2.5 text-right font-mono font-semibold">{formatINR(total)}</td>
                          <td className="p-2.5 text-right font-mono text-indigo-600 dark:text-indigo-400">
                            {formatINR(weighted)}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: High-Priority Deals Roster */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              3. Top High-Value Accounts in Pipeline
            </h3>
            <div className="space-y-2">
              {[...leads]
                .filter((l) => l.stage !== "closed_lost")
                .sort((a, b) => (b.dealValue || 0) - (a.dealValue || 0))
                .slice(0, 8)
                .map((lead, idx) => (
                  <div
                    key={lead.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white truncate">
                          {lead.companyName}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {lead.contactName} • {lead.program || "General"} • {STAGES[lead.stage]?.label || lead.stage}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatINR(lead.dealValue || 0)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Owner: {lead.owner || "Unassigned"}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between text-xs text-slate-500">
          <span>xMonks Business Intelligence & Strategy Engine</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 font-medium transition-colors"
          >
            Close Briefing
          </button>
        </div>
      </div>
    </div>
  );
};
