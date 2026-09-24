"use client";

import React, { useMemo } from "react";
import { Lead } from "@/types/lead";
import { STAGES } from "@/constants/stages";
import { formatINR } from "@/lib/formatters";
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  Flame,
  ArrowUpRight,
  CheckCircle2,
  CalendarX,
  History,
} from "lucide-react";

interface PipelineHealthRadarProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

interface FlaggedLead {
  lead: Lead;
  flagType: "stale" | "overdue" | "high_value_risk";
  title: string;
  reason: string;
  severity: "high" | "medium" | "warning";
  daysInactive: number;
}

export const PipelineHealthRadar: React.FC<PipelineHealthRadarProps> = ({
  leads,
  onSelectLead,
}) => {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const todayStr = now.toISOString().slice(0, 10);

  const flaggedDeals = useMemo(() => {
    const list: FlaggedLead[] = [];

    leads.forEach((l) => {
      // Ignore won or lost deals
      if (l.stage === "closure" || l.stage === "closed_lost") return;

      // 1. Check Overdue Closure Month / Expected Close Date
      let isOverdue = false;
      if (l.closureMonth && l.closureMonth < currentMonthStr) {
        isOverdue = true;
      } else if (l.expectedCloseDate && l.expectedCloseDate < todayStr) {
        isOverdue = true;
      }

      // 2. Check Inactivity / Ageing
      let lastActivityDate = l.createdAt ? new Date(l.createdAt) : now;
      if (l.journeyLogs && l.journeyLogs.length > 0) {
        const sortedLogs = [...l.journeyLogs].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        lastActivityDate = new Date(sortedLogs[0].timestamp);
      } else if (l.updatedAt) {
        lastActivityDate = new Date(l.updatedAt);
      }

      const diffMs = now.getTime() - lastActivityDate.getTime();
      const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      // 3. High Value at Risk
      const isHighValue = (l.dealValue || 0) >= 1500000; // >= 15 Lakhs
      const isStuckNegotiation = l.stage === "negotiation" && diffDays > 14;

      if (isOverdue) {
        list.push({
          lead: l,
          flagType: "overdue",
          title: "Overdue Closure Target",
          reason: `Target deadline (${l.closureMonth || l.expectedCloseDate}) has lapsed.`,
          severity: "high",
          daysInactive: diffDays,
        });
      } else if (isHighValue && isStuckNegotiation) {
        list.push({
          lead: l,
          flagType: "high_value_risk",
          title: "High-Value Deal at Risk",
          reason: `Major deal (${formatINR(l.dealValue)}) in negotiation without recent activity for ${diffDays} days.`,
          severity: "high",
          daysInactive: diffDays,
        });
      } else if (diffDays >= 30) {
        list.push({
          lead: l,
          flagType: "stale",
          title: "Stale / Inactive Deal",
          reason: `No activity logged for ${diffDays} days in stage: ${STAGES[l.stage]?.label || l.stage}.`,
          severity: diffDays >= 45 ? "high" : "medium",
          daysInactive: diffDays,
        });
      }
    });

    // Sort by severity (high first) and deal value
    list.sort((a, b) => {
      if (a.severity === "high" && b.severity !== "high") return -1;
      if (b.severity === "high" && a.severity !== "high") return 1;
      return (b.lead.dealValue || 0) - (a.lead.dealValue || 0);
    });

    return list;
  }, [leads, currentMonthStr, todayStr, now]);

  const totalAtRiskValue = useMemo(
    () => flaggedDeals.reduce((acc, curr) => acc + (curr.lead.dealValue || 0), 0),
    [flaggedDeals]
  );

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <span>Pipeline Health Radar: Stale & At-Risk Deals</span>
            </h3>
            <p className="text-xs text-slate-500">
              Immediate intervention required for overdue deadlines, inactive accounts, and stalled negotiations
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs flex-shrink-0">
            <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 font-semibold">
              {flaggedDeals.length} At-Risk Accounts
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold">
              {formatINR(totalAtRiskValue)} At Risk
            </span>
          </div>
        </div>

        {flaggedDeals.length === 0 ? (
          <div className="p-8 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40 text-center flex flex-col items-center justify-center space-y-2">
            <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              All Active Deals Are Healthy & On Track!
            </div>
            <p className="text-xs text-slate-500 max-w-sm">
              No overdue deadlines or stalled accounts detected. All pipeline deals have recent customer engagement logs.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {flaggedDeals.slice(0, 6).map((item) => {
              const { lead } = item;
              return (
                <div
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group hover:shadow-md ${
                    item.severity === "high"
                      ? "bg-rose-50/30 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40 hover:border-rose-500"
                      : "bg-amber-50/30 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40 hover:border-amber-500"
                  }`}
                >
                  <div>
                    {/* Top Alert Badge */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          item.flagType === "overdue"
                            ? "bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300"
                            : item.flagType === "high_value_risk"
                            ? "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {item.flagType === "overdue" && <CalendarX className="w-3 h-3 mr-0.5" />}
                        {item.flagType === "high_value_risk" && <Flame className="w-3 h-3 mr-0.5" />}
                        {item.flagType === "stale" && <Clock className="w-3 h-3 mr-0.5" />}
                        <span>{item.title}</span>
                      </span>

                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                        {formatINR(lead.dealValue || 0)}
                      </span>
                    </div>

                    {/* Company & Contact */}
                    <h5 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                      {lead.companyName}
                    </h5>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {lead.contactName} • Stage: {STAGES[lead.stage]?.label || lead.stage}
                    </div>

                    {/* Reason */}
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                      {item.reason}
                    </p>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-[10px] text-slate-400">
                      Owner: {lead.owner || "Unassigned"}
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold group-hover:underline flex items-center space-x-0.5">
                      <span>Open Deal</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
