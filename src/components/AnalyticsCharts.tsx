"use client";

import React, { useState, useMemo } from "react";
import { Lead } from "@/types/lead";
import { PIPELINE_STAGES, STAGES, STAGE_ORDER } from "@/constants/stages";
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
import {
  History,
  TrendingUp,
  PieChart as PieIcon,
  Clock,
  Building2,
  User,
  Search,
  Maximize2,
  X,
  ArrowUpRight,
  Layers,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

import { formatINR } from "@/lib/formatters";

interface AnalyticsChartsProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

const STAGE_COLORS: Record<string, string> = {
  interest: "#3b82f6",     // blue
  discussion: "#a855f7",   // purple
  proposal: "#6366f1",     // indigo
  negotiation: "#f59e0b",  // amber
  closure: "#10b981",      // emerald
  closed_lost: "#ef4444",  // rose
};

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  leads,
  onSelectLead,
}) => {
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"chart" | "grouped">("chart");
  const [showBreakdownModal, setShowBreakdownModal] = useState<boolean>(false);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({
    interest: true,
    discussion: true,
    proposal: true,
    negotiation: true,
    closure: true,
    closed_lost: false,
  });

  const toggleStageExpand = (stageKey: string) => {
    setExpandedStages((prev) => ({
      ...prev,
      [stageKey]: !prev[stageKey],
    }));
  };

  const formatCurrency = (val: number) => formatINR(val);

  const formatCompact = (val: number) => {
    if (!val) return "₹0";
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
    return `₹${val.toLocaleString("en-IN")}`;
  };

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

  // Calculate comprehensive stats for each stage
  const stageStats = useMemo(() => {
    return STAGE_ORDER.map((stageKey) => {
      const stageInfo = STAGES[stageKey];
      const stageLeads = leads
        .filter((l) => l.stage === stageKey)
        .sort((a, b) => (b.dealValue || 0) - (a.dealValue || 0));
      const totalAmount = stageLeads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);
      const weightedAmount = totalAmount * ((stageInfo?.weightage ?? 0) / 100);

      return {
        stageKey,
        name: stageInfo?.label || stageKey,
        weightage: stageInfo?.weightage ?? 0,
        leads: stageLeads,
        count: stageLeads.length,
        totalAmount,
        weightedAmount,
        color: STAGE_COLORS[stageKey] || "#6366f1",
      };
    });
  }, [leads]);

  // Total pipeline metrics
  const totalPipelineValue = useMemo(
    () => leads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0),
    [leads]
  );

  const totalWeightedValue = useMemo(() => {
    return stageStats.reduce((acc, curr) => acc + curr.weightedAmount, 0);
  }, [stageStats]);

  // Data for the Donut Chart (stages with at least 1 lead)
  const pieData = useMemo(() => {
    return stageStats.filter((item) => item.count > 0);
  }, [stageStats]);

  // Filtered leads for the active stage client list
  const displayedLeads = useMemo(() => {
    let list =
      selectedStage === "all"
        ? leads
        : leads.filter((l) => l.stage === selectedStage);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          l.companyName.toLowerCase().includes(q) ||
          l.contactName?.toLowerCase().includes(q) ||
          l.program?.toLowerCase().includes(q) ||
          l.industry?.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => (b.dealValue || 0) - (a.dealValue || 0));
  }, [leads, selectedStage, searchQuery]);

  const selectedTotalAmount = useMemo(() => {
    return displayedLeads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);
  }, [displayedLeads]);

  const selectedStageMeta = stageStats.find((s) => s.stageKey === selectedStage);

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

  // Custom Rich Tooltip for Donut Chart with clients list and amount
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-3 rounded-xl shadow-2xl text-white text-xs max-w-[260px] z-50 pointer-events-none">
          <div className="flex items-center justify-between gap-2 mb-1.5 pb-1.5 border-b border-slate-800">
            <div className="flex items-center space-x-1.5 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: data.color }}
              />
              <span className="font-bold text-slate-100 truncate">{data.name}</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium flex-shrink-0">
              {data.weightage}% Prob.
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] mb-2 text-slate-300">
            <span>
              Deals: <strong className="text-white">{data.count}</strong>
            </span>
            <span className="text-right">
              Total:{" "}
              <strong className="text-emerald-400 font-mono">
                {formatINR(data.totalAmount)}
              </strong>
            </span>
          </div>

          {data.leads && data.leads.length > 0 && (
            <div className="mt-1 pt-1.5 border-t border-slate-800">
              <div className="text-[10px] text-slate-400 font-medium mb-1 uppercase tracking-wider">
                Clients Preview:
              </div>
              <div className="space-y-1 max-h-28 overflow-hidden">
                {data.leads.slice(0, 4).map((lead: Lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between text-[11px] gap-2"
                  >
                    <span className="text-slate-200 truncate">{lead.companyName}</span>
                    <span className="font-mono text-emerald-400 font-medium flex-shrink-0">
                      {formatINR(lead.dealValue || 0)}
                    </span>
                  </div>
                ))}
                {data.leads.length > 4 && (
                  <div className="text-[10px] text-indigo-400 font-medium pt-0.5">
                    +{data.leads.length - 4} more clients...
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
    <div className="space-y-6">
      {/* Top Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* 1. Bar Chart: Revenue Forecast Breakdown */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                <span>Unweighted vs. Weighted Revenue by Stage</span>
              </h3>
              <p className="text-xs text-slate-500">
                Visualizing probability-adjusted pipeline distribution across stages
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                Unweighted: <strong className="text-slate-900 dark:text-white font-mono">{formatCompact(totalPipelineValue)}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-medium">
                Weighted: <strong className="font-mono">{formatCompact(totalWeightedValue)}</strong>
              </span>
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
                  formatter={(val: unknown) => [formatCurrency(Number(val) || 0), ""]}
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

        {/* 2. Upgraded Stage Distribution: Interactive Donut, Stage Filters, Client List & Amounts */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col">
          {/* Header with Title and Mode Switcher */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <PieIcon className="w-5 h-5 text-purple-500" />
                <span>Stage Distribution</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {leads.length} deals • {formatCompact(totalPipelineValue)} total
              </p>
            </div>

            <div className="flex items-center space-x-1.5 flex-shrink-0">
              {/* Toggle View Mode */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setViewMode("chart")}
                  className={`p-1 rounded text-xs transition-colors ${
                    viewMode === "chart"
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                  title="Donut Chart View"
                >
                  <PieIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grouped")}
                  className={`p-1 rounded text-xs transition-colors ${
                    viewMode === "grouped"
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                  title="Grouped Stages View"
                >
                  <Layers className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Full Breakdown Modal Trigger */}
              <button
                type="button"
                onClick={() => setShowBreakdownModal(true)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/60 dark:border-slate-700/60 transition-colors"
                title="Open Full Stage & Client Breakdown Modal"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {viewMode === "chart" ? (
            <>
              {/* Donut Chart with center value */}
              <div className="h-44 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={4}
                      dataKey="count"
                      onClick={(entry: any) => {
                        const key = entry?.stageKey || entry?.payload?.stageKey;
                        if (key) {
                          setSelectedStage(selectedStage === key ? "all" : key);
                        }
                      }}
                      cursor="pointer"
                    >
                      {pieData.map((entry) => (
                        <Cell
                          key={entry.stageKey}
                          fill={entry.color}
                          stroke={selectedStage === entry.stageKey ? "#ffffff" : "transparent"}
                          strokeWidth={selectedStage === entry.stageKey ? 3 : 0}
                          className="transition-all hover:opacity-85"
                          onClick={() =>
                            setSelectedStage(
                              selectedStage === entry.stageKey ? "all" : entry.stageKey
                            )
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center of Donut Summary */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {selectedStage === "all" ? "Pipeline" : selectedStageMeta?.name?.split(" ")[0]}
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {selectedStage === "all" ? `${leads.length} Deals` : `${selectedStageMeta?.count || 0} Deals`}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    {selectedStage === "all"
                      ? formatCompact(totalPipelineValue)
                      : formatCompact(selectedStageMeta?.totalAmount || 0)}
                  </span>
                </div>
              </div>

              {/* Stage Selection Pills with Count and Amount */}
              <div className="flex flex-wrap gap-1.5 pt-2 pb-3 border-b border-slate-100 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedStage("all")}
                  className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center space-x-1.5 ${
                    selectedStage === "all"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-750"
                  }`}
                >
                  <span>All</span>
                  <span className="opacity-70">({leads.length})</span>
                </button>

                {pieData.map((item) => {
                  const isSelected = selectedStage === item.stageKey;
                  return (
                    <button
                      key={item.stageKey}
                      type="button"
                      onClick={() =>
                        setSelectedStage(isSelected ? "all" : item.stageKey)
                      }
                      className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center space-x-1.5 ${
                        isSelected
                          ? "ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-semibold"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-750"
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate max-w-[85px]">{item.name}</span>
                      <span className="font-bold">({item.count})</span>
                      <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                        {formatCompact(item.totalAmount)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Client List & Amounts for Selected Stage */}
              <div className="pt-3 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {selectedStage === "all"
                        ? "All Clients"
                        : `${selectedStageMeta?.name || "Stage"} Clients`}
                    </span>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">
                      ({displayedLeads.length})
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                      {formatINR(selectedTotalAmount)}
                    </span>
                  </div>
                </div>

                {/* Quick Search inside Client List if there are more than 3 leads */}
                {(leads.length > 3 || searchQuery) && (
                  <div className="relative mb-2">
                    <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter clients..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs pl-7 pr-7 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {/* Scrollable Client List */}
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {displayedLeads.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      No clients found in this view
                    </div>
                  ) : (
                    displayedLeads.map((lead) => {
                      const stageColor = STAGE_COLORS[lead.stage] || "#6366f1";
                      return (
                        <div
                          key={lead.id}
                          onClick={() => onSelectLead(lead)}
                          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/60 dark:border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/30 transition-all cursor-pointer flex items-center justify-between gap-2.5 group"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            {lead.companyLogo ? (
                              <img
                                src={lead.companyLogo}
                                alt=""
                                className="w-6 h-6 rounded-md object-cover flex-shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs"
                              />
                            ) : (
                              <div
                                className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] text-white flex-shrink-0 shadow-2xs"
                                style={{ backgroundColor: stageColor }}
                              >
                                {lead.companyName?.charAt(0)?.toUpperCase() || "C"}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="font-semibold text-xs text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {lead.companyName}
                              </div>
                              <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {lead.contactName && (
                                  <span className="truncate">{lead.contactName}</span>
                                )}
                                {lead.program && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate text-indigo-500 font-medium">
                                      {lead.program}
                                    </span>
                                  </>
                                )}
                                {selectedStage === "all" && (
                                  <>
                                    <span>•</span>
                                    <span
                                      className="font-medium text-[9px] truncate"
                                      style={{ color: stageColor }}
                                    >
                                      {STAGES[lead.stage]?.label || lead.stage}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0 flex items-center space-x-1.5">
                            <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                              {formatINR(lead.dealValue || 0)}
                            </span>
                            <ArrowUpRight className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Grouped View: Stage-by-Stage Accordion showing Clients & Amounts */
            <div className="space-y-2 pt-2 max-h-[380px] overflow-y-auto pr-1">
              {stageStats.map((stage) => {
                const isExpanded = expandedStages[stage.stageKey] ?? true;
                return (
                  <div
                    key={stage.stageKey}
                    className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 overflow-hidden"
                  >
                    {/* Stage Header */}
                    <button
                      type="button"
                      onClick={() => toggleStageExpand(stage.stageKey)}
                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors text-left"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {stage.name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                          {stage.count}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                          {formatINR(stage.totalAmount)}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Stage Clients List */}
                    {isExpanded && (
                      <div className="p-2 pt-0 space-y-1 border-t border-slate-200/40 dark:border-slate-800/40">
                        {stage.leads.length === 0 ? (
                          <div className="text-[11px] text-slate-400 italic py-1 px-2">
                            No deals in this stage
                          </div>
                        ) : (
                          stage.leads.map((lead) => (
                            <div
                              key={lead.id}
                              onClick={() => onSelectLead(lead)}
                              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all cursor-pointer flex items-center justify-between text-xs group"
                            >
                              <div className="min-w-0 pr-2">
                                <div className="font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                  {lead.companyName}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {lead.contactName}
                                  {lead.program && ` • ${lead.program}`}
                                </div>
                              </div>
                              <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                                {formatINR(lead.dealValue || 0)}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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

      {/* Comprehensive Stage & Client Breakdown Modal */}
      {showBreakdownModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/60">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <PieIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Stage Distribution: Clients & Deal Values
                  </h3>
                  <p className="text-xs text-slate-500">
                    Complete breakdown of all client accounts and pipeline deal amounts by stage
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowBreakdownModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Summary KPI Strip */}
            <div className="grid grid-cols-3 gap-4 p-4 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/60 dark:border-slate-800">
                <div className="text-[11px] text-slate-400 font-medium">Total Deals</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  {leads.length} Accounts
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/60 dark:border-slate-800">
                <div className="text-[11px] text-slate-400 font-medium">Total Pipeline (Unweighted)</div>
                <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {formatINR(totalPipelineValue)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
                <div className="text-[11px] text-indigo-500 font-medium">Probability Weighted Pipeline</div>
                <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
                  {formatINR(totalWeightedValue)}
                </div>
              </div>
            </div>

            {/* Modal Body: Grid of Stages and Their Clients */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stageStats.map((stage) => (
                  <div
                    key={stage.stageKey}
                    className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col justify-between"
                  >
                    <div>
                      {/* Stage Card Header */}
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200/60 dark:border-slate-800">
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: stage.color }}
                          />
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {stage.name}
                          </span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                          {stage.weightage}% Prob.
                        </span>
                      </div>

                      {/* Stage Amount and Count */}
                      <div className="flex items-center justify-between mb-3 text-xs">
                        <span className="text-slate-500 font-medium">
                          {stage.count} {stage.count === 1 ? "Deal" : "Deals"}
                        </span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatINR(stage.totalAmount)}
                        </span>
                      </div>

                      {/* Client List */}
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {stage.leads.length === 0 ? (
                          <div className="text-xs text-slate-400 italic py-2 text-center">
                            No clients in this stage
                          </div>
                        ) : (
                          stage.leads.map((lead) => (
                            <div
                              key={lead.id}
                              onClick={() => {
                                setShowBreakdownModal(false);
                                onSelectLead(lead);
                              }}
                              className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/30 transition-all cursor-pointer flex items-center justify-between gap-2 group"
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                  {lead.companyName}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate flex items-center space-x-1">
                                  <span>{lead.contactName}</span>
                                  {lead.program && (
                                    <>
                                      <span>•</span>
                                      <span className="text-indigo-500 truncate">{lead.program}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                                  {formatINR(lead.dealValue || 0)}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
              <span>Tip: Click on any client to open their full deal profile and customer journey</span>
              <button
                type="button"
                onClick={() => setShowBreakdownModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

