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
  TemplateItem,
  TemplateCategory,
  TemplateCategoryConfig,
  INITIAL_TEMPLATE_CATEGORIES,
  TEMPLATE_CATEGORIES,
} from "@/types/template";
import { formatBytes } from "./formatters";

const TEMPLATES_COLLECTION = "b2b_templates";
const TEMPLATES_STORAGE_KEY = "xmonks_b2b_templates_v6";
const CATEGORIES_COLLECTION = "b2b_template_categories";
const CATEGORIES_STORAGE_KEY = "xmonks_b2b_template_categories_v2";
const DEPRECATED_TEMPLATE_IDS = new Set(["tpl-icici-fin-prop-02", "tpl-icici-zsm-prop-03"]);
const DELETED_TEMPLATES_STORAGE_KEY = "xmonks_b2b_deleted_template_ids_v1";

/**
 * Retrieve categories with localStorage caching and fallback to INITIAL_TEMPLATE_CATEGORIES
 */
export function getStoredCategories(): TemplateCategoryConfig[] {
  if (typeof window === "undefined") return INITIAL_TEMPLATE_CATEGORIES;
  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (raw) {
      const parsed: TemplateCategoryConfig[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const map = new Map<string, TemplateCategoryConfig>();
        INITIAL_TEMPLATE_CATEGORIES.forEach((c) => map.set(c.id, c));
        parsed.forEach((c) => map.set(c.id, c));
        return Array.from(map.values());
      }
    }
  } catch (e) {
    console.warn("Failed to read categories from storage", e);
  }
  return INITIAL_TEMPLATE_CATEGORIES;
}

/**
 * Save categories to localStorage
 */
export function saveLocalCategories(categories: TemplateCategoryConfig[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  } catch (e) {
    console.warn("Failed to save categories to storage", e);
  }
}

/**
 * Real-time subscription to template categories
 */
export function subscribeToCategories(
  callback: (categories: TemplateCategoryConfig[]) => void
): () => void {
  const local = getStoredCategories();
  callback(local);

  if (typeof window === "undefined") return () => {};

  try {
    const q = collection(db, CATEGORIES_COLLECTION);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const map = new Map<string, TemplateCategoryConfig>();
        INITIAL_TEMPLATE_CATEGORIES.forEach((c) => map.set(c.id, c));

        if (!snapshot.empty) {
          snapshot.forEach((d) => {
            const data = d.data();
            if (data && data.id && data.label) {
              map.set(data.id, {
                id: data.id,
                label: data.label,
                badgeBg: data.badgeBg || "bg-emerald-50 dark:bg-emerald-950/70",
                badgeText: data.badgeText || "text-emerald-700 dark:text-emerald-300",
                borderColor: data.borderColor || "border-emerald-300 dark:border-emerald-800",
                icon: data.icon || "Folder",
                isCustom: true,
              });
            }
          });
        }
        const merged = Array.from(map.values());
        saveLocalCategories(merged);
        callback(merged);
      },
      (err) => {
        console.warn("Categories subscription error, using local fallback", err.message);
        callback(getStoredCategories());
      }
    );
    return unsubscribe;
  } catch (e) {
    console.warn("Error subscribing to categories", e);
    return () => {};
  }
}

/**
 * Save / Create new category
 */
