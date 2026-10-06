import { EmailAttachment } from "@/constants/emailTemplates";

export type DocumentCategory =
  | "all"
  | "pitch_deck"
  | "brochure"
  | "proposal"
  | "case_study"
  | "contract"
  | "executive_coaching"
  | "ld_transformation"
  | "tasc"
  | "assessment"
  | "pricing_commercial"
  | "other";

export interface LibraryDocument {
  id: string;
  title: string;                 // Friendly title (e.g., "Executive Coaching CXO Impact Deck")
  fileName: string;              // Original file name (e.g., "executive_coaching_2026.pdf")
  fileSize: string;              // Formatted e.g. "3.8 MB"
  fileSizeBytes: number;         // Numeric bytes
  fileType: string;              // MIME type or extension
  category: DocumentCategory;
  description?: string;          // Context, usage guide or pitch summary
  storageKey: string;            // Cloudflare R2 storage key (b2bxmonks/library/...)
  downloadUrl: string;           // Direct download or proxy URL
  uploadedBy: string;            // User name (e.g. "Amit Shelly")
  uploadedByEmail?: string;
  owner?: string;                // Username identifier e.g. "amit", "preeti", "admin"
  uploadedAt: string;            // ISO timestamp
  uploadedAtMs: number;          // Numeric timestamp for fast sorting
  tags?: string[];               // e.g. ["cxo", "brochure", "2026"]
  isStarred?: boolean;           // Pin to top / favorites
  useCount: number;              // Number of times attached to emails
  lastUsedAt?: string;           // ISO timestamp of last email attachment
  isPublic?: boolean;            // Accessible to all sales reps
}

/**
 * Helper to check if a document is visible to a given user:
 * Admin has unified access to all resources;
 * Non-admin users can ONLY see their own uploaded files.
 */
export function isDocumentVisibleToUser(
  doc: LibraryDocument,
  username?: string,
  userEmail?: string,
  userName?: string,
  isAdmin: boolean = false
): boolean {
  if (isAdmin) return true;
  if (!username && !userEmail && !userName) return false;

  const cleanUser = (username || "").toLowerCase().trim();
  const cleanEmail = (userEmail || "").toLowerCase().trim();
  const cleanName = (userName || "").toLowerCase().trim();

  const docOwner = (doc.owner || "").toLowerCase().trim();
  const docEmail = (doc.uploadedByEmail || "").toLowerCase().trim();
  const docName = (doc.uploadedBy || "").toLowerCase().trim();

  // Match by username, email, or user display name
  if (cleanUser && docOwner && cleanUser === docOwner) return true;
  if (cleanEmail && docEmail && cleanEmail === docEmail) return true;
  if (cleanName && docName && cleanName === docName) return true;
  if (cleanUser && docName && (cleanUser === docName || docName.startsWith(cleanUser) || cleanUser.startsWith(docName))) return true;

  return false;
}

export interface CategoryConfig {
  id: DocumentCategory;
  label: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  iconName: string;
}

export const DOCUMENT_CATEGORIES: CategoryConfig[] = [
  {
    id: "pitch_deck",
    label: "Pitch Deck",
    badgeBg: "bg-indigo-50 dark:bg-indigo-950/70",
    badgeText: "text-indigo-700 dark:text-indigo-300",
    borderColor: "border-indigo-300 dark:border-indigo-800",
    iconName: "Presentation",
  },
  {
    id: "brochure",
    label: "Brochure & Credentials",
    badgeBg: "bg-purple-50 dark:bg-purple-950/70",
    badgeText: "text-purple-700 dark:text-purple-300",
    borderColor: "border-purple-300 dark:border-purple-800",
    iconName: "BookOpen",
  },
  {
    id: "proposal",
    label: "Commercial Proposal",
    badgeBg: "bg-emerald-50 dark:bg-emerald-950/70",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    borderColor: "border-emerald-300 dark:border-emerald-800",
    iconName: "FileCheck",
  },
  {
    id: "case_study",
    label: "Client Case Study",
    badgeBg: "bg-sky-50 dark:bg-sky-950/70",
    badgeText: "text-sky-700 dark:text-sky-300",
    borderColor: "border-sky-300 dark:border-sky-800",
    iconName: "Award",
  },
  {
    id: "executive_coaching",
    label: "Executive Coaching",
    badgeBg: "bg-blue-50 dark:bg-blue-950/70",
    badgeText: "text-blue-700 dark:text-blue-300",
    borderColor: "border-blue-300 dark:border-blue-800",
    iconName: "Sparkles",
  },
  {
    id: "ld_transformation",
    label: "L&D Transformation",
    badgeBg: "bg-teal-50 dark:bg-teal-950/70",
    badgeText: "text-teal-700 dark:text-teal-300",
    borderColor: "border-teal-300 dark:border-teal-800",
    iconName: "Layers",
  },
  {
    id: "tasc",
    label: "TASC Consulting",
    badgeBg: "bg-amber-50 dark:bg-amber-950/70",
    badgeText: "text-amber-700 dark:text-amber-300",
    borderColor: "border-amber-300 dark:border-amber-800",
    iconName: "Compass",
  },
  {
    id: "assessment",
    label: "Assessments & Diagnostics",
    badgeBg: "bg-orange-50 dark:bg-orange-950/70",
    badgeText: "text-orange-700 dark:text-orange-300",
    borderColor: "border-orange-300 dark:border-orange-800",
    iconName: "Target",
  },
  {
    id: "contract",
    label: "Contract / Master SLA",
    badgeBg: "bg-rose-50 dark:bg-rose-950/70",
    badgeText: "text-rose-700 dark:text-rose-300",
    borderColor: "border-rose-300 dark:border-rose-800",
    iconName: "Shield",
  },
  {
    id: "pricing_commercial",
    label: "Pricing Sheet",
    badgeBg: "bg-lime-50 dark:bg-lime-950/70",
    badgeText: "text-lime-700 dark:text-lime-300",
    borderColor: "border-lime-300 dark:border-lime-800",
    iconName: "Coins",
  },
  {
    id: "other",
    label: "General Document",
    badgeBg: "bg-slate-100 dark:bg-slate-800/80",
    badgeText: "text-slate-700 dark:text-slate-300",
    borderColor: "border-slate-300 dark:border-slate-700",
    iconName: "File",
  },
];

export function getCategoryConfig(category?: string): CategoryConfig {
  const match = DOCUMENT_CATEGORIES.find((c) => c.id === category);
  return (
    match || {
      id: "other",
      label: "General Document",
      badgeBg: "bg-slate-100 dark:bg-slate-800/80",
      badgeText: "text-slate-700 dark:text-slate-300",
      borderColor: "border-slate-300 dark:border-slate-700",
      iconName: "File",
    }
  );
}

/**
 * Converts a Library Document into an EmailAttachment suitable for Nodemailer & preview cards
 */
export function libraryDocToEmailAttachment(doc: LibraryDocument): EmailAttachment {
  return {
    id: doc.id,
    name: doc.fileName || doc.title,
    size: doc.fileSizeBytes,
    type: doc.fileType || "application/octet-stream",
    storageKey: doc.storageKey,
    downloadUrl: doc.downloadUrl,
  };
}
