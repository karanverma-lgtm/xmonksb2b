"use client";

import React, { useState } from "react";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Building2,
  ExternalLink,
  Copy,
  Check,
  PlusCircle,
  SendHorizontal,
  Calendar,
  Award,
  Globe,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";
import { SalesQLPerson } from "@/types/salesql";
import {
  formatTimestampToMonthYear,
  calculateDuration,
  formatCareerTotalExperience,
  getCompanyTypeBadge,
  getCompanyAge,
} from "@/lib/prospectorHelpers";

interface PersonDossierCardProps {
  person: SalesQLPerson;
  sourceLabel?: string;
  sourceEmail?: string;
  onConvertToLead?: (person: SalesQLPerson) => void;
  onAddToOutreach?: (person: SalesQLPerson) => void;
  onCopy?: (text: string, fieldId: string) => void;
  copiedField?: string | null;
}

export const PersonDossierCard: React.FC<PersonDossierCardProps> = ({
  person,
  sourceLabel,
  sourceEmail,
  onConvertToLead,
  onAddToOutreach,
  onCopy,
  copiedField,
}) => {
  const [localCopied, setLocalCopied] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const profileImageUrl =
    person.image ||
    (person as any).photo ||
    (person as any).avatar_url ||
    (person as any).picture ||
    (person as any).avatar;

  React.useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [profileImageUrl]);

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

  const careerExp = formatCareerTotalExperience(
    person.timestamp_work_experience_start
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl shadow-slate-950/5 space-y-6">
      {/* Reverse Email / Source Discovery Callout */}
      {sourceLabel && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 border border-indigo-500/20 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-600/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-indigo-900 dark:text-indigo-200">
                {sourceLabel}
              </p>
              {sourceEmail && (
                <p className="text-[11px] font-mono text-indigo-700 dark:text-indigo-400">
                  Queried address: <span className="font-bold underline">{sourceEmail}</span>
                </p>
              )}
            </div>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>High Confidence Match</span>
          </span>
        </div>
      )}

      {/* Top Profile Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start space-x-4">
          {/* Profile Picture or Avatar Initials with Verified Badge */}
          <div className="relative flex-shrink-0 group">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-xl shadow-indigo-600/25 ring-4 ring-indigo-50 dark:ring-slate-800 overflow-hidden relative">
              {profileImageUrl && !imageError ? (
                <>
                  <img
                    src={profileImageUrl}
                    alt={person.full_name || person.first_name || "Profile picture"}
                    className={`w-full h-full object-cover transition-all duration-300 ${
                      imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
                    } group-hover:scale-105`}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                    loading="lazy"
                  />
                  {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
                      <span>{person.first_name?.[0] || person.full_name?.[0] || "U"}</span>
                    </div>
                  )}
                  {/* Subtle hover overlay to view full image */}
                  <a
                    href={profileImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-white"
                    title="Open full resolution profile image"
                  >
                    <ExternalLink className="w-4 h-4 drop-shadow" />
                  </a>
                </>
              ) : (
                <span>{person.first_name?.[0] || person.full_name?.[0] || "U"}</span>
              )}
            </div>
            {person.uuid && (
              <div
                className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 text-white rounded-full ring-2 ring-white dark:ring-slate-900 shadow-sm z-10"
                title="Verified SalesQL Record"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {person.full_name ||
                  `${person.first_name || ""} ${person.last_name || ""}`.trim() ||
                  "Verified Executive"}
              </h2>
              {person.uuid && (
                <button
                  type="button"
                  onClick={() => handleCopyText(person.uuid!, "uuid-copy")}
                  className="group flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                  title="Click to copy SalesQL UUID"
                >
                  <span>{person.uuid.slice(0, 8)}...</span>
                  {isCopied("uuid-copy") ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                  )}
                </button>
              )}
            </div>

            {person.title && (
              <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                {person.title}
              </p>
            )}

            {person.headline && (
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed">
                {person.headline}
              </p>
            )}

            {/* Total Career Experience Badge */}
            {careerExp && (
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 text-[11px] font-bold mt-1">
                <Award className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                <span>{careerExp.yearsText}</span>
                <span className="text-purple-400">•</span>
                <span className="font-medium text-purple-600 dark:text-purple-400">
                  {careerExp.sinceYearText}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 1-Click Action Buttons */}
        <div className="flex flex-wrap sm:flex-col gap-2 flex-shrink-0">
          {onConvertToLead && (
            <button
              onClick={() => onConvertToLead(person)}
              className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition active:scale-95"
              title="Add this prospect directly into CRM Pipeline Leads"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create CRM Lead</span>
            </button>
          )}

          {onAddToOutreach && (
            <button
              onClick={() => onAddToOutreach(person)}
              className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-xl border border-blue-500/20 transition active:scale-95"
              title="Add prospect to Cold Outreach list"
            >
              <SendHorizontal className="w-4 h-4" />
              <span>Add to Outreach</span>
            </button>
          )}

          <button
            onClick={() => {
              handleCopyText(JSON.stringify(person, null, 2), "person-json-copy");
            }}
            className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition"
            title="Copy Raw Profile JSON"
          >
            {isCopied("person-json-copy") ? (
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

      {/* Direct Verified Contact Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* User LinkedIn Profile Card (Prominent & Full Width) */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/60 to-indigo-50/40 dark:from-slate-950/70 dark:to-indigo-950/20 border border-blue-200/80 dark:border-blue-900/40 space-y-2.5 md:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center space-x-2">
              <svg
                className="w-4 h-4 fill-current text-[#0A66C2]"
                viewBox="0 0 24 24"
              >
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
              </svg>
              <span>User LinkedIn Profile</span>
            </span>
            {person.linkedin_url ? (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-[#0A66C2]/10 text-[#0A66C2] dark:text-blue-400 border border-[#0A66C2]/20">
                Direct User Profile
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-bold">
                Not Available
              </span>
            )}
          </div>

          {person.linkedin_url ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs shadow-sm">
              <div className="min-w-0 pr-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                  Verified Profile URL
                </span>
                <a
                  href={person.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-sm font-bold text-[#0A66C2] dark:text-blue-400 hover:underline truncate block"
                  title={person.linkedin_url}
                >
                  {person.linkedin_url}
                </a>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(
                      person.linkedin_url!,
                      "person-linkedin-url"
                    )
                  }
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
                  title="Copy LinkedIn URL"
                >
                  {isCopied("person-linkedin-url") ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500 text-[11px]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Copy URL</span>
                    </>
                  )}
                </button>

                <a
                  href={person.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-[#0A66C2] hover:bg-[#004182] text-white text-xs font-bold transition shadow-md shadow-[#0A66C2]/20"
                >
                  <span>Open Profile</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              No personal LinkedIn profile URL was returned in this query.
            </p>
          )}
        </div>

        {/* Verified Emails Block */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-500" />
              <span>Verified Direct Emails</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              {person.emails?.length || 0} Found
            </span>
          </div>

          {!person.emails || person.emails.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              No verified email addresses on record.
            </p>
          ) : (
            <div className="space-y-2">
              {person.emails.map((em, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs shadow-sm hover:border-indigo-400 dark:hover:border-indigo-500 transition"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-mono font-bold text-slate-900 dark:text-slate-100 truncate">
                      {em.email}
                    </p>
                    <div className="flex items-center space-x-1.5 mt-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                        {em.type || "Email"}
                      </span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                          em.status?.toLowerCase() === "valid"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {em.status || "Verified"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleCopyText(em.email, `email-${idx}`)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Copy Email"
                    >
                      {isCopied(`email-${idx}`) ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {!em.email.includes("*") && (
                      <a
                        href={`mailto:${em.email}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Send Email"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Direct Phone Numbers Block */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-500" />
              <span>Direct Phone Numbers</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {person.phones?.length || 0} Found
            </span>
          </div>

          {!person.phones || person.phones.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              No direct phone numbers recorded.
            </p>
          ) : (
            <div className="space-y-2">
              {person.phones.map((ph, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs shadow-sm hover:border-emerald-400 dark:hover:border-emerald-500 transition"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {ph.phone}
                    </p>
                    <div className="flex items-center space-x-1.5 mt-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                        {ph.type || "Direct"}
                      </span>
                      {ph.is_valid && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Valid Line
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleCopyText(ph.phone, `phone-${idx}`)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Copy Phone Number"
                    >
                      {isCopied(`phone-${idx}`) ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {!ph.phone.includes("*") && (
                      <a
                        href={`tel:${ph.phone}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Click to Call"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Current Organization Card */}
      {person.organization && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/30 dark:from-slate-950/70 dark:to-indigo-950/20 border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-indigo-500" />
              <span>Current Organization</span>
            </span>

            {person.organization.website_domain && (
              <a
                href={
                  person.organization.website ||
                  `https://${person.organization.website_domain}`
                }
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
              >
                <Globe className="w-3 h-3" />
                <span>{person.organization.website_domain}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                {person.organization.name}
              </h4>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {person.organization.number_of_employees && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    <span>{person.organization.number_of_employees} employees</span>
                  </span>
                )}
                {person.organization.founded_year && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Founded {person.organization.founded_year}</span>
                    {getCompanyAge(person.organization.founded_year) && (
                      <span className="text-slate-400">
                        ({getCompanyAge(person.organization.founded_year)})
                      </span>
                    )}
                  </span>
                )}
                {person.organization.type && (
                  <span className="capitalize px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-[11px]">
                    {person.organization.type.replace(/-/g, " ")}
                  </span>
                )}
              </div>
            </div>

            {person.organization.linkedin_url && (
              <a
                href={person.organization.linkedin_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-xs font-bold transition border border-blue-500/20 self-start sm:self-center"
              >
                <span>Company LinkedIn</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Work Experience Timeline & Career Journey */}
      {person.work_experience && person.work_experience.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center space-x-2">
              <Briefcase className="w-4 h-4 text-indigo-500" />
              <span>
                Work Experience & Career Progression ({person.work_experience.length})
              </span>
            </h4>
            <span className="text-[11px] text-slate-500 font-medium">
              Chronological Journey
            </span>
          </div>

          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-indigo-500 before:via-purple-500 before:to-slate-300 dark:before:to-slate-800">
            {person.work_experience.map((exp, idx) => {
              const dateRange = `${formatTimestampToMonthYear(
                exp.timestamp_start
              )} – ${
                exp.is_current
                  ? "Present"
                  : formatTimestampToMonthYear(exp.timestamp_end) || "Past"
              }`;
              const duration = calculateDuration(
                exp.timestamp_start,
                exp.timestamp_end,
                exp.is_current
              );

              return (
                <div key={idx} className="relative group">
                  {/* Timeline Bullet */}
                  <div
                    className={`absolute -left-[23px] top-3.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 transition-transform group-hover:scale-125 ${
                      exp.is_current
                        ? "bg-emerald-500 ring-4 ring-emerald-500/20 shadow-md shadow-emerald-500/30"
                        : "bg-slate-400 dark:bg-slate-600"
                    }`}
                  />

                  {/* Experience Card */}
                  <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-white dark:hover:bg-slate-900 transition-all shadow-sm space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h5 className="text-sm font-black text-slate-900 dark:text-white">
                            {exp.title}
                          </h5>
                          {exp.is_current && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Current Role
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                          {exp.organization?.name || "Company"}
                        </p>
                      </div>

                      {/* Organization Logo or Fallback */}
                      {exp.organization?.logo ? (
                        <div className="w-10 h-10 rounded-xl bg-white p-1 border border-slate-200 dark:border-slate-800 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <img
                            src={exp.organization.logo}
                            alt={exp.organization.name || "logo"}
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-slate-800">
                          {exp.organization?.name?.[0] || "C"}
                        </div>
                      )}
                    </div>

                    {/* Timeline Date & Duration */}
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center space-x-1 font-semibold">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{dateRange}</span>
                      </span>
                      {duration && (
                        <>
                          <span>•</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {duration}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Extra Company Metadata Pills */}
                    {exp.organization && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-slate-500">
                        {exp.organization.website_domain && (
                          <a
                            href={
                              exp.organization.website ||
                              `https://${exp.organization.website_domain}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline flex items-center space-x-1 text-slate-600 dark:text-slate-400"
                          >
                            <Globe className="w-2.5 h-2.5" />
                            <span>{exp.organization.website_domain}</span>
                          </a>
                        )}

                        {exp.organization.number_of_employees && (
                          <span>• {exp.organization.number_of_employees} employees</span>
                        )}

                        {exp.organization.type && (
                          <span className="capitalize">
                            • {exp.organization.type.replace(/-/g, " ")}
                          </span>
                        )}

                        {exp.organization.linkedin_url && (
                          <a
                            href={exp.organization.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
                          >
                            <span>• LinkedIn</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
