export type LeadStage =
  | "interest"
  | "proposal"
  | "discussion"
  | "negotiation"
  | "closure"
  | "closed_lost";

export interface ApproachNote {
  id?: string; // Unique document ID
  fileName: string;
  fileSize: string;
  fileSizeBytes?: number;
  fileType?: string; // MIME type or file extension
  uploadedAt: string;
  uploadedBy: string;
  downloadUrl: string;
  storagePath?: string;
}

export interface ContactPerson {
  id: string; // Unique contact ID
  name: string;
  contactNumber?: string; // Phone / mobile number
  email?: string;
  designation?: string;
  addedAt?: string;
}

export interface FinancialDocument {
  id: string; // Unique document ID
  fileName: string;
  fileSize: string;
  fileSizeBytes?: number;
  fileType?: string; // MIME type or file extension
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
    | "financial_document"
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
  approachNote?: ApproachNote; // Legacy single approach note
  approachNotes?: ApproachNote[]; // Uploaded approach notes (multi-upload, all formats allowed)
  financialDocuments?: FinancialDocument[]; // Attached financial documents (multi-upload, all formats allowed)
  additionalContacts?: ContactPerson[]; // Additional stakeholders / people associated with this client
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
