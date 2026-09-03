export interface ProgramOption {
  id: string;
  name: string;
  category: "coaching" | "leadership" | "culture" | "certification" | "custom";
  description: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
}

export const PRESET_PROGRAMS: ProgramOption[] = [
  {
    id: "executive-coaching",
    name: "Executive Coaching & Leadership Presence",
    category: "coaching",
    description: "1-on-1 personalized C-suite and VP executive coaching cohorts.",
    badgeBg: "bg-indigo-50 dark:bg-indigo-950/60",
    badgeText: "text-indigo-600 dark:text-indigo-400",
    borderColor: "border-indigo-500/30",
  },
  {
    id: "leadership-development",
    name: "High Performance Leadership Development",
    category: "leadership",
    description: "Comprehensive multi-tier leadership transition & acceleration curriculum.",
    badgeBg: "bg-blue-50 dark:bg-blue-950/60",
    badgeText: "text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-500/30",
  },
  {
    id: "team-coaching",
    name: "Systemic Team Coaching & Synergy",
    category: "coaching",
    description: "Enhancing cross-functional alignment, trust, and team accountability.",
    badgeBg: "bg-purple-50 dark:bg-purple-950/60",
    badgeText: "text-purple-600 dark:text-purple-400",
    borderColor: "border-purple-500/30",
  },
  {
    id: "icf-certification",
    name: "ICF Accredited Coach Certification",
    category: "certification",
    description: "Global Level 1 & Level 2 ICF credentialing pathways for leaders.",
    badgeBg: "bg-emerald-50 dark:bg-emerald-950/60",
    badgeText: "text-emerald-600 dark:text-emerald-400",
    borderColor: "border-emerald-500/30",
  },
  {
    id: "culture-transformation",
    name: "Culture & Mindset Transformation",
    category: "culture",
    description: "Organization-wide cultural agility, psychological safety, and growth mindset.",
    badgeBg: "bg-amber-50 dark:bg-amber-950/60",
    badgeText: "text-amber-600 dark:text-amber-400",
    borderColor: "border-amber-500/30",
  },
  {
    id: "manager-as-coach",
    name: "Manager as Coach (MAC)",
    category: "coaching",
    description: "Empowering frontline and mid-level managers with everyday coaching skills.",
    badgeBg: "bg-teal-50 dark:bg-teal-950/60",
    badgeText: "text-teal-600 dark:text-teal-400",
    borderColor: "border-teal-500/30",
  },
  {
    id: "strategic-alignment",
    name: "Strategic Alignment & Board Governance",
    category: "leadership",
    description: "Vision setting, executive offsites, and board advisory alignment sessions.",
    badgeBg: "bg-violet-50 dark:bg-violet-950/60",
    badgeText: "text-violet-600 dark:text-violet-400",
    borderColor: "border-violet-500/30",
  },
  {
    id: "emotional-intelligence",
    name: "Emotional Intelligence & Resilience",
    category: "culture",
    description: "Mindfulness, stress management, and empathetic workplace engagement.",
    badgeBg: "bg-rose-50 dark:bg-rose-950/60",
    badgeText: "text-rose-600 dark:text-rose-400",
    borderColor: "border-rose-500/30",
  },
  {
    id: "custom-enterprise",
    name: "Custom Enterprise Solution",
    category: "custom",
    description: "Bespoke tailored organizational development and coaching architecture.",
    badgeBg: "bg-slate-100 dark:bg-slate-800",
    badgeText: "text-slate-700 dark:text-slate-300",
    borderColor: "border-slate-500/30",
  },
];

export function getProgramBadgeStyle(programName?: string) {
  if (!programName) {
    return {
      badgeBg: "bg-slate-100 dark:bg-slate-800/80",
      badgeText: "text-slate-500 dark:text-slate-400",
      borderColor: "border-slate-300 dark:border-slate-700",
    };
  }

  const match = PRESET_PROGRAMS.find(
    (p) => p.name.toLowerCase() === programName.toLowerCase() || p.id === programName.toLowerCase()
  );

  if (match) {
    return {
      badgeBg: match.badgeBg,
      badgeText: match.badgeText,
      borderColor: match.borderColor,
    };
  }

  return {
    badgeBg: "bg-indigo-50 dark:bg-indigo-950/60",
    badgeText: "text-indigo-600 dark:text-indigo-400",
    borderColor: "border-indigo-500/30",
  };
}
