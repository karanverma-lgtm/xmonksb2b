"use client";

import React from "react";
import { X } from "lucide-react";
import { SalesQLPerson } from "@/types/salesql";
import { PersonDossierCard } from "./PersonDossierCard";

interface BulkDossierModalProps {
  person: SalesQLPerson | null;
  onClose: () => void;
  onConvertToLead?: (person: SalesQLPerson) => void;
  onAddToOutreach?: (person: SalesQLPerson) => void;
  onCopy?: (text: string, fieldId: string) => void;
  copiedField?: string | null;
}

export const BulkDossierModal: React.FC<BulkDossierModalProps> = ({
  person,
  onClose,
  onConvertToLead,
  onAddToOutreach,
  onCopy,
  copiedField,
}) => {
  if (!person) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-transparent my-8">
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 p-2 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-white shadow-xl hover:scale-105 transition"
          title="Close Dossier"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="max-h-[90vh] overflow-y-auto rounded-3xl pr-1">
          <PersonDossierCard
            person={person}
            sourceLabel="Bulk Enriched Dossier"
            onConvertToLead={onConvertToLead}
            onAddToOutreach={onAddToOutreach}
            onCopy={onCopy}
            copiedField={copiedField}
          />
        </div>
      </div>
    </div>
  );
};