export async function saveCategory(category: TemplateCategoryConfig): Promise<void> {
  const current = getStoredCategories();
  const map = new Map<string, TemplateCategoryConfig>();
  current.forEach((c) => map.set(c.id, c));
  map.set(category.id, { ...category, isCustom: true });
  const updated = Array.from(map.values());
  saveLocalCategories(updated);

  try {
    await setDoc(
      doc(db, CATEGORIES_COLLECTION, category.id),
      {
        id: category.id,
        label: category.label,
        badgeBg: category.badgeBg,
        badgeText: category.badgeText,
        borderColor: category.borderColor,
        icon: category.icon || "Folder",
        isCustom: true,
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn("Failed to sync category to Firestore", e);
  }
}

/**
 * Delete custom category (built-in categories cannot be deleted)
 */
export async function deleteCustomCategory(categoryId: string): Promise<void> {
  const isBuiltIn = INITIAL_TEMPLATE_CATEGORIES.some((c) => c.id === categoryId);
  if (isBuiltIn) return;

  const current = getStoredCategories();
  const updated = current.filter((c) => c.id !== categoryId);
  saveLocalCategories(updated);

  try {
    await deleteDoc(doc(db, CATEGORIES_COLLECTION, categoryId));
  } catch (e) {
    console.warn("Failed to delete category from Firestore", e);
  }
}

export function getDeletedTemplateIds(): Set<string> {
  const set = new Set<string>(DEPRECATED_TEMPLATE_IDS);
  if (typeof window === "undefined") return set;
  try {
    const raw = localStorage.getItem(DELETED_TEMPLATES_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach((id) => set.add(id));
      }
    }
  } catch {}
  return set;
}

export function recordDeletedTemplateId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const set = getDeletedTemplateIds();
    set.add(id);
    localStorage.setItem(DELETED_TEMPLATES_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export const PRODUCT_INDUCTION_TEMPLATES: TemplateItem[] = [
  // --- 1. Product Workshops & Profile Brochures ---
  {
    id: "tpl-prod-coach-maturity-clutterbuck",
    title: "Coach Maturity – Professor David Clutterbuck (India 2025)",
    fileName: "Coach Maturity - David Clutterbuck (2025).pdf",
    fileSize: "1.2 MB",
    fileSizeBytes: 1301691,
    fileType: "pdf",
    category: "product_induction_materials",
    categoryLabel: "Product and Induction Materials",
    description:
      "Official workshop brochure for Coach Maturity in India with pioneer Prof. David Clutterbuck and Gaurav Arora. Covers models-based, process-based, and systemic eclectic coaching evolution.",
    downloadUrl: "/templates/Coach%20Maturity%20-%20David%20Clutterbuck%20(2025).pdf",
    uploadedBy: "Admin",
    uploadedByEmail: "sales@xmonks.com",
    uploadedAt: "2026-10-14T16:20:00.000Z",
    uploadedAtMs: 1791985200000,
    tags: ["David Clutterbuck", "Coach Maturity", "Workshop", "Facilitator Toolkit", "OD Professionals"],
    isPinned: true,
    downloadCount: 24,
    version: "2025",
  },
  {
    id: "tpl-prod-rapid-teaming-clutterbuck",
    title: "Accelerating Team Performance with Rapid Teaming – Dr David Clutterbuck",
    fileName: "Rapid Teaming - Dr David Clutterbuck (2025).pdf",
    fileSize: "2.0 MB",
    fileSizeBytes: 2057955,
    fileType: "pdf",
    category: "product_induction_materials",
    categoryLabel: "Product and Induction Materials",
    description:
      "Workshop overview for business and HR leaders: high-performing team evolution, psychological safety, managing self in multiple teams, and rapid agile teaming processes.",
    downloadUrl: "/templates/Rapid%20Teaming%20-%20Dr%20David%20Clutterbuck%20(2025).pdf",
    uploadedBy: "Admin",
    uploadedByEmail: "sales@xmonks.com",
    uploadedAt: "2026-10-14T16:20:00.000Z",
    uploadedAtMs: 1791985200001,
    tags: ["Rapid Teaming", "David Clutterbuck", "Team Performance", "Psychological Safety", "HR Leaders"],
    isPinned: true,
    downloadCount: 31,
    version: "2025",
  },
  {
    id: "tpl-prod-leadership-circle-profile",
    title: "Leadership Circle Profile™ (LCP) – 360° Assessment Overview",
    fileName: "Leadership Circle Profile (LCP) - Assessment Brochure.pdf",
    fileSize: "294.5 KB",
    fileSizeBytes: 301528,
    fileType: "pdf",
    category: "product_induction_materials",
    categoryLabel: "Product and Induction Materials",
    description:
      "Comprehensive product guide to the Leadership Circle Profile 360 assessment: connecting patterns of action with habits of thought, Creative Competencies vs. Reactive Tendencies, and leadership effectiveness.",
    downloadUrl: "/templates/Leadership%20Circle%20Profile%20(LCP)%20-%20Assessment%20Brochure.pdf",
    uploadedBy: "Admin",
    uploadedByEmail: "sales@xmonks.com",
    uploadedAt: "2026-10-14T16:20:00.000Z",
    uploadedAtMs: 1791985200002,
    tags: ["Leadership Circle Profile", "360 Assessment", "Creative Competencies", "Reactive Tendencies", "TLC India"],
    isPinned: true,
    downloadCount: 42,
    version: "2024",
  },
  {
    id: "tpl-prod-emotions-centred-coaching",
    title: "Emotions-Centred Coaching Program – Dan Newby & xMonks",
    fileName: "Emotions-Centred Coaching Program - School of Emotions.pdf",
    fileSize: "1.9 MB",
    fileSizeBytes: 2029790,
    fileType: "pdf",
    category: "product_induction_materials",
    categoryLabel: "Product and Induction Materials",
    description:
      "Program guide for School of Emotions & xMonks partnership: Dan Newby methodology for emotional literacy, 12 CCEUs, emotional distinctions, and linguistic framework for executive coaches.",
    downloadUrl: "/templates/Emotions-Centred%20Coaching%20Program%20-%20School%20of%20Emotions.pdf",
    uploadedBy: "Admin",
    uploadedByEmail: "sales@xmonks.com",
    uploadedAt: "2026-10-14T16:20:00.000Z",
    uploadedAtMs: 1791985200003,
    tags: ["School of Emotions", "Dan Newby", "Emotional Literacy", "12 CCEUs", "ICF Coaches"],
    isPinned: true,
    downloadCount: 19,
    version: "2024",
  },
  {
    id: "tpl-prod-leaders-growth-catalysts",
    title: "Leaders as Growth Catalysts – Intensive Leadership Program",
    fileName: "Leaders as Growth Catalysts - Program Brochure.pdf",
    fileSize: "1.5 MB",
    fileSizeBytes: 1626166,
    fileType: "pdf",
    category: "product_induction_materials",
    categoryLabel: "Product and Induction Materials",
    description:
      "Flagship 2-day leadership development intervention rooted in Adaptive Mindset, Performance Equation (Interference removal), 6 A Coaching Model, and Growth Multiplier competencies.",
    downloadUrl: "/templates/Leaders%20as%20Growth%20Catalysts%20-%20Program%20Brochure.pdf",
    uploadedBy: "Admin",
    uploadedByEmail: "sales@xmonks.com",
    uploadedAt: "2026-10-14T16:20:00.000Z",
    uploadedAtMs: 1791985200004,
    tags: ["Leaders as Growth Catalysts", "Adaptive Leadership", "6 A Model", "Gaurav Arora", "Enterprise L&D"],
    isPinned: true,
    downloadCount: 38,
    version: "2025",
  },
];

export const APPROACH_NOTES_TEMPLATES: TemplateItem[] = [
  {
    id: "tpl-app-sales-mastery-banking",
    title: "Approach Note – Sales Mastery for Trusted Banking Relationships",
    fileName: "Approach Note - Sales Mastery for Trusted Banking Relationships.pdf",
    fileSize: "1.5 MB",
    fileSizeBytes: 1587262,
    fileType: "pdf",
    category: "approach_notes",
    categoryLabel: "Approach Notes",
    description:
      "10-page comprehensive induction and sales mastery approach note: moving from transactional conversations to advisory client partnerships in BFSI.",
    downloadUrl:
      "/templates/Approach%20Note%20-%20Sales%20Mastery%20for%20Trusted%20Banking%20Relationships.pdf",
    uploadedBy: "Admin",
    uploadedByEmail: "sales@xmonks.com",
    uploadedAt: "2026-10-14T16:22:00.000Z",
    uploadedAtMs: 1791985320000,
    tags: ["Approach Note", "Sales Mastery", "BFSI", "Banking Relationships", "Consultative Selling"],
    isPinned: false,
    downloadCount: 27,
    version: "v2.0",
  },
  {
    id: "tpl-app-personal-effectiveness",
    title: "Approach Note – Personal Effectiveness & Customer Delight (Branch Managers)",
    fileName: "Approach Note - Personal Effectiveness & Customer Delight.pdf",
    fileSize: "3.7 MB",
    fileSizeBytes: 3747370,
    fileType: "pdf",
    category: "approach_notes",
    categoryLabel: "Approach Notes",
    description:
      "Transformational learning journey for branch managers: self-management, high-impact daily routines, emotional poise, and customer delight standards.",
    downloadUrl:
      "/templates/Approach%20Note%20-%20Personal%20Effectiveness%20&%20Customer%20Delight.pdf",
    uploadedBy: "Admin",
    uploadedByEmail: "sales@xmonks.com",
    uploadedAt: "2026-10-14T16:22:00.000Z",
    uploadedAtMs: 1791985320001,
    tags: ["Approach Note", "Branch Managers", "Customer Delight", "Personal Effectiveness", "Leadership"],
    isPinned: false,
    downloadCount: 18,
    version: "v1.2",
  },
  {
    id: "tpl-app-character-building",
    title: "Approach Note – Excellence Through Character Building",
    fileName: "Approach Note - Excellence Through Character Building.pdf",
    fileSize: "4.6 MB",
    fileSizeBytes: 4686112,
    fileType: "pdf",
    category: "approach_notes",
    categoryLabel: "Approach Notes",
    description:
      "Organizational ethics, psychological resilience, authentic character development, and values-driven execution framework for leadership cohorts.",
    downloadUrl:
      "/templates/Approach%20Note%20-%20Excellence%20Through%20Character%20Building.pdf",
    uploadedBy: "Admin",
    uploadedByEmail: "sales@xmonks.com",
    uploadedAt: "2026-10-14T16:22:00.000Z",
    uploadedAtMs: 1791985320002,
    tags: ["Approach Note", "Character Building", "Ethics", "Values-Driven Leadership", "xMonks Philosophy"],
    isPinned: false,
    downloadCount: 13,
    version: "v1.0",
  },
  {
    id: "tpl-app-lead-self-others-strategic",
    title: "Approach Note – Lead Self, Lead Others, Strategic Thinking & Design",
    fileName: "Approach Note - Lead Self, Lead Others, Strategic Thinking & Design.pdf",
    fileSize: "6.1 MB",
    fileSizeBytes: 6244226,
    fileType: "pdf",
    category: "approach_notes",
    categoryLabel: "Approach Notes",
    description:
      "Core curriculum approach note: 4 pillars of modern leadership (leading self, leading teams, strategic business thinking, and organizational design).",
    downloadUrl:
      "/templates/Approach%20Note%20-%20Lead%20Self,%20Lead%20Others,%20Strategic%20Thinking%20&%20Design.pdf",
    uploadedBy: "Admin",
    uploadedByEmail: "sales@xmonks.com",
    uploadedAt: "2026-10-14T16:22:00.000Z",
    uploadedAtMs: 1791985320003,
    tags: ["Approach Note", "Lead Self", "Strategic Thinking", "Organizational Design", "Executive Program"],
    isPinned: false,
    downloadCount: 25,
    version: "v2.1",
  },
  {
    id: "tpl-app-coach-as-leader",
    title: "Approach Note – Coach as Leader Framework",
    fileName: "Approach Note - Coach as Leader.pdf",
    fileSize: "4.9 MB",
    fileSizeBytes: 4975156,
    fileType: "pdf",
    category: "approach_notes",
    categoryLabel: "Approach Notes",
    description:
      "Why coaching? What coaches excel at doing. Foundational playbook to equip enterprise executives with coaching dialogues, active enquiry, and autonomy enablement.",
    downloadUrl:
      "/templates/Approach%20Note%20-%20Coach%20as%20Leader.pdf",
    uploadedBy: "Admin",
    uploadedByEmail: "sales@xmonks.com",
    uploadedAt: "2026-10-14T16:22:00.000Z",
    uploadedAtMs: 1791985320004,
    tags: ["Approach Note", "Coach as Leader", "Manager as Coach", "ICF Framework", "Leadership Mindset"],
    isPinned: false,
    downloadCount: 30,
    version: "v2.0",
  },
];

export const CASE_STUDIES_TEMPLATES: TemplateItem[] = [
  {
    id: "tpl-case-turnaround-food-packaging",
    title: "Case Study: Food Packaging Company – Maximizing Profits Amid Disruptions",
    fileName: "Case Study - Food Packaging Company (Maximizing Profits Amid Disruptions).pdf",
    fileSize: "107.4 KB",
    fileSizeBytes: 109939,
    fileType: "pdf",
    category: "case_studies",
    categoryLabel: "Case Studies",
    description:
      "Operational turnaround case study for Executive Management Group: analyzing declining revenue, shrinking margins, customer pushbacks, employee sickness disruptions, and SNOP forecasting strategies.",
    downloadUrl:
      "/templates/Case%20Study%20-%20Food%20Packaging%20Company%20(Maximizing%20Profits%20Amid%20Disruptions).pdf",
    uploadedBy: "Admin",
    uploadedByEmail: "sales@xmonks.com",
    uploadedAt: "2026-10-14T16:24:00.000Z",
    uploadedAtMs: 1791985440000,
    tags: ["Case Study", "Food Packaging", "Operations", "Revenue Recovery", "SNOP", "Turnaround"],
    isPinned: true,
    downloadCount: 16,
    version: "v1.0",
  },
  {
    id: "tpl-case-dilemma-performing-leader",
    title: "Case Study: Leading FMCG & Confectionery Brand – Dilemma of a Performing Leader",
    fileName: "Case Study - Dilemma of a Performing Leader (Leading Confectionery & FMCG Company).pdf",
    fileSize: "603.7 KB",
    fileSizeBytes: 618202,
    fileType: "pdf",
    category: "case_studies",
    categoryLabel: "Case Studies",
    description:
      "Consumer goods & FMCG leadership dilemma: Ishaan (Regional Head) and Virat (top performer). Examines power centre dynamics, team disengagement, inter-associate friction, and coaching advisory interventions.",
    downloadUrl:
      "/templates/Case%20Study%20-%20Dilemma%20of%20a%20Performing%20Leader%20(Leading%20Confectionery%20%26%20FMCG%20Company).pdf",
    uploadedBy: "Admin",
    uploadedByEmail: "sales@xmonks.com",
    uploadedAt: "2026-10-14T16:24:00.000Z",
    uploadedAtMs: 1791985440001,
    tags: ["Case Study", "Leading FMCG Brand", "Confectionery", "Erickson", "Performing Leader", "Power Dynamics", "Advisory"],
    isPinned: true,
    downloadCount: 22,
    version: "v1.0",
  },
  {
    id: "tpl-case-tata-steel-frontline",
    title: "Case Study: Leading Steel Company – Coaching for Strengthening Employee Engagement",
    fileName: "Case Study - Strengthening Employee Engagement (Leading Steel Company).pdf",
    fileSize: "1.0 MB",
    fileSizeBytes: 1074347,
    fileType: "pdf",
    category: "case_studies",
    categoryLabel: "Case Studies",
    description:
      "Enterprise coaching transformation at a leading steel manufacturing giant (35M tonnes capacity). Rolling out 'The Art & Science of Coaching' to 51 top leaders and 'Leader as Coach' to 600+ AGM/GM/DGM level executives.",
    downloadUrl:
      "/templates/Case%20Study%20-%20Strengthening%20Employee%20Engagement%20(Leading%20Steel%20Company).pdf",
    uploadedBy: "Admin",
    uploadedByEmail: "sales@xmonks.com",
    uploadedAt: "2026-10-14T16:24:00.000Z",
    uploadedAtMs: 1791985440002,
    tags: ["Case Study", "Leading Steel Company", "Employee Engagement", "Leader as Coach", "Manufacturing", "Frontline Leaders"],
    isPinned: true,
    downloadCount: 35,
    version: "v1.0",
  },
  {
    id: "tpl-case-private-general-insurance",
    title: "Case Study: Leading Private General Insurance – Fostering Coaching Culture (305 Branches)",
    fileName: "Case Study - Fostering Coaching Culture (Private General Insurance - 305 Branches).pdf",
    fileSize: "2.3 MB",
    fileSizeBytes: 2356132,
    fileType: "pdf",
    category: "case_studies",
    categoryLabel: "Case Studies",
    description:
      "Nationwide insurer transformation (305 branches, 12,865 employees, ₹217.7B GWP). Multi-tiered 'Leader as Coach' program (2+1 format) with weekly nudges for 60+ Management Committee and Band I/II leaders.",
    downloadUrl:
      "/templates/Case%20Study%20-%20Fostering%20Coaching%20Culture%20(Private%20General%20Insurance%20-%20305%20Branches).pdf",
    uploadedBy: "Admin",
    uploadedByEmail: "sales@xmonks.com",
    uploadedAt: "2026-10-14T16:24:00.000Z",
    uploadedAtMs: 1791985440003,
    tags: ["Case Study", "General Insurance", "305 Branches", "BFSI", "Coaching Culture", "Management Committee"],
    isPinned: true,
    downloadCount: 29,
    version: "v1.0",
  },
  {
    id: "tpl-case-general-insurance-retention",
    title: "Case Study: Leading General Insurance Company (Mumbai) – Fostering Coaching Culture (122 Branches)",
    fileName: "Case Study - Fostering Coaching Culture (Leading General Insurance - 122 Branches).pdf",
    fileSize: "2.4 MB",
    fileSizeBytes: 2422007,
    fileType: "pdf",
    category: "case_studies",
    categoryLabel: "Case Studies",
    description:
      "Mumbai-headquartered general insurer with 122 branches & 9 countries. 'Art and Science of Coaching Essentials' by Erickson Coaching: 60h training, 10h mentoring, and oral assessments for 28 ICF Certified ACC Coaches.",
    downloadUrl:
      "/templates/Case%20Study%20-%20Fostering%20Coaching%20Culture%20(Leading%20General%20Insurance%20-%20122%20Branches).pdf",
    uploadedBy: "Admin",
    uploadedByEmail: "sales@xmonks.com",
    uploadedAt: "2026-10-14T16:24:00.000Z",
    uploadedAtMs: 1791985440004,
    tags: ["Case Study", "General Insurance", "122 Branches", "ICF ACC", "Erickson Coaching", "Executive Mentoring"],
    isPinned: true,
    downloadCount: 26,
    version: "v1.0",
  },
];

// Initial seed templates containing the requested financial proposal, product induction materials, and case studies
export const INITIAL_TEMPLATES: TemplateItem[] = [
  {
    id: "tpl-financial-proposal-master-01",
    title: "Template _ Financial Proposal _ Program Name @ Client Name",
    fileName: "Template _ Financial  Proposal _ Program Name @ Client Name.doc",
    fileSize: "525.5 KB",
    fileSizeBytes: 538112,
    fileType: "doc",
    category: "financial_proposals",
    categoryLabel: "Financial Proposals",
    description:
      "Standard corporate financial proposal document for enterprise client engagements, pricing structures, phased milestone commercial tables, and terms of engagement.",
    downloadUrl:
      "/Template%20_%20Financial%20%20Proposal%20_%20Program%20Name%20@%20Client%20Name.doc",
    uploadedBy: "Admin",
    uploadedByEmail: "sales@xmonks.com",
    uploadedAt: "2026-10-14T14:39:00.000Z",
    uploadedAtMs: 1791979140000,
    tags: [
      "Financial Proposals",
      "Pricing",
      "Commercial Terms",
      "Enterprise Proposal",
      "Executive Coaching",
      "Milestones",
    ],
    isPinned: true,
    downloadCount: 18,
    version: "v2.4",
  },
  ...PRODUCT_INDUCTION_TEMPLATES,
  ...APPROACH_NOTES_TEMPLATES,
  ...CASE_STUDIES_TEMPLATES,
];

/**
 * Intelligent categorization auto-fix:
 * Fixes any templates where the file name or title indicates a specific category
 * (e.g. Case Study uploaded while on default Financial Proposals tab).
 */
export function autoFixTemplateCategory(item: TemplateItem): TemplateItem {
  if (!item) return item;
  const lowerTitle = (item.title || "").toLowerCase();
  const lowerFileName = (item.fileName || "").toLowerCase();

  const isCaseStudy =
    lowerTitle.includes("case study") ||
    lowerTitle.includes("case-study") ||
    lowerTitle.includes("case_study") ||
    lowerTitle.includes("casestudy") ||
    lowerFileName.includes("case study") ||
    lowerFileName.includes("case-study") ||
    lowerFileName.includes("case_study") ||
    lowerFileName.includes("casestudy");

  if (isCaseStudy && item.category !== "case_studies") {
    const fixed: TemplateItem = {
      ...item,
      category: "case_studies",
      categoryLabel: "Case Studies",
    };
    if (typeof window !== "undefined") {
      setDoc(doc(db, TEMPLATES_COLLECTION, item.id), { category: "case_studies", categoryLabel: "Case Studies" }, { merge: true }).catch(() => {});
    }
    return fixed;
  }

  const isApproachNote =
    lowerTitle.includes("approach note") ||
    lowerTitle.includes("approach-note") ||
    lowerTitle.includes("approach_note") ||
    lowerTitle.includes("approachnote") ||
    lowerFileName.includes("approach note") ||
    lowerFileName.includes("approach-note") ||
    lowerFileName.includes("approach_note") ||
    lowerFileName.includes("approachnote");

  if (isApproachNote && item.category !== "approach_notes") {
    const fixed: TemplateItem = {
      ...item,
      category: "approach_notes",
      categoryLabel: "Approach Notes",
    };
    if (typeof window !== "undefined") {
      setDoc(doc(db, TEMPLATES_COLLECTION, item.id), { category: "approach_notes", categoryLabel: "Approach Notes" }, { merge: true }).catch(() => {});
    }
    return fixed;
  }

  return item;
}

/**
 * Get templates from localStorage with fallback to INITIAL_TEMPLATES
 */
export function getStoredTemplates(): TemplateItem[] {
  const deletedIds = getDeletedTemplateIds();
  if (typeof window === "undefined") {
    return INITIAL_TEMPLATES.filter((t) => !deletedIds.has(t.id)).map(autoFixTemplateCategory);
  }
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (raw) {
      let parsed: TemplateItem[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filter out any deleted/deprecated templates and auto-fix category anomalies
        parsed = parsed.filter((t) => !deletedIds.has(t.id)).map(autoFixTemplateCategory);

        // Ensure all INITIAL_TEMPLATES (except deleted ones) are present and up to date
        INITIAL_TEMPLATES.forEach((seedTpl) => {
          if (deletedIds.has(seedTpl.id)) return; // DO NOT RESURRECT DELETED TEMPLATES!
          const idx = parsed.findIndex((t) => t.id === seedTpl.id);
          if (idx >= 0) {
            parsed[idx] = {
              ...seedTpl,
              downloadCount: Math.max(parsed[idx].downloadCount || 0, seedTpl.downloadCount || 0),
            };
          } else {
            parsed.push(seedTpl);
          }
        });

        saveLocalTemplates(parsed);
        return parsed;
      }
    }
    const initialNonDeleted = INITIAL_TEMPLATES.filter((t) => !deletedIds.has(t.id)).map(autoFixTemplateCategory);
    saveLocalTemplates(initialNonDeleted);
    return initialNonDeleted;
  } catch (e) {
    console.warn("Failed to read templates from localStorage", e);
    return INITIAL_TEMPLATES.filter((t) => !deletedIds.has(t.id)).map(autoFixTemplateCategory);
  }
}

/**
 * Save templates to localStorage
 */
export function saveLocalTemplates(templates: TemplateItem[]): void {
  if (typeof window === "undefined") return;
  try {
    const deletedIds = getDeletedTemplateIds();
    const sanitized = templates.filter((t) => !deletedIds.has(t.id));
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (e) {
    console.warn("Failed to save templates to localStorage", e);
  }
}

/**
 * Real-time subscription to templates:
 * Listens to Firestore `b2b_templates` with localStorage fallback.
 */
export function subscribeToTemplates(callback: (templates: TemplateItem[]) => void): () => void {
  const localDocs = getStoredTemplates();
  callback(localDocs);

  if (typeof window === "undefined") return () => {};

  try {
    const q = query(collection(db, TEMPLATES_COLLECTION), orderBy("uploadedAtMs", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const deletedIds = getDeletedTemplateIds();
        if (!snapshot.empty) {
          const list: TemplateItem[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            if (deletedIds.has(d.id) || data?.isDeleted) {
              // Track deleted and purge from Firestore if still exists
              recordDeletedTemplateId(d.id);
              deleteDoc(doc(db, TEMPLATES_COLLECTION, d.id)).catch(() => {});
            } else {
              const item = autoFixTemplateCategory({ id: d.id, ...data } as TemplateItem);
              list.push(item);
            }
          });
          // Ensure seed templates are included UNLESS deleted by user
          INITIAL_TEMPLATES.forEach((seedTpl) => {
            if (deletedIds.has(seedTpl.id)) return; // DO NOT RESURRECT
            const idx = list.findIndex((t) => t.id === seedTpl.id);
            if (idx >= 0) {
              if (
                list[idx].title !== seedTpl.title ||
                list[idx].fileName !== seedTpl.fileName ||
                list[idx].downloadUrl !== seedTpl.downloadUrl
              ) {
                setDoc(doc(db, TEMPLATES_COLLECTION, seedTpl.id), seedTpl, { merge: true }).catch(() => {});
              }
              list[idx] = {
                ...seedTpl,
                downloadCount: Math.max(list[idx].downloadCount || 0, seedTpl.downloadCount || 0),
              };
            } else {
              list.push(seedTpl);
            }
          });
          saveLocalTemplates(list);
          callback(list);
        } else {
          // If Firestore is empty, seed it with non-deleted INITIAL_TEMPLATES
          INITIAL_TEMPLATES.forEach((tpl) => {
            if (!deletedIds.has(tpl.id)) {
              setDoc(doc(db, TEMPLATES_COLLECTION, tpl.id), tpl, { merge: true }).catch(() => {});
            }
          });
          callback(getStoredTemplates());
        }
      },
      (err) => {
        console.warn("Firestore templates subscription error (using local)", err.message);
        callback(getStoredTemplates());
      }
    );

    return unsubscribe;
  } catch (e) {
    console.warn("Error subscribing to templates", e);
    return () => {};
  }
}

/**
 * Add or update a template (Admin only)
 */
export async function saveTemplate(template: TemplateItem): Promise<void> {
  const current = getStoredTemplates();
  const existingIdx = current.findIndex((t) => t.id === template.id);
  let updated: TemplateItem[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = template;
  } else {
    updated = [template, ...current];
  }

  saveLocalTemplates(updated);

  try {
    await setDoc(doc(db, TEMPLATES_COLLECTION, template.id), template, { merge: true });
  } catch (e) {
    console.warn("Failed to sync template to Firestore", e);
  }
}

/**
 * Add or update multiple templates at once (Batch upload)
 */
export async function saveTemplatesBatch(newTemplates: TemplateItem[]): Promise<void> {
  if (!newTemplates || newTemplates.length === 0) return;
  const current = getStoredTemplates();
  const map = new Map<string, TemplateItem>();
  // Seed current
  current.forEach((t) => map.set(t.id, t));
  // Upsert new
  newTemplates.forEach((t) => map.set(t.id, t));
  const updated = Array.from(map.values());
  saveLocalTemplates(updated);

  try {
    await Promise.all(
      newTemplates.map((tpl) =>
        setDoc(doc(db, TEMPLATES_COLLECTION, tpl.id), tpl, { merge: true })
      )
    );
  } catch (e) {
    console.warn("Failed to sync templates batch to Firestore", e);
  }
}

/**
 * Delete a template (Admin only)
 */
export async function deleteTemplate(id: string): Promise<void> {
  recordDeletedTemplateId(id);
  const current = getStoredTemplates();
  const updated = current.filter((t) => t.id !== id);
  saveLocalTemplates(updated);

  try {
    // Record tombstone in Firestore so other sessions don't resurrect it
    await setDoc(doc(db, TEMPLATES_COLLECTION, id), { isDeleted: true }, { merge: true });
    await deleteDoc(doc(db, TEMPLATES_COLLECTION, id));
  } catch (e) {
    console.warn("Failed to delete template from Firestore", e);
  }
}

/**
 * Increment download count
 */
export async function recordTemplateDownload(id: string): Promise<void> {
  const current = getStoredTemplates();
  const idx = current.findIndex((t) => t.id === id);
  if (idx >= 0) {
    current[idx].downloadCount = (current[idx].downloadCount || 0) + 1;
    saveLocalTemplates(current);
    try {
      await setDoc(doc(db, TEMPLATES_COLLECTION, id), { downloadCount: current[idx].downloadCount }, { merge: true });
    } catch {
      // offline silent
    }
  }
}

/**
 * Toggle pinned status (Admin only)
 */
export async function togglePinTemplate(id: string): Promise<void> {
  const current = getStoredTemplates();
  const idx = current.findIndex((t) => t.id === id);
  if (idx >= 0) {
    current[idx].isPinned = !current[idx].isPinned;
    saveLocalTemplates(current);
    try {
      await setDoc(doc(db, TEMPLATES_COLLECTION, id), { isPinned: current[idx].isPinned }, { merge: true });
    } catch {
      // offline silent
    }
  }
}

/**
 * Bulk update templates (category, tags, version, isPinned)
 */
export async function bulkUpdateTemplates(
  ids: string[],
  updates: Partial<TemplateItem>,
  appendTags?: string[]
): Promise<void> {
  if (!ids || ids.length === 0) return;
  const idSet = new Set(ids);
  const current = getStoredTemplates();

  const updated = current.map((t) => {
    if (idSet.has(t.id)) {
      let combinedTags = t.tags || [];
      if (appendTags && appendTags.length > 0) {
        const tagSet = new Set([...combinedTags, ...appendTags]);
        combinedTags = Array.from(tagSet);
      }
      return {
        ...t,
        ...updates,
        ...(appendTags ? { tags: combinedTags } : {}),
      };
    }
    return t;
  });

  saveLocalTemplates(updated);

  try {
    await Promise.all(
      ids.map((id) => {
        const item = updated.find((t) => t.id === id);
        if (item) {
          return setDoc(doc(db, TEMPLATES_COLLECTION, id), item, { merge: true });
        }
        return Promise.resolve();
      })
    );
  } catch (e) {
    console.warn("Failed to bulk update templates in Firestore", e);
  }
}

/**
 * Bulk delete templates
 */
export async function bulkDeleteTemplates(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  ids.forEach(recordDeletedTemplateId);
  const idSet = new Set(ids);
  const current = getStoredTemplates();
  const updated = current.filter((t) => !idSet.has(t.id));
  saveLocalTemplates(updated);

  try {
    await Promise.all(
      ids.map(async (id) => {
        await setDoc(doc(db, TEMPLATES_COLLECTION, id), { isDeleted: true }, { merge: true });
        await deleteDoc(doc(db, TEMPLATES_COLLECTION, id));
      })
    );
  } catch (e) {
    console.warn("Failed to bulk delete templates from Firestore", e);
  }
}

/**
 * Bulk pin or unpin templates
 */
export async function bulkTogglePinTemplates(ids: string[], isPinned: boolean): Promise<void> {
  if (!ids || ids.length === 0) return;
  await bulkUpdateTemplates(ids, { isPinned });
}
