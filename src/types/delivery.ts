import { LeadStage, ApproachNote, FinancialDocument, ContactPerson, JourneyLog } from "./lead";

export type TenureType = "delivery" | "payment_terms" | "contract";

export type MilestoneCompletionStatus = "pending" | "in_progress" | "completed";
export type TranchePaymentStatus = "pending" | "invoiced" | "received" | "overdue";
export type DeliveryOverallStatus = "not_started" | "in_progress" | "delivered" | "on_hold";
export type ProjectHealthStatus = "on_track" | "at_risk" | "stalled";

export type SimpleDeliveryStatus = "not_started" | "in_delivery" | "delivered" | "on_hold";
export type SimpleBillingStatus = "unbilled" | "invoiced" | "paid_in_full";

export function getSimpleDeliveryStatus(record: {
  deliveryStatus?: DeliveryOverallStatus;
  overallCompletionPercent?: number;
}): {
  status: SimpleDeliveryStatus;
  label: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
} {
  if (record.deliveryStatus === "delivered" || (record.overallCompletionPercent || 0) >= 100) {
    return {
      status: "delivered",
      label: "Delivered",
      badgeBg: "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800",
      badgeText: "text-emerald-700 dark:text-emerald-300",
      dotColor: "bg-emerald-500",
    };
  }
  if (record.deliveryStatus === "in_progress" || (record.overallCompletionPercent || 0) > 0) {
    return {
      status: "in_delivery",
      label: "In Delivery",
      badgeBg: "bg-amber-50 dark:bg-amber-950/70 border-amber-200 dark:border-amber-800",
      badgeText: "text-amber-700 dark:text-amber-300",
      dotColor: "bg-amber-500",
    };
  }
  if (record.deliveryStatus === "on_hold") {
    return {
      status: "on_hold",
      label: "On Hold",
      badgeBg: "bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-800",
      badgeText: "text-rose-700 dark:text-rose-300",
      dotColor: "bg-rose-500",
    };
  }
  return {
    status: "not_started",
    label: "Not Started",
    badgeBg: "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
    badgeText: "text-slate-600 dark:text-slate-400",
    dotColor: "bg-slate-400",
  };
}

export function getSimpleBillingStatus(
  dealValue: number,
  invoicedAmount: number,
  receivedAmount: number
): {
  status: SimpleBillingStatus;
  label: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
} {
  if (receivedAmount >= dealValue && dealValue > 0) {
    return {
      status: "paid_in_full",
      label: "Paid in Full",
      badgeBg: "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800",
      badgeText: "text-emerald-700 dark:text-emerald-300",
      dotColor: "bg-emerald-500",
    };
  }
  if (invoicedAmount > 0) {
    return {
      status: "invoiced",
      label: "Invoiced",
      badgeBg: "bg-blue-50 dark:bg-blue-950/70 border-blue-200 dark:border-blue-800",
      badgeText: "text-blue-700 dark:text-blue-300",
      dotColor: "bg-blue-500",
    };
  }
  return {
    status: "unbilled",
    label: "Unbilled",
    badgeBg: "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
    badgeText: "text-slate-600 dark:text-slate-400",
    dotColor: "bg-slate-400",
  };
}

/**
 * 1. Delivery Option: Milestone & Project Completion Linked Payment Tranche
 * Example: 20% of project completed -> 30% payment triggered
 */
export interface DeliveryMilestoneTranche {
  id: string;
  milestoneTitle: string; // e.g. "Phase 1: Project Kickoff & Discovery"
  projectCompletionPercent: number; // e.g. 20 (meaning 20% of project completed)
  paymentPercent: number; // e.g. 30 (meaning 30% payment released)
  amount: number; // Auto-calculated: dealValue * (paymentPercent / 100)
  milestoneStatus: MilestoneCompletionStatus;
  paymentStatus: TranchePaymentStatus;
  targetDate?: string;
  completionDate?: string;
  assignedCoach?: string;
  paymentReceivedDate?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  gstNumber?: string;
  utrNumber?: string; // UTR / Wire Reference / Cheque number
  bankReference?: string;
  paymentProofUrl?: string;
  notes?: string;
}

/**
 * 2. Payment Terms Option: Time & Schedule / Advance Payment Tranche
 * Example: 30% advance payment upfront -> 20% after 3 months
 */
