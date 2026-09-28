import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import {
  BillingRecord,
  BillingPayment,
  BillingPaymentDefault,
  BillingDocument,
  BillingStatus,
  VendorCredential,
} from "@/types/billing";
import { Lead } from "@/types/lead";

const BILLING_COLLECTION = "b2b_billing_records";
const BILLING_STORAGE_KEY = "xmonks_b2b_billing_records";
const BILLING_INITIALIZED_KEY = "xmonks_b2b_billing_initialized_v2";

// Initial Demo Seed Records
export const INITIAL_BILLING_RECORDS: BillingRecord[] = [
  {
    id: "bill-zenith-001",
    leadId: "lead-zenith-001",
    projectName: "Enterprise Leadership & CXO Succession Cohort",
    contractNumber: "XMB-2026-0881",
    status: "active",
    industry: "Technology",
    city: "Bengaluru",
    designation: "VP of Engineering & HR Sponsor",
    program: "Executive Coaching",
    leadSource: "Event Based",
    closureMonth: "2026-01",
    expectedCloseDate: "2026-01-15",
    pipelineStage: "closure",
    pipelineDealValue: 2400000,
    pipelineWeightage: 100,
    projectAmount: 2400000,
    tenureMonths: 12,
    startDate: "2026-01-15",
    endDate: "2027-01-14",
    billingFrequency: "monthly",
    amountReceived: 1600000,
    pendingAmount: 800000,
    advancePaymentAmount: 400000,
    hasDefaults: false,
    defaultCount: 0,
    defaultedAmount: 0,
    paymentHistory: [
      {
        id: "pay-z1",
        amount: 400000,
        date: "2026-01-20",
        paymentMethod: "neft_rtgs",
        referenceNumber: "HDFC982348271",
        notes: "Advance 2-month mobilization fee",
        recordedBy: "Finance Admin",
        isAdvance: true,
      },
      {
        id: "pay-z2",
        amount: 600000,
        date: "2026-04-10",
        paymentMethod: "bank_transfer",
        referenceNumber: "ICIC487219920",
        notes: "Q1 Cohort milestone payment",
        recordedBy: "Ruby Dayal",
      },
      {
        id: "pay-z3",
        amount: 600000,
        date: "2026-07-15",
        paymentMethod: "bank_transfer",
        referenceNumber: "ICIC998231002",
        notes: "Q2 Executive coaching reviews",
        recordedBy: "Amit",
      },
    ],
    defaultsHistory: [],
    vendor: {
      companyName: "Zenith Cloud Technologies Pvt Ltd",
      contactPerson: "Aarav Patel",
      designation: "VP of Engineering & HR Sponsor",
      companyAddress: "Block C-4, Outer Ring Road, Bellandur, Bengaluru, Karnataka 560103",
      contactPersonPhone: "+91 98450 12345",
      contactPersonEmail: "aarav.patel@zenithcloud.in",
      companyLogoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80",
      profilePictureUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
      gstin: "29AABCZ9876K1Z5",
      pan: "AABCZ9876K",
      website: "https://zenithcloud.in",
      industry: "Technology",
      city: "Bengaluru",
      program: "Executive Coaching",
      leadSource: "Event Based",
    },
    documents: [
      {
        id: "doc-z1",
        name: "Master_Service_Agreement_Zenith_xMonks.pdf",
        category: "contract",
        fileSize: "2.4 MB",
        fileSizeBytes: 2516582,
        fileType: "application/pdf",
        downloadUrl: "#",
        uploadedAt: "2026-01-16T10:30:00Z",
        uploadedBy: "Legal Team",
      },
      {
        id: "doc-z2",
        name: "GSTIN_Certificate_Zenith_Cloud.pdf",
        category: "gst",
        fileSize: "680 KB",
        fileSizeBytes: 696320,
        fileType: "application/pdf",
        downloadUrl: "#",
        uploadedAt: "2026-01-16T11:00:00Z",
        uploadedBy: "Finance Admin",
      },
    ],
    credentials: [
      {
        id: "cred-zenith-1",
        platformUrl: "https://vendor.zenithcloud.in/portal/login",
        platformName: "Zenith Vendor Management Portal",
        usernameOrEmail: "finance.xmonks@zenithcloud.in",
        password: "Zenith#Vendor$2026",
        description: "Upload monthly GST invoices and timesheet logs before the 25th of each month.",
        createdAt: "2026-01-16T12:00:00Z",
        updatedAt: "2026-01-16T12:00:00Z",
      },
      {
        id: "cred-zenith-2",
        platformUrl: "https://lms.zenithcloud.in/admin",
        platformName: "Cornerstone Cohort LMS Admin",
        usernameOrEmail: "aarav.patel@zenithcloud.in",
        password: "CXO#Leadership!99",
        description: "Admin portal to view executive attendance and assessment completions.",
        createdAt: "2026-01-20T15:30:00Z",
        updatedAt: "2026-01-20T15:30:00Z",
      },
    ],
    notes: "High strategic account. Scheduled for renewal discussion in Nov 2026.",
    createdAt: "15 Jan 2026, 11:30 am",
    createdAtMs: 1768456800000,
    updatedAt: "15 Jul 2026, 04:45 pm",
    createdBy: "Ruby Dayal",
    owner: "Ruby",
  },
  {
    id: "bill-apex-002",
    leadId: "lead-apex-002",
    projectName: "Supply Chain Leaders Coaching & Team Alignment",
    contractNumber: "XMB-2026-0942",
    status: "defaulted",
    industry: "Logistics & Supply Chain",
    city: "Mumbai",
    designation: "Chief Human Resources Officer",
    program: "L&D Transformation",
    leadSource: "Self Created",
    closureMonth: "2026-03",
    expectedCloseDate: "2026-03-01",
    pipelineStage: "closure",
    pipelineDealValue: 1500000,
    pipelineWeightage: 100,
    projectAmount: 1500000,
    tenureMonths: 6,
    startDate: "2026-03-01",
    endDate: "2026-08-31",
    billingFrequency: "milestone",
    amountReceived: 500000,
    pendingAmount: 1000000,
    hasDefaults: true,
    defaultCount: 1,
    defaultedAmount: 500000,
    defaultNotes: "Milestone 2 payment overdue by 42 days. Procurement restructuring at client side.",
    paymentHistory: [
      {
        id: "pay-a1",
        amount: 500000,
        date: "2026-03-05",
        paymentMethod: "bank_transfer",
        referenceNumber: "SBIN002938192",
        notes: "Milestone 1 project kickoff payment",
        recordedBy: "Finance Admin",
      },
    ],
    defaultsHistory: [
      {
        id: "def-a1",
        dueDate: "2026-05-15",
        expectedAmount: 500000,
        daysOverdue: 42,
        reason: "Internal leadership reshuffle and finance ERP migration at Apex HQ.",
        status: "pending_resolution",
        flaggedBy: "Amit",
        createdAt: "2026-05-20T09:00:00Z",
      },
    ],
    vendor: {
      companyName: "Apex Global Logistics Ltd",
      contactPerson: "Meera Nair",
      designation: "Chief Human Resources Officer",
      companyAddress: "Floor 7, BKC Towers, Bandra Kurla Complex, Mumbai, Maharashtra 400051",
      contactPersonPhone: "+91 98200 45678",
      contactPersonEmail: "meera.nair@apexlogistics.com",
      companyLogoUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=120&auto=format&fit=crop&q=80",
      profilePictureUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80",
      gstin: "27AABCA3344M1Z2",
      pan: "AABCA3344M",
      website: "https://apexlogistics.com",
      industry: "Logistics & Supply Chain",
      city: "Mumbai",
      program: "L&D Transformation",
      leadSource: "Self Created",
    },
    documents: [
      {
        id: "doc-a1",
        name: "Apex_Logistics_Executed_Agreement.pdf",
        category: "contract",
        fileSize: "3.1 MB",
        fileSizeBytes: 3250585,
        fileType: "application/pdf",
        downloadUrl: "#",
        uploadedAt: "2026-03-02T14:20:00Z",
        uploadedBy: "Finance Admin",
      },
      {
        id: "doc-a2",
        name: "Formal_Payment_Reminder_Milestone2.pdf",
        category: "invoice",
        fileSize: "420 KB",
        fileSizeBytes: 430080,
        fileType: "application/pdf",
        downloadUrl: "#",
        uploadedAt: "2026-05-22T10:15:00Z",
        uploadedBy: "Amit",
      },
    ],
    notes: "Follow up call scheduled with Meera Nair on Friday regarding pending release.",
    createdAt: "01 Mar 2026, 09:15 am",
    createdAtMs: 1772346000000,
    updatedAt: "22 May 2026, 11:30 am",
    createdBy: "Amit",
    owner: "Amit",
  },
  {
    id: "bill-quantum-003",
    leadId: "lead-quantum-003",
    projectName: "Clinical Leadership & High-Po Development Program",
    contractNumber: "XMB-2026-1015",
    status: "active",
    industry: "Healthcare & Life Sciences",
    city: "Bengaluru",
    designation: "Head of Medical Affairs & R&D",
    program: "Assessments",
    leadSource: "Marketing",
    closureMonth: "2026-02",
    expectedCloseDate: "2026-02-01",
    pipelineStage: "closure",
    pipelineDealValue: 1850000,
    pipelineWeightage: 100,
    projectAmount: 1850000,
    tenureMonths: 9,
    startDate: "2026-02-01",
    endDate: "2026-10-31",
    billingFrequency: "quarterly",
    amountReceived: 1200000,
    pendingAmount: 650000,
    hasDefaults: false,
    defaultCount: 0,
    defaultedAmount: 0,
    paymentHistory: [
      {
        id: "pay-q1",
        amount: 600000,
        date: "2026-02-10",
        paymentMethod: "neft_rtgs",
        referenceNumber: "KKBK001928374",
        notes: "Tranche 1 initiation",
        recordedBy: "Finance Admin",
      },
      {
        id: "pay-q2",
        amount: 600000,
        date: "2026-05-28",
        paymentMethod: "neft_rtgs",
        referenceNumber: "KKBK008827361",
        notes: "Tranche 2 assessment completion",
        recordedBy: "Ruby Dayal",
      },
    ],
    defaultsHistory: [],
    vendor: {
      companyName: "Quantum Medical Systems India",
      contactPerson: "Dr. Vikram Sethi",
      designation: "Head of Medical Affairs & R&D",
      companyAddress: "Plot 88, Electronic City Phase 1, Hosur Road, Bengaluru, Karnataka 560100",
      contactPersonPhone: "+91 97110 88231",
      contactPersonEmail: "v.sethi@quantummed.org",
      companyLogoUrl: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=120&auto=format&fit=crop&q=80",
      profilePictureUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
      gstin: "29AAACQ1122P1Z0",
      pan: "AAACQ1122P",
      website: "https://quantummed.org",
      industry: "Healthcare & Life Sciences",
      city: "Bengaluru",
      program: "Assessments",
      leadSource: "Marketing",
    },
    documents: [
      {
        id: "doc-q1",
        name: "Quantum_Medical_SOW_Engagement.pdf",
        category: "contract",
        fileSize: "1.9 MB",
        fileSizeBytes: 1992294,
        fileType: "application/pdf",
        downloadUrl: "#",
        uploadedAt: "2026-02-02T15:00:00Z",
        uploadedBy: "Ruby Dayal",
      },
    ],
    notes: "Tranche 3 due in October 2026 upon final presentation.",
    createdAt: "01 Feb 2026, 10:00 am",
    createdAtMs: 1769922000000,
    updatedAt: "28 May 2026, 03:20 pm",
    createdBy: "Ruby Dayal",
    owner: "Ruby",
  },
  {
    id: "bill-nova-004",
    leadId: "lead-nova-004",
    projectName: "Strategic Change & Executive Transition Coaching",
    contractNumber: "XMB-2025-0720",
    status: "completed",
    industry: "BFSI",
    city: "Mumbai",
    designation: "Managing Director - People & Talent",
    program: "Executive Coaching",
    leadSource: "TASC Upselling",
    closureMonth: "2025-09",
    expectedCloseDate: "2025-09-01",
    pipelineStage: "closure",
    pipelineDealValue: 3200000,
    pipelineWeightage: 100,
    projectAmount: 3200000,
    tenureMonths: 18,
    startDate: "2025-09-01",
    endDate: "2027-02-28",
    billingFrequency: "quarterly",
    amountReceived: 3200000,
    pendingAmount: 0,
    hasDefaults: false,
    defaultCount: 0,
    defaultedAmount: 0,
    paymentHistory: [
      {
        id: "pay-n1",
        amount: 800000,
        date: "2025-09-15",
        paymentMethod: "bank_transfer",
        referenceNumber: "CITI001239841",
        notes: "Tranche 1 kickoff",
        recordedBy: "Finance Admin",
      },
      {
        id: "pay-n2",
        amount: 800000,
        date: "2025-12-20",
        paymentMethod: "bank_transfer",
        referenceNumber: "CITI002348912",
        notes: "Tranche 2",
        recordedBy: "Finance Admin",
      },
      {
        id: "pay-n3",
        amount: 800000,
        date: "2026-03-30",
        paymentMethod: "bank_transfer",
        referenceNumber: "CITI003948123",
        notes: "Tranche 3",
        recordedBy: "Finance Admin",
      },
      {
        id: "pay-n4",
        amount: 800000,
        date: "2026-06-25",
        paymentMethod: "bank_transfer",
        referenceNumber: "CITI004918234",
        notes: "Final Tranche 4 settlement",
        recordedBy: "Finance Admin",
      },
    ],
    defaultsHistory: [],
    vendor: {
      companyName: "Nova Financial Partners LLP",
      contactPerson: "Rohan Kapoor",
      designation: "Managing Director - People & Talent",
      companyAddress: "Express Towers, 14th Floor, Nariman Point, Mumbai, Maharashtra 400021",
      contactPersonPhone: "+91 98210 99887",
      contactPersonEmail: "rohan.kapoor@novafin.com",
      companyLogoUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=120&auto=format&fit=crop&q=80",
      profilePictureUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
      gstin: "27AAACN5566R1Z9",
      pan: "AAACN5566R",
      website: "https://novafin.com",
      industry: "BFSI",
      city: "Mumbai",
      program: "Executive Coaching",
      leadSource: "TASC Upselling",
    },
    documents: [
      {
        id: "doc-n1",
        name: "Full_and_Final_Signoff_Certificate_Nova.pdf",
        category: "compliance",
        fileSize: "1.4 MB",
        fileSizeBytes: 1468006,
        fileType: "application/pdf",
        downloadUrl: "#",
        uploadedAt: "2026-06-26T12:00:00Z",
        uploadedBy: "Finance Admin",
      },
    ],
    notes: "100% paid on time. Ideal enterprise case study partner.",
    createdAt: "01 Sep 2025, 10:00 am",
    createdAtMs: 1756708800000,
    updatedAt: "26 Jun 2026, 01:10 pm",
    createdBy: "Gaurav",
    owner: "Gaurav",
  },
];

