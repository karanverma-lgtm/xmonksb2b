export interface LeadSourceOption {
  id: string;
  name: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  dotColor: string;
}

export const LEAD_SOURCES: LeadSourceOption[] = [
  {
    id: "event-based",
    name: "Event Based",
    description: "Acquired via leadership summits, HR roundtables, conferences, or webinars.",
    badgeBg: "bg-sky-50 dark:bg-sky-950/60",
    badgeText: "text-sky-700 dark:text-sky-300",
    borderColor: "border-sky-500/30",
    dotColor: "bg-sky-500",
  },
  {
    id: "self-created",
    name: "Self Created",
    description: "Direct outbound prospecting, personal network referral, or relationship outreach.",
    badgeBg: "bg-emerald-50 dark:bg-emerald-950/60",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    borderColor: "border-emerald-500/30",
    dotColor: "bg-emerald-500",
  },
  {
    id: "marketing",
    name: "Marketing",
    description: "Inbound digital campaigns, website consultation forms, whitepapers, or SEO.",
    badgeBg: "bg-purple-50 dark:bg-purple-950/60",
    badgeText: "text-purple-700 dark:text-purple-300",
    borderColor: "border-purple-500/30",
    dotColor: "bg-purple-500",
  },
  {
    id: "tasc-upselling",
    name: "TASC Upselling",
    description: "Expansion opportunities, cross-sells, or account upgrades from existing TASC clients.",
    badgeBg: "bg-amber-50 dark:bg-amber-950/60",
    badgeText: "text-amber-700 dark:text-amber-300",
    borderColor: "border-amber-500/30",
    dotColor: "bg-amber-500",
  },
];

export function getLeadSourceBadgeStyle(sourceName?: string) {
  if (!sourceName) {
    return {
      badgeBg: "bg-slate-100 dark:bg-slate-800/80",
      badgeText: "text-slate-500 dark:text-slate-400",
      borderColor: "border-slate-300 dark:border-slate-700",
      dotColor: "bg-slate-400",
    };
  }

  const clean = sourceName.toLowerCase().trim();

  const match = LEAD_SOURCES.find(
    (s) => s.name.toLowerCase() === clean || s.id === clean
  );

  if (match) {
    return {
      badgeBg: match.badgeBg,
      badgeText: match.badgeText,
      borderColor: match.borderColor,
      dotColor: match.dotColor,
    };
  }

  // Fuzzy match
  if (clean.includes("event")) return LEAD_SOURCES[0];
  if (clean.includes("self")) return LEAD_SOURCES[1];
  if (clean.includes("market")) return LEAD_SOURCES[2];
  if (clean.includes("tasc") || clean.includes("upsell")) return LEAD_SOURCES[3];

  return {
    badgeBg: "bg-sky-50 dark:bg-sky-950/60",
    badgeText: "text-sky-700 dark:text-sky-300",
    borderColor: "border-sky-500/30",
    dotColor: "bg-sky-500",
  };
}
