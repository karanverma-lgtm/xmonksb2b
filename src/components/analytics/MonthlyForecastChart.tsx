"use client";

import React, { useMemo } from "react";
import { Lead } from "@/types/lead";
import { STAGES } from "@/constants/stages";
import { formatINR } from "@/lib/formatters";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Calendar, TrendingUp, Sparkles, Building2, ArrowUpRight } from "lucide-react";

interface MonthlyForecastChartProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

export const MonthlyForecastChart: React.FC<MonthlyForecastChartProps> = ({
  leads,
  onSelectLead,
}) => {
  // Aggregate leads by closure month (or month from expectedCloseDate)
  const monthlyData = useMemo(() => {
    const map = new Map<
      string,
      {
        monthKey: string;
        label: string;
        unweighted: number;
        weighted: number;
        leads: Lead[];
        count: number;
      }
    >();

    leads.forEach((lead) => {
      // Exclude lost deals from revenue forecast
      if (lead.stage === "closed_lost") return;

      let monthKey = "";
      if (lead.closureMonth && lead.closureMonth.length >= 7) {
        monthKey = lead.closureMonth.slice(0, 7);
      } else if (lead.expectedCloseDate && lead.expectedCloseDate.length >= 7) {
        monthKey = lead.expectedCloseDate.slice(0, 7);
      } else if (lead.createdAt && lead.createdAt.length >= 7) {
        monthKey = lead.createdAt.slice(0, 7);
      } else {
        monthKey = "Unscheduled";
      }

      const stageInfo = STAGES[lead.stage];
      const weight = stageInfo?.weightage ?? lead.weightage ?? 0;
      const unweighted = lead.dealValue || 0;
      const weighted = Math.round(unweighted * (weight / 100));

      const existing = map.get(monthKey);
      if (existing) {
        existing.unweighted += unweighted;
        existing.weighted += weighted;
        existing.count += 1;
        existing.leads.push(lead);
      } else {
        // Human label
        let label = monthKey;
        if (monthKey !== "Unscheduled" && monthKey.includes("-")) {
          const [yearStr, monthStr] = monthKey.split("-");
          const y = parseInt(yearStr, 10);
          const m = parseInt(monthStr, 10) - 1;
          if (!isNaN(y) && !isNaN(m)) {
            const d = new Date(y, m, 1);
            label = d.toLocaleString("en-US", { month: "short", year: "numeric" });
          }
        }

        map.set(monthKey, {
          monthKey,
          label,
          unweighted,
          weighted,
          leads: [lead],
          count: 1,
        });
      }
    });

    const items = Array.from(map.values());

    // Sort chronologically (Unscheduled at the end)
    items.sort((a, b) => {
      if (a.monthKey === "Unscheduled") return 1;
      if (b.monthKey === "Unscheduled") return -1;
      return a.monthKey.localeCompare(b.monthKey);
    });

    return items;
  }, [leads]);

  const totalForecastValue = useMemo(
    () => monthlyData.reduce((acc, curr) => acc + curr.unweighted, 0),
    [monthlyData]
  );
  const totalWeightedForecast = useMemo(
    () => monthlyData.reduce((acc, curr) => acc + curr.weighted, 0),
    [monthlyData]
  );

  const formatCurrency = (val: number) => formatINR(val);

  // Custom Tooltip with Month Deals list
  const CustomForecastTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const monthObj = monthlyData.find((m) => m.label === label);
      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-3.5 rounded-xl shadow-2xl text-white text-xs max-w-xs z-50">
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800">
            <span className="font-bold text-slate-100 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>{label}</span>
            </span>
            <span className="text-[10px] text-slate-400">
              {monthObj?.count || 0} Deals
            </span>
          </div>

          <div className="space-y-1 mb-2 text-[11px]">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Unweighted Expected:</span>
              </span>
              <strong className="text-white font-mono">{formatINR(payload[0]?.value || 0)}</strong>
            </div>
            <div className="flex items-center justify-between text-indigo-300">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>Weighted Realization:</span>
              </span>
              <strong className="text-indigo-400 font-mono">{formatINR(payload[1]?.value || 0)}</strong>
            </div>
          </div>

          {monthObj && monthObj.leads.length > 0 && (
            <div className="pt-2 border-t border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">
                Deals Targeted in {label}:
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {monthObj.leads.slice(0, 4).map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-[11px] gap-2">
                    <span className="text-slate-200 truncate">{l.companyName}</span>
                    <span className="font-mono text-emerald-400 font-semibold flex-shrink-0">
                      {formatINR(l.dealValue || 0)}
                    </span>
                  </div>
                ))}
                {monthObj.leads.length > 4 && (
                  <div className="text-[10px] text-indigo-400 pt-0.5">
                    +{monthObj.leads.length - 4} more accounts...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              <span>Monthly Revenue Forecast & Closure Timeline</span>
            </h3>
            <p className="text-xs text-slate-500">
              Expected monthly collections & conversion milestones based on target closure dates
            </p>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
              Pipeline Total: <strong className="text-slate-900 dark:text-white font-mono">{formatINR(totalForecastValue)}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-medium">
              Weighted: <strong className="font-mono">{formatINR(totalWeightedForecast)}</strong>
            </span>
          </div>
        </div>

        {/* Chart */}
        <div className="h-72 w-full">
          {monthlyData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
              No closure timeline data available for the selected filters
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  tickFormatter={(val) =>
                    val >= 100000
                      ? `₹${(val / 100000).toFixed(1)}L`
                      : `₹${(val / 1000).toFixed(0)}k`
                  }
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <Tooltip content={<CustomForecastTooltip />} />
                <Legend wrapperStyle={{ paddingTop: "15px", fontSize: "12px" }} />
                <Bar dataKey="unweighted" name="Unweighted Expected" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="weighted" name="Weighted Forecast" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Monthly Milestone Strip */}
      {monthlyData.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2.5 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Target Closure Milestones</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {monthlyData.slice(0, 6).map((m) => (
              <div
                key={m.monthKey}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/80 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {m.label}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {m.count} deals
                    </span>
                  </div>
                  <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                    {formatINR(m.unweighted)}
                  </div>
                </div>
                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                  {formatINR(m.weighted)} wtd
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
