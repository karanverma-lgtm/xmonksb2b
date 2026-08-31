export type LeadStage =
  | "interest"
  | "proposal"
  | "discussion"
  | "negotiation"
  | "closure"
  | "closed_lost";

export interface JourneyLog {
  id: string;
  timestamp: string; // ISO string format
  formattedDate: string; // Human readable formatted date & time
  type: "stage_change" | "note" | "lead_created" | "value_update" | "contact_update";
  title: string;
  description: string;
  previousStage?: LeadStage;
  newStage?: LeadStage;
  author: string;
}

export interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  city?: string;
  industry: string;
  dealValue: number; // In INR
  stage: LeadStage;
  weightage: number; // Percentage e.g. 10, 25, 50, 75, 100
  expectedCloseDate: string;
  notes?: string;
  tags?: string[];
  owner: string;
  createdAt: string;
  updatedAt: string;
  journeyLogs: JourneyLog[];
}

export interface StageInfo {
  id: LeadStage;
  label: string;
  weightage: number;
  description: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  headerBg: string;
  iconName: string;
}
