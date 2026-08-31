"use client";

import React, { useState } from "react";
import { LeadStage } from "@/types/lead";
import { STAGES, STAGE_ORDER } from "@/constants/stages";
import { X, Building2, User, Mail, Phone, IndianRupee, Calendar, Sparkles, MapPin, Briefcase } from "lucide-react";

import { UserAccount } from "@/constants/users";

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
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [designation, setDesignation] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState("SaaS & Software");
  const [customIndustry, setCustomIndustry] = useState("");
  const [dealValue, setDealValue] = useState("50000");
  const [stage, setStage] = useState<LeadStage>("interest");
  const [expectedCloseDate, setExpectedCloseDate] = useState("2026-10-31");
  const [owner, setOwner] = useState(currentUser?.name || "Ruby");
  const [journeyNotes, setJourneyNotes] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !contactName || !contactEmail) return;

    const finalIndustry =
      industry === "Other"
        ? customIndustry.trim() || "Other"
        : industry;

    onSubmit({
      companyName,
      contactName,
      designation: designation.trim() || undefined,
      contactEmail,
      contactPhone,
      city,
      industry: finalIndustry,
      dealValue: parseFloat(dealValue) || 0,
      stage,
      expectedCloseDate,
      owner,
      journeyNotes: journeyNotes || `Initial B2B Prospecting Lead Created for ${companyName}.`,
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
    setJourneyNotes("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Add New B2B Lead
              </h3>
              <p className="text-xs text-slate-500">
                Initialize customer journey with automatic stage weightage
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Contact Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Primary Contact Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Amanda Vance"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Designation */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Designation
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. VP of HR, Head of L&D, CEO"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Contact Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Contact Email *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="e.g. amanda@apex.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Contact Phone Number */}
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

          {/* Initial Journey Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Initial Prospecting Journey Log Note
            </label>
            <textarea
              rows={2}
              placeholder="Record initial outreach notes or prospect source details..."
              value={journeyNotes}
              onChange={(e) => setJourneyNotes(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-500/20 transition"
            >
              Create B2B Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
