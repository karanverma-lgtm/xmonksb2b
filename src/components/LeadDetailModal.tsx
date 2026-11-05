"use client";

import React, { useState } from "react";
import { Lead, LeadStage } from "@/types/lead";
import { STAGES, STAGE_ORDER, PIPELINE_STAGES } from "@/constants/stages";
import {
  X,
  Building2,
  Mail,
  Phone,
  User,
  Sparkles,
  CheckCircle2,
  Clock,
  Send,
  History,
  MessageSquare,
  AlertCircle,
  Trash2,
  MapPin,
  Pencil,
  Check,
  GraduationCap,
  Calendar,
  FileText,
  UploadCloud,
  Download,
  ExternalLink,
  Eye,
  Loader2,
  FileCheck,
  Compass,
  Camera,
  Image as ImageIcon,
  Link2,
  Receipt,
  Truck,
  FileSpreadsheet,
  Plus,
  Files,
  Paperclip,
  Users,
  UserPlus,
  Briefcase,
  Star,
  Copy,
} from "lucide-react";
import confetti from "canvas-confetti";

import { formatINR, formatClosureMonth } from "@/lib/formatters";
import { PRESET_PROGRAMS, getProgramBadgeStyle } from "@/constants/programs";
import { LEAD_SOURCES, getLeadSourceBadgeStyle } from "@/constants/leadSources";
import { SpringButton } from "@/components/spring";
import { ApproachNote, FinancialDocument, ContactPerson, LeadInvoice, getLeadInvoices } from "@/types/lead";
import {
  uploadApproachNoteToFirebase,
  uploadMultipleApproachNotesToR2,
  getApproachNoteContentUrl,
} from "@/lib/approachNoteService";
import { uploadCompanyLogoToFirebase } from "@/lib/companyLogoService";
import {
  uploadMultipleFinancialDocumentsToR2,
  deleteFinancialDocumentFromR2,
  getFinancialDocumentContentUrl,
} from "@/lib/financialDocumentService";
import { getFileTypeBadgeInfo } from "@/lib/mimeUtils";
import { GoogleCalendarDatePicker } from "./GoogleCalendarDatePicker";

import { UserAccount, VALID_USERS } from "@/constants/users";

