"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  Sparkles,
  Building2,
  User,
  Mail,
  Phone,
  Briefcase,
  ExternalLink,
  Copy,
  Check,
  PlusCircle,
  SendHorizontal,
  History,
  Download,
  Trash2,
  RefreshCw,
  Globe,
  Users,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  KeyRound,
  Layers,
  FileSpreadsheet,
  UploadCloud,
  CheckSquare,
  Square,
  ListPlus,
  Eye,
  Info,
  X,
} from "lucide-react";
import {
  SalesQLPerson,
  SalesQLOrganization,
  ProspectHistoryRecord,
  BulkEnrichPersonQuery,
  BulkEnrichPersonItemResult,
} from "@/types/salesql";
import {
  enrichOrganization,
  enrichPerson,
  emailLookupPerson,
  bulkEnrichPersons,
  parseTextToBulkQueries,
  exportBulkEnrichResultsToCSV,
  fetchEnvSalesQLConfig,
  getStoredSalesQLKey,
  subscribeToProspectHistory,
  subscribeToSalesQLKey,
  saveProspectToHistory,
  deleteProspectFromHistory,
  clearAllProspectHistory,
  exportProspectsToCSV,
} from "@/lib/salesqlService";
import { UserAccount } from "@/constants/users";
import { Lead } from "@/types/lead";
import { ColdClient } from "@/types/outreach";

type ProspectorMode = "person" | "bulk_person" | "organization" | "email_lookup" | "history";

interface ProspectorTabProps {
  currentUser?: UserAccount | null;
  isAdmin?: boolean;
  onNavigateToTab?: (tab: any) => void;
  onCreateLead?: (leadData: any) => Promise<void>;
  onAddColdClient?: (clientData: any) => Promise<any>;
}

