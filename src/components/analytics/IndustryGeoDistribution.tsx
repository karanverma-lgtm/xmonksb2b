"use client";

import React, { useMemo } from "react";
import { Lead } from "@/types/lead";
import { formatINR } from "@/lib/formatters";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Building2, MapPin } from "lucide-react";

interface IndustryGeoDistributionProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

const INDUSTRY_COLORS = [
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#64748b",
];

export const IndustryGeoDistribution: React.FC<IndustryGeoDistributionProps> = ({
  leads,
}) => {
  const totalPipelineValue = useMemo(
    () => leads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0),
    [leads]
  );

  // 1. Industry Breakdown
  const industryStats = useMemo(() => {
    const map = new Map<
      string,
      { name: string; totalValue: number; count: number; color: string }
    >();

    leads.forEach((l) => {
      const ind = l.industry?.trim() || "Other / General";
      const existing = map.get(ind);
      const val = l.dealValue || 0;
      if (existing) {
        existing.totalValue += val;
        existing.count += 1;
      } else {
        map.set(ind, {
          name: ind,
          totalValue: val,
          count: 1,
          color: INDUSTRY_COLORS[map.size % INDUSTRY_COLORS.length],
        });
      }
    });

    const list = Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);
    return list;
  }, [leads]);

  // 2. City-wise Distribution
  const cityStats = useMemo(() => {
    const map = new Map<
      string,
      { city: string; totalValue: number; count: number }
    >();

    leads.forEach((l) => {
      const city = l.city?.trim() || "Multi-City / Pan-India";
      const existing = map.get(city);
      const val = l.dealValue || 0;
      if (existing) {
        existing.totalValue += val;
        existing.count += 1;
      } else {
        map.set(city, {
          city,
          totalValue: val,
          count: 1,
        });
      }
    });

    const list = Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);
    return list;
  }, [leads]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Industry Sector Breakdown */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                <span>Industry & Sector Distribution</span>
              </h3>
              <p className="text-xs text-slate-500">
                Revenue exposure and deal concentration across vertical sectors
              </p>
            </div>
            <span className="text-xs text-slate-400">
              {industryStats.length} Sectors
            </span>
          </div>

          <div className="space-y-3">
            {industryStats.slice(0, 5).map((ind) => {
              const percent =
                totalPipelineValue > 0 ? (ind.totalValue / totalPipelineValue) * 100 : 0;
              return (
                <div key={ind.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: ind.color }}
                      />
                      <span>{ind.name}</span>
                      <span className="text-slate-400 font-normal">
                        ({ind.count} {ind.count === 1 ? "deal" : "deals"})
                      </span>
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatINR(ind.totalValue)}{" "}
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({percent.toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(percent, 100)}%`,
                        backgroundColor: ind.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. City & Geographic Revenue Hubs */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-indigo-500" />
                <span>Geographic & Hub Distribution</span>
              </h3>
              <p className="text-xs text-slate-500">
                Client territory concentration and metropolitan revenue split
              </p>
            </div>
            <span className="text-xs text-slate-400">
              {cityStats.length} Hubs
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {cityStats.slice(0, 6).map((item) => (
              <div
                key={item.city}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center space-x-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                    <span className="truncate">{item.city}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {item.count} Active {item.count === 1 ? "Account" : "Accounts"}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                    {formatINR(item.totalValue)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