interface LeadDetailModalProps {
  lead: Lead | null;
  currentUser?: UserAccount | null;
  onClose: () => void;
  onUpdateStage: (leadId: string, newStage: LeadStage, notes?: string) => void;
  onAddNote: (leadId: string, noteText: string) => void;
  onDeleteLead?: (leadId: string) => void;
  onUpdateDealValue?: (leadId: string, newDealValue: number) => void;
  onUpdateProgram?: (leadId: string, newProgram: string) => void;
  onUpdateLeadSource?: (leadId: string, newSource: string) => void;
  onUpdateOwner?: (leadId: string, newOwner: string) => void;
  onUpdateClosureMonth?: (leadId: string, closureMonth: string) => void;
  onAttachApproachNote?: (leadId: string, approachNote: ApproachNote) => void;
  onAttachApproachNotes?: (leadId: string, approachNotes: ApproachNote[]) => void;
  onRemoveApproachNote?: (leadId: string, noteId?: string) => void;
  onAttachFinancialDocuments?: (leadId: string, documents: FinancialDocument[]) => void;
  onRemoveFinancialDocument?: (leadId: string, documentId: string) => void;
  onAddContact?: (
    leadId: string,
    contact: {
      name: string;
      contactNumber?: string;
      email?: string;
      designation?: string;
    },
    isPrimary?: boolean
  ) => void;
  onRemoveContact?: (leadId: string, contactId: string) => void;
  onUpdatePrimaryContact?: (
    leadId: string,
    contactData: {
      contactName: string;
      designation?: string;
      contactEmail: string;
      contactPhone?: string;
    }
  ) => void;
  onEditContact?: (
    leadId: string,
    contactId: string,
    contactData: {
      name: string;
      contactNumber?: string;
      email?: string;
      designation?: string;
    },
    isPrimary?: boolean
  ) => void;
  onSetPrimaryContact?: (leadId: string, contactId: string) => void;
  onUpdateCompanyLogo?: (leadId: string, logoUrl: string) => void;
  onRemoveCompanyLogo?: (leadId: string) => void;
  onMoveToBilling?: (lead: Lead) => void;
  onSendToDelivery?: (lead: Lead) => void;
  onUpdateInvoiceDetails?: (
    leadId: string,
    invoiceData: {
      invoiceNumber?: string;
      invoiceDate?: string;
      invoiceAmount?: number;
      invoices?: LeadInvoice[];
    }
  ) => void;
  onAddInvoice?: (
    leadId: string,
    invoiceData: {
      invoiceNumber: string;
      invoiceDate: string;
      invoiceAmount: number;
      notes?: string;
    }
  ) => Promise<void> | void;
  onUpdateSingleInvoice?: (
    leadId: string,
    invoiceId: string,
    updates: Partial<LeadInvoice>
  ) => Promise<void> | void;
  onDeleteInvoice?: (
    leadId: string,
    invoiceId: string
  ) => Promise<void> | void;
  readOnly?: boolean;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  currentUser,
  onClose,
  onUpdateStage,
  onAddNote,
  onDeleteLead,
  onUpdateDealValue,
  onUpdateProgram,
  onUpdateLeadSource,
  onUpdateOwner,
  onUpdateClosureMonth,
  onAttachApproachNote,
  onAttachApproachNotes,
  onRemoveApproachNote,
  onAttachFinancialDocuments,
  onRemoveFinancialDocument,
  onAddContact,
  onRemoveContact,
  onUpdatePrimaryContact,
  onEditContact,
  onSetPrimaryContact,
  onUpdateCompanyLogo,
  onRemoveCompanyLogo,
  onMoveToBilling,
  onSendToDelivery,
  onUpdateInvoiceDetails,
  onAddInvoice,
  onUpdateSingleInvoice,
  onDeleteInvoice,
  readOnly = false,
}) => {
  const isReadOnly = Boolean(readOnly || currentUser?.readOnly);
  const [newNoteText, setNewNoteText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [editedValue, setEditedValue] = useState("");
  const [isEditingProgram, setIsEditingProgram] = useState(false);
  const [editedProgram, setEditedProgram] = useState("");
  const [isCustomProgram, setIsCustomProgram] = useState(false);
  const [customProgramInput, setCustomProgramInput] = useState("");

  // People / Contacts State (Multi-people support for client card)
  const [showContactPersonModal, setShowContactPersonModal] = useState(false);
  const [contactModalMode, setContactModalMode] = useState<"new" | "primary" | "additional">("new");
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [isPrimaryContact, setIsPrimaryContact] = useState(false);
  const [personName, setPersonName] = useState("");
  const [personContactNumber, setPersonContactNumber] = useState("");
  const [personEmail, setPersonEmail] = useState("");
  const [personDesignation, setPersonDesignation] = useState("");
  const [personToDelete, setPersonToDelete] = useState<ContactPerson | null>(null);
  const [personFormError, setPersonFormError] = useState<string | null>(null);

  // Logo Upload & URL State
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [showLogoOptions, setShowLogoOptions] = useState(false);
  const [isEnteringLogoUrl, setIsEnteringLogoUrl] = useState(false);
  const [logoUrlInput, setLogoUrlInput] = useState("");
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [logoUploadSuccess, setLogoUploadSuccess] = useState<string | null>(null);
  const logoInputRef = React.useRef<HTMLInputElement | null>(null);

  // Lead Source State
  const [isEditingLeadSource, setIsEditingLeadSource] = useState(false);
  const [editedLeadSource, setEditedLeadSource] = useState(lead?.leadSource || "Event Based");

  React.useEffect(() => {
    setEditedLeadSource(lead?.leadSource || "Event Based");
  }, [lead?.leadSource]);

  const [stageNotePrompt, setStageNotePrompt] = useState<{
    show: boolean;
    targetStage?: LeadStage;
    noteText: string;
  }>({ show: false, noteText: "" });

  // Closure Month State
  const [isEditingClosureMonth, setIsEditingClosureMonth] = useState(false);
  const [editedClosureMonth, setEditedClosureMonth] = useState(lead?.closureMonth || "");

  React.useEffect(() => {
    setEditedClosureMonth(lead?.closureMonth || "");
  }, [lead?.closureMonth]);

  // Approach Note State (Multi-Upload & All Formats)
  const [isUploadingNote, setIsUploadingNote] = useState(false);
  const [noteUploadProgress, setNoteUploadProgress] = useState<{
    completed: number;
    total: number;
    currentFileName: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<ApproachNote | null>(null);
  const [isDraggingNote, setIsDraggingNote] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Multiple Invoices State (Synced to Forecast Tab)
  const existingInvoices: LeadInvoice[] = React.useMemo(() => getLeadInvoices(lead), [lead]);
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [invoiceNumberInput, setInvoiceNumberInput] = useState("");
  const [invoiceDateInput, setInvoiceDateInput] = useState("");
  const [invoiceAmountInput, setInvoiceAmountInput] = useState("");
  const [invoiceNotesInput, setInvoiceNotesInput] = useState("");
  const [copiedInvoiceId, setCopiedInvoiceId] = useState<string | null>(null);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [invoiceSaveSuccess, setInvoiceSaveSuccess] = useState(false);

  const totalInvoiced = React.useMemo(
    () => existingInvoices.reduce((sum, inv) => sum + (inv.invoiceAmount || 0), 0),
    [existingInvoices]
  );
  const unbilledBalance = Math.max(0, (lead?.dealValue || 0) - totalInvoiced);
  const invoicedPercent =
    lead?.dealValue && lead.dealValue > 0
      ? Math.min(100, Math.round((totalInvoiced / lead.dealValue) * 100))
      : 100;

  // Open form to add a new invoice
  const handleOpenAddInvoice = () => {
    setEditingInvoiceId(null);
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    setInvoiceNumberInput(`INV-XM-${year}-${rand}`);
    setInvoiceDateInput(new Date().toISOString().split("T")[0]);
    setInvoiceAmountInput(
      unbilledBalance > 0 ? String(unbilledBalance) : lead?.dealValue ? String(lead.dealValue) : ""
    );
    setInvoiceNotesInput("");
    setIsInvoiceFormOpen(true);
  };

  // Open form to edit an existing invoice
  const handleStartEditInvoice = (inv: LeadInvoice) => {
    setEditingInvoiceId(inv.id);
    setInvoiceNumberInput(inv.invoiceNumber);
    setInvoiceDateInput(inv.invoiceDate);
    setInvoiceAmountInput(String(inv.invoiceAmount));
    setInvoiceNotesInput(inv.notes || "");
    setIsInvoiceFormOpen(true);
  };

  const handleCancelInvoiceForm = () => {
    setIsInvoiceFormOpen(false);
    setEditingInvoiceId(null);
    setInvoiceNumberInput("");
    setInvoiceDateInput("");
    setInvoiceAmountInput("");
    setInvoiceNotesInput("");
  };

  const handleSaveInvoiceDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    setIsSavingInvoice(true);
    const parsedAmount = parseFloat(invoiceAmountInput) || 0;
    const cleanInvNo = invoiceNumberInput.trim() || `INV-${lead.id.slice(-6).toUpperCase()}`;
    const cleanDate = invoiceDateInput.trim() || new Date().toISOString().split("T")[0];

    try {
      if (editingInvoiceId) {
        // Update existing invoice
        const updatedList = existingInvoices.map((inv) =>
          inv.id === editingInvoiceId
            ? {
                ...inv,
                invoiceNumber: cleanInvNo,
                invoiceDate: cleanDate,
                invoiceAmount: parsedAmount,
                notes: invoiceNotesInput.trim() || undefined,
                updatedAt: new Date().toISOString(),
              }
            : inv
        );
        if (onUpdateSingleInvoice) {
          await onUpdateSingleInvoice(lead.id, editingInvoiceId, {
            invoiceNumber: cleanInvNo,
            invoiceDate: cleanDate,
            invoiceAmount: parsedAmount,
            notes: invoiceNotesInput.trim() || undefined,
          });
        } else if (onUpdateInvoiceDetails) {
          onUpdateInvoiceDetails(lead.id, {
            invoices: updatedList,
            invoiceNumber: cleanInvNo,
            invoiceDate: cleanDate,
            invoiceAmount: updatedList.reduce((s, i) => s + i.invoiceAmount, 0),
          });
        }
      } else {
        // Add new invoice
        const newInvoice: LeadInvoice = {
          id: "inv-" + Date.now() + "-" + Math.floor(100 + Math.random() * 900),
          invoiceNumber: cleanInvNo,
          invoiceDate: cleanDate,
          invoiceAmount: parsedAmount,
          notes: invoiceNotesInput.trim() || undefined,
          createdAt: new Date().toISOString(),
        };
        const updatedList = [...existingInvoices, newInvoice];
        if (onAddInvoice) {
          await onAddInvoice(lead.id, {
            invoiceNumber: cleanInvNo,
            invoiceDate: cleanDate,
            invoiceAmount: parsedAmount,
            notes: invoiceNotesInput.trim() || undefined,
          });
        } else if (onUpdateInvoiceDetails) {
          onUpdateInvoiceDetails(lead.id, {
            invoices: updatedList,
            invoiceNumber: cleanInvNo,
            invoiceDate: cleanDate,
            invoiceAmount: updatedList.reduce((s, i) => s + i.invoiceAmount, 0),
          });
        }
      }

      setInvoiceSaveSuccess(true);
      setTimeout(() => setInvoiceSaveSuccess(false), 3000);
      handleCancelInvoiceForm();
    } catch (err) {
      console.error("Failed to save invoice:", err);
    } finally {
      setIsSavingInvoice(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!lead) return;
    if (!confirm("Are you sure you want to remove this invoice? It will also be removed from the Forecast tab.")) {
      return;
    }
    try {
      if (onDeleteInvoice) {
        await onDeleteInvoice(lead.id, invoiceId);
      } else if (onUpdateInvoiceDetails) {
        const filtered = existingInvoices.filter((i) => i.id !== invoiceId);
        onUpdateInvoiceDetails(lead.id, {
          invoices: filtered,
          invoiceNumber: filtered[filtered.length - 1]?.invoiceNumber,
          invoiceDate: filtered[filtered.length - 1]?.invoiceDate,
          invoiceAmount: filtered.reduce((s, i) => s + i.invoiceAmount, 0),
        });
      }
      if (editingInvoiceId === invoiceId) {
        handleCancelInvoiceForm();
      }
    } catch (err) {
      console.error("Failed to delete invoice:", err);
    }
  };

  const handleCopyInvoiceNumber = (invNo: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(invNo);
      setCopiedInvoiceId(id);
      setTimeout(() => setCopiedInvoiceId(null), 2000);
    }
  };

  // Financial Documents State (Multi-Upload & All Formats)
  const [isUploadingFinancialDocs, setIsUploadingFinancialDocs] = useState(false);
  const [financialUploadProgress, setFinancialUploadProgress] = useState<{
    completed: number;
    total: number;
    currentFileName: string;
  } | null>(null);
  const [financialUploadError, setFinancialUploadError] = useState<string | null>(null);
  const [financialUploadSuccess, setFinancialUploadSuccess] = useState<string | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<FinancialDocument | null>(null);
  const [isDraggingFinancial, setIsDraggingFinancial] = useState(false);
  const financialFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Unified Document Preview State for financial documents and approach note
  const [previewDocModal, setPreviewDocModal] = useState<{
    fileName: string;
    fileSize: string;
    downloadUrl: string;
    fileType?: string;
  } | null>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !lead) return;

    if (!file.type.startsWith("image/")) {
      setLogoUploadError("Please select a valid image file (PNG, JPG, SVG, WebP).");
      if (logoInputRef.current) logoInputRef.current.value = "";
      return;
    }

    setLogoUploadError(null);
    setIsUploadingLogo(true);
    setShowLogoOptions(false);

    try {
      const logoUrl = await uploadCompanyLogoToFirebase(lead.id, file);
      if (onUpdateCompanyLogo) {
        onUpdateCompanyLogo(lead.id, logoUrl);
      }
      setLogoUploadSuccess("Company logo updated!");
      setTimeout(() => setLogoUploadSuccess(null), 3000);
    } catch (err: any) {
      setLogoUploadError(err?.message || "Failed to upload logo.");
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleSaveLogoUrl = () => {
    if (!lead || !logoUrlInput.trim()) return;
    const url = logoUrlInput.trim();
    if (onUpdateCompanyLogo) {
      onUpdateCompanyLogo(lead.id, url);
    }
    setLogoUploadSuccess("Logo URL applied!");
    setTimeout(() => setLogoUploadSuccess(null), 3000);
    setLogoUrlInput("");
    setIsEnteringLogoUrl(false);
    setShowLogoOptions(false);
  };

  const handleRemoveLogo = () => {
    if (!lead) return;
    if (onRemoveCompanyLogo) {
      onRemoveCompanyLogo(lead.id);
    }
    setShowLogoOptions(false);
    setIsEnteringLogoUrl(false);
  };

  if (!lead) return null;

  const currentStageInfo = STAGES[lead.stage];
  const currentWeightage = currentStageInfo?.weightage ?? lead.weightage;
  const weightedValue = lead.dealValue * (currentWeightage / 100);
  const badgeStyle = getProgramBadgeStyle(lead.program);
  const leadSourceBadge = getLeadSourceBadgeStyle(lead.leadSource);

  const handleStageClick = (stageId: LeadStage) => {
    if (stageId === lead.stage) return;
    setStageNotePrompt({
      show: true,
      targetStage: stageId,
      noteText: `Transitioned stage from ${STAGES[lead.stage].label} to ${STAGES[stageId].label}.`,
    });
  };

  const confirmStageChange = () => {
    if (!stageNotePrompt.targetStage) return;
    const targetStage = stageNotePrompt.targetStage;

    if (targetStage === "closure") {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
      });
    }

    onUpdateStage(lead.id, targetStage, stageNotePrompt.noteText);
    setStageNotePrompt({ show: false, noteText: "" });
  };

  const handlePostNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    onAddNote(lead.id, newNoteText.trim());
    setNewNoteText("");
  };

  const handleSaveClosureMonth = () => {
    if (onUpdateClosureMonth) {
      onUpdateClosureMonth(lead.id, editedClosureMonth);
    }
    setIsEditingClosureMonth(false);
  };

  const handleClearClosureMonth = () => {
    setEditedClosureMonth("");
    if (onUpdateClosureMonth) {
      onUpdateClosureMonth(lead.id, "");
    }
    setIsEditingClosureMonth(false);
  };

  // Approach Notes Handlers (Multi-Upload of Any Format)
  const handleApproachNotesUpload = async (files: File[]) => {
    if (!files || files.length === 0 || !lead) return;

    setUploadError(null);
    setUploadSuccess(null);
    setIsUploadingNote(true);
    setNoteUploadProgress({
      completed: 0,
      total: files.length,
      currentFileName: files[0].name,
    });

    try {
      const { successful, errors } = await uploadMultipleApproachNotesToR2(
        lead.id,
        files,
        currentUser?.name || "Client Partner",
        (completed, total, currentFileName) => {
          setNoteUploadProgress({ completed, total, currentFileName });
        }
      );

      if (successful.length > 0) {
        if (onAttachApproachNotes) {
          onAttachApproachNotes(lead.id, successful);
        } else if (onAttachApproachNote) {
          onAttachApproachNote(lead.id, successful[0]);
        }
      }

      if (errors.length > 0) {
        const errorMsg = `Uploaded ${successful.length} file(s). Failed: ${errors.map((e) => e.fileName).join(", ")}`;
        setUploadError(errorMsg);
      } else {
        const successMsg =
          successful.length === 1
            ? `"${successful[0].fileName}" uploaded successfully to Cloudflare R2!`
            : `All ${successful.length} approach notes uploaded successfully to Cloudflare R2!`;
        setUploadSuccess(successMsg);
        setTimeout(() => setUploadSuccess(null), 4000);
      }
    } catch (err: any) {
      setUploadError(err?.message || "Failed to upload approach notes.");
    } finally {
      setIsUploadingNote(false);
      setNoteUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleApproachFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleApproachNotesUpload(files);
    }
  };

  const handleApproachDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingNote(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      handleApproachNotesUpload(files);
    }
  };

  // Contact Stakeholder Handlers (Add & Edit people in client card)
  const handleOpenAddPerson = () => {
    setContactModalMode("new");
    setEditingContactId(null);
    setIsPrimaryContact(false);
    setPersonName("");
    setPersonContactNumber("");
    setPersonEmail("");
    setPersonDesignation("");
    setPersonFormError(null);
    setShowContactPersonModal(true);
  };

  const handleOpenEditPrimaryContact = () => {
    if (!lead) return;
    setContactModalMode("primary");
    setEditingContactId("primary");
    setIsPrimaryContact(true);
    setPersonName(lead.contactName || "");
    setPersonContactNumber(lead.contactPhone || "");
    setPersonEmail(lead.contactEmail || "");
    setPersonDesignation(lead.designation || "");
    setPersonFormError(null);
    setShowContactPersonModal(true);
  };

  const handleOpenEditAdditionalContact = (contact: ContactPerson) => {
    setContactModalMode("additional");
    setEditingContactId(contact.id);
    setIsPrimaryContact(false);
    setPersonName(contact.name || "");
    setPersonContactNumber(contact.contactNumber || "");
    setPersonEmail(contact.email || "");
    setPersonDesignation(contact.designation || "");
    setPersonFormError(null);
    setShowContactPersonModal(true);
  };

  const handleSetPrimaryContact = (contact: ContactPerson) => {
    if (!lead || !onSetPrimaryContact) return;
    onSetPrimaryContact(lead.id, contact.id);
  };

  const handleSavePerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim()) {
      setPersonFormError("Please enter the contact person's name.");
      return;
    }
    if (!lead) return;

    if (contactModalMode === "primary") {
      if (onUpdatePrimaryContact) {
        onUpdatePrimaryContact(lead.id, {
          contactName: personName.trim(),
          contactPhone: personContactNumber.trim() || undefined,
          contactEmail: personEmail.trim(),
          designation: personDesignation.trim() || undefined,
        });
      }
    } else if (contactModalMode === "additional" && editingContactId) {
      if (onEditContact) {
        onEditContact(
          lead.id,
          editingContactId,
          {
            name: personName.trim(),
            contactNumber: personContactNumber.trim() || undefined,
            email: personEmail.trim() || undefined,
            designation: personDesignation.trim() || undefined,
          },
          isPrimaryContact
        );
      }
    } else {
      if (onAddContact) {
        onAddContact(
          lead.id,
          {
            name: personName.trim(),
            contactNumber: personContactNumber.trim() || undefined,
            email: personEmail.trim() || undefined,
            designation: personDesignation.trim() || undefined,
          },
          isPrimaryContact
        );
      }
    }

    setShowContactPersonModal(false);
  };

  const handleConfirmRemovePerson = () => {
    if (!lead || !personToDelete) return;
    if (onRemoveContact) {
      onRemoveContact(lead.id, personToDelete.id);
    }
    setPersonToDelete(null);
  };

  const handleDownloadNote = async (note?: ApproachNote) => {
    const targetNote = note || lead.approachNote;
    if (!targetNote) return;
    const downloadUrl = await getApproachNoteContentUrl(lead.id, targetNote, true);
    if (!downloadUrl) return;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = targetNote.fileName;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleConfirmRemoveNote = () => {
    if (!lead) return;
    if (onRemoveApproachNote) {
      onRemoveApproachNote(lead.id, noteToDelete?.id || noteToDelete?.storagePath || noteToDelete?.fileName);
    }
    setNoteToDelete(null);
  };

  const handleViewApproachNote = async (note: ApproachNote) => {
    const badgeInfo = getFileTypeBadgeInfo(note.fileName, note.fileType);
    const url = await getApproachNoteContentUrl(lead.id, note, false);

    if (badgeInfo.canPreview) {
      setPreviewDocModal({
        fileName: note.fileName,
        fileSize: note.fileSize,
        downloadUrl: url,
        fileType: note.fileType,
      });
    } else {
      window.open(url, "_blank");
    }
  };

  // Financial Documents Handlers (Multi-Upload of Any Format)
  const handleFinancialFilesUpload = async (files: File[]) => {
    if (!files || files.length === 0 || !lead) return;

    setFinancialUploadError(null);
    setFinancialUploadSuccess(null);
    setIsUploadingFinancialDocs(true);
    setFinancialUploadProgress({
      completed: 0,
      total: files.length,
      currentFileName: files[0].name,
    });

    try {
      const { successful, errors } = await uploadMultipleFinancialDocumentsToR2(
        lead.id,
        files,
        currentUser?.name || "Client Partner",
        (completed, total, currentFileName) => {
          setFinancialUploadProgress({ completed, total, currentFileName });
        }
      );

      if (successful.length > 0 && onAttachFinancialDocuments) {
        onAttachFinancialDocuments(lead.id, successful);
      }

      if (errors.length > 0) {
        const errorMsg = `Uploaded ${successful.length} file(s). Failed: ${errors.map((e) => e.fileName).join(", ")}`;
        setFinancialUploadError(errorMsg);
      } else {
        const successMsg =
          successful.length === 1
            ? `"${successful[0].fileName}" uploaded successfully to Cloudflare R2!`
            : `All ${successful.length} financial documents uploaded successfully to Cloudflare R2!`;
        setFinancialUploadSuccess(successMsg);
        setTimeout(() => setFinancialUploadSuccess(null), 4000);
      }
    } catch (err: any) {
      setFinancialUploadError(err?.message || "Failed to upload financial documents.");
    } finally {
      setIsUploadingFinancialDocs(false);
      setFinancialUploadProgress(null);
      if (financialFileInputRef.current) financialFileInputRef.current.value = "";
    }
  };

  const handleFinancialFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFinancialFilesUpload(files);
    }
  };

  const handleFinancialDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFinancial(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      handleFinancialFilesUpload(files);
    }
  };

  const handleDownloadFinancialDoc = (doc: FinancialDocument) => {
    const url = getFinancialDocumentContentUrl(doc, true);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.fileName;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleConfirmDeleteFinancialDoc = () => {
    if (!documentToDelete || !lead) return;
    if (onRemoveFinancialDocument) {
      onRemoveFinancialDocument(lead.id, documentToDelete.id);
    }
    setDocumentToDelete(null);
  };

  const handleViewFinancialDoc = (doc: FinancialDocument) => {
    const badgeInfo = getFileTypeBadgeInfo(doc.fileName, doc.fileType);
    const url = getFinancialDocumentContentUrl(doc, false);

    if (badgeInfo.canPreview) {
      setPreviewDocModal({
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        downloadUrl: url,
        fileType: doc.fileType,
      });
    } else {
      // Direct open / download in new window
      window.open(url, "_blank");
    }
  };

  const formatCurrency = (val: number) => formatINR(val);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header Bar */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 flex items-start justify-between">
          <div className="flex items-start space-x-4">
            {/* Interactive Company Logo Container */}
            <div className="relative group">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
              />
              
              {lead.companyLogo ? (
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-md flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                  <img
                    src={lead.companyLogo}
                    alt={`${lead.companyName} Logo`}
                    className="w-full h-full object-cover"
                  />
                  {/* Hover upload overlay */}
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold"
                    title="Change Company Logo"
                  >
                    {isUploadingLogo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-3.5 h-3.5 mb-0.5" />
                        <span>Change</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 flex items-center justify-center">
                    <Building2 className="w-6 h-6" />
                  </div>
                  {/* Upload overlay trigger */}
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="absolute inset-0 rounded-2xl bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold"
                    title="Upload Company Logo"
                  >
                    {isUploadingLogo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-3.5 h-3.5 mb-0.5" />
                        <span>Upload</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Upload badge or quick delete */}
              {lead.companyLogo && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="absolute -top-1.5 -right-1.5 p-0.5 bg-rose-500 text-white rounded-full shadow hover:bg-rose-600 opacity-0 group-hover:opacity-100 transition"
                  title="Remove custom logo"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div>
              <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>{lead.companyName}</span>
                  {/* Logo Options Trigger (Upload or URL) */}
                  {!isReadOnly && (
                    <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowLogoOptions(!showLogoOptions);
                        setIsEnteringLogoUrl(false);
                      }}
                      disabled={isUploadingLogo}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 font-normal"
                    >
                      <Camera className="w-3 h-3" />
                      <span>
                        {isUploadingLogo
                          ? "Uploading..."
                          : lead.companyLogo
                          ? "Edit Logo"
                          : "Add Logo"}
                      </span>
                    </button>

                    {/* Popover Menu with Both Options: Upload File or Image URL */}
                    {showLogoOptions && (
                      <div className="absolute left-0 top-6 z-50 w-64 p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl space-y-2">
                        <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Set Company Logo
                        </div>

                        {!isEnteringLogoUrl ? (
                          <div className="space-y-1.5">
                            <button
                              type="button"
                              onClick={() => logoInputRef.current?.click()}
                              className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                            >
                              <UploadCloud className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Upload from Computer</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setIsEnteringLogoUrl(true)}
                              className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                            >
                              <Link2 className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Use Image URL</span>
                            </button>

                            {lead.companyLogo && (
                              <button
                                type="button"
                                onClick={handleRemoveLogo}
                                className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove Logo</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <input
                              type="url"
                              placeholder="https://example.com/logo.png"
                              value={logoUrlInput}
                              onChange={(e) => setLogoUrlInput(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              autoFocus
                            />
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                type="button"
                                onClick={() => setIsEnteringLogoUrl(false)}
                                className="px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                              >
                                Back
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveLogoUrl}
                                disabled={!logoUrlInput.trim()}
                                className="px-2.5 py-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-50"
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                </h2>
                {logoUploadError && (
                  <span className="text-xs text-rose-500 font-semibold">{logoUploadError}</span>
                )}
                {logoUploadSuccess && (
                  <span className="text-xs text-emerald-500 font-semibold">{logoUploadSuccess}</span>
                )}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${currentStageInfo.badgeBg} ${currentStageInfo.badgeText}`}
                >
                  {currentStageInfo.label} ({currentWeightage}%)
                </span>
                {lead.program && (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center space-x-1 ${badgeStyle.badgeBg} ${badgeStyle.badgeText} ${badgeStyle.borderColor}`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>{lead.program}</span>
                  </span>
                )}

                {/* Account Owner Indicator */}
                {currentUser?.username.toLowerCase() === "admin" && onUpdateOwner ? (
                  <select
                    value={lead.owner || "Unassigned"}
                    onChange={(e) => onUpdateOwner(lead.id, e.target.value)}
                    className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 cursor-pointer focus:outline-none"
                    title="Change Lead Owner"
                  >
                    {VALID_USERS.map((u) => (
                      <option key={u.username} value={u.name}>
                        Owner: {u.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center space-x-1">
                    <User className="w-3 h-3 text-indigo-500" />
                    <span>Owner: {lead.owner || "Unassigned"}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap gap-y-1">
                <span className="flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium text-slate-800 dark:text-slate-200">{lead.contactName}</span>
                  {lead.designation && (
                    <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/60">
                      {lead.designation}
                    </span>
                  )}
                  {onUpdatePrimaryContact && !isReadOnly && (
                    <button
                      type="button"
                      onClick={handleOpenEditPrimaryContact}
                      className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition cursor-pointer"
                      title="Edit primary contact"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{lead.contactEmail}</span>
                </span>
                {lead.contactPhone && (
                  <>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{lead.contactPhone}</span>
                    </span>
                  </>
                )}
                {lead.city && (
                  <>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{lead.city}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isReadOnly && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>View Only</span>
              </span>
            )}

            {lead.stage === "closure" && (onSendToDelivery || onMoveToBilling) && !isReadOnly && (
              <SpringButton
                variant="gradient"
                size="sm"
                onClick={() => (onSendToDelivery || onMoveToBilling)?.(lead)}
                className="flex items-center space-x-1.5 shadow-md shadow-indigo-500/20"
                title="Send this won deal to Delivery pipeline to configure Tenure & milestones"
              >
                <Truck className="w-3.5 h-3.5 text-indigo-200" />
                <span>Send to Delivery</span>
              </SpringButton>
            )}

            {onDeleteLead && !isReadOnly && (
              <SpringButton
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20"
                title="Delete this B2B Lead"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete Lead</span>
              </SpringButton>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Alert Banner */}
        {showDeleteConfirm && (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4" />
              <span>Are you sure you want to delete {lead.companyName}? This cannot be undone.</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteLead) {
                    onDeleteLead(lead.id);
                  }
                  onClose();
                }}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Program & Lead Source Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 1. Pitched Program Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-slate-50 dark:from-slate-900 dark:via-indigo-950/30 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-900/50 flex flex-col justify-between gap-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20 flex-shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Pitched Program Offering
                    </div>
                    <div className="text-[11px] text-slate-500">4 Core Enterprise Categories</div>
                  </div>
                </div>

                {onUpdateProgram && !isEditingProgram && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditedProgram(lead.program || PRESET_PROGRAMS[0].name);
                      setCustomProgramInput(lead.program || "");
                      setIsCustomProgram(false);
                      setIsEditingProgram(true);
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition shadow-sm flex-shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>{lead.program ? "Change" : "Assign"}</span>
                  </button>
                )}
              </div>

              {isEditingProgram ? (
                <div className="mt-1 space-y-2">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    {!isCustomProgram ? (
                      <select
                        value={editedProgram}
                        onChange={(e) => setEditedProgram(e.target.value)}
                        className="px-3 py-1.5 bg-white dark:bg-slate-950 border border-indigo-500 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none flex-1 min-w-[180px]"
                      >
                        {PRESET_PROGRAMS.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={customProgramInput}
                        onChange={(e) => setCustomProgramInput(e.target.value)}
                        placeholder="Enter custom program offering..."
                        className="px-3 py-1.5 bg-white dark:bg-slate-950 border border-purple-500 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none flex-1 min-w-[180px]"
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => setIsCustomProgram(!isCustomProgram)}
                      className="text-[11px] font-bold px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300"
                    >
                      {isCustomProgram ? "Presets" : "Custom"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const valToSave = isCustomProgram
                          ? customProgramInput.trim() || editedProgram
                          : editedProgram;
                        if (onUpdateProgram && valToSave.trim()) {
                          onUpdateProgram(lead.id, valToSave.trim());
                        }
                        setIsEditingProgram(false);
                      }}
                      className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow"
                      title="Save Pitched Program"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingProgram(false)}
                      className="p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2 mt-0.5 flex-wrap gap-y-1">
                  <span className="text-sm font-black text-slate-900 dark:text-white truncate">
                    {lead.program || "No program assigned"}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeStyle.badgeBg} ${badgeStyle.badgeText} ${badgeStyle.borderColor}`}>
                    {lead.program ? "Pitched Program" : "Pending Pitch"}
                  </span>
                </div>
              )}
            </div>

            {/* 2. Lead Source Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50/90 via-blue-50/40 to-slate-50 dark:from-slate-900 dark:via-sky-950/30 dark:to-slate-900 border border-sky-200/80 dark:border-sky-900/50 flex flex-col justify-between gap-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-sky-600 text-white shadow-md shadow-sky-500/20 flex-shrink-0">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                      Lead Source Channel
                    </div>
                    <div className="text-[11px] text-slate-500">Pipeline Attribution Origin</div>
                  </div>
                </div>

                {onUpdateLeadSource && !isEditingLeadSource && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditedLeadSource(lead.leadSource || LEAD_SOURCES[0].name);
                      setIsEditingLeadSource(true);
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold text-sky-700 dark:text-sky-300 bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950 transition shadow-sm flex-shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>{lead.leadSource ? "Change" : "Select Source"}</span>
                  </button>
                )}
              </div>

              {isEditingLeadSource ? (
                <div className="mt-1 flex items-center space-x-2 flex-wrap gap-y-1">
                  <select
                    value={editedLeadSource}
                    onChange={(e) => setEditedLeadSource(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-950 border border-sky-500 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none flex-1 min-w-[180px]"
                  >
                    {LEAD_SOURCES.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateLeadSource && editedLeadSource.trim()) {
                        onUpdateLeadSource(lead.id, editedLeadSource.trim());
                      }
                      setIsEditingLeadSource(false);
                    }}
                    className="p-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition shadow"
                    title="Save Lead Source"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingLeadSource(false)}
                    className="p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2 mt-0.5 flex-wrap gap-y-1">
                  <span className="text-sm font-black text-slate-900 dark:text-white truncate">
                    {lead.leadSource || "Not Assigned"}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center space-x-1.5 ${leadSourceBadge.badgeBg} ${leadSourceBadge.badgeText} ${leadSourceBadge.borderColor}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${leadSourceBadge.dotColor}`} />
                    <span>{lead.leadSource || "Pending Attribution"}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Key Deal Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
            <div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400 font-semibold uppercase">Total Deal Value</div>
                {onUpdateDealValue && !isEditingValue && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditedValue(String(lead.dealValue));
                      setIsEditingValue(true);
                    }}
                    className="p-1 text-xs text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10 rounded flex items-center space-x-1 font-semibold transition"
                    title="Change deal value"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {isEditingValue ? (
                <div className="flex items-center space-x-1.5 mt-1">
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1.5 text-xs text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={editedValue}
                      onChange={(e) => setEditedValue(e.target.value)}
                      className="w-full pl-5 pr-2 py-1 bg-white dark:bg-slate-900 border border-indigo-500 rounded-lg text-sm font-bold focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const val = parseFloat(editedValue);
                      if (!isNaN(val) && val >= 0 && onUpdateDealValue) {
                        onUpdateDealValue(lead.id, val);
                      }
                      setIsEditingValue(false);
                    }}
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                    title="Save Deal Value"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingValue(false)}
                    className="p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  {formatCurrency(lead.dealValue)}
                </div>
              )}
            </div>

            <div>
              <div className="text-xs text-purple-500 font-semibold uppercase">
                Forecasted Weighted Revenue
              </div>
              <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
                {formatCurrency(weightedValue)}
              </div>
            </div>

            {/* Target Closure Date (Google Calendar Style: Date, Month, Year) */}
            <div className="flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#EA4335]" />
                  <span>Closure Target</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Date, Month, Year
                </span>
              </div>

              <GoogleCalendarDatePicker
                value={lead.closureMonth}
                onChange={(newVal) => {
                  if (onUpdateClosureMonth) {
                    onUpdateClosureMonth(lead.id, newVal);
                  }
                }}
              />
            </div>

            <div>
              <div className="text-xs text-emerald-500 font-semibold uppercase">
                Stage Weightage
              </div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {currentWeightage}%
              </div>
              <div className="text-[10px] font-semibold text-slate-400">
                {currentStageInfo?.label}
              </div>
            </div>
          </div>

          {/* Interactive Lead Stage Journey Stepper */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>Update Lead Stage & Weightage</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Click any stage to update probability weightage & append timestamped journey log.
                </p>
              </div>
            </div>

            {/* Stepper Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {PIPELINE_STAGES.map((stageKey) => {
                const info = STAGES[stageKey];
                const isActive = lead.stage === stageKey;
                const isPassed =
                  STAGE_ORDER.indexOf(lead.stage) >= STAGE_ORDER.indexOf(stageKey);

                return (
                  <button
                    key={stageKey}
                    onClick={isReadOnly ? undefined : () => handleStageClick(stageKey)}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      isReadOnly ? "cursor-default" : "cursor-pointer"
                    } ${
                      isActive
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/30 font-bold scale-[1.02]"
                        : isPassed
                        ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100"
                        : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-extrabold">
                      <span>{info.weightage}%</span>
                      {isActive ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      ) : isPassed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                      ) : null}
                    </div>
                    <div className="text-xs font-semibold mt-1 truncate">{info.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prompt Box for Stage Change Notes */}
          {!isReadOnly && stageNotePrompt.show && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-3">
              <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>
                  Updating stage to {STAGES[stageNotePrompt.targetStage!].label} (
                  {STAGES[stageNotePrompt.targetStage!].weightage}% Weightage)
                </span>
              </div>

              <textarea
                value={stageNotePrompt.noteText}
                onChange={(e) =>
                  setStageNotePrompt({ ...stageNotePrompt, noteText: e.target.value })
                }
                rows={2}
                placeholder="Enter details about this stage transition..."
                className="w-full p-2.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setStageNotePrompt({ show: false, noteText: "" })}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmStageChange}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow"
                >
                  Confirm Stage & Save Log
                </button>
              </div>
            </div>
          )}

          {/* Add Manual Touchpoint Log Box */}
          {!isReadOnly && (
            <form
              onSubmit={handlePostNote}
              className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3"
            >
              <label className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-indigo-500" />
                <span>Log Customer Touchpoint / Note</span>
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Logged phone call, meeting feedback, or client note..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  className="flex-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post Log</span>
                </button>
              </div>
            </form>
          )}

          {/* Client Contacts & Key Stakeholders Section (Option to add more people with name, contact number, email, designation) */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>Client Stakeholders &amp; Contacts</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                      {(lead.additionalContacts?.length || 0) + 1} {((lead.additionalContacts?.length || 0) + 1) === 1 ? "Person" : "People"}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Key decision makers, champions, and team members associated with {lead.companyName}.
                  </p>
                </div>
              </div>

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={handleOpenAddPerson}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Person</span>
                </button>
              )}
            </div>

            {/* Contacts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Primary Contact Card */}
              <div className="p-3.5 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900 flex flex-col justify-between space-y-2.5 relative">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs flex-shrink-0">
                      {lead.contactName ? lead.contactName.slice(0, 2).toUpperCase() : "PC"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {lead.contactName}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                          Primary
                        </span>
                      </div>
                      {lead.designation && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                          {lead.designation}
                        </p>
                      )}
                    </div>
                  </div>

                  {onUpdatePrimaryContact && !isReadOnly && (
                    <button
                      type="button"
                      onClick={handleOpenEditPrimaryContact}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 shadow-2xs transition cursor-pointer flex-shrink-0"
                      title="Edit Primary Contact"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                  {lead.contactEmail && (
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span className="flex items-center space-x-1.5 truncate">
                        <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{lead.contactEmail}</span>
                      </span>
                      <a
                        href={`mailto:${lead.contactEmail}`}
                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex-shrink-0"
                      >
                        Email
                      </a>
                    </div>
                  )}
                  {lead.contactPhone && (
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span className="flex items-center space-x-1.5 truncate">
                        <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{lead.contactPhone}</span>
                      </span>
                      <a
                        href={`tel:${lead.contactPhone}`}
                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex-shrink-0"
                      >
                        Call
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Contacts */}
              {(lead.additionalContacts || []).map((person) => (
                <div
                  key={person.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 flex flex-col justify-between space-y-2.5 transition shadow-2xs group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700 flex-shrink-0">
                        {person.name ? person.name.slice(0, 2).toUpperCase() : "CO"}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {person.name}
                        </h4>
                        {person.designation ? (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                            {person.designation}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">No designation</p>
                        )}
                      </div>
                    </div>

                    {!isReadOnly && (
                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        {onSetPrimaryContact && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryContact(person)}
                            className="flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition cursor-pointer shadow-2xs"
                            title="Set as Primary Contact"
                          >
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500/20" />
                            <span>Make Primary</span>
                          </button>
                        )}
                        {onEditContact && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditAdditionalContact(person)}
                            className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Edit contact"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setPersonToDelete(person)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Remove contact"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                    {person.email ? (
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span className="flex items-center space-x-1.5 truncate">
                          <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{person.email}</span>
                        </span>
                        <a
                          href={`mailto:${person.email}`}
                          className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex-shrink-0"
                        >
                          Email
                        </a>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 italic flex items-center space-x-1">
                        <Mail className="w-3 h-3 text-slate-300" />
                        <span>No email provided</span>
                      </div>
                    )}

                    {person.contactNumber ? (
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span className="flex items-center space-x-1.5 truncate">
                          <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{person.contactNumber}</span>
                        </span>
                        <a
                          href={`tel:${person.contactNumber}`}
                          className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex-shrink-0"
                        >
                          Call
                        </a>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 italic flex items-center space-x-1">
                        <Phone className="w-3 h-3 text-slate-300" />
                        <span>No phone provided</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dedicated Approach Notes (Multi-Upload & All Formats) Section */}
          {(() => {
            const approachNotesList: ApproachNote[] =
              lead.approachNotes && lead.approachNotes.length > 0
                ? lead.approachNotes
                : lead.approachNote
                ? [lead.approachNote]
                : [];

            return (
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                        <span>Approach Notes</span>
                        {approachNotesList.length > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                            <FileCheck className="w-3 h-3" />
                            <span>
                              {approachNotesList.length}{" "}
                              {approachNotesList.length === 1 ? "Attached" : "Attached"}
                            </span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            Pending Upload
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Client strategy documents, presentations, proposal notes & alignment files stored in Cloudflare R2.
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons for Multi-upload */}
                  <div className="flex items-center space-x-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleApproachFilesChange}
                      className="hidden"
                    />

                    <button
                      type="button"
                      disabled={isUploadingNote}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                    >
                      {isUploadingNote ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>
                            {noteUploadProgress
                              ? `Uploading ${noteUploadProgress.completed}/${noteUploadProgress.total}...`
                              : "Uploading to Cloudflare R2..."}
                          </span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>
                            {approachNotesList.length > 0
                              ? "+ Attach More Notes"
                              : "Attach Approach Notes"}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Multi-upload Progress Bar */}
                {isUploadingNote && noteUploadProgress && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200/60 dark:border-rose-800/60 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-rose-800 dark:text-rose-300 font-semibold">
                      <span className="truncate max-w-xs">Uploading: {noteUploadProgress.currentFileName}</span>
                      <span>
                        {noteUploadProgress.completed} of {noteUploadProgress.total} files
                      </span>
                    </div>
                    <div className="w-full bg-rose-200/50 dark:bg-rose-900/50 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-rose-600 h-1.5 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.round(
                            (noteUploadProgress.completed / Math.max(1, noteUploadProgress.total)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Upload Error / Success Notifications */}
                {uploadError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {uploadSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{uploadSuccess}</span>
                  </div>
                )}

                {/* Approach Notes Card List */}
                {approachNotesList.length > 0 ? (
                  <div className="space-y-2">
                    {approachNotesList.map((noteItem, idx) => {
                      const badgeInfo = getFileTypeBadgeInfo(noteItem.fileName, noteItem.fileType);
                      const keyId = noteItem.id || noteItem.storagePath || `note-${idx}`;

                      return (
                        <div
                          key={keyId}
                          className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition"
                        >
                          <div className="flex items-center space-x-3 min-w-[240px]">
                            <div
                              className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 font-bold text-xs uppercase tracking-tight ${badgeInfo.bgColor} ${badgeInfo.borderColor} ${badgeInfo.color}`}
                            >
                              {badgeInfo.badgeText}
                            </div>
                            <div>
                              <div
                                className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md"
                                title={noteItem.fileName}
                              >
                                {noteItem.fileName}
                              </div>
                              <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                                <span className="font-semibold text-slate-500 dark:text-slate-400">
                                  {badgeInfo.label}
                                </span>
                                <span>•</span>
                                <span>{noteItem.fileSize}</span>
                                <span>•</span>
                                <span>By: {noteItem.uploadedBy || "Client Partner"}</span>
                                <span>•</span>
                                <span>
                                  {new Date(noteItem.uploadedAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleViewApproachNote(noteItem)}
                              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                              title="View Document"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-500" />
                              <span>View</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadNote(noteItem)}
                              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                              title="Download Document"
                            >
                              <Download className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Download</span>
                            </button>

                            {onRemoveApproachNote && (
                              <button
                                type="button"
                                onClick={() => setNoteToDelete(noteItem)}
                                className="p-1.5 rounded-lg text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                                title="Remove Document"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Additional dropzone strip for adding more approach notes */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingNote(true);
                      }}
                      onDragLeave={() => setIsDraggingNote(false)}
                      onDrop={handleApproachDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border border-dashed rounded-xl p-3 text-center cursor-pointer transition flex items-center justify-center space-x-2 ${
                        isDraggingNote
                          ? "border-rose-500 bg-rose-500/10 text-rose-600"
                          : "border-slate-200 dark:border-slate-800 hover:border-rose-400 bg-slate-50/50 dark:bg-slate-950/30 text-slate-500 hover:text-rose-600"
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold">
                        Click to add more approach notes or drag & drop files here (All formats allowed)
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Dropzone Placeholder for Approach Notes */
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingNote(true);
                    }}
                    onDragLeave={() => setIsDraggingNote(false)}
                    onDrop={handleApproachDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition group ${
                      isDraggingNote
                        ? "border-rose-500 bg-rose-500/10 text-rose-600"
                        : "border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-600 bg-slate-50/50 dark:bg-slate-950/30"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 mx-auto flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Click to select multiple approach notes or drag & drop here
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Multi-upload enabled • All formats allowed: PDF, DOCX, XLSX, CSV, PPTX, Images, and more
                    </p>
                    <div className="flex items-center justify-center space-x-1.5 mt-3 text-[10px] text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-rose-500">.pdf</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-blue-500">.docx</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-emerald-500">.xlsx</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-teal-500">.csv</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-amber-500">.pptx</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-500">+any format</span>
                    </div>
                  </div>
                )}

                {/* Remove Confirmation Dialog */}
                {noteToDelete && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                      Remove attached &quot;{noteToDelete.fileName}&quot; from Cloudflare R2?
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setNoteToDelete(null)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmRemoveNote}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ========================================================= */}
          {/* INVOICE & COMMERCIAL DETAILS (SYNCED TO FORECAST TAB) */}
          {/* ========================================================= */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2 flex-wrap gap-1.5">
                    <span>Invoice & Forecast Details</span>
                    {existingInvoices.length > 0 ? (
                      <>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80">
                          {existingInvoices.length} {existingInvoices.length === 1 ? "Invoice" : "Invoices"} Raised
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/80">
                          Total: {formatINR(totalInvoiced)}
                        </span>
                      </>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        Not Invoiced
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Record one or multiple invoices with issue date and amounts for live monthly tracking in the Forecast tab.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {invoiceSaveSuccess && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center space-x-1 animate-fadeIn">
                    <Check className="w-3.5 h-3.5" />
                    <span>Invoice Saved & Synced!</span>
                  </span>
                )}

                {!isReadOnly && !isInvoiceFormOpen && (
                  <SpringButton
                    type="button"
                    variant="gradient"
                    size="sm"
                    onClick={handleOpenAddInvoice}
                    className="flex items-center space-x-1.5 font-bold shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Invoice</span>
                  </SpringButton>
                )}
              </div>
            </div>

            {/* Invoicing Progress Bar & Commercial Overview */}
            {(lead.dealValue > 0 || existingInvoices.length > 0) && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block tracking-wider">
                      Total Invoiced
                    </span>
                    <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                      {formatINR(totalInvoiced)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Across {existingInvoices.length} {existingInvoices.length === 1 ? "invoice" : "invoices"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block tracking-wider">
                      Contract Deal Value
                    </span>
                    <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                      {formatINR(lead.dealValue || 0)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">Agreed pipeline value</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block tracking-wider">
                      Unbilled Balance
                    </span>
                    <span
                      className={`font-mono font-black text-sm ${
                        unbilledBalance > 0
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {unbilledBalance > 0 ? formatINR(unbilledBalance) : "₹0 (Fully Invoiced)"}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {unbilledBalance > 0 ? "Remaining to raise" : "100% Invoiced"}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                {lead.dealValue > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span>Invoicing Realization</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">
                        {invoicedPercent}% ({formatINR(totalInvoiced)} of {formatINR(lead.dealValue)})
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                        style={{ width: `${invoicedPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* List of Existing Invoices */}
            {existingInvoices.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Raised Invoices ({existingInvoices.length})
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {existingInvoices.map((inv, idx) => {
                    const isCopied = copiedInvoiceId === inv.id;
                    const dateMonth = inv.invoiceDate ? inv.invoiceDate.slice(0, 7) : "N/A";
                    return (
                      <div
                        key={inv.id || idx}
                        className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          editingInvoiceId === inv.id
                            ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700 ring-2 ring-amber-500/20"
                            : "bg-slate-50/80 dark:bg-slate-850/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-start sm:items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                            #{idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                                {inv.invoiceNumber}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyInvoiceNumber(inv.invoiceNumber, inv.id, e)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                                title="Copy invoice number"
                              >
                                {isCopied ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              {inv.notes && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                                  {inv.notes}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <span className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>{inv.invoiceDate || "No Date"}</span>
                              </span>
                              <span>•</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                Forecast: {dateMonth}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end space-x-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800">
                          <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                            {formatINR(inv.invoiceAmount)}
                          </span>

                          {!isReadOnly && (
                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => handleStartEditInvoice(inv)}
                                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                                title="Edit this invoice"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteInvoice(inv.id)}
                                className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                title="Delete this invoice"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state when no invoices exist and form is closed */}
            {existingInvoices.length === 0 && !isInvoiceFormOpen && (
              <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <Receipt className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  No invoices recorded yet for this client deal.
                </p>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={handleOpenAddInvoice}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Raise First Invoice</span>
                  </button>
                )}
              </div>
            )}

            {/* Add / Edit Invoice Form */}
            {!isReadOnly && (isInvoiceFormOpen || existingInvoices.length === 0) && (
              <form
                onSubmit={handleSaveInvoiceDetails}
                className="space-y-3 pt-3 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-950/70 border border-amber-200/80 dark:border-amber-900/40"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-slate-800">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <Receipt className="w-4 h-4 text-amber-500" />
                    <span>{editingInvoiceId ? "Edit Invoice Details" : "Add New Invoice"}</span>
                  </span>
                  {(isInvoiceFormOpen || existingInvoices.length > 0) && (
                    <button
                      type="button"
                      onClick={handleCancelInvoiceForm}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 1. Invoice Number */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Invoice Number *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={invoiceNumberInput}
                        onChange={(e) => setInvoiceNumberInput(e.target.value)}
                        placeholder="e.g. INSP/26-27/052"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                      {!invoiceNumberInput && (
                        <button
                          type="button"
                          onClick={() => {
                            const year = new Date().getFullYear();
                            const rand = Math.floor(1000 + Math.random() * 9000);
                            setInvoiceNumberInput(`INV-XM-${year}-${rand}`);
                          }}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                          title="Generate suggested invoice number"
                        >
                          Auto
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 2. Invoice Date */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Invoice Issue Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={invoiceDateInput}
                      onChange={(e) => setInvoiceDateInput(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  {/* 3. Invoice Amount */}
                  <div>
                    <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        Invoice Amount (₹) *
                      </label>
                      <div className="flex items-center space-x-2">
                        {unbilledBalance > 0 && unbilledBalance !== lead.dealValue && (
                          <button
                            type="button"
                            onClick={() => setInvoiceAmountInput(String(unbilledBalance))}
                            className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                            title="Set to remaining balance"
                          >
                            Balance ({formatINR(unbilledBalance)})
                          </button>
                        )}
                        {lead.dealValue > 0 && (
                          <button
                            type="button"
                            onClick={() => setInvoiceAmountInput(String(lead.dealValue))}
                            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                            title="Set to deal value"
                          >
                            Deal Val ({formatINR(lead.dealValue)})
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      value={invoiceAmountInput}
                      onChange={(e) => setInvoiceAmountInput(e.target.value)}
                      placeholder={`e.g. ${unbilledBalance > 0 ? unbilledBalance : lead.dealValue || 100000}`}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                {/* Optional Note / Milestone */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Invoice Note / Milestone (Optional)
                  </label>
                  <input
                    type="text"
                    value={invoiceNotesInput}
                    onChange={(e) => setInvoiceNotesInput(e.target.value)}
                    placeholder="e.g. Tranche 1 (50% Advance), Final Delivery Signoff, Milestone 2"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {invoiceDateInput && invoiceAmountInput ? (
                      <span>
                        Scheduled for Forecast: <strong>{invoiceDateInput}</strong> •{" "}
                        <strong>{formatINR(parseFloat(invoiceAmountInput) || 0)}</strong>
                      </span>
                    ) : (
                      <span>Fill date, number, and amount to sync into the Forecast tab</span>
                    )}
                  </span>

                  <div className="flex items-center space-x-2">
                    {isInvoiceFormOpen && (
                      <button
                        type="button"
                        onClick={handleCancelInvoiceForm}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <SpringButton
                      type="submit"
                      variant="gradient"
                      size="sm"
                      disabled={isSavingInvoice}
                      className="flex items-center space-x-1.5 shadow-sm font-bold"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {isSavingInvoice
                          ? "Saving..."
                          : editingInvoiceId
                          ? "Update Invoice"
                          : "Save Invoice"}
                      </span>
                    </SpringButton>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Dedicated Financial Documents (Multi-Upload & All Formats) Section */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>Financial Documents</span>
                    {lead.financialDocuments && lead.financialDocuments.length > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                        <FileCheck className="w-3 h-3" />
                        <span>
                          {lead.financialDocuments.length}{" "}
                          {lead.financialDocuments.length === 1 ? "Attached" : "Attached"}
                        </span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        Pending Upload
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Client commercial agreements, financial proposals, rate cards, invoices & spreadsheets stored in Cloudflare R2.
                  </p>
                </div>
              </div>

              {/* Action Buttons for Multi-upload */}
              <div className="flex items-center space-x-2">
                <input
                  ref={financialFileInputRef}
                  type="file"
                  multiple
                  onChange={handleFinancialFilesChange}
                  className="hidden"
                />

                <button
                  type="button"
                  disabled={isUploadingFinancialDocs}
                  onClick={() => financialFileInputRef.current?.click()}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                >
                  {isUploadingFinancialDocs ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>
                        {financialUploadProgress
                          ? `Uploading ${financialUploadProgress.completed}/${financialUploadProgress.total}...`
                          : "Uploading to Cloudflare R2..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>
                        {lead.financialDocuments && lead.financialDocuments.length > 0
                          ? "+ Attach More Docs"
                          : "Attach Financial Documents"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Multi-upload Progress Bar */}
            {isUploadingFinancialDocs && financialUploadProgress && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                  <span className="truncate max-w-xs">Uploading: {financialUploadProgress.currentFileName}</span>
                  <span>
                    {financialUploadProgress.completed} of {financialUploadProgress.total} files
                  </span>
                </div>
                <div className="w-full bg-emerald-200/50 dark:bg-emerald-900/50 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round(
                        (financialUploadProgress.completed / Math.max(1, financialUploadProgress.total)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Error / Success Notifications */}
            {financialUploadError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{financialUploadError}</span>
              </div>
            )}

            {financialUploadSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{financialUploadSuccess}</span>
              </div>
            )}

            {/* Attached Financial Documents List */}
            {lead.financialDocuments && lead.financialDocuments.length > 0 ? (
              <div className="space-y-2">
                {lead.financialDocuments.map((docItem) => {
                  const badgeInfo = getFileTypeBadgeInfo(docItem.fileName, docItem.fileType);
                  return (
                    <div
                      key={docItem.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition"
                    >
                      <div className="flex items-center space-x-3 min-w-[240px]">
                        <div
                          className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 font-bold text-xs uppercase tracking-tight ${badgeInfo.bgColor} ${badgeInfo.borderColor} ${badgeInfo.color}`}
                        >
                          {badgeInfo.badgeText}
                        </div>
                        <div>
                          <div
                            className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md"
                            title={docItem.fileName}
                          >
                            {docItem.fileName}
                          </div>
                          <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                            <span className="font-semibold text-slate-500 dark:text-slate-400">
                              {badgeInfo.label}
                            </span>
                            <span>•</span>
                            <span>{docItem.fileSize}</span>
                            <span>•</span>
                            <span>By: {docItem.uploadedBy || "Client Partner"}</span>
                            <span>•</span>
                            <span>
                              {new Date(docItem.uploadedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleViewFinancialDoc(docItem)}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                          title="View Document"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-500" />
                          <span>View</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadFinancialDoc(docItem)}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                          title="Download Document"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Download</span>
                        </button>

                        {onRemoveFinancialDocument && (
                          <button
                            type="button"
                            onClick={() => setDocumentToDelete(docItem)}
                            className="p-1.5 rounded-lg text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                            title="Remove Document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Additional dropzone strip for adding more */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFinancial(true);
                  }}
                  onDragLeave={() => setIsDraggingFinancial(false)}
                  onDrop={handleFinancialDrop}
                  onClick={() => financialFileInputRef.current?.click()}
                  className={`border border-dashed rounded-xl p-3 text-center cursor-pointer transition flex items-center justify-center space-x-2 ${
                    isDraggingFinancial
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                      : "border-slate-200 dark:border-slate-800 hover:border-emerald-400 bg-slate-50/50 dark:bg-slate-950/30 text-slate-500 hover:text-emerald-600"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">
                    Click to add more financial documents or drag & drop files here (All formats allowed)
                  </span>
                </div>
              </div>
            ) : (
              /* Dropzone Placeholder for Financial Documents */
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFinancial(true);
                }}
                onDragLeave={() => setIsDraggingFinancial(false)}
                onDrop={handleFinancialDrop}
                onClick={() => financialFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition group ${
                  isDraggingFinancial
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                    : "border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 bg-slate-50/50 dark:bg-slate-950/30"
                }`}
              >
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Click to select multiple financial documents or drag & drop here
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Multi-upload enabled • All formats allowed: PDF, DOCX, XLSX, CSV, PPTX, Images, and more
                </p>
                <div className="flex items-center justify-center space-x-1.5 mt-3 text-[10px] text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-rose-500">.pdf</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-blue-500">.docx</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-emerald-500">.xlsx</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-teal-500">.csv</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-amber-500">.pptx</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-500">+any format</span>
                </div>
              </div>
            )}

            {/* Document Delete Confirmation Dialog */}
            {documentToDelete && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  Remove attached &quot;{documentToDelete.fileName}&quot; from Cloudflare R2?
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setDocumentToDelete(null)}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteFinancialDoc}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Customer Journey Logs Timeline */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                <History className="w-4 h-4 text-purple-500" />
                <span>Timestamped Customer Journey Logs ({lead.journeyLogs?.length || 0})</span>
              </h3>
              <span className="text-[11px] text-slate-400">Chronological Audit Trail</span>
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {lead.journeyLogs?.map((log) => {
                const isApproachNoteLog = log.type === "approach_note";
                const isClosureMonthLog = log.type === "closure_month_update";
                const isFinancialDocLog = log.type === "financial_document";

                return (
                  <div key={log.id} className="relative group">
                    {/* Timeline Bullet Dot */}
                    <div
                      className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 shadow-sm ${
                        isApproachNoteLog
                          ? "bg-rose-500"
                          : isClosureMonthLog
                          ? "bg-amber-500"
                          : isFinancialDocLog
                          ? "bg-emerald-500"
                          : "bg-indigo-600"
                      }`}
                    />

                    {/* Log Content Card */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center space-x-2">
                          {isApproachNoteLog && <FileText className="w-3.5 h-3.5 text-rose-500" />}
                          {isClosureMonthLog && <Calendar className="w-3.5 h-3.5 text-amber-500" />}
                          {isFinancialDocLog && <Receipt className="w-3.5 h-3.5 text-emerald-500" />}
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                            {log.title}
                          </h4>
                        </div>
                        <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-mono bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{log.formattedDate}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                        {log.description}
                      </p>

                      <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                        <span>Author: <strong className="text-slate-600 dark:text-slate-300">{log.author}</strong></span>
                        {log.newStage && (
                          <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                            Stage: {STAGES[log.newStage]?.label} ({STAGES[log.newStage]?.weightage}%)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Contact Person Modal */}
      {showContactPersonModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  {contactModalMode === "new" ? (
                    <UserPlus className="w-5 h-5" />
                  ) : (
                    <Pencil className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {contactModalMode === "primary"
                      ? "Edit Primary Contact"
                      : contactModalMode === "additional"
                      ? "Edit Contact Person"
                      : "Add Contact Person"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {contactModalMode === "primary"
                      ? `Update primary contact details for ${lead.companyName}`
                      : contactModalMode === "additional"
                      ? `Update stakeholder details for ${lead.companyName}`
                      : `Add a key stakeholder to ${lead.companyName}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowContactPersonModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePerson} className="space-y-3.5">
              {personFormError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{personFormError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priya Sharma"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Contact Number (Phone / Mobile)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={personContactNumber}
                    onChange={(e) => setPersonContactNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    placeholder="e.g. priya.sharma@company.com"
                    value={personEmail}
                    onChange={(e) => setPersonEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Designation / Role
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Head of Learning & Development"
                    value={personDesignation}
                    onChange={(e) => setPersonDesignation(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Toggle to make this contact Primary */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      isPrimaryContact
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                    }`}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        isPrimaryContact ? "fill-amber-500 text-amber-500" : ""
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                      <span>Primary Contact</span>
                      {isPrimaryContact && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                          Primary
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {contactModalMode === "primary"
                        ? "Currently the primary contact for this account"
                        : "Toggle ON to make this person the primary stakeholder"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={contactModalMode === "primary"}
                  onClick={() => setIsPrimaryContact(!isPrimaryContact)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isPrimaryContact ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"
                  } ${contactModalMode === "primary" ? "opacity-75 cursor-not-allowed" : ""}`}
                  title={contactModalMode === "primary" ? "Already the primary contact" : "Toggle primary contact"}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isPrimaryContact ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowContactPersonModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-500/20 transition flex items-center space-x-1.5 cursor-pointer"
                >
                  {contactModalMode === "new" ? (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Save Person</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{contactModalMode === "primary" ? "Update Primary Contact" : "Save Changes"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Person Confirmation Modal */}
      {personToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Remove Contact Person?
                </h4>
                <p className="text-xs text-slate-500">
                  Are you sure you want to remove {personToDelete.name}?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setPersonToDelete(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemovePerson}
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow cursor-pointer"
              >
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Document Preview Modal (Approach Notes & Financial Documents) */}
      {previewDocModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-5xl h-[88vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center space-x-2 truncate">
                <Receipt className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {previewDocModal.fileName}
                </span>
                <span className="text-xs text-slate-400">({previewDocModal.fileSize})</span>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={previewDocModal.downloadUrl.includes("?") ? `${previewDocModal.downloadUrl}&download=1` : `${previewDocModal.downloadUrl}?download=1`}
                  download={previewDocModal.fileName}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <a
                  href={previewDocModal.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                  title="Open in new window"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDocModal(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 dark:bg-slate-950 relative overflow-hidden flex items-center justify-center">
              {previewDocModal.fileName.match(/\.(png|jpe?g|webp|svg|gif)$/i) || previewDocModal.fileType?.startsWith("image/") ? (
                <div className="p-4 flex items-center justify-center max-w-full max-h-full overflow-auto">
                  <img
                    src={previewDocModal.downloadUrl}
                    alt={previewDocModal.fileName}
                    className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-lg border border-slate-200 dark:border-slate-800"
                  />
                </div>
              ) : (
                <iframe
                  src={previewDocModal.downloadUrl}
                  title={previewDocModal.fileName}
                  className="w-full h-full border-0"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