export const ProspectorTab: React.FC<ProspectorTabProps> = ({
  currentUser,
  isAdmin = false,
  onNavigateToTab,
  onCreateLead,
  onAddColdClient,
}) => {
  const [mode, setMode] = useState<ProspectorMode>("person");
  const [apiKeyPresent, setApiKeyPresent] = useState<boolean>(false);
  const [keyMasked, setKeyMasked] = useState<string>("");

  // Search Inputs - Single Person
  const [personLinkedinUrl, setPersonLinkedinUrl] = useState("");
  const [personEmail, setPersonEmail] = useState("");
  const [personFullName, setPersonFullName] = useState("");
  const [personOrgDomain, setPersonOrgDomain] = useState("");
  const [matchDirectEmail, setMatchDirectEmail] = useState(false);
  const [matchDirectPhone, setMatchDirectPhone] = useState(false);

  // Search Inputs - Bulk Person
  const [bulkInputMode, setBulkInputMode] = useState<"paste" | "upload" | "manual">("paste");
  const [bulkRawText, setBulkRawText] = useState("");
  const [bulkManualRows, setBulkManualRows] = useState<BulkEnrichPersonQuery[]>([
    { linkedin_url: "" },
    { email: "" },
    { full_name: "", organization_domain: "" },
  ]);
  const [bulkResults, setBulkResults] = useState<{ query: BulkEnrichPersonQuery; person?: SalesQLPerson; error?: string }[] | null>(null);
  const [selectedBulkIndices, setSelectedBulkIndices] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search Inputs - Organization
  const [orgDomain, setOrgDomain] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgLinkedinUrl, setOrgLinkedinUrl] = useState("");

  // Search Inputs - Email Lookup
  const [lookupEmail, setLookupEmail] = useState("");

  // Loading & State
  const [isLoading, setIsLoading] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Active Results
  const [personResult, setPersonResult] = useState<SalesQLPerson | null>(null);
  const [orgResult, setOrgResult] = useState<SalesQLOrganization | null>(null);

  // History State
  const [historyList, setHistoryList] = useState<ProspectHistoryRecord[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilterType, setHistoryFilterType] = useState<"all" | "person" | "organization">("all");

  // Success Feedback Toast
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "info" | "error";
  } | null>(null);

  const showToast = (text: string, type: "success" | "info" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Copy helper
  const handleCopy = (text: string, fieldId: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Initial key verification & real-time sync across workspace
  useEffect(() => {
    // 1. Subscribe to real-time SalesQL key synced across workspace (via Admin in Developer Tab)
    const unsubKey = subscribeToSalesQLKey((syncedKey) => {
      if (syncedKey && syncedKey.trim()) {
        setApiKeyPresent(true);
        setKeyMasked(syncedKey.slice(0, 4) + "••••••••" + syncedKey.slice(-4));
      }
    });

    // 2. Also check local storage & server config (.env / Firestore)
    const checkKey = async () => {
      const localKey = getStoredSalesQLKey();
      if (localKey) {
        setApiKeyPresent(true);
        setKeyMasked(localKey.slice(0, 4) + "••••••••" + localKey.slice(-4));
        return;
      }
      const envConfig = await fetchEnvSalesQLConfig();
      if (envConfig.hasEnvKey) {
        setApiKeyPresent(true);
        setKeyMasked(envConfig.maskedKey || "Connected");
      } else {
        setApiKeyPresent(false);
      }
    };
    checkKey();

    return () => unsubKey();
  }, []);

  // Subscribe to history
  useEffect(() => {
    const unsubscribe = subscribeToProspectHistory((records) => {
      setHistoryList(records);
    });
    return () => unsubscribe();
  }, []);

  // 1. Enrich Person Handler
  const handleEnrichPerson = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!personLinkedinUrl.trim() && !personEmail.trim() && !personFullName.trim()) {
      setErrorMsg("Please enter at least a LinkedIn profile URL, email address, or full name.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setPersonResult(null);

    try {
      const data = await enrichPerson({
        linkedin_url: personLinkedinUrl.trim() || undefined,
        email: personEmail.trim() || undefined,
        full_name: personFullName.trim() || undefined,
        organization_domain: personOrgDomain.trim() || undefined,
        match_if_direct_email: matchDirectEmail,
        match_if_direct_phone: matchDirectPhone,
      });

      setPersonResult(data);
      showToast(`Successfully enriched profile for ${data.full_name || "contact"}!`);

      // Auto save to history
      await saveProspectToHistory({
        id: "prospect-" + Date.now(),
        type: "person",
        query: personLinkedinUrl || personFullName || personEmail || "Person Search",
        personData: data,
        prospectedBy: currentUser?.name || "System",
        prospectedAt: new Date().toISOString(),
        prospectedAtMs: Date.now(),
      });
    } catch (err: any) {
      setErrorMsg(err.message || "No matching profile found on SalesQL.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Bulk Enrich Persons Handler
  const handleBulkEnrich = async (queriesToRun?: BulkEnrichPersonQuery[]) => {
    let queries: BulkEnrichPersonQuery[] = [];

    if (queriesToRun && queriesToRun.length > 0) {
      queries = queriesToRun;
    } else if (bulkInputMode === "paste") {
      queries = parseTextToBulkQueries(bulkRawText);
    } else if (bulkInputMode === "manual") {
      queries = bulkManualRows.filter(
        (r) =>
          r.linkedin_url?.trim() ||
          r.email?.trim() ||
          r.full_name?.trim() ||
          (r.first_name?.trim() && r.last_name?.trim())
      );
    }

    if (queries.length === 0) {
      setErrorMsg("Please provide at least 1 valid query (LinkedIn URL, Email, or Name + Organization).");
      return;
    }

    if (queries.length > 100) {
      setErrorMsg(`Maximum 100 items per bulk request. Found ${queries.length}. Please trim your list.`);
      return;
    }

    setIsBulkProcessing(true);
    setErrorMsg(null);
    setBulkResults(null);
    setSelectedBulkIndices(new Set());

    try {
      const apiResults = await bulkEnrichPersons(queries);

      const mapped = queries.map((q, idx) => {
        const resItem = apiResults[idx];
        if (!resItem) {
          return { query: q, error: "No response from SalesQL" };
        }
        if ("error" in resItem && resItem.error) {
          return { query: q, error: resItem.error };
        }
        return { query: q, person: resItem as SalesQLPerson };
      });

      setBulkResults(mapped);

      // Auto-select all successfully found records
      const foundIndices = new Set<number>();
      mapped.forEach((item, idx) => {
        if (item.person && !item.error) {
          foundIndices.add(idx);
          // Auto-save found person to history
          saveProspectToHistory({
            id: "prospect-" + Date.now() + "-" + idx,
            type: "person",
            query: item.person.linkedin_url || item.person.full_name || item.query.linkedin_url || item.query.email || "Bulk Enrich",
            personData: item.person,
            prospectedBy: currentUser?.name || "System",
            prospectedAt: new Date().toISOString(),
            prospectedAtMs: Date.now(),
          }).catch(() => {});
        }
      });
      setSelectedBulkIndices(foundIndices);

      const foundCount = foundIndices.size;
      showToast(`Bulk enrichment finished: ${foundCount} of ${queries.length} persons found!`, "success");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process bulk enrichment.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // CSV File Upload Reader
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setBulkRawText(text);
        const parsed = parseTextToBulkQueries(text);
        showToast(`Loaded ${parsed.length} queries from ${file.name}`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 3. Enrich Organization Handler
  const handleEnrichOrganization = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!orgDomain.trim() && !orgName.trim() && !orgLinkedinUrl.trim()) {
      setErrorMsg("Please enter an organization domain, company name, or LinkedIn company URL.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setOrgResult(null);

    try {
      const data = await enrichOrganization({
        organization_domain: orgDomain.trim() || undefined,
        organization_name: orgName.trim() || undefined,
        linkedin_url: orgLinkedinUrl.trim() || undefined,
      });

      setOrgResult(data);
      showToast(`Company profile retrieved for ${data.name || "organization"}!`);

      // Auto save to history
      await saveProspectToHistory({
        id: "prospect-" + Date.now(),
        type: "organization",
        query: orgDomain || orgName || orgLinkedinUrl || "Company Search",
        orgData: data,
        prospectedBy: currentUser?.name || "System",
        prospectedAt: new Date().toISOString(),
        prospectedAtMs: Date.now(),
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to find organization data on SalesQL.");
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Reverse Email Lookup Handler
  const handleEmailLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!lookupEmail.trim()) {
      setErrorMsg("Please enter an email address to lookup.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setPersonResult(null);

    try {
      const data = await emailLookupPerson(lookupEmail.trim());

      setPersonResult(data);
      showToast(`Found contact matching ${lookupEmail}!`);

      // Auto save to history
      await saveProspectToHistory({
        id: "prospect-" + Date.now(),
        type: "person",
        query: lookupEmail.trim(),
        personData: data,
        prospectedBy: currentUser?.name || "System",
        prospectedAt: new Date().toISOString(),
        prospectedAtMs: Date.now(),
      });
    } catch (err: any) {
      setErrorMsg(err.message || "No profile found matching this email address.");
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Quick Convert to CRM Lead (Single)
  const handleConvertToPipelineLead = async (person?: SalesQLPerson, org?: SalesQLOrganization) => {
    if (!onCreateLead) {
      showToast("Lead creation service unavailable in current view.", "info");
      return;
    }

    const company = person?.organization?.name || org?.name || "Prospect Company";
    const contact = person?.full_name || "Primary Decision Maker";
    const primaryEmail = person?.emails?.[0]?.email?.replace(/\*/g, "") || "";
    const primaryPhone = person?.phones?.[0]?.phone?.replace(/\*/g, "") || "";
    const title = person?.title || "Leadership";
    const website = person?.organization?.website || org?.website || "";

    const newLeadPayload = {
      companyName: company,
      contactName: contact,
      contactEmail: primaryEmail,
      contactPhone: primaryPhone,
      industry: "Technology",
      dealValue: 500000,
      stage: "Qualified",
      leadSource: "SalesQL Prospector",
      program: "B2B Solutions",
      owner: currentUser?.name || "Amit",
      notes: `Imported via SalesQL Prospector.\nTitle: ${title}\nCompany: ${company}\nWebsite: ${website}\nLinkedIn: ${person?.linkedin_url || org?.linkedin_url || ""}`,
    };

    try {
      await onCreateLead(newLeadPayload);
      showToast(`🎉 "${company}" (${contact}) added to Pipeline Leads!`, "success");
      if (onNavigateToTab) {
        setTimeout(() => onNavigateToTab("kanban"), 1200);
      }
    } catch (err: any) {
      showToast("Failed to create pipeline lead: " + (err.message || "Unknown error"), "error");
    }
  };

  // 6. Quick Convert to Cold Outreach (Single)
  const handleAddToColdOutreach = async (person?: SalesQLPerson, org?: SalesQLOrganization) => {
    if (!onAddColdClient) {
      showToast("Cold outreach service unavailable.", "info");
      return;
    }

    const company = person?.organization?.name || org?.name || "Prospect Account";
    const contact = person?.full_name || "Business Contact";
    const primaryEmail = person?.emails?.[0]?.email?.replace(/\*/g, "") || "";
    const primaryPhone = person?.phones?.[0]?.phone?.replace(/\*/g, "") || "";
    const title = person?.title || "";
    const domain = person?.organization?.website_domain || org?.website_domain || "";

    const payload = {
      companyName: company,
      contactPerson: contact,
      email: primaryEmail,
      phone: primaryPhone,
      designation: title,
      domain: domain,
      status: "lead" as const,
      channel: "email" as const,
      owner: currentUser?.name || "Amit",
      initialNote: `Prospect discovered via SalesQL.\nTitle: ${title}\nLinkedIn: ${person?.linkedin_url || org?.linkedin_url || ""}`,
    };

    try {
      await onAddColdClient(payload);
      showToast(`🚀 Added "${company}" to Cold Outreach list!`, "success");
      if (onNavigateToTab) {
        setTimeout(() => onNavigateToTab("outreach"), 1200);
      }
    } catch (err: any) {
      showToast("Failed to add to cold outreach: " + (err.message || "Unknown error"), "error");
    }
  };

  // 7. Bulk Action: Add Selected to Pipeline Leads
  const handleBulkAddToPipeline = async () => {
    if (!onCreateLead || !bulkResults) return;

    const selectedItems = bulkResults.filter(
      (item, idx) => selectedBulkIndices.has(idx) && item.person && !item.error
    );

    if (selectedItems.length === 0) {
      showToast("Please select at least one enriched prospect.", "info");
      return;
    }

    let successCount = 0;
    for (const item of selectedItems) {
      const p = item.person!;
      const company = p.organization?.name || "Company";
      const contact = p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Decision Maker";
      const primaryEmail = p.emails?.[0]?.email?.replace(/\*/g, "") || "";
      const primaryPhone = p.phones?.[0]?.phone?.replace(/\*/g, "") || "";
      const title = p.title || p.headline || "Leadership";

      try {
        await onCreateLead({
          companyName: company,
          contactName: contact,
          contactEmail: primaryEmail,
          contactPhone: primaryPhone,
          industry: "Technology",
          dealValue: 500000,
          stage: "Qualified",
          leadSource: "SalesQL Bulk Prospector",
          program: "B2B Solutions",
          owner: currentUser?.name || "Amit",
          notes: `Bulk imported via SalesQL.\nTitle: ${title}\nCompany: ${company}\nLinkedIn: ${p.linkedin_url || ""}`,
        });
        successCount++;
      } catch {}
    }

    showToast(`🎉 Added ${successCount} leads into CRM Pipeline!`, "success");
    if (onNavigateToTab) {
      setTimeout(() => onNavigateToTab("kanban"), 1400);
    }
  };

  // 8. Bulk Action: Add Selected to Cold Outreach
  const handleBulkAddToOutreach = async () => {
    if (!onAddColdClient || !bulkResults) return;

    const selectedItems = bulkResults.filter(
      (item, idx) => selectedBulkIndices.has(idx) && item.person && !item.error
    );

    if (selectedItems.length === 0) {
      showToast("Please select at least one enriched prospect.", "info");
      return;
    }

    let successCount = 0;
    for (const item of selectedItems) {
      const p = item.person!;
      const company = p.organization?.name || "Target Account";
      const contact = p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Contact";
      const primaryEmail = p.emails?.[0]?.email?.replace(/\*/g, "") || "";
      const primaryPhone = p.phones?.[0]?.phone?.replace(/\*/g, "") || "";
      const title = p.title || p.headline || "";
      const domain = p.organization?.website_domain || "";

      try {
        await onAddColdClient({
          companyName: company,
          contactPerson: contact,
          email: primaryEmail,
          phone: primaryPhone,
          designation: title,
          domain: domain,
          status: "lead" as const,
          channel: "email" as const,
          owner: currentUser?.name || "Amit",
          initialNote: `Bulk prospect via SalesQL.\nTitle: ${title}\nLinkedIn: ${p.linkedin_url || ""}`,
        });
        successCount++;
      } catch {}
    }

    showToast(`🚀 Added ${successCount} accounts into Cold Outreach!`, "success");
    if (onNavigateToTab) {
      setTimeout(() => onNavigateToTab("outreach"), 1400);
    }
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return historyList.filter((item) => {
      if (historyFilterType !== "all" && item.type !== historyFilterType) return false;
      if (!historySearch.trim()) return true;
      const q = historySearch.toLowerCase();
      const personName = item.personData?.full_name?.toLowerCase() || "";
      const orgName = item.orgData?.name?.toLowerCase() || "";
      const personOrg = item.personData?.organization?.name?.toLowerCase() || "";
      const personTitle = item.personData?.title?.toLowerCase() || "";
      const queryStr = item.query?.toLowerCase() || "";

      return (
        personName.includes(q) ||
        orgName.includes(q) ||
        personOrg.includes(q) ||
        personTitle.includes(q) ||
        queryStr.includes(q)
      );
    });
  }, [historyList, historySearch, historyFilterType]);

  // Detected bulk queries count in textarea
  const detectedPasteQueriesCount = useMemo(() => {
    if (!bulkRawText.trim()) return 0;
    return parseTextToBulkQueries(bulkRawText).length;
  }, [bulkRawText]);

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900/95 dark:bg-slate-800/95 text-white rounded-2xl shadow-2xl border border-indigo-500/40 backdrop-blur-md flex items-center space-x-3 animate-slideUp">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400" />
            )}
          </div>
          <p className="text-xs font-semibold text-slate-100 max-w-sm">{toastMessage.text}</p>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 rounded-2xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30 text-white">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Prospector Engine
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live B2B Intel
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                  Single and bulk enrich executives, uncover verified direct emails & mobile numbers, and discover company hierarchies with one click.
                </p>
              </div>
            </div>
          </div>

          {/* API Key Status Pill */}
          <div className="flex items-center space-x-2 self-start md:self-center">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs">
              <div className={`w-2 h-2 rounded-full ${apiKeyPresent ? "bg-emerald-400 shadow-sm shadow-emerald-400" : "bg-amber-400"}`} />
              <span className="text-slate-300 font-medium">SalesQL API:</span>
              <span className="font-mono font-bold text-indigo-300">
                {apiKeyPresent ? (isAdmin ? keyMasked || "Connected" : "Connected (Admin Set)") : "Not Configured"}
              </span>
            </div>

            {isAdmin && onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab("developer")}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30 text-xs font-bold transition"
                title="Manage SalesQL API Key in Developer Settings"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Configure</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Mode Buttons */}
        <div className="flex items-center space-x-1 sm:space-x-2 mt-6 pt-4 border-t border-slate-800/80 overflow-x-auto pb-1">
          <button
            onClick={() => {
              setMode("person");
              setErrorMsg(null);
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              mode === "person"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30"
                : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Enrich Person</span>
          </button>

          <button
            onClick={() => {
              setMode("bulk_person");
              setErrorMsg(null);
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              mode === "bulk_person"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30"
                : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50"
            }`}
          >
            <Layers className="w-4 h-4 text-amber-300" />
            <span>Bulk Enrich Persons</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
              Up to 100
            </span>
          </button>

          <button
            onClick={() => {
              setMode("organization");
              setErrorMsg(null);
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              mode === "organization"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30"
                : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Enrich Organization</span>
          </button>

          <button
            onClick={() => {
              setMode("email_lookup");
              setErrorMsg(null);
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              mode === "email_lookup"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30"
                : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50"
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Reverse Email Lookup</span>
          </button>

          <button
            onClick={() => {
              setMode("history");
              setErrorMsg(null);
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              mode === "history"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30"
                : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Saved Intel History</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60 text-indigo-300">
              {historyList.length}
            </span>
          </button>
        </div>
      </div>

      {/* Mode: BULK ENRICH PERSONS (Full width optimized experience) */}
      {mode === "bulk_person" ? (
        <div className="space-y-6">
          {/* Rules & Matching Strategy Guide */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Bulk Person Intelligence Engine</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    Max 100/Batch
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enrich up to 100 executives and decision makers in a single request. Each item must contain at least one valid matching strategy.
                </p>
              </div>

              {/* Matching Groups Pill Summary */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-bold flex items-center space-x-1">
                  <span>⭐ Group 1: LinkedIn URL</span>
                </span>
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 font-bold flex items-center space-x-1">
                  <span>✉️ Group 2: Email</span>
                </span>
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 font-bold flex items-center space-x-1">
                  <span>🏢 Group 3: Name + Company</span>
                </span>
              </div>
            </div>

            {/* Input Selection Tabs */}
            <div className="pt-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center space-x-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setBulkInputMode("paste")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1.5 ${
                    bulkInputMode === "paste"
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Paste Text / URLs / CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBulkInputMode("upload")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1.5 ${
                    bulkInputMode === "upload"
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Upload CSV File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBulkInputMode("manual")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1.5 ${
                    bulkInputMode === "manual"
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  <span>Manual Grid Editor</span>
                </button>
              </div>

              {/* Sample Quick Loader */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const sampleText = `https://linkedin.com/in/tonyagarrett1\ncatherinelkent@gmail.com\nSatya Nadella, microsoft.com\nSundar Pichai, google.com`;
                    setBulkRawText(sampleText);
                    setBulkInputMode("paste");
                    showToast("Sample prospect queries loaded!");
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 text-xs font-bold hover:bg-indigo-100 transition"
                >
                  ⚡ Load Demo Batch (4 Profiles)
                </button>
                {bulkRawText && (
                  <button
                    type="button"
                    onClick={() => {
                      setBulkRawText("");
                      setBulkResults(null);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition"
                    title="Clear"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Input Panels */}
            <div className="mt-4">
              {bulkInputMode === "paste" && (
                <div className="space-y-3">
                  <div className="relative">
                    <textarea
                      rows={6}
                      value={bulkRawText}
                      onChange={(e) => setBulkRawText(e.target.value)}
                      placeholder={`Paste up to 100 queries (one per line, or comma-separated CSV):
https://linkedin.com/in/tonyagarrett1
catherinelkent@gmail.com
Tonya Garrett, linkedin.com
Satya Nadella, microsoft.com
Sundar Pichai, Alphabet`}
                      className="w-full p-3 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    />
                    <div className="absolute right-3 bottom-3 text-[11px] font-mono font-bold bg-white/90 dark:bg-slate-900/90 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                      <span className={detectedPasteQueriesCount > 100 ? "text-rose-500 font-black" : "text-indigo-600 dark:text-indigo-400"}>
                        {detectedPasteQueriesCount}
                      </span>
                      <span className="text-slate-400"> / 100 queries</span>
                    </div>
                  </div>
                </div>
              )}

              {bulkInputMode === "upload" && (
                <div className="p-8 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl text-center space-y-3 bg-slate-50/50 dark:bg-slate-950/50">
                  <UploadCloud className="w-10 h-10 text-indigo-500 mx-auto" />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Upload CSV file with contacts
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Columns supported: <code className="font-mono font-semibold">linkedin_url</code>, <code className="font-mono font-semibold">email</code>, <code className="font-mono font-semibold">full_name</code>, <code className="font-mono font-semibold">organization_domain</code>
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="bulk-csv-input"
                  />
                  <label
                    htmlFor="bulk-csv-input"
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md shadow-indigo-600/20 transition"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Select CSV Spreadsheet</span>
                  </label>
                  {bulkRawText && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-2">
                      ✓ {detectedPasteQueriesCount} queries ready from file
                    </p>
                  )}
                </div>
              )}

              {bulkInputMode === "manual" && (
                <div className="space-y-3">
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {bulkManualRows.map((row, idx) => (
                      <div key={idx} className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-mono font-bold text-slate-400 w-5 text-center">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          placeholder="LinkedIn URL (https://linkedin.com/in/...)"
                          value={row.linkedin_url || ""}
                          onChange={(e) => {
                            const updated = [...bulkManualRows];
                            updated[idx] = { ...updated[idx], linkedin_url: e.target.value };
                            setBulkManualRows(updated);
                          }}
                          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                        />
                        <input
                          type="email"
                          placeholder="Email"
                          value={row.email || ""}
                          onChange={(e) => {
                            const updated = [...bulkManualRows];
                            updated[idx] = { ...updated[idx], email: e.target.value };
                            setBulkManualRows(updated);
                          }}
                          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                        />
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={row.full_name || ""}
                          onChange={(e) => {
                            const updated = [...bulkManualRows];
                            updated[idx] = { ...updated[idx], full_name: e.target.value };
                            setBulkManualRows(updated);
                          }}
                          className="w-36 px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                        />
                        <input
                          type="text"
                          placeholder="Company/Domain"
                          value={row.organization_domain || row.organization_name || ""}
                          onChange={(e) => {
                            const updated = [...bulkManualRows];
                            const val = e.target.value;
                            if (val.includes(".")) {
                              updated[idx] = { ...updated[idx], organization_domain: val, organization_name: undefined };
                            } else {
                              updated[idx] = { ...updated[idx], organization_name: val, organization_domain: undefined };
                            }
                            setBulkManualRows(updated);
                          }}
                          className="w-36 px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (bulkManualRows.length <= 1) return;
                            setBulkManualRows(bulkManualRows.filter((_, i) => i !== idx));
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 transition"
                          title="Remove row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (bulkManualRows.length >= 100) return;
                      setBulkManualRows([...bulkManualRows, { linkedin_url: "" }]);
                    }}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition flex items-center space-x-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Query Row</span>
                  </button>
                </div>
              )}
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">SalesQL Notice</p>
                  <p className="text-[11px] mt-0.5 text-rose-500/90">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Submit Action */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Bulk endpoint: <code className="font-mono text-indigo-600 dark:text-indigo-400">POST /v1/persons/enrich/bulk</code>
              </span>

              <button
                type="button"
                onClick={() => handleBulkEnrich()}
                disabled={isBulkProcessing || (bulkInputMode === "paste" && detectedPasteQueriesCount === 0)}
                className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition active:scale-[0.98]"
              >
                {isBulkProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Enriching Batch on SalesQL...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Enrich Batch of Persons</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Bulk Results Table & Actions */}
          {bulkResults && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5 animate-fadeIn">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Submitted
                  </span>
                  <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    {bulkResults.length}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                    Enriched / Found
                  </span>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {bulkResults.filter((r) => r.person && !r.error).length}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                    Not Found / Error
                  </span>
                  <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
                    {bulkResults.filter((r) => r.error || !r.person).length}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                    Emails Discovered
                  </span>
                  <p className="text-lg font-black text-purple-600 dark:text-purple-400 mt-0.5">
                    {bulkResults.reduce((acc, curr) => acc + (curr.person?.emails?.length || 0), 0)}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                    Phones Discovered
                  </span>
                  <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">
                    {bulkResults.reduce((acc, curr) => acc + (curr.person?.phones?.length || 0), 0)}
                  </p>
                </div>
              </div>

              {/* Bulk Actions Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      const foundCount = bulkResults.filter((r) => r.person && !r.error).length;
                      if (selectedBulkIndices.size === foundCount) {
                        setSelectedBulkIndices(new Set());
                      } else {
                        const allFound = new Set<number>();
                        bulkResults.forEach((r, idx) => {
                          if (r.person && !r.error) allFound.add(idx);
                        });
                        setSelectedBulkIndices(allFound);
                      }
                    }}
                    className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600"
                  >
                    {selectedBulkIndices.size > 0 &&
                    selectedBulkIndices.size === bulkResults.filter((r) => r.person && !r.error).length ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <span>
                      Select All Found ({selectedBulkIndices.size} selected)
                    </span>
                  </button>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleBulkAddToPipeline}
                    disabled={selectedBulkIndices.size === 0}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition"
                    title="Add selected enriched contacts to CRM Leads"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add to Pipeline Leads ({selectedBulkIndices.size})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkAddToOutreach}
                    disabled={selectedBulkIndices.size === 0}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 disabled:opacity-50 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-bold rounded-xl transition"
                    title="Add selected enriched contacts to Cold Outreach"
                  >
                    <SendHorizontal className="w-3.5 h-3.5" />
                    <span>Add to Outreach ({selectedBulkIndices.size})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => exportBulkEnrichResultsToCSV(bulkResults)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition"
                    title="Export full bulk dataset to CSV spreadsheet"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Enriched Results Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 w-24">Status</th>
                      <th className="py-2.5 px-3">Person / Executive</th>
                      <th className="py-2.5 px-3">Current Organization</th>
                      <th className="py-2.5 px-3">Discovered Emails</th>
                      <th className="py-2.5 px-3">Direct Phone</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {bulkResults.map((item, idx) => {
                      const p = item.person;
                      const isFound = Boolean(p && !item.error);
                      const isSelected = selectedBulkIndices.has(idx);

                      const name =
                        p?.full_name ||
                        `${p?.first_name || ""} ${p?.last_name || ""}`.trim() ||
                        item.query.full_name ||
                        "Unknown";
                      const title = p?.title || p?.headline || "";
                      const org = p?.organization?.name || item.query.organization_name || "";
                      const domain = p?.organization?.website_domain || item.query.organization_domain || "";
                      const verifiedEmails = p?.emails || [];
                      const directPhones = p?.phones || [];

                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                            isSelected ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            {isFound ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const updated = new Set(selectedBulkIndices);
                                  if (e.target.checked) updated.add(idx);
                                  else updated.delete(idx);
                                  setSelectedBulkIndices(updated);
                                }}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">{idx + 1}</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {isFound ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Found</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <span>Not Found</span>
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                                {name[0] || "?"}
                              </div>
                              <div className="min-w-0 max-w-[200px]">
                                <p className="font-bold text-slate-900 dark:text-white truncate">
                                  {name}
                                </p>
                                {title && (
                                  <p className="text-[11px] text-slate-500 truncate" title={title}>
                                    {title}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-2.5 px-3">
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">
                                {org || "—"}
                              </p>
                              {domain && (
                                <p className="text-[10px] text-slate-400 font-mono truncate">
                                  {domain}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="py-2.5 px-3">
                            {verifiedEmails.length === 0 ? (
                              <span className="text-slate-400 italic text-[11px]">None</span>
                            ) : (
                              <div className="space-y-1">
                                {verifiedEmails.slice(0, 2).map((em, eIdx) => (
                                  <div key={eIdx} className="flex items-center space-x-1.5 font-mono text-[11px]">
                                    <span className="text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                                      {em.email}
                                    </span>
                                    <span
                                      className={`text-[9px] px-1 rounded font-bold ${
                                        em.status?.toLowerCase() === "valid"
                                          ? "bg-emerald-500/10 text-emerald-600"
                                          : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                                      }`}
                                    >
                                      {em.status || "work"}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(em.email, `bulk-email-${idx}-${eIdx}`)}
                                      className="p-0.5 text-slate-400 hover:text-indigo-600"
                                    >
                                      {copiedField === `bulk-email-${idx}-${eIdx}` ? (
                                        <Check className="w-3 h-3 text-emerald-500" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                ))}
                                {verifiedEmails.length > 2 && (
                                  <span className="text-[10px] text-slate-400 font-semibold">
                                    +{verifiedEmails.length - 2} more
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="py-2.5 px-3">
                            {directPhones.length === 0 ? (
                              <span className="text-slate-400 italic text-[11px]">None</span>
                            ) : (
                              <div className="font-mono text-[11px] text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                                <span>{directPhones[0].phone}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(directPhones[0].phone, `bulk-phone-${idx}`)}
                                  className="p-0.5 text-slate-400 hover:text-emerald-600"
                                >
                                  {copiedField === `bulk-phone-${idx}` ? (
                                    <Check className="w-3 h-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1">
                              {p?.linkedin_url && (
                                <a
                                  href={p.linkedin_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  title="Open LinkedIn"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}

                              {isFound && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPersonResult(p!);
                                    setOrgResult(null);
                                    setMode("person");
                                  }}
                                  className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  title="View Full Profile Dossier"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Standard Single Search Grid Content */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Search & Parameter Form (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-4">
            {mode === "person" && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center space-x-2">
                    <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Executive / Decision Maker Lookup</span>
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    SalesQL v1
                  </span>
                </div>

                <form onSubmit={handleEnrichPerson} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      LinkedIn Profile URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://linkedin.com/in/tonyagarrett1"
                      value={personLinkedinUrl}
                      onChange={(e) => setPersonLinkedinUrl(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Direct LinkedIn URL yields the highest accuracy match.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Known Email (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. catherinelkent@gmail.com"
                        value={personEmail}
                        onChange={(e) => setPersonEmail(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Full Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Tonya Garrett"
                        value={personFullName}
                        onChange={(e) => setPersonFullName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Organization Domain (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. linkedin.com, openai.com"
                      value={personOrgDomain}
                      onChange={(e) => setPersonOrgDomain(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Match Preferences */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                    <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Advanced Enrichment Filters
                    </span>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={matchDirectEmail}
                          onChange={(e) => setMatchDirectEmail(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Strict Direct Email match</span>
                      </label>

                      <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={matchDirectPhone}
                          onChange={(e) => setMatchDirectPhone(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Strict Direct Phone match</span>
                      </label>
                    </div>
                  </div>

                  {/* Quick Examples */}
                  <div className="pt-1">
                    <span className="text-[10px] text-slate-400 font-semibold block mb-1">
                      Quick Demo Profiles:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setPersonLinkedinUrl("https://linkedin.com/in/tonyagarrett1");
                          setPersonFullName("Tonya Garrett");
                          setPersonOrgDomain("linkedin.com");
                        }}
                        className="text-[10px] px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-medium"
                      >
                        Tonya Garrett (LinkedIn)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPersonLinkedinUrl("https://linkedin.com/in/williamhgates");
                          setPersonFullName("Bill Gates");
                          setPersonOrgDomain("gatesfoundation.org");
                        }}
                        className="text-[10px] px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-medium"
                      >
                        Bill Gates
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition active:scale-[0.99]"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Enriching Person Data...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Enrich Contact Profile</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {mode === "organization" && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Company & Organization Enrichment</span>
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    SalesQL v1
                  </span>
                </div>

                <form onSubmit={handleEnrichOrganization} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Company Website Domain
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. openai.com, stripe.com, microsoft.com"
                      value={orgDomain}
                      onChange={(e) => setOrgDomain(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Recommended: Domain name without https:// or www.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Company Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. OpenAI"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      LinkedIn Company URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://linkedin.com/company/openai"
                      value={orgLinkedinUrl}
                      onChange={(e) => setOrgLinkedinUrl(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Quick Examples */}
                  <div className="pt-1">
                    <span className="text-[10px] text-slate-400 font-semibold block mb-1">
                      Quick Examples:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {["openai.com", "stripe.com", "airbnb.com", "microsoft.com"].map((dom) => (
                        <button
                          key={dom}
                          type="button"
                          onClick={() => {
                            setOrgDomain(dom);
                            setOrgName(dom.split(".")[0].toUpperCase());
                          }}
                          className="text-[10px] px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-medium"
                        >
                          {dom}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition active:scale-[0.99]"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Retrieving Company Details...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Enrich Organization</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {mode === "email_lookup" && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Reverse Email Contact Discovery</span>
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    SalesQL v1
                  </span>
                </div>

                <form onSubmit={handleEmailLookup} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Email Address to Uncover
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. catherinelkent@gmail.com"
                      value={lookupEmail}
                      onChange={(e) => setLookupEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Find full executive name, LinkedIn profile, work experience & phone numbers from any personal or business email.
                    </p>
                  </div>

                  <div className="pt-1">
                    <span className="text-[10px] text-slate-400 font-semibold block mb-1">
                      Quick Sample:
                    </span>
                    <button
                      type="button"
                      onClick={() => setLookupEmail("catherinelkent@gmail.com")}
                      className="text-[10px] px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-medium"
                    >
                      catherinelkent@gmail.com
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition active:scale-[0.99]"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Querying SalesQL Database...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>Lookup Person by Email</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {mode === "history" && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center space-x-2">
                    <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Enrichment History</span>
                  </h3>
                  <span className="text-xs font-bold text-slate-500">
                    {filteredHistory.length} Saved
                  </span>
                </div>

                {/* History Search & Filter */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search past enrichments..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setHistoryFilterType("all")}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          historyFilterType === "all"
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setHistoryFilterType("person")}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          historyFilterType === "person"
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        People
                      </button>
                      <button
                        onClick={() => setHistoryFilterType("organization")}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          historyFilterType === "organization"
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        Companies
                      </button>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => exportProspectsToCSV(filteredHistory)}
                        className="p-1 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Export History to CSV"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      {filteredHistory.length > 0 && (
                        <button
                          onClick={async () => {
                            if (confirm("Clear all prospect history?")) {
                              await clearAllProspectHistory();
                              showToast("History cleared");
                            }
                          }}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Clear History"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* History List */}
                <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
                  {filteredHistory.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No history found. Try searching a person or organization!
                    </div>
                  ) : (
                    filteredHistory.map((item) => {
                      const displayName =
                        item.personData?.full_name || item.orgData?.name || item.query;
                      const subtitle =
                        item.personData?.organization?.name ||
                        item.personData?.title ||
                        item.orgData?.website_domain ||
                        item.query;

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (item.type === "person" && item.personData) {
                              setPersonResult(item.personData);
                              setOrgResult(null);
                              setMode("person");
                            } else if (item.type === "organization" && item.orgData) {
                              setOrgResult(item.orgData);
                              setPersonResult(null);
                              setMode("organization");
                            }
                          }}
                          className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-950/50 cursor-pointer transition flex items-center justify-between group"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center space-x-1.5">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                  item.type === "person"
                                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                }`}
                              >
                                {item.type}
                              </span>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                {displayName}
                              </p>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {subtitle}
                            </p>
                          </div>

                          <div className="flex items-center space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteProspectFromHistory(item.id);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">SalesQL Query Notice</p>
                  <p className="text-[11px] mt-0.5 text-rose-500/90">{errorMsg}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Intel Dossier (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Default Empty State */}
            {!personResult && !orgResult && (
              <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center min-h-[420px]">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-inner">
                  <Search className="w-7 h-7" />
                </div>
                <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
                  Awaiting Search Query
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Enter a LinkedIn URL, domain, or email on the left to reveal rich executive profiles, direct mobile phones, verified emails, and work experience.
                </p>
                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={() => {
                      setMode("person");
                      setPersonLinkedinUrl("https://linkedin.com/in/tonyagarrett1");
                      setPersonFullName("Tonya Garrett");
                      setPersonOrgDomain("linkedin.com");
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 transition"
                  >
                    ⚡ Try Demo Executive
                  </button>
                  <button
                    onClick={() => {
                      setMode("organization");
                      setOrgDomain("openai.com");
                      setOrgName("OpenAI");
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 transition"
                  >
                    🏢 Try Demo Company (OpenAI)
                  </button>
                  <button
                    onClick={() => {
                      setMode("bulk_person");
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition flex items-center space-x-1"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Try Bulk Enrich (100x)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Person Result Dossier */}
            {personResult && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
                {/* Top Profile Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-start space-x-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-600/20 flex-shrink-0">
                      {personResult.first_name?.[0] || personResult.full_name?.[0] || "U"}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">
                          {personResult.full_name || `${personResult.first_name || ""} ${personResult.last_name || ""}`.trim() || "Executive"}
                        </h2>
                        {personResult.uuid && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {personResult.title || "Professional"}
                      </p>
                      {personResult.headline && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-md line-clamp-2">
                          {personResult.headline}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 1-Click Action Buttons */}
                  <div className="flex flex-wrap sm:flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleConvertToPipelineLead(personResult)}
                      className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95"
                      title="Add this prospect to Active Pipeline Leads"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Create CRM Lead</span>
                    </button>
                    <button
                      onClick={() => handleAddToColdOutreach(personResult)}
                      className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-xl border border-blue-500/20 transition active:scale-95"
                      title="Add to Cold Outreach accounts"
                    >
                      <SendHorizontal className="w-3.5 h-3.5" />
                      <span>Add to Outreach</span>
                    </button>
                  </div>
                </div>

                {/* Direct Verified Contact Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Emails Block */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                        <Mail className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Verified Emails</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">
                        {personResult.emails?.length || 0} Found
                      </span>
                    </div>

                    {(!personResult.emails || personResult.emails.length === 0) ? (
                      <p className="text-xs text-slate-400 italic">No emails available.</p>
                    ) : (
                      <div className="space-y-2">
                        {personResult.emails.map((em, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-mono text-slate-900 dark:text-slate-100 truncate">
                                {em.email}
                              </p>
                              <div className="flex items-center space-x-1.5 mt-0.5">
                                <span className="text-[9px] font-bold text-slate-500">
                                  {em.type || "Email"}
                                </span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                                    em.status?.toLowerCase() === "valid"
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  }`}
                                >
                                  {em.status || "Unknown"}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleCopy(em.email, `email-${idx}`)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="Copy email"
                            >
                              {copiedField === `email-${idx}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Phones Block */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Direct Phone Numbers</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">
                        {personResult.phones?.length || 0} Found
                      </span>
                    </div>

                    {(!personResult.phones || personResult.phones.length === 0) ? (
                      <p className="text-xs text-slate-400 italic">No direct phone numbers recorded.</p>
                    ) : (
                      <div className="space-y-2">
                        {personResult.phones.map((ph, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-mono text-slate-900 dark:text-slate-100">
                                {ph.phone}
                              </p>
                              <div className="flex items-center space-x-1.5 mt-0.5">
                                <span className="text-[9px] font-bold text-slate-500">
                                  {ph.type || "Direct"}
                                </span>
                                {ph.country_code && (
                                  <span className="text-[9px] px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                                    {ph.country_code}
                                  </span>
                                )}
                                {ph.is_valid && (
                                  <span className="text-[9px] px-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                                    Verified
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleCopy(ph.phone, `phone-${idx}`)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="Copy phone"
                            >
                              {copiedField === `phone-${idx}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Current Organization Card */}
                {personResult.organization && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Current Organization</span>
                      </span>
                      {personResult.organization.website_domain && (
                        <a
                          href={personResult.organization.website || `https://${personResult.organization.website_domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                        >
                          <span>{personResult.organization.website_domain}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          {personResult.organization.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          {personResult.organization.number_of_employees && (
                            <span className="flex items-center space-x-1">
                              <Users className="w-3 h-3 text-slate-400" />
                              <span>{personResult.organization.number_of_employees} employees</span>
                            </span>
                          )}
                          {personResult.organization.type && (
                            <span className="capitalize px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                              {personResult.organization.type}
                            </span>
                          )}
                          {personResult.organization.founded_year && (
                            <span>Founded {personResult.organization.founded_year}</span>
                          )}
                        </div>
                      </div>

                      {personResult.organization.linkedin_url && (
                        <a
                          href={personResult.organization.linkedin_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 text-xs font-bold transition flex items-center space-x-1"
                        >
                          <span>LinkedIn</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Work Experience Timeline */}
                {personResult.work_experience && personResult.work_experience.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Work Experience & Career Progression ({personResult.work_experience.length})</span>
                    </h4>

                    <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                      {personResult.work_experience.slice(0, 6).map((exp, idx) => (
                        <div key={idx} className="relative group">
                          <div
                            className={`absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                              exp.is_current ? "bg-emerald-500 ring-2 ring-emerald-500/30" : "bg-slate-400"
                            }`}
                          />
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center space-x-2">
                                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                                    {exp.title}
                                  </p>
                                  {exp.is_current && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                                  {exp.organization?.name || "Company"}
                                </p>
                              </div>

                              {exp.organization?.logo && (
                                <img
                                  src={exp.organization.logo}
                                  alt={exp.organization.name || "logo"}
                                  className="w-8 h-8 rounded-lg object-contain bg-white p-1 border border-slate-200 dark:border-slate-800"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-slate-400">
                              {exp.organization?.website_domain && (
                                <span>{exp.organization.website_domain}</span>
                              )}
                              {exp.organization?.number_of_employees && (
                                <span>{exp.organization.number_of_employees} employees</span>
                              )}
                              {exp.organization?.type && (
                                <span className="capitalize">{exp.organization.type}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Organization Result Dossier */}
            {orgResult && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
                {/* Org Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-start space-x-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-600/20 flex-shrink-0">
                      <Building2 className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">
                          {orgResult.name}
                        </h2>
                        {orgResult.type && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            {orgResult.type}
                          </span>
                        )}
                      </div>
                      {orgResult.website_domain && (
                        <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                          {orgResult.website_domain}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 1-Click Action Buttons */}
                  <div className="flex flex-wrap sm:flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleConvertToPipelineLead(undefined, orgResult)}
                      className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition active:scale-95"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Create CRM Lead</span>
                    </button>
                    <button
                      onClick={() => handleAddToColdOutreach(undefined, orgResult)}
                      className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-xl border border-blue-500/20 transition active:scale-95"
                    >
                      <SendHorizontal className="w-3.5 h-3.5" />
                      <span>Add to Outreach</span>
                    </button>
                  </div>
                </div>

                {/* Company Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Headcount
                    </span>
                    <p className="text-sm font-black text-slate-900 dark:text-white mt-1">
                      {orgResult.number_of_employees || "N/A"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Founded Year
                    </span>
                    <p className="text-sm font-black text-slate-900 dark:text-white mt-1">
                      {orgResult.founded_year || "N/A"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Company Structure
                    </span>
                    <p className="text-sm font-black text-slate-900 dark:text-white mt-1 capitalize">
                      {orgResult.type || "N/A"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Intel ID
                    </span>
                    <p className="text-xs font-mono text-slate-600 dark:text-slate-300 mt-1 truncate">
                      {orgResult.uuid?.slice(0, 8) || "SalesQL"}...
                    </p>
                  </div>
                </div>

                {/* Links & Quick Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {orgResult.website && (
                    <a
                      href={orgResult.website}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold transition"
                    >
                      <Globe className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Visit Website</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {orgResult.linkedin_url && (
                    <a
                      href={orgResult.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 text-xs font-bold transition"
                    >
                      <span>LinkedIn Company Page</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  <button
                    onClick={() => {
                      handleCopy(JSON.stringify(orgResult, null, 2), "raw-json");
                      showToast("Raw company JSON copied to clipboard");
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON Payload</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