// --- LOCAL STORAGE HELPERS ---

export function getStoredBillingRecords(): BillingRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BILLING_STORAGE_KEY);
    if (raw !== null) {
      const parsed: BillingRecord[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed; // Can be empty array [] if user deleted all records
      }
    }

    // Only seed on brand new first-time setup if never initialized
    const isInitialized = localStorage.getItem(BILLING_INITIALIZED_KEY) === "true";
    if (!isInitialized) {
      localStorage.setItem(BILLING_INITIALIZED_KEY, "true");
      saveLocalBillingRecords(INITIAL_BILLING_RECORDS);
      return INITIAL_BILLING_RECORDS;
    }
  } catch (e) {
    console.warn("Error reading billing records from localStorage", e);
  }
  return [];
}

export function saveLocalBillingRecords(records: BillingRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn("Failed to save billing records to localStorage", e);
  }
}

// --- REAL-TIME FIRESTORE SUBSCRIPTIONS ---

export function subscribeToBillingRecords(
  onData: (records: BillingRecord[], isFirebaseSyncing: boolean) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let unsubscribed = false;

  try {
    const ref = collection(db, BILLING_COLLECTION);
    const q = query(ref, orderBy("createdAtMs", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (unsubscribed) return;
        if (!snapshot.empty) {
          const firestoreRecords: BillingRecord[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<BillingRecord, "id">),
          }));
          if (typeof window !== "undefined") {
            localStorage.setItem(BILLING_INITIALIZED_KEY, "true");
          }
          saveLocalBillingRecords(firestoreRecords);
          onData(firestoreRecords, true);
        } else {
          // Snapshot is empty: Check if brand-new install vs user intentionally deleted all records
          const isInitialized =
            typeof window !== "undefined" &&
            localStorage.getItem(BILLING_INITIALIZED_KEY) === "true";

          if (!isInitialized) {
            // First time setup only: Seed initial records
            if (typeof window !== "undefined") {
              localStorage.setItem(BILLING_INITIALIZED_KEY, "true");
            }
            saveLocalBillingRecords(INITIAL_BILLING_RECORDS);
            INITIAL_BILLING_RECORDS.forEach((item) => {
              const docRef = doc(db, BILLING_COLLECTION, item.id);
              setDoc(docRef, item, { merge: true }).catch(() => {});
            });
            onData(INITIAL_BILLING_RECORDS, true);
          } else {
            // User deleted all records: Keep it empty! DO NOT resurrect demo data!
            saveLocalBillingRecords([]);
            onData([], true);
          }
        }
      },
      (error) => {
        console.warn("Firestore billing subscription fallback to local:", error);
        if (!unsubscribed) {
          onData(getStoredBillingRecords(), false);
        }
      }
    );

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  } catch (err) {
    console.warn("Firestore billing init error, using local:", err);
    onData(getStoredBillingRecords(), false);
    return () => {};
  }
}

