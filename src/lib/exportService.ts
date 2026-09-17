import { Lead } from "@/types/lead";
import { STAGES } from "@/constants/stages";

/**
 * Escapes a field for safe CSV output (quotes if containing commas, quotes, or newlines)
 */
function escapeCSVField(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Exports all provided leads as a clean, structured CSV file and triggers a browser download.
 * File name includes current date: `xMonks_B2B_Clients_Export_YYYY-MM-DD.csv`
 */
export function exportLeadsToCSV(leads: Lead[], filenamePrefix: string = "xMonks_B2B_Clients_Export"): void {
  if (!leads || leads.length === 0) {
    alert("No client records to export.");
    return;
  }

  const headers = [
    "Lead ID",
    "Company Name",
    "Pitched Program",
    "Lead Source",
    "Primary Contact Person",
    "Designation",
    "Contact Email",
    "Contact Phone",
    "City / Location",
    "Industry",
    "Deal Value (INR)",
    "Stage ID",
    "Stage Label",
    "Probability Weightage (%)",
    "Weighted Pipeline (INR)",
    "Target Closure Date",
    "Expected Close Date",
    "Assigned Account Owner",
    "Approach Note Name",
    "Approach Note URL",
    "Created Date",
    "Last Updated Date",
    "Total Journey Logs Count",
  ];

  const rows = leads.map((lead) => {
    const stageInfo = STAGES[lead.stage];
    const weightage = stageInfo?.weightage ?? lead.weightage ?? 0;
    const weightedVal = (lead.dealValue || 0) * (weightage / 100);

    return [
      escapeCSVField(lead.id),
      escapeCSVField(lead.companyName),
      escapeCSVField(lead.program || "Not Assigned"),
      escapeCSVField(lead.leadSource || "Event Based"),
      escapeCSVField(lead.contactName),
      escapeCSVField(lead.designation || ""),
      escapeCSVField(lead.contactEmail),
      escapeCSVField(lead.contactPhone || ""),
      escapeCSVField(lead.city || ""),
      escapeCSVField(lead.industry || ""),
      escapeCSVField(lead.dealValue || 0),
      escapeCSVField(lead.stage),
      escapeCSVField(stageInfo?.label || lead.stage),
      escapeCSVField(weightage),
      escapeCSVField(weightedVal),
      escapeCSVField(lead.closureMonth || "Not Set"),
      escapeCSVField(lead.expectedCloseDate || ""),
      escapeCSVField(lead.owner || "Unassigned"),
      escapeCSVField(lead.approachNote?.fileName || ""),
      escapeCSVField(lead.approachNote?.downloadUrl || ""),
      escapeCSVField(lead.createdAt ? new Date(lead.createdAt).toISOString().split("T")[0] : ""),
      escapeCSVField(lead.updatedAt ? new Date(lead.updatedAt).toISOString().split("T")[0] : ""),
      escapeCSVField(lead.journeyLogs?.length || 0),
    ].join(",");
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  const dateStr = new Date().toISOString().split("T")[0];
  const downloadName = `${filenamePrefix}_${dateStr}.csv`;

  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", downloadName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
