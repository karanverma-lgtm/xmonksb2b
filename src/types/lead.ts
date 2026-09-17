export type LeadStage =
  | "interest"
  | "proposal"
  | "discussion"
  | "negotiation"
  | "closure"
  | "closed_lost";

export interface ApproachNote {
  fileName: string;
  fileSize: string;
  fileSizeBytes?: number;
  uploadedAt: string;
  uploadedBy: string;
  downloadUrl: string;
  storagePath?: string;
}

export interface JourneyLog {
  id: string;
  timestamp: string; // ISO string format
  formattedDate: string; // Human readable formatted date & time
  type:
    | "stage_change"
    | "note"
    | "lead_created"
    | "value_update"
    | "contact_update"
    | "program_update"
    | "lead_source_update"
    | "approach_note"
    | "closure_month_update"
    | "logo_update";
  title: string;
  description: string;
  previousStage?: LeadStage;
  newStage?: LeadStage;
  author: string;
}

export interface Lead {
  id: string;
  companyName: string;
  companyLogo?: string; // Image URL or Base64 data URI of company logo
  contactName: string;
  designation?: string;
  contactEmail: string;
  contactPhone?: string;
  city?: string;
  industry: string;
  program?: string; // Executive Coaching, L&D Transformation, TASC Inhouse, Assessments
  leadSource?: string; // Event Based, Self Created, Marketing, TASC Upselling
  dealValue: number; // In INR
  stage: LeadStage;
  weightage: number; // Percentage e.g. 10, 25, 50, 75, 100
  expectedCloseDate: string;
  closureMonth?: string; // Target conversion deadline e.g. "2026-10"
  approachNote?: ApproachNote; // Uploaded approach note in PDF format
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