// --- CRUD OPERATIONS ---

export function saveBillingRecord(
  data: Omit<BillingRecord, "id" | "createdAt" | "createdAtMs" | "updatedAt" | "pendingAmount"> & {
    id?: string;
    createdAt?: string;
    createdAtMs?: number;
  }
): BillingRecord {
  const now = Date.now();
  const id = data.id || `bill-${now}-${Math.random().toString(36).substring(2, 6)}`;
  const createdAtMs = data.createdAtMs || now;
  const createdAt =
    data.createdAt ||
    new Date(createdAtMs).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });
  const updatedAt = new Date(now).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const projectAmount = Number(data.projectAmount) || 0;
  const amountReceived = Number(data.amountReceived) || 0;
  const pendingAmount = Math.max(0, projectAmount - amountReceived);

  // Auto determine status if fully paid
  let status: BillingStatus = data.status || "active";
  if (data.hasDefaults) {
    status = "defaulted";
  } else if (pendingAmount === 0 && projectAmount > 0) {
    status = "completed";
  }

  const record: BillingRecord = {
    ...data,
    id,
    projectAmount,
    amountReceived,
    pendingAmount,
    status,
    createdAt,
    createdAtMs,
    updatedAt,
  };

  // 1. Update local storage
  const current = getStoredBillingRecords();
  const existingIdx = current.findIndex((r) => r.id === id);
  let updatedList: BillingRecord[] = [];
  if (existingIdx >= 0) {
    current[existingIdx] = record;
    updatedList = [...current];
  } else {
    updatedList = [record, ...current];
  }
  saveLocalBillingRecords(updatedList);

  // 2. Sync to Firestore
  if (typeof window !== "undefined") {
    try {
      const docRef = doc(db, BILLING_COLLECTION, id);
      setDoc(docRef, record, { merge: true }).catch((err) =>
        console.warn("Firestore save billing record warning:", err)
      );
    } catch (e) {
      console.warn("Firestore save billing record error:", e);
    }
  }

  return record;
}

