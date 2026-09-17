// Helper for formatting INR currency across the application
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

// Detailed Date Components for Google Calendar style tear-off widgets
export interface DateComponents {
  isValid: boolean;
  dayNum: number;
  dayStr: string;
  monthNum: number; // 1-indexed (1-12)
  monthShort: string; // e.g. "Oct"
  monthLong: string; // e.g. "October"
  year: number;
  weekdayShort: string; // e.g. "Thu"
  weekdayLong: string; // e.g. "Thursday"
  isoDate: string; // YYYY-MM-DD
  hasSpecificDay: boolean;
}

export function getDateComponents(dateString?: string): DateComponents {
  if (!dateString || typeof dateString !== "string") {
    return {
      isValid: false,
      dayNum: 1,
      dayStr: "01",
      monthNum: 1,
      monthShort: "Jan",
      monthLong: "January",
      year: 2026,
      weekdayShort: "Thu",
      weekdayLong: "Thursday",
      isoDate: "",
      hasSpecificDay: false,
    };
  }

  let cleaned = dateString.trim();

  // If format is YYYYMM (e.g. 202611) or YYYYMMDD
  if (!cleaned.includes("-") && cleaned.length >= 6 && /^\d+$/.test(cleaned)) {
    const y = cleaned.slice(0, 4);
    const m = cleaned.slice(4, 6);
    const d = cleaned.length >= 8 ? cleaned.slice(6, 8) : "";
    cleaned = d ? `${y}-${m}-${d}` : `${y}-${m}`;
  }

  const parts = cleaned.split("-");
  if (parts.length >= 2) {
    let year = parseInt(parts[0], 10);
    // If year was accidentally parsed with month concatenated e.g. 202611
    if (year > 2099 && String(year).length >= 6) {
      year = parseInt(String(year).slice(0, 4), 10);
    }
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const day = parts.length >= 3 && parts[2] ? parseInt(parts[2], 10) : 1;
    const hasSpecificDay = parts.length >= 3 && Boolean(parts[2]);

    if (!isNaN(year) && !isNaN(month) && month >= 0 && month <= 11) {
      const d = new Date(year, month, day);
      return {
        isValid: true,
        dayNum: day,
        dayStr: day < 10 ? `0${day}` : `${day}`,
        monthNum: month + 1,
        monthShort: d.toLocaleString("en-US", { month: "short" }),
        monthLong: d.toLocaleString("en-US", { month: "long" }),
        year: year,
        weekdayShort: d.toLocaleString("en-US", { weekday: "short" }),
        weekdayLong: d.toLocaleString("en-US", { weekday: "long" }),
        isoDate: hasSpecificDay
          ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          : `${year}-${String(month + 1).padStart(2, "0")}`,
        hasSpecificDay,
      };
    }
  }

  return {
    isValid: false,
    dayNum: 1,
    dayStr: "01",
    monthNum: 1,
    monthShort: "Jan",
    monthLong: "January",
    year: 2026,
    weekdayShort: "Thu",
    weekdayLong: "Thursday",
    isoDate: "",
    hasSpecificDay: false,
  };
}

// Helper for formatting Closure Month / Date with Date, Month, and Year support
export function formatClosureMonth(
  closureDate?: string,
  variant: "long" | "short" | "full" = "short"
): string {
  if (!closureDate || typeof closureDate !== "string") return "Not Set";

  let cleaned = closureDate.trim();
  if (!cleaned.includes("-") && cleaned.length >= 6 && /^\d+$/.test(cleaned)) {
    const y = cleaned.slice(0, 4);
    const m = cleaned.slice(4, 6);
    const d = cleaned.length >= 8 ? cleaned.slice(6, 8) : "";
    cleaned = d ? `${y}-${m}-${d}` : `${y}-${m}`;
  }

  const parts = cleaned.split("-");
  if (parts.length >= 2) {
    let year = parseInt(parts[0], 10);
    if (year > 2099 && String(year).length >= 6) {
      year = parseInt(String(year).slice(0, 4), 10);
    }
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const day = parts.length >= 3 && parts[2] ? parseInt(parts[2], 10) : undefined;

    if (!isNaN(year) && !isNaN(month) && month >= 0 && month <= 11) {
      const date = new Date(year, month, day || 1);

      if (day) {
        if (variant === "full") {
          return date.toLocaleDateString("en-US", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          }); // e.g. "Thu, 15 Oct 2026"
        }
        return date.toLocaleDateString("en-US", {
          day: "numeric",
          month: variant === "short" ? "short" : "long",
          year: "numeric",
        }); // e.g. "15 Oct 2026"
      }

      return date.toLocaleString("en-US", {
        month: variant === "short" ? "short" : "long",
        year: "numeric",
      });
    }
  }

  return closureDate;
}

// Helper for formatting file size in KB/MB
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
