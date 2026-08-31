import { LeadStage, StageInfo } from "@/types/lead";

export const STAGES: Record<LeadStage, StageInfo> = {
  interest: {
    id: "interest",
    label: "Interest",
    weightage: 10,
    description: "Initial client interest registered & qualified lead identification",
    badgeBg: "bg-blue-500/10 dark:bg-blue-500/20",
    badgeText: "text-blue-600 dark:text-blue-400 border-blue-500/30",
    borderColor: "border-blue-500",
    headerBg: "from-blue-600/10 to-transparent",
    iconName: "Sparkles",
  },
  proposal: {
    id: "proposal",
    label: "Share Proposal",
    weightage: 25,
    description: "Customized solution pitch & proposal submitted to prospect",
    badgeBg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    badgeText: "text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    borderColor: "border-indigo-500",
    headerBg: "from-indigo-600/10 to-transparent",
    iconName: "FileText",
  },
  discussion: {
    id: "discussion",
    label: "Discussion with Team",
    weightage: 50,
    description: "Internal stakeholder review, technical evaluation & demo",
    badgeBg: "bg-purple-500/10 dark:bg-purple-500/20",
    badgeText: "text-purple-600 dark:text-purple-400 border-purple-500/30",
    borderColor: "border-purple-500",
    headerBg: "from-purple-600/10 to-transparent",
    iconName: "Users",
  },
  negotiation: {
    id: "negotiation",
    label: "Pricing / Negotiations",
    weightage: 75,
    description: "Commercial terms, contract review & SLA finalization",
    badgeBg: "bg-amber-500/10 dark:bg-amber-500/20",
    badgeText: "text-amber-600 dark:text-amber-400 border-amber-500/30",
    borderColor: "border-amber-500",
    headerBg: "from-amber-600/10 to-transparent",
    iconName: "Scale",
  },
  closure: {
    id: "closure",
    label: "Closure (Won)",
    weightage: 100,
    description: "Deal signed, payment processed & onboarding initialized",
    badgeBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    badgeText: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    borderColor: "border-emerald-500",
    headerBg: "from-emerald-600/10 to-transparent",
    iconName: "CheckCircle2",
  },
  closed_lost: {
    id: "closed_lost",
    label: "Closed Lost",
    weightage: 0,
    description: "Opportunity passed or deferred for future consideration",
    badgeBg: "bg-rose-500/10 dark:bg-rose-500/20",
    badgeText: "text-rose-600 dark:text-rose-400 border-rose-500/30",
    borderColor: "border-rose-500",
    headerBg: "from-rose-600/10 to-transparent",
    iconName: "XCircle",
  },
};

export const STAGE_ORDER: LeadStage[] = [
  "interest",
  "proposal",
  "discussion",
  "negotiation",
  "closure",
  "closed_lost",
];

export const PIPELINE_STAGES: LeadStage[] = [
  "interest",
  "proposal",
  "discussion",
  "negotiation",
  "closure",
];

export function getWeightageForStage(stage: LeadStage): number {
  return STAGES[stage]?.weightage ?? 0;
}
