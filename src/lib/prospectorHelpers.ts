/**
 * Prospector formatting & calculation helpers
 */

export function formatTimestampToMonthYear(ts?: number): string {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export function calculateDuration(
  startMs?: number,
  endMs?: number,
  isCurrent?: boolean
): string {
  if (!startMs) return "";
  try {
    const end = isCurrent || !endMs ? Date.now() : endMs;
    const totalMonths = Math.max(
      1,
      Math.round((end - startMs) / (1000 * 60 * 60 * 24 * 30.4375))
    );
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    const parts: string[] = [];
    if (years > 0) parts.push(`${years} ${years === 1 ? "yr" : "yrs"}`);
    if (months > 0) parts.push(`${months} ${months === 1 ? "mo" : "mos"}`);
    return parts.join(" ") || "1 mo";
  } catch {
    return "";
  }
}

export function formatCareerTotalExperience(startMs?: number): {
  yearsText: string;
  sinceYearText: string;
  startedDateText: string;
} | null {
  if (!startMs) return null;
  try {
    const d = new Date(startMs);
    if (isNaN(d.getTime())) return null;

    const totalYears = Math.max(
      1,
      Math.floor((Date.now() - startMs) / (1000 * 60 * 60 * 24 * 365.25))
    );
    const sinceYear = d.getFullYear();
    const formattedDate = d.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    return {
      yearsText: `${totalYears}+ Years of Industry Experience`,
      sinceYearText: `Active since ${sinceYear}`,
      startedDateText: formattedDate,
    };
  } catch {
    return null;
  }
}

export function getCompanyTypeBadge(type?: string): {
  label: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
} {
  const t = (type || "").toLowerCase().trim();

  if (t === "public") {
    return {
      label: "Public Company",
      bgClass: "bg-emerald-500/10 dark:bg-emerald-500/20",
      borderClass: "border-emerald-500/30",
      textClass: "text-emerald-700 dark:text-emerald-300",
    };
  }
  if (t === "partnership") {
    return {
      label: "Partnership",
      bgClass: "bg-purple-500/10 dark:bg-purple-500/20",
      borderClass: "border-purple-500/30",
      textClass: "text-purple-700 dark:text-purple-300",
    };
  }
  if (t === "privately-held" || t === "private") {
    return {
      label: "Privately Held",
      bgClass: "bg-blue-500/10 dark:bg-blue-500/20",
      borderClass: "border-blue-500/30",
      textClass: "text-blue-700 dark:text-blue-300",
    };
  }

  return {
    label: type ? type.replace(/-/g, " ") : "Organization",
    bgClass: "bg-slate-500/10 dark:bg-slate-500/20",
    borderClass: "border-slate-500/30",
    textClass: "text-slate-700 dark:text-slate-300",
  };
}

export function getCompanyAge(foundedYear?: number): string | null {
  if (!foundedYear || isNaN(foundedYear)) return null;
  const currentYear = new Date().getFullYear();
  const age = currentYear - foundedYear;
  if (age <= 0) return "Founded this year";
  if (age === 1) return "1 year established";
  return `${age} years in operation`;
}