export function deleteBillingRecord(recordId: string): void {
  // Ensure initialized flag is saved so empty state is never overwritten by demo records
  if (typeof window !== "undefined") {
    localStorage.setItem(BILLING_INITIALIZED_KEY, "true");
  }

  // 1. Update local storage
  const current = getStoredBillingRecords();
  const filtered = current.filter((r) => r.id !== recordId);
  saveLocalBillingRecords(filtered);

  // 2. Delete from Firestore
  if (typeof window !== "undefined") {
    try {
      const docRef = doc(db, BILLING_COLLECTION, recordId);
      deleteDoc(docRef).catch((err) =>
        console.warn("Firestore delete billing warning:", err)
      );
    } catch (e) {
      console.warn("Firestore delete billing error:", e);
    }
  }
}

/**
 * Permanently deletes multiple billing records from Firestore and localStorage without auto re-seeding.
 */
export async function clearAllBillingRecords(records: BillingRecord[]): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.setItem(BILLING_INITIALIZED_KEY, "true");
  }
  saveLocalBillingRecords([]);

  if (typeof window !== "undefined" && records.length > 0) {
    try {
      const promises = records.map((r) => {
        const docRef = doc(db, BILLING_COLLECTION, r.id);
        return deleteDoc(docRef).catch(() => {});
      });
      await Promise.all(promises);
    } catch (e) {
      console.warn("Firestore clear billing error:", e);
    }
  }
}

