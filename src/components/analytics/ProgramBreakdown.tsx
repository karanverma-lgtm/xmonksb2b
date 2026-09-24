"use client";

import React, { useMemo } from "react";
import { Lead } from "@/types/lead";
import { PRESET_PROGRAMS, getProgramBadgeStyle } from "@/constants/programs";
import { formatINR } from "@/lib/formatters";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { Briefcase, Target, Trophy, ArrowUpRight } from "lucide-react";

interface ProgramBreakdownProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

const PROGRAM_COLORS = [
  "#6366f1", // Indigo (Executive Coaching)
  "#a855f7", // Purple (L&D Transformation)
  "#0d9488", // Teal (TASC Inhouse)
  "#f59e0b", // Amber (Assessments)
  "#3b82f6", // Blue (Custom/Other)
  "#ec4899", // Pink
];

export const ProgramBreakdown: React.FC<ProgramBreakdownProps> = ({
  leads,
  onSelectLead,
}) => {
  const totalPipelineValue = useMemo(
    () => leads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0),
    [leads]
  );

  // Group leads by Program
  const programStats = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        totalValue: number;
        leads: Lead[];
        count: number;
        wonValue: number;
        wonCount: number;
        color: string;
      }
    >();

    // Seed preset programs
    PRESET_PROGRAMS.forEach((p, idx) => {
      map.set(p.name, {
        name: p.name,
        totalValue: 0,
        leads: [],
        count: 0,
        wonValue: 0,
        wonCount: 0,
        color: PROGRAM_COLORS[idx % PROGRAM_COLORS.length],
      });
    });

    leads.forEach((l) => {
      const progName = l.program?.trim() || "Unassigned / General";
      let existing = map.get(progName);
      if (!existing) {
        existing = {
          name: progName,
          totalValue: 0,
          leads: [],
          count: 0,
          wonValue: 0,
          wonCount: 0,
          color: PROGRAM_COLORS[map.size % PROGRAM_COLORS.length],
        };
        map.set(progName, existing);
      }

      const val = l.dealValue || 0;
      existing.totalValue += val;
      existing.count += 1;
      existing.leads.push(l);

      if (l.stage === "closure") {
        existing.wonValue += val;
        existing.wonCount += 1;
      }
    });

    // Sort leads inside each program by dealValue
    const results = Array.from(map.values())
      .filter((item) => item.count > 0)
      .map((item) => {
        item.leads.sort((a, b) => (b.dealValue || 0) - (a.dealValue || 0));
        const avgDealSize = item.count > 0 ? Math.round(item.totalValue / item.count) : 0;
        const percentOfPipeline =
          totalPipelineValue > 0 ? (item.totalValue / totalPipelineValue) * 100 : 0;
        return {
          ...item,
          avgDealSize,
          percentOfPipeline,
        };
      });

    // Sort programs by total value descending
    results.sort((a, b) => b.totalValue - a.totalValue);

    return results;
  }, [leads, totalPipelineValue]);

  // Donut Tooltip
  const CustomProgramTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-3 rounded-xl shadow-2xl text-white text-xs max-w-xs z-50">
          <div className="flex items-center space-x-1.5 pb-1.5 mb-1.5 border-b border-slate-800">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            <span className="font-bold text-slate-100">{data.name}</span>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between text-slate-300">
              <span>Total Revenue:</span>
              <strong className="text-emerald-400 font-mono">{formatINR(data.totalValue)}</strong>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Deal Volume:</span>
              <strong className="text-white">{data.count} deals ({data.percentOfPipeline.toFixed(1)}%)</strong>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Average Ticket Size:</span>
              <strong className="text-indigo-400 font-mono">{formatINR(data.avgDealSize)}</strong>
            </div>
            {data.wonCount > 0 && (
              <div className="flex items-center justify-between text-emerald-300 pt-1 border-t border-slate-800">
                <span>Won Revenue:</span>
                <strong className="font-mono">{formatINR(data.wonValue)}</strong>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <Briefcase className="w-5 h-5 text-indigo-500" />
              <span>Program & Service Line Breakdown</span>
            </h3>
            <p className="text-xs text-slate-500">
              Revenue contribution & average ticket size by solution vertical
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {programStats.length} Offerings Active
          </span>
        </div>

        {/* Charts & Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Donut Chart */}
          <div className="h-52 w-full relative md:col-span-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={programStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="totalValue"
                >
                  {programStats.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomProgramTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[10px] text-slate-400 font-medium">Programs</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {programStats.length} Services
              </span>
            </div>
          </div>

          {/* Program Cards / List */}
          <div className="md:col-span-2 space-y-2.5">
            {programStats.map((prog) => {
              const badgeStyle = getProgramBadgeStyle(prog.name);
              return (
                <div
                  key={prog.name}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/80"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: prog.color }}
                      />
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {prog.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                        {prog.count} deals
                      </span>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                        {formatINR(prog.totalValue)}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1.5">
                        ({prog.percentOfPipeline.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(prog.percentOfPipeline, 100)}%`,
                        backgroundColor: prog.color,
                      }}
                    />
                  </div>

                  {/* Stats strip */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Avg Ticket: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatINR(prog.avgDealSize)}</strong>
                    </span>
                    {prog.wonValue > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Won: {formatINR(prog.wonValue)} ({prog.wonCount})
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">
                        Top Lead: {prog.leads[0]?.companyName}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
