import { ContactPerson } from "./lead";

export type ColdClientStatus =
  | "cold_no_answer"
  | "outreach_sent"
  | "follow_up_in_progress"
  | "interest"
  | "discussion_stakeholders"
  | "share_commercial"
  | "pricing_negotiations"
  | "closure_won"
  | "future_prospect"
  | "not_interested_lost"
  | "uncontacted"
  | "email_sent"
  | "follow_up_1"
  | "follow_up_2"
  | "call_scheduled"
  | "replied_interested"
  | "unresponsive"
  | "not_interested"
  | "converted";

export type OutreachChannel = "email" | "linkedin" | "call" | "referral" | "event" | "other";

export interface OutreachTouchpoint {
  id: string;
  timestamp: string; // ISO date string
  formattedDate: string;
  channel: OutreachChannel | "note";
  summary: string;
  author: string;
}

export interface ColdClient {
  id: string;
  companyName: string;
  companyLogo?: string;
  contactName: string;
  designation?: string;
  email: string;
  phone?: string;
  additionalContacts?: ContactPerson[]; // Additional people / stakeholders
  linkedinUrl?: string;
  website?: string;
  city?: string;
  industry: string;
  targetProgram?: string;
  estimatedPotentialValue?: number; // In INR
  status: ColdClientStatus;
  channel: OutreachChannel;
  owner: string; // User assigned
  notes?: string;
  touchpoints: OutreachTouchpoint[];
  lastContactDate?: string; // ISO string or YYYY-MM-DD
  nextFollowUpDate?: string; // YYYY-MM-DD
  convertedLeadId?: string; // Lead ID if converted to pipeline
  sheetRowNumber?: number; // Row index in synced Google Sheet
  sourceSheet?: string; // Google Sheet name or spreadsheet ID
  companySize?: string; // Company headcount / employee size (from sheets)
  createdAt: string;
  updatedAt: string;
}

export interface ColdStatusConfig {
  id: ColdClientStatus;
  label: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  headerBg: string;
  iconName: string;
  description: string;
}