// Add a payment entry to an existing billing record
export function addPaymentToBillingRecord(
  recordId: string,
  payment: Omit<BillingPayment, "id" | "createdAt">
): BillingRecord | null {
  const current = getStoredBillingRecords();
  const target = current.find((r) => r.id === recordId);
  if (!target) return null;

  const now = Date.now();
  const newPayment: BillingPayment = {
    ...payment,
    id: `pay-${now}-${Math.random().toString(36).substring(2, 6)}`,
    createdAt: new Date().toISOString(),
  };

  const updatedPayments = [newPayment, ...(target.paymentHistory || [])];
  const newAmountReceived = (target.amountReceived || 0) + Number(payment.amount);
  const newPending = Math.max(0, target.projectAmount - newAmountReceived);

  // If advance payment, update advancePaymentAmount
  let newAdvance = target.advancePaymentAmount || 0;
  if (payment.isAdvance) {
    newAdvance += Number(payment.amount);
  }

  let newStatus: BillingStatus = target.status;
  if (newPending === 0) {
    newStatus = "completed";
  }

  return saveBillingRecord({
    ...target,
    amountReceived: newAmountReceived,
    advancePaymentAmount: newAdvance > 0 ? newAdvance : undefined,
    paymentHistory: updatedPayments,
    status: newStatus,
  });
}

// Unrecord / delete a payment from an existing billing record
export function unrecordPaymentFromBillingRecord(
  recordId: string,
  paymentId: string
): BillingRecord | null {
  const current = getStoredBillingRecords();
  const target = current.find((r) => r.id === recordId);
  if (!target) return null;

  const paymentToRemove = (target.paymentHistory || []).find((p) => p.id === paymentId);
  if (!paymentToRemove) return null;

  const updatedPayments = (target.paymentHistory || []).filter((p) => p.id !== paymentId);
  const newAmountReceived = Math.max(0, (target.amountReceived || 0) - Number(paymentToRemove.amount || 0));
  const newPending = Math.max(0, (target.projectAmount || 0) - newAmountReceived);

  let newAdvance = target.advancePaymentAmount;
  if (paymentToRemove.isAdvance && typeof newAdvance === "number") {
    newAdvance = Math.max(0, newAdvance - Number(paymentToRemove.amount || 0));
  }

  let newStatus: BillingStatus = target.status;
  if (newPending > 0 && target.status === "completed") {
    newStatus = "active";
  }

  return saveBillingRecord({
    ...target,
    amountReceived: newAmountReceived,
    advancePaymentAmount: newAdvance && newAdvance > 0 ? newAdvance : undefined,
    paymentHistory: updatedPayments,
    status: newStatus,
  });
}

