"use client";

import React from "react";
import { Lead } from "@/types/lead";
import { PIPELINE_STAGES, STAGES } from "@/constants/stages";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { History, TrendingUp, PieChart as PieIcon, Clock, Building2 } from "lucide-react";

import { formatINR } from "@/lib/formatters";

interface AnalyticsChartsProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  leads,
  onSelectLead,
}) => {
  // Prepare data for Bar chart: Unweighted Value vs Weighted Value by Stage
  const stageData = PIPELINE_STAGES.map((stageKey) => {
    const stageInfo = STAGES[stageKey];
    const stageLeads = leads.filter((l) => l.stage === stageKey);
    const unweightedTotal = stageLeads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);
    const weightedTotal = unweightedTotal * (stageInfo.weightage / 100);

    return {
      name: stageInfo.label,
      weightage: `${stageInfo.weightage}%`,
      Unweighted: unweightedTotal,
      Weighted: weightedTotal,
      count: stageLeads.length,
    };
  });

  // Prepare Pie Chart data
  const COLORS = ["#3b82f6", "#6366f1", "#a855f7", "#f59e0b", "#10b981", "#f43f5e"];
  const pieData = PIPELINE_STAGES.map((stageKey) => {
    const stageInfo = STAGES[stageKey];
    const stageLeads = leads.filter((l) => l.stage === stageKey);
    return {
      name: stageInfo.label,
      value: stageLeads.length,
    };
  }).filter((item) => item.value > 0);

  // Flatten all journey logs for a Global Timeline Activity Stream
  const allLogs = leads
    .flatMap((lead) =>
      (lead.journeyLogs || []).map((log) => ({
        ...log,
        leadId: lead.id,
        companyName: lead.companyName,
        leadObj: lead,
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const formatCurrency = (val: number) => formatINR(val);

  return (
    <div className="space-y-6">
      {/* Top Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Bar Chart: Revenue Forecast Breakdown */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                <span>Unweighted vs. Weighted Revenue by Stage</span>
              </h3>
              <p className="text-xs text-slate-500">
                Visualizing probability-adjusted pipeline distribution
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  dataKey="name"
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
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val) || 0), ""]}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: "15px", fontSize: "12px" }} />
                <Bar dataKey="Unweighted" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Weighted" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Pie Chart: Lead Distribution */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2 mb-1">
              <PieIcon className="w-5 h-5 text-purple-500" />
              <span>Stage Distribution</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Number of deals in each journey phase
            </p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-2 text-xs">
            {pieData.map((item, i) => (
              <div key={item.name} className="flex items-center space-x-1.5 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-slate-600 dark:text-slate-400 truncate">
                  {item.name}: <strong>{item.value}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Global Activity Log Feed */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <History className="w-5 h-5 text-indigo-500" />
              <span>Real-Time Customer Journey Logs Stream</span>
            </h3>
            <p className="text-xs text-slate-500">
              Live timestamped activity feed across all B2B customer accounts
            </p>
          </div>
          <span className="text-xs text-slate-400">Total {allLogs.length} events</span>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {allLogs.map((log) => (
            <div
              key={log.id}
              onClick={() => onSelectLead(log.leadObj)}
              className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 hover:border-indigo-500/40 transition cursor-pointer flex items-start justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center space-x-1">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{log.companyName}</span>
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    {log.title}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {log.description}
                </p>
                <div className="text-[10px] text-slate-400">Author: {log.author}</div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="text-[11px] font-mono text-slate-500 flex items-center space-x-1 justify-end">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{log.formattedDate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
