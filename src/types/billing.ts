export interface BillingPayment {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMethod: "bank_transfer" | "neft_rtgs" | "cheque" | "upi" | "card" | "other";
  referenceNumber?: string;
  receiptUrl?: string;
  notes?: string;
  recordedBy?: string;
  createdAt?: string;
}

export interface BillingPaymentDefault {
  id: string;
  dueDate: string; // YYYY-MM-DD
  expectedAmount: number;
  daysOverdue: number;
  reason?: string;
  status: "pending_resolution" | "resolved" | "written_off" | "legal_notice";
  resolvedDate?: string;
  resolutionNotes?: string;
  flaggedBy?: string;
  createdAt?: string;
}

export interface BillingDocument {
  id: string;
  name: string;
  category: "contract" | "nda" | "invoice" | "gst" | "po" | "proposal" | "compliance" | "other";
  fileSize: string; // Formatted e.g. "1.8 MB"
  fileSizeBytes?: number;
  fileType: string; // MIME type or extension
  downloadUrl: string;
  storagePath?: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface VendorInfo {
  companyName: string;
  contactPerson: string;
  companyAddress: string;
  contactPersonPhone: string;
  contactPersonEmail: string;
  profilePictureUrl?: string; // Profile Picture of Contact Person
  companyLogoUrl?: string; // Company Logo
  gstin?: string;
  pan?: string;
  website?: string;
  designation?: string;
  industry?: string;
  city?: string;
  program?: string;
  leadSource?: string;
}

export type BillingStatus = "active" | "completed" | "defaulted" | "on_hold";

export interface BillingRecord {
  id: string;
  leadId?: string; // Optional link to CRM Lead
  projectName: string;
  contractNumber?: string;
  status: BillingStatus;

  // Pipeline Closure Sync Details
  industry?: string;
  city?: string;
  designation?: string;
  program?: string; // Pitched Program e.g. Executive Coaching, L&D Transformation
  leadSource?: string; // Marketing, Event Based, etc.
  closureMonth?: string; // Target conversion deadline e.g. "2026-10"
  expectedCloseDate?: string;
  pipelineStage?: string; // e.g. "closure"
  pipelineDealValue?: number; // Original pipeline deal value in INR
  pipelineWeightage?: number; // e.g. 100
  approachNote?: {
    fileName: string;
    fileSize: string;
    fileSizeBytes?: number;
    uploadedAt: string;
    uploadedBy: string;
    downloadUrl: string;
    storagePath?: string;
  };
  tags?: string[];

  // 1. Project Amount
  projectAmount: number; // In INR

  // 2. Tenure
  tenureMonths: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  billingFrequency: "one_time" | "monthly" | "quarterly" | "milestone" | "annual";

  // 3. Amount Received Till Now
  amountReceived: number; // In INR
  pendingAmount: number; // projectAmount - amountReceived
  paymentHistory: BillingPayment[];

  // 4. Any Payment Defaults
  hasDefaults: boolean;
  defaultCount: number;
  defaultedAmount: number; // Total overdue defaulted amount in INR
  defaultNotes?: string;
  defaultsHistory: BillingPaymentDefault[];

  // 5. Vendor Information
  vendor: VendorInfo;

  // 6. Company Documents
  documents: BillingDocument[];

  // Audit Fields
  notes?: string;
  owner?: string; // Lead Owner / Client Partner
  createdBy?: string;
  createdAt: string;
  createdAtMs: number;
  updatedAt: string;
}