// Add a platform credential to a billing record
export function addCredentialToBillingRecord(
  recordId: string,
  credential: Omit<VendorCredential, "id" | "createdAt" | "updatedAt">
): BillingRecord | null {
  const current = getStoredBillingRecords();
  const target = current.find((r) => r.id === recordId);
  if (!target) return null;

  const now = new Date().toISOString();
  const newCred: VendorCredential = {
    ...credential,
    id: `cred-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    createdAt: now,
    updatedAt: now,
  };

  const updatedCredentials = [newCred, ...(target.credentials || [])];
  return saveBillingRecord({
    ...target,
    credentials: updatedCredentials,
  });
}

// Update an existing platform credential in a billing record
export function updateCredentialInBillingRecord(
  recordId: string,
  credentialId: string,
  updates: Partial<Omit<VendorCredential, "id" | "createdAt">>
): BillingRecord | null {
  const current = getStoredBillingRecords();
  const target = current.find((r) => r.id === recordId);
  if (!target) return null;

  const now = new Date().toISOString();
  const updatedCredentials = (target.credentials || []).map((c) => {
    if (c.id === credentialId) {
      return {
        ...c,
        ...updates,
        updatedAt: now,
      };
    }
    return c;
  });

  return saveBillingRecord({
    ...target,
    credentials: updatedCredentials,
  });
}

// Remove a platform credential from a billing record
export function removeCredentialFromBillingRecord(
  recordId: string,
  credentialId: string
): BillingRecord | null {
  const current = getStoredBillingRecords();
  const target = current.find((r) => r.id === recordId);
  if (!target) return null;

  const updatedCredentials = (target.credentials || []).filter((c) => c.id !== credentialId);
  return saveBillingRecord({
    ...target,
    credentials: updatedCredentials,
  });
}

// Log a payment default
export function addDefaultToBillingRecord(
  recordId: string,
  defaultItem: Omit<BillingPaymentDefault, "id" | "createdAt">
): BillingRecord | null {
  const current = getStoredBillingRecords();
  const target = current.find((r) => r.id === recordId);
  if (!target) return null;

  const now = Date.now();
  const newDefault: BillingPaymentDefault = {
    ...defaultItem,
    id: `def-${now}-${Math.random().toString(36).substring(2, 6)}`,
    createdAt: new Date().toISOString(),
  };

  const updatedDefaults = [newDefault, ...(target.defaultsHistory || [])];
  const totalDefaulted = updatedDefaults
    .filter((d) => d.status === "pending_resolution" || d.status === "legal_notice")
    .reduce((acc, curr) => acc + (curr.expectedAmount || 0), 0);

  return saveBillingRecord({
    ...target,
    hasDefaults: totalDefaulted > 0,
    defaultCount: updatedDefaults.length,
    defaultedAmount: totalDefaulted,
    defaultNotes: defaultItem.reason || target.defaultNotes,
    defaultsHistory: updatedDefaults,
    status: totalDefaulted > 0 ? "defaulted" : target.status,
  });
}

// Resolve an existing payment default
export function resolveDefaultInBillingRecord(
  recordId: string,
  defaultId: string,
  resolutionNotes?: string
): BillingRecord | null {
  const current = getStoredBillingRecords();
  const target = current.find((r) => r.id === recordId);
  if (!target) return null;

  const updatedDefaults = (target.defaultsHistory || []).map((d) => {
    if (d.id === defaultId) {
      return {
        ...d,
        status: "resolved" as const,
        resolvedDate: new Date().toISOString().split("T")[0],
        resolutionNotes: resolutionNotes || d.resolutionNotes,
      };
    }
    return d;
  });

  const remainingDefaulted = updatedDefaults
    .filter((d) => d.status === "pending_resolution" || d.status === "legal_notice")
    .reduce((acc, curr) => acc + (curr.expectedAmount || 0), 0);

  let newStatus: BillingStatus = target.status;
  if (remainingDefaulted === 0 && target.status === "defaulted") {
    newStatus = target.pendingAmount === 0 ? "completed" : "active";
  }

  return saveBillingRecord({
    ...target,
    hasDefaults: remainingDefaulted > 0,
    defaultedAmount: remainingDefaulted,
    defaultsHistory: updatedDefaults,
    status: newStatus,
  });
}

// Add a document to an existing billing record
export function addDocumentToBillingRecord(
  recordId: string,
  document: BillingDocument
): BillingRecord | null {
  const current = getStoredBillingRecords();
  const target = current.find((r) => r.id === recordId);
  if (!target) return null;

  const updatedDocs = [document, ...(target.documents || [])];
  return saveBillingRecord({
    ...target,
    documents: updatedDocs,
  });
}

// Remove a document from a billing record
export function removeDocumentFromBillingRecord(
  recordId: string,
  documentId: string
): BillingRecord | null {
  const current = getStoredBillingRecords();
  const target = current.find((r) => r.id === recordId);
  if (!target) return null;

  const updatedDocs = (target.documents || []).filter((d) => d.id !== documentId);
  return saveBillingRecord({
    ...target,
    documents: updatedDocs,
  });
}

// Upload a document or image to Cloudflare R2 / Server route
export async function uploadBillingFile(
  file: File,
  category: string = "document",
  uploadedBy: string = "Finance Admin"
): Promise<BillingDocument> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);
  formData.append("uploadedBy", uploadedBy);

  const res = await fetch("/api/billing/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to upload billing file.");
  }

  return data.file as BillingDocument;
}

// Export Billing Records to CSV
export function exportBillingRecordsToCSV(
  records: BillingRecord[],
  filenamePrefix = "xMonks_B2B_Billing_Report"
): void {
  if (records.length === 0) {
    alert("No billing records to export.");
    return;
  }

  const headers = [
    "Project Name",
    "Contract Number",
    "Status",
    "Company Name",
    "Contact Person",
    "Contact Email",
    "Contact Phone",
    "Company Address",
    "GSTIN",
    "Project Amount (INR)",
    "Tenure (Months)",
    "Start Date",
    "End Date",
    "Billing Frequency",
    "Amount Received (INR)",
    "Pending Amount (INR)",
    "Has Defaults",
    "Defaulted Amount (INR)",
    "Total Payments Count",
    "Total Documents Count",
    "Account Partner",
    "Created Date",
  ];

  const escapeCSV = (val: unknown) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = records.map((r) => [
    escapeCSV(r.projectName),
    escapeCSV(r.contractNumber || ""),
    escapeCSV(r.status),
    escapeCSV(r.vendor?.companyName || ""),
    escapeCSV(r.vendor?.contactPerson || ""),
    escapeCSV(r.vendor?.contactPersonEmail || ""),
    escapeCSV(r.vendor?.contactPersonPhone || ""),
    escapeCSV(r.vendor?.companyAddress || ""),
    escapeCSV(r.vendor?.gstin || ""),
    r.projectAmount || 0,
    r.tenureMonths || 0,
    escapeCSV(r.startDate || ""),
    escapeCSV(r.endDate || ""),
    escapeCSV(r.billingFrequency || ""),
    r.amountReceived || 0,
    r.pendingAmount || 0,
    r.hasDefaults ? "YES" : "NO",
    r.defaultedAmount || 0,
    r.paymentHistory?.length || 0,
    r.documents?.length || 0,
    escapeCSV(r.owner || ""),
    escapeCSV(r.createdAt || ""),
  ]);

  const csvContent =
    "data:text/csv;charset=utf-8,\uFEFF" +
    [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute(
    "download",
    `${filenamePrefix}_${new Date().toISOString().split("T")[0]}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 1-Click Migration from a Pipeline Lead (Closure card) into a full Billing Record.
 * Syncs company information, contact details, project amount, industry, pitched program,
 * lead source, closure month, and auto-imports pipeline approach notes into company documents.
 */
export function migrateLeadToBilling(
  lead: Lead,
  customizations?: {
    tenureMonths?: number;
    billingFrequency?: BillingRecord["billingFrequency"];
    startDate?: string;
    contractNumber?: string;
    projectName?: string;
    owner?: string;
  }
): BillingRecord {
  const timestamp = Date.now();
  const today = customizations?.startDate || new Date().toISOString().split("T")[0];
  const tenure = customizations?.tenureMonths || 12;

  // Calculate end date based on start date and tenure
  const sDate = new Date(today);
  const eDate = new Date(sDate);
  eDate.setMonth(sDate.getMonth() + tenure);
  eDate.setDate(eDate.getDate() - 1);
  const endDate = eDate.toISOString().split("T")[0];

  const contractNum =
    customizations?.contractNumber ||
    `XMB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Automatically migrate approach note from pipeline into Billing Documents
  const docs: BillingDocument[] = [];
  if (lead.approachNote) {
    docs.push({
      id: `doc-pipeline-${timestamp}`,
      name: lead.approachNote.fileName || `${lead.companyName}_Approach_Note.pdf`,
      category: "proposal",
      fileSize: lead.approachNote.fileSize || "1.2 MB",
      fileSizeBytes: lead.approachNote.fileSizeBytes,
      fileType: "application/pdf",
      downloadUrl: lead.approachNote.downloadUrl || "#",
      storagePath: lead.approachNote.storagePath,
      uploadedAt: lead.approachNote.uploadedAt || new Date().toISOString(),
      uploadedBy: lead.approachNote.uploadedBy || lead.owner || "Pipeline Deal Sync",
    });
  }

  const projTitle =
    customizations?.projectName ||
    (lead.program
      ? `${lead.companyName} - ${lead.program}`
      : `${lead.companyName} Leadership Transformation Engagement`);

  const record: BillingRecord = {
    id: `bill-${lead.id}-${timestamp.toString(36)}`,
    leadId: lead.id,
    projectName: projTitle,
    contractNumber: contractNum,
    status: "active",
    industry: lead.industry,
    city: lead.city,
    designation: lead.designation,
    program: lead.program,
    leadSource: lead.leadSource,
    closureMonth: lead.closureMonth,
    expectedCloseDate: lead.expectedCloseDate,
    pipelineStage: lead.stage,
    pipelineDealValue: lead.dealValue,
    pipelineWeightage: lead.weightage,
    approachNote: lead.approachNote,
    tags: lead.tags,
    owner: customizations?.owner || lead.owner || "Amit",
    projectAmount: lead.dealValue || 1000000,
    tenureMonths: tenure,
    startDate: today,
    endDate,
    billingFrequency: customizations?.billingFrequency || "milestone",
    amountReceived: 0,
    pendingAmount: lead.dealValue || 1000000,
    hasDefaults: false,
    defaultCount: 0,
    defaultedAmount: 0,
    paymentHistory: [],
    defaultsHistory: [],
    vendor: {
      companyName: lead.companyName,
      contactPerson: lead.contactName,
      designation: lead.designation,
      companyAddress: lead.city ? `${lead.city}, India` : "India",
      contactPersonPhone: lead.contactPhone || "",
      contactPersonEmail: lead.contactEmail,
      companyLogoUrl: lead.companyLogo,
      industry: lead.industry,
      city: lead.city,
      program: lead.program,
      leadSource: lead.leadSource,
    },
    documents: docs,
    notes: `Migrated from CRM Pipeline Closure (${lead.stage}). Original Deal Value: ₹${(lead.dealValue || 0).toLocaleString("en-IN")}.`,
    createdAt: new Date().toISOString(),
    createdAtMs: timestamp,
    updatedAt: new Date().toISOString(),
  };

  saveBillingRecord(record);
  return record;
}

/**
 * Automatically syncs updated lead information (logos, contact changes, industry, program)
 * into linked billing records that have `leadId`.
 */
export function syncBillingWithLeads(
  records: BillingRecord[],
  leads: Lead[]
): BillingRecord[] {
  if (!leads || leads.length === 0) return records;
  const leadMap = new Map(leads.map((l) => [l.id, l]));

  return records.map((record) => {
    if (!record.leadId) return record;
    const lead = leadMap.get(record.leadId);
    if (!lead) return record;

    let hasChanges = false;
    const updatedVendor = { ...record.vendor };

    if (lead.companyLogo && !updatedVendor.companyLogoUrl) {
      updatedVendor.companyLogoUrl = lead.companyLogo;
      hasChanges = true;
    }
    if (lead.industry && (!record.industry || !updatedVendor.industry)) {
      record.industry = lead.industry;
      updatedVendor.industry = lead.industry;
      hasChanges = true;
    }
    if (lead.city && (!record.city || !updatedVendor.city)) {
      record.city = lead.city;
      updatedVendor.city = lead.city;
      hasChanges = true;
    }
    if (lead.program && (!record.program || !updatedVendor.program)) {
      record.program = lead.program;
      updatedVendor.program = lead.program;
      hasChanges = true;
    }
    if (lead.leadSource && (!record.leadSource || !updatedVendor.leadSource)) {
      record.leadSource = lead.leadSource;
      updatedVendor.leadSource = lead.leadSource;
      hasChanges = true;
    }
    if (lead.designation && (!record.designation || !updatedVendor.designation)) {
      record.designation = lead.designation;
      updatedVendor.designation = lead.designation;
      hasChanges = true;
    }
    if (lead.owner && record.owner !== lead.owner) {
      record.owner = lead.owner;
      hasChanges = true;
    }
    if (lead.dealValue && !record.pipelineDealValue) {
      record.pipelineDealValue = lead.dealValue;
      hasChanges = true;
    }
    if (lead.closureMonth && !record.closureMonth) {
      record.closureMonth = lead.closureMonth;
      hasChanges = true;
    }
    if (lead.approachNote && !record.approachNote) {
      record.approachNote = lead.approachNote;
      hasChanges = true;
    }

    if (hasChanges) {
      return {
        ...record,
        vendor: updatedVendor,
      };
    }
    return record;
  });
}
