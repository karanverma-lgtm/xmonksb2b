import { Lead } from "@/types/lead";
import { STAGES } from "@/constants/stages";
import { formatINR } from "@/lib/formatters";

export interface AnalyticsReportData {
  leads: Lead[];
  totalPipelineValue: number;
  totalWeightedValue: number;
  winRate: number;
  avgDealSize: number;
  closingThisMonthValue: number;
  closingThisMonthCount: number;
}

export function exportAnalyticsToCSV(data: AnalyticsReportData) {
  const {
    leads,
    totalPipelineValue,
    totalWeightedValue,
    winRate,
    avgDealSize,
    closingThisMonthValue,
    closingThisMonthCount,
  } = data;

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toLocaleTimeString();

  const wonLeads = leads.filter((l) => l.stage === "closure");
  const wonValue = wonLeads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);

  const lines: string[] = [];

  // Header Banner
  lines.push(`"xMonks B2B Sales & Pipeline Executive Report"`);
  lines.push(`"Generated on: ${dateStr} ${timeStr}"`);
  lines.push(`"Total Accounts Analyzed: ${leads.length}"`);
  lines.push("");

  // Section 1: Executive KPIs
  lines.push(`"=== EXECUTIVE PERFORMANCE KPIS ==="`);
  lines.push(`"Metric","Value"`);
  lines.push(`"Total Pipeline Value (Unweighted)","${formatINR(totalPipelineValue)}"`);
  lines.push(`"Probability-Weighted Forecast","${formatINR(totalWeightedValue)}"`);
  lines.push(`"Win Rate %","${winRate.toFixed(1)}% (${wonLeads.length} Won Deals)"`);
  lines.push(`"Total Won Revenue Realized","${formatINR(wonValue)}"`);
  lines.push(`"Average Deal Size (ACV)","${formatINR(avgDealSize)}"`);
  lines.push(`"Target Closures This Month","${closingThisMonthCount} Deals (${formatINR(closingThisMonthValue)})"`);
  lines.push("");

  // Section 2: Stage Breakdown
  lines.push(`"=== STAGE DISTRIBUTION ==="`);
  lines.push(`"Stage","Weightage %","Deals Count","Total Value (INR)","Weighted Value (INR)"`);
  const stageKeys = ["interest", "discussion", "proposal", "negotiation", "closure", "closed_lost"] as const;
  stageKeys.forEach((key) => {
    const stageInfo = STAGES[key];
    const stageLeads = leads.filter((l) => l.stage === key);
    const stageTotal = stageLeads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);
    const stageWeighted = stageTotal * ((stageInfo?.weightage ?? 0) / 100);
    lines.push(
      `"${stageInfo?.label || key}","${stageInfo?.weightage ?? 0}%","${stageLeads.length}","${stageTotal}","${stageWeighted}"`
    );
  });
  lines.push("");

  // Section 3: Program Breakdown
  lines.push(`"=== REVENUE BY PROGRAM / SERVICE LINE ==="`);
  lines.push(`"Program","Deals Count","Total Revenue (INR)","Avg Deal Size (INR)"`);
  const programMap = new Map<string, { count: number; total: number }>();
  leads.forEach((l) => {
    const prog = l.program || "Unassigned / General";
    const cur = programMap.get(prog) || { count: 0, total: 0 };
    programMap.set(prog, { count: cur.count + 1, total: cur.total + (l.dealValue || 0) });
  });
  programMap.forEach((val, prog) => {
    const avg = val.count > 0 ? Math.round(val.total / val.count) : 0;
    lines.push(`"${prog}","${val.count}","${val.total}","${avg}"`);
  });
  lines.push("");

  // Section 4: Lead Source Analysis
  lines.push(`"=== LEAD SOURCE ACQUISITION PERFORMANCE ==="`);
  lines.push(`"Lead Source","Deals Count","Total Revenue (INR)","Won Deals","Win Rate %"`);
  const sourceMap = new Map<string, { count: number; total: number; won: number }>();
  leads.forEach((l) => {
    const src = l.leadSource || "Direct / Other";
    const cur = sourceMap.get(src) || { count: 0, total: 0, won: 0 };
    sourceMap.set(src, {
      count: cur.count + 1,
      total: cur.total + (l.dealValue || 0),
      won: cur.won + (l.stage === "closure" ? 1 : 0),
    });
  });
  sourceMap.forEach((val, src) => {
    const wr = val.count > 0 ? ((val.won / val.count) * 100).toFixed(1) : "0";
    lines.push(`"${src}","${val.count}","${val.total}","${val.won}","${wr}%"`);
  });
  lines.push("");

  // Section 5: Detailed Deals Registry
  lines.push(`"=== COMPLETE PIPELINE DEALS REGISTRY ==="`);
  lines.push(
    `"Company Name","Contact Person","Email","Phone","Industry","City","Program","Lead Source","Stage","Probability %","Deal Value (INR)","Weighted Value (INR)","Closure Month","Owner"`
  );
  leads.forEach((l) => {
    const stageInfo = STAGES[l.stage];
    const weightage = stageInfo?.weightage ?? l.weightage ?? 0;
    const weightedVal = Math.round((l.dealValue || 0) * (weightage / 100));
    lines.push(
      `"${(l.companyName || "").replace(/"/g, '""')}","${(l.contactName || "").replace(/"/g, '""')}","${(l.contactEmail || "").replace(/"/g, '""')}","${(l.contactPhone || "").replace(/"/g, '""')}","${(l.industry || "").replace(/"/g, '""')}","${(l.city || "").replace(/"/g, '""')}","${(l.program || "General").replace(/"/g, '""')}","${(l.leadSource || "Direct").replace(/"/g, '""')}","${stageInfo?.label || l.stage}","${weightage}%","${l.dealValue || 0}","${weightedVal}","${l.closureMonth || l.expectedCloseDate || ""}","${(l.owner || "").replace(/"/g, '""')}"`
    );
  });

  const csvContent = lines.join("\r\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `B2B_Executive_Analytics_Report_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
