"use client";

import React, { useState } from "react";
import { LeadStage } from "@/types/lead";
import { STAGES, STAGE_ORDER } from "@/constants/stages";
import {
  X,
  Building2,
  Phone,
  IndianRupee,
  Calendar,
  Sparkles,
  MapPin,
  GraduationCap,
  Check,
  ArrowRight,
  ArrowLeft,
  Award,
} from "lucide-react";
import { UserAccount } from "@/constants/users";
import { PRESET_PROGRAMS, getProgramBadgeStyle } from "@/constants/programs";

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAccount | null;
  onSubmit: (leadData: {
    companyName: string;
    contactName: string;
    designation?: string;
    contactEmail: string;
    contactPhone?: string;
    city?: string;
    industry: string;
    program?: string;
    dealValue: number;
    stage: LeadStage;
    expectedCloseDate: string;
    owner: string;
    journeyNotes?: string;
  }) => void;
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSubmit,
}) => {
  const [modalTab, setModalTab] = useState<"general" | "programs">("general");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [designation, setDesignation] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState("SaaS & Software");
  const [customIndustry, setCustomIndustry] = useState("");
  const [dealValue, setDealValue] = useState("500000");
  const [stage, setStage] = useState<LeadStage>("interest");
  const [expectedCloseDate, setExpectedCloseDate] = useState("2026-10-31");
  const owner = currentUser?.name || "Ruby";
  const [journeyNotes, setJourneyNotes] = useState("");

  // Program pitched state
  const [program, setProgram] = useState<string>("Executive Coaching & Leadership Presence");
  const [isCustomProgram, setIsCustomProgram] = useState<boolean>(false);
  const [customProgram, setCustomProgram] = useState<string>("");

  if (!isOpen) return null;

  const currentPitchedProgram = isCustomProgram ? customProgram.trim() || program : program;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !contactName || !contactEmail) {
      setModalTab("general");
      return;
    }

    const finalIndustry =
      industry === "Other"
        ? customIndustry.trim() || "Other"
        : industry;

    const finalProgram = isCustomProgram
      ? customProgram.trim() || "Custom Enterprise Solution"
      : program;

    onSubmit({
      companyName,
      contactName,
      designation: designation.trim() || undefined,
      contactEmail,
      contactPhone,
      city,
      industry: finalIndustry,
      program: finalProgram,
      dealValue: parseFloat(dealValue) || 0,
      stage,
      expectedCloseDate,
      owner,
      journeyNotes: journeyNotes || `Initial B2B Prospecting Lead Created for ${companyName}. Pitched Program: ${finalProgram}.`,
    });

    // Reset form
    setCompanyName("");
    setContactName("");
    setDesignation("");
    setContactEmail("");
    setContactPhone("");
    setCity("");
    setIndustry("SaaS & Software");
    setCustomIndustry("");
    setProgram("Executive Coaching & Leadership Presence");
    setIsCustomProgram(false);
    setCustomProgram("");
    setJourneyNotes("");
    setModalTab("general");
    onClose();
  };

  const badgeStyle = getProgramBadgeStyle(currentPitchedProgram);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Add New B2B Lead & Client Pitch
              </h3>
              <p className="text-xs text-slate-500">
                Setup client record with pipeline stage, deal value, and pitched program
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs Header */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-950/40 px-6 pt-2 gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setModalTab("general")}
            className={`flex items-center space-x-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition ${
              modalTab === "general"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>1. Client & Deal Info</span>
          </button>

          <button
            type="button"
            onClick={() => setModalTab("programs")}
            className={`flex items-center space-x-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition ${
              modalTab === "programs"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
            <span>2. Pitched Programs</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${badgeStyle.badgeBg} ${badgeStyle.badgeText} ${badgeStyle.borderColor}`}>
              {currentPitchedProgram ? currentPitchedProgram.split(" ")[0] : "Select"}
            </span>
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {modalTab === "general" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Company Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Company Name *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Global Tech"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Industry */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Industry
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="SaaS & Software">SaaS & Software</option>
                    <option value="Executive Coaching & Training">Executive Coaching & Training</option>
                    <option value="Manufacturing & Industrial">Manufacturing & Industrial</option>
                    <option value="Education & EdTech">Education & EdTech</option>
                    <option value="Consulting & Professional Services">Consulting & Professional Services</option>
                    <option value="Healthcare & Biotech">Healthcare & Biotech</option>
                    <option value="Fintech & Banking">Fintech & Banking</option>
                    <option value="Real Estate & Construction">Real Estate & Construction</option>
                    <option value="E-Commerce & Retail">E-Commerce & Retail</option>
                    <option value="Logistics & Supply Chain">Logistics & Supply Chain</option>
                    <option value="Media & Marketing">Media & Marketing</option>
                    <option value="Cybersecurity">Cybersecurity</option>
                    <option value="Hospitality & Events">Hospitality & Events</option>
                    <option value="Other">Other (Specify Custom Below...)</option>
                  </select>
                </div>
              </div>

              {/* Conditional Custom Industry Input */}
              {industry === "Other" && (
                <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                  <label className="block text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                    Specify Custom Industry Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Corporate Coaching, Automotive, Green Energy..."
                    value={customIndustry}
                    onChange={(e) => setCustomIndustry(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-indigo-500/30 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Pitched Program Quick Banner in Tab 1 */}
              <div
                onClick={() => setModalTab("programs")}
                className="p-3 rounded-2xl bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-transparent border border-indigo-500/20 hover:border-indigo-500/40 cursor-pointer transition flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
                      Pitched Program
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {currentPitchedProgram || "No program selected"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <span>Change</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Designation / Role
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Chief People Officer / VP HR"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. sarah.j@apextech.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="e.g. +91 98765 43210"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* City */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    City / Location
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. Mumbai, Bengaluru, Delhi"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Deal Value */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Estimated Deal Value (₹ INR) *
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="number"
                      required
                      placeholder="500000"
                      value={dealValue}
                      onChange={(e) => setDealValue(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Initial Stage */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Stage (Sets Weightage)
                  </label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as LeadStage)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {STAGE_ORDER.map((stageKey) => (
                      <option key={stageKey} value={stageKey}>
                        {STAGES[stageKey].label} ({STAGES[stageKey].weightage}% weightage)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Expected Close Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expected Close Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="date"
                      value={expectedCloseDate}
                      onChange={(e) => setExpectedCloseDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Initial Journey Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Prospecting Journey Log Note
                </label>
                <textarea
                  rows={2}
                  placeholder="Record initial outreach notes, pitch expectations, or client prospect source..."
                  value={journeyNotes}
                  onChange={(e) => setJourneyNotes(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            /* Tab 2: Pitched Programs */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50">
                <div className="flex items-center space-x-2 text-indigo-900 dark:text-indigo-200 font-bold text-sm mb-1">
                  <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Which program is {companyName ? `"${companyName}"` : "this client"} being pitched for?</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Select from xMonks core enterprise programs or type a customized organizational solution.
                </p>
              </div>

              {/* Presets Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
                {PRESET_PROGRAMS.map((p) => {
                  const isSelected = !isCustomProgram && program === p.name;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setProgram(p.name);
                        setIsCustomProgram(false);
                      }}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20 ring-2 ring-indigo-500/40"
                          : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="font-bold text-xs leading-tight">
                          {p.name}
                        </div>
                        {isSelected ? (
                          <div className="p-0.5 rounded-full bg-white text-indigo-600 ml-2 flex-shrink-0">
                            <Check className="w-3 h-3" />
                          </div>
                        ) : (
                          <span className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded border ml-2 flex-shrink-0 ${p.badgeBg} ${p.badgeText} ${p.borderColor}`}>
                            {p.category}
                          </span>
                        )}
                      </div>
                      <div className={`text-[11px] mt-1.5 leading-snug line-clamp-2 ${isSelected ? "text-indigo-100" : "text-slate-500 dark:text-slate-400"}`}>
                        {p.description}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom Program Input Option */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                    <Award className="w-4 h-4 text-purple-500" />
                    <span>Custom / Bespoke Program Offering</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomProgram(!isCustomProgram);
                      if (!isCustomProgram && !customProgram) {
                        setCustomProgram("Custom Leadership Architecture");
                      }
                    }}
                    className={`text-[11px] font-bold px-2 py-0.5 rounded transition ${
                      isCustomProgram
                        ? "bg-purple-600 text-white"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {isCustomProgram ? "Using Custom Program" : "Type Custom"}
                  </button>
                </div>

                {isCustomProgram && (
                  <input
                    type="text"
                    required={isCustomProgram}
                    placeholder="e.g. 6-Month CXO Executive Coaching Cohort for 12 Leaders"
                    value={customProgram}
                    onChange={(e) => setCustomProgram(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-purple-500 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                )}
              </div>

              {/* Selected Program Summary Badge */}
              <div className="p-3 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500">Active Selection:</span>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${badgeStyle.badgeBg} ${badgeStyle.badgeText} ${badgeStyle.borderColor}`}>
                  {currentPitchedProgram}
                </span>
              </div>
            </div>
          )}

          {/* Modal Footer / Navigation Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            {modalTab === "general" ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setModalTab("programs")}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition"
                  >
                    <span>Next: Choose Program</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition"
                  >
                    Create Lead
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setModalTab("general")}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Details</span>
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition"
                >
                  Confirm & Create Lead
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
