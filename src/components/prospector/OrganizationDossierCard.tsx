"use client";

import React, { useState } from "react";
import {
  Building2,
  Globe,
  Users,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  PlusCircle,
  SendHorizontal,
  ShieldCheck,
  Briefcase,
  Layers,
  Sparkles,
} from "lucide-react";
import { SalesQLOrganization } from "@/types/salesql";
import { getCompanyTypeBadge, getCompanyAge } from "@/lib/prospectorHelpers";

interface OrganizationDossierCardProps {
  organization: SalesQLOrganization;
  onConvertToLead?: (org: SalesQLOrganization) => void;
  onAddToOutreach?: (org: SalesQLOrganization) => void;
  onCopy?: (text: string, fieldId: string) => void;
  copiedField?: string | null;
}

export const OrganizationDossierCard: React.FC<OrganizationDossierCardProps> = ({
  organization,
  onConvertToLead,
  onAddToOutreach,
  onCopy,
  copiedField,
}) => {
  const [localCopied, setLocalCopied] = useState<string | null>(null);

  const handleCopyText = (text: string, id: string) => {
    if (onCopy) {
      onCopy(text, id);
    } else {
      if (!text) return;
      navigator.clipboard.writeText(text);
      setLocalCopied(id);
      setTimeout(() => setLocalCopied(null), 2000);
    }
  };

  const isCopied = (id: string) => copiedField === id || localCopied === id;

  const typeBadge = getCompanyTypeBadge(organization.type);
  const companyAge = getCompanyAge(organization.founded_year);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl shadow-slate-950/5 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start space-x-4">
          {/* Company Avatar with Gradient */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-600 text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-blue-600/25 ring-4 ring-blue-50 dark:ring-slate-800">
              {organization.name?.[0] || "C"}
            </div>
            {organization.uuid && (
              <div
                className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 text-white rounded-full ring-2 ring-white dark:ring-slate-900 shadow-sm"
                title="Verified SalesQL Entity"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {organization.name}
              </h2>
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${typeBadge.bgClass} ${typeBadge.textClass} ${typeBadge.borderClass}`}
              >
                {typeBadge.label}
              </span>
            </div>

            {organization.website_domain && (
              <p className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {organization.website_domain}
              </p>
            )}

            {organization.uuid && (
              <div className="flex items-center space-x-2 pt-0.5">
                <span className="text-[10px] text-slate-400 font-mono">Entity UUID:</span>
                <button
                  type="button"
                  onClick={() => handleCopyText(organization.uuid!, "org-uuid-copy")}
                  className="group flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                  title="Copy Entity UUID"
                >
                  <span>{organization.uuid}</span>
                  {isCopied("org-uuid-copy") ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 1-Click Action Buttons */}
        <div className="flex flex-wrap sm:flex-col gap-2 flex-shrink-0">
          {onConvertToLead && (
            <button
              onClick={() => onConvertToLead(organization)}
              className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/25 transition active:scale-95"
              title="Add this company into CRM Pipeline"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create CRM Account</span>
            </button>
          )}

          {onAddToOutreach && (
            <button
              onClick={() => onAddToOutreach(organization)}
              className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-xl border border-blue-500/20 transition active:scale-95"
              title="Add company to Cold Outreach accounts"
            >
              <SendHorizontal className="w-4 h-4" />
              <span>Add to Outreach</span>
            </button>
          )}

          <button
            onClick={() => {
              handleCopyText(JSON.stringify(organization, null, 2), "org-json-copy");
            }}
            className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition"
            title="Copy Raw Organization JSON"
          >
            {isCopied("org-json-copy") ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500 text-[11px]">JSON Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px]">Copy JSON</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4 Key Corporate Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Headcount */}
        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center space-x-1">
              <Users className="w-3 h-3 text-indigo-500" />
              <span>Team Size</span>
            </span>
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-white">
            {organization.number_of_employees || "N/A"}
          </p>
          <span className="text-[10px] font-bold text-slate-500 block">
            Employees Recorded
          </span>
        </div>

        {/* Founded Year & Age */}
        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-blue-500" />
              <span>Founded</span>
            </span>
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-white">
            {organization.founded_year || "N/A"}
          </p>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block truncate">
            {companyAge || "Established"}
          </span>
        </div>

        {/* Structure */}
        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center space-x-1">
              <Briefcase className="w-3 h-3 text-purple-500" />
              <span>Structure</span>
            </span>
          </div>
          <p className="text-sm font-black capitalize text-slate-900 dark:text-white truncate mt-1">
            {organization.type?.replace(/-/g, " ") || "Company"}
          </p>
          <span className="text-[10px] font-bold text-slate-500 block">
            Corporate Entity
          </span>
        </div>

        {/* Domain */}
        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center space-x-1">
              <Globe className="w-3 h-3 text-cyan-500" />
              <span>Domain</span>
            </span>
          </div>
          <p className="text-sm font-mono font-bold text-slate-900 dark:text-white truncate mt-1">
            {organization.website_domain || "N/A"}
          </p>
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block">
            Primary Web Domain
          </span>
        </div>
      </div>

      {/* Direct Intelligence & Online Assets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Official Website */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-500" />
              <span>Official Website</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400 font-bold">
              {organization.website_domain}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 shadow-sm">
            <a
              href={organization.website || `https://${organization.website_domain}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline truncate"
              title={organization.website || organization.website_domain}
            >
              {organization.website || organization.website_domain}
            </a>

            <div className="flex items-center space-x-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() =>
                  handleCopyText(
                    organization.website || organization.website_domain || "",
                    "org-website-copy"
                  )
                }
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                title="Copy Website URL"
              >
                {isCopied("org-website-copy") ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              <a
                href={organization.website || `https://${organization.website_domain}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
              >
                <span>Visit</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* LinkedIn Company Profile */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
              <svg
                className="w-3.5 h-3.5 fill-current text-[#0A66C2]"
                viewBox="0 0 24 24"
              >
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
              </svg>
              <span>LinkedIn Page</span>
            </span>
            {organization.linkedin_url ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#0A66C2]/10 text-[#0A66C2]">
                Company Profile
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-bold">N/A</span>
            )}
          </div>

          {organization.linkedin_url ? (
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 shadow-sm">
              <a
                href={organization.linkedin_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono font-bold text-[#0A66C2] dark:text-blue-400 hover:underline truncate"
                title={organization.linkedin_url}
              >
                {organization.linkedin_url}
              </a>

              <div className="flex items-center space-x-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(organization.linkedin_url!, "org-linkedin-copy")
                  }
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                  title="Copy LinkedIn URL"
                >
                  {isCopied("org-linkedin-copy") ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                <a
                  href={organization.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-lg text-xs font-bold transition shadow-sm"
                >
                  <span>Open</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-2">
              No LinkedIn company URL on file.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