export interface PaymentTermTranche {
  id: string;
  termLabel: string; // e.g. "Advance Payment", "Installment 1", "Final Balance"
  isAdvance?: boolean;
  timeframe: string; // e.g. "Advance (Immediate)", "After 1 Month", "After 2 Months", "After 3 Months", "After 6 Months", "On Completion"
  paymentPercent: number; // e.g. 30
  amount: number; // Auto-calculated: dealValue * (paymentPercent / 100)
  dueDate?: string;
  paymentStatus: TranchePaymentStatus;
  paymentReceivedDate?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  gstNumber?: string;
  utrNumber?: string;
  bankReference?: string;
  paymentProofUrl?: string;
  notes?: string;
}

/**
 * 3. Faculty & Coach Allocation Matrix
 * Tracks ICF Executive Coaches, Facilitators, and delivery faculty assigned to engagements
 */
export interface CoachAssignment {
  id: string;
  name: string;
  role: "lead_facilitator" | "executive_coach" | "program_manager" | "faculty";
  email?: string;
  phone?: string;
  payoutRate?: number; // Total or per-session payout in INR
  assignedSessionsCount: number;
  completedSessionsCount: number;
  notes?: string;
}

/**
 * 4. Client Sign-off & CSAT Pulse
 * Formal client acceptance certificate & satisfaction rating
 */
export interface ClientSignoff {
  signatoryName: string;
  signatoryDesignation: string;
  signatoryEmail?: string;
  signoffDate: string;
  feedbackNotes?: string;
  clientFeedback?: string;
  csatRating: number; // 1 to 5 stars
  npsScore?: number; // 0 to 10
  certificateGenerated?: boolean;
  certificateDate?: string;
}

export interface DeliveryLog {
  id: string;
  timestamp: string;
  formattedDate: string;
  author: string;
  type:
    | "status_change"
    | "milestone_update"
    | "payment_received"
    | "tenure_change"
    | "health_change"
    | "coach_assigned"
    | "invoice_generated"
    | "client_signoff"
    | "note";
  message: string;
}

export interface DeliveryRecord {
  id: string;
  leadId: string;
  companyName: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  city?: string;
  industry?: string;
  program?: string;
  dealValue: number; // Total Project / Contract Value in INR
  clientPartner: string;
  deliveryLead?: string; // Assigned delivery lead / manager
  createdAt: string;
  updatedAt: string;

  // Preexisting Pipeline Data from CRM
  companyLogo?: string;
  designation?: string;
  leadSource?: string;
  stage?: LeadStage;
  weightage?: number;
  closureMonth?: string;
  expectedCloseDate?: string;
  pipelineNotes?: string;
  additionalContacts?: ContactPerson[];
  approachNotes?: ApproachNote[];
  financialDocuments?: FinancialDocument[];
  journeyLogs?: JourneyLog[];

  // Tenure Configuration
  tenureType: TenureType; // "delivery" | "payment_terms" | "contract"

  // Option 1: Delivery (Project Completion Milestones)
  deliveryMilestones: DeliveryMilestoneTranche[];

  // Option 2: Payment Terms (Time / Advance Schedule)
  paymentTerms: PaymentTermTranche[];

  // Delivery Execution Stats
  deliveryStatus: DeliveryOverallStatus;
  overallCompletionPercent: number; // 0 - 100%
  startDate?: string;
  targetCompletionDate?: string;
  notes?: string;
  deliveryLogs?: DeliveryLog[];

  // 1. Delivery Risk & Project Health
  projectHealth?: ProjectHealthStatus; // "on_track" | "at_risk" | "stalled"
  healthBlocker?: string; // Description of current operational blocker

  // 2. Invoicing details
  gstNumber?: string;
  clientBillingAddress?: string;

  // 3. Coach & Faculty Allocation Matrix
  coaches?: CoachAssignment[];
  coachingSessionsTotal?: number;
  coachingSessionsCompleted?: number;
  totalFacultyCost?: number; // Total coach payouts in INR

  // 5. Client Sign-off & CSAT Pulse
  clientSignoff?: ClientSignoff;

  // 6. Client Shareable Portal Token
  shareToken?: string;
}
