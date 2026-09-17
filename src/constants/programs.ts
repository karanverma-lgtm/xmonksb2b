export interface ProgramOption {
  id: string;
  name: string;
  category: "coaching" | "transformation" | "consulting" | "assessments" | "custom";
  description: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
}

export const PRESET_PROGRAMS: ProgramOption[] = [
  {
    id: "executive-coaching",
    name: "Executive Coaching",
    category: "coaching",
    description: "1-on-1 personalized C-suite and VP executive coaching cohorts & leadership presence.",
    badgeBg: "bg-indigo-50 dark:bg-indigo-950/60",
    badgeText: "text-indigo-600 dark:text-indigo-400",
    borderColor: "border-indigo-500/30",
  },
  {
    id: "ld-transformation",
    name: "L&D Transformation",
    category: "transformation",
    description: "Comprehensive multi-tier learning and development transformation & capability architecture.",
    badgeBg: "bg-purple-50 dark:bg-purple-950/60",
    badgeText: "text-purple-600 dark:text-purple-400",
    borderColor: "border-purple-500/30",
  },
  {
    id: "tasc-inhouse",
    name: "TASC Inhouse",
    category: "consulting",
    description: "In-house strategic talent solutions, organizational agility, and customized consulting.",
    badgeBg: "bg-teal-50 dark:bg-teal-950/60",
    badgeText: "text-teal-600 dark:text-teal-400",
    borderColor: "border-teal-500/30",
  },
  {
    id: "assessments",
    name: "Assessments",
    category: "assessments",
    description: "Psychometric, 360-degree leadership potential, and organizational capability assessments.",
    badgeBg: "bg-amber-50 dark:bg-amber-950/60",
    badgeText: "text-amber-600 dark:text-amber-400",
    borderColor: "border-amber-500/30",
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

  const clean = programName.toLowerCase().trim();

  // Match exact presets or IDs
  const match = PRESET_PROGRAMS.find(
    (p) => p.name.toLowerCase() === clean || p.id === clean
  );

  if (match) {
    return {
      badgeBg: match.badgeBg,
      badgeText: match.badgeText,
      borderColor: match.borderColor,
    };
  }

  // Graceful fallback for legacy program strings
  if (clean.includes("coach")) {
    return PRESET_PROGRAMS[0];
  }
  if (clean.includes("l&d") || clean.includes("leadership") || clean.includes("learn") || clean.includes("culture")) {
    return PRESET_PROGRAMS[1];
  }
  if (clean.includes("tasc") || clean.includes("inhouse")) {
    return PRESET_PROGRAMS[2];
  }
  if (clean.includes("assess") || clean.includes("psychometric")) {
    return PRESET_PROGRAMS[3];
  }

  return {
    badgeBg: "bg-indigo-50 dark:bg-indigo-950/60",
    badgeText: "text-indigo-600 dark:text-indigo-400",
    borderColor: "border-indigo-500/30",
  };
}
