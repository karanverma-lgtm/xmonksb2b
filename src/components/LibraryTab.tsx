"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FolderOpen,
  UploadCloud,
  Search,
  Filter,
  Plus,
  Star,
  Download,
  Trash2,
  Edit3,
  ExternalLink,
  Eye,
  Send,
  Paperclip,
  Check,
  X,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  FileArchive,
  FileCheck,
  File,
  Presentation,
  Award,
  Layers,
  Sparkles,
  Compass,
  Target,
  Shield,
  Coins,
  LayoutGrid,
  Table as TableIcon,
  RefreshCw,
  FileDown,
  Tag,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  User,
  HardDrive,
  BarChart3,
  ChevronDown,
  ArrowRight,
  MoreVertical,
} from "lucide-react";
import {
  LibraryDocument,
  DocumentCategory,
  DOCUMENT_CATEGORIES,
  getCategoryConfig,
  libraryDocToEmailAttachment,
} from "@/types/library";
import {
  subscribeToLibraryDocuments,
  getStoredLocalLibraryDocs,
  uploadLibraryDocument,
  updateLibraryDocument,
  deleteLibraryDocument,
  toggleStarDocument,
  exportLibraryMetadataToCSV,
} from "@/lib/libraryService";
import { UserAccount } from "@/constants/users";
import { EmailAttachment } from "@/constants/emailTemplates";
import { formatBytes } from "@/lib/formatters";

interface LibraryTabProps {
  currentUser?: UserAccount | null;
  isAdmin?: boolean;
  onNavigateToEmailWithAttachments?: (attachments: EmailAttachment[]) => void;
}

type ViewMode = "grid" | "table";
type SortOption = "newest" | "oldest" | "most_used" | "title" | "size";

export const LibraryTab: React.FC<LibraryTabProps> = ({
  currentUser,
  isAdmin = false,
  onNavigateToEmailWithAttachments,
}) => {
  const [documents, setDocuments] = useState<LibraryDocument[]>(() => getStoredLocalLibraryDocs());
  const [isFirebaseSyncing, setIsFirebaseSyncing] = useState<boolean>(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [onlyStarred, setOnlyStarred] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Selection for Batch Actions
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [previewDoc, setPreviewDoc] = useState<LibraryDocument | null>(null);
  const [editingDoc, setEditingDoc] = useState<LibraryDocument | null>(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<LibraryDocument | null>(null);

  // Upload Form State
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadTitle, setUploadTitle] = useState<string>("");
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>("pitch_deck");
  const [uploadDescription, setUploadDescription] = useState<string>("");
  const [uploadTags, setUploadTags] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Edit Form State
  const [editTitle, setEditTitle] = useState<string>("");
  const [editCategory, setEditCategory] = useState<DocumentCategory>("other");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editTags, setEditTags] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Success Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToLibraryDocuments((docs, syncing) => {
      setDocuments(docs);
      setIsFirebaseSyncing(syncing);
    });
    return unsubscribe;
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const totalDocs = documents.length;
    const totalBytes = documents.reduce((acc, d) => acc + (d.fileSizeBytes || 0), 0);
    const totalStarred = documents.filter((d) => d.isStarred).length;
    const totalUses = documents.reduce((acc, d) => acc + (d.useCount || 0), 0);
    return {
      totalDocs,
      totalBytesFormatted: formatBytes(totalBytes),
      totalStarred,
      totalUses,
    };
  }, [documents]);

  // Filtered & Sorted Documents
  const processedDocuments = useMemo(() => {
    let result = documents.filter((doc) => {
      if (onlyStarred && !doc.isStarred) return false;
      if (selectedCategory !== "all" && doc.category !== selectedCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = doc.title?.toLowerCase().includes(q);
      const matchFileName = doc.fileName?.toLowerCase().includes(q);
      const matchDesc = doc.description?.toLowerCase().includes(q);
      const matchTags = doc.tags?.some((t) => t.toLowerCase().includes(q));
      const matchAuthor = doc.uploadedBy?.toLowerCase().includes(q);

      return matchTitle || matchFileName || matchDesc || matchTags || matchAuthor;
    });

    result.sort((a, b) => {
      if (sortBy === "newest") return (b.uploadedAtMs || 0) - (a.uploadedAtMs || 0);
      if (sortBy === "oldest") return (a.uploadedAtMs || 0) - (b.uploadedAtMs || 0);
      if (sortBy === "most_used") return (b.useCount || 0) - (a.useCount || 0);
      if (sortBy === "title") return (a.title || "").localeCompare(b.title || "");
      if (sortBy === "size") return (b.fileSizeBytes || 0) - (a.fileSizeBytes || 0);
      return 0;
    });

    return result;
  }, [documents, searchQuery, selectedCategory, onlyStarred, sortBy]);

  // Selection Helpers
  const toggleSelectDoc = (id: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedDocIds.size === processedDocuments.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(processedDocuments.map((d) => d.id)));
    }
  };

  // Email Actions
  const handleComposeWithSingleDoc = (doc: LibraryDocument) => {
    if (!onNavigateToEmailWithAttachments) {
      alert("Email Campaign engine is ready in the Emails tab.");
      return;
    }
    const attachment = libraryDocToEmailAttachment(doc);
    onNavigateToEmailWithAttachments([attachment]);
  };

  const handleComposeWithSelectedDocs = () => {
    if (!onNavigateToEmailWithAttachments) return;
    const selected = documents.filter((d) => selectedDocIds.has(d.id));
    if (selected.length === 0) return;
    const attachments = selected.map(libraryDocToEmailAttachment);
    onNavigateToEmailWithAttachments(attachments);
  };

  // Upload Handlers
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadFiles.length === 0) {
      setUploadError("Please select at least one file to upload.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const parsedTags = uploadTags
      .split(/[,;\s]+/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    const authorName = currentUser?.name || "Amit Shelly";
    const authorEmail = currentUser?.email || "amit@xmonks.com";

    try {
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        const titleToUse =
          uploadFiles.length === 1 && uploadTitle.trim()
            ? uploadTitle.trim()
            : file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");

        await uploadLibraryDocument(file, {
          title: titleToUse,
          category: uploadCategory,
          description: uploadDescription,
          tags: parsedTags,
          uploadedBy: authorName,
          uploadedByEmail: authorEmail,
        });
      }

      showToast(`Successfully uploaded ${uploadFiles.length} document(s) to Library!`);
      setIsUploadModalOpen(false);
      setUploadFiles([]);
      setUploadTitle("");
      setUploadDescription("");
      setUploadTags("");
    } catch (err: unknown) {
      console.error("Upload failed:", err);
      const msg = err instanceof Error ? err.message : "Upload failed. Please try again.";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  // Edit Handlers
  const openEditModal = (doc: LibraryDocument) => {
    setEditingDoc(doc);
    setEditTitle(doc.title || "");
    setEditCategory(doc.category || "other");
    setEditDescription(doc.description || "");
    setEditTags((doc.tags || []).join(", "));
  };

  const handleSaveEdit = async () => {
    if (!editingDoc) return;
    setIsSavingEdit(true);

    const parsedTags = editTags
      .split(/[,;\s]+/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    try {
      await updateLibraryDocument(editingDoc.id, {
        title: editTitle.trim() || editingDoc.fileName,
        category: editCategory,
        description: editDescription.trim(),
        tags: parsedTags,
      });

      showToast("Document metadata updated.");
      setEditingDoc(null);
    } catch (err) {
      console.error("Failed to update doc:", err);
      alert("Failed to save changes.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Handler
  const handleDeleteDoc = async (doc: LibraryDocument) => {
    try {
      await deleteLibraryDocument(doc.id, doc.storageKey);
      showToast(`"${doc.title || doc.fileName}" removed from library.`);
      setDeleteConfirmDoc(null);
      if (previewDoc?.id === doc.id) setPreviewDoc(null);
      setSelectedDocIds((prev) => {
        const next = new Set(prev);
        next.delete(doc.id);
        return next;
      });
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete document.");
    }
  };

  const getFileIcon = (fileName: string, mimeType: string, sizeClass = "w-6 h-6") => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (ext === "pdf" || mimeType.includes("pdf")) {
      return <FileText className={`${sizeClass} text-rose-500`} />;
    }
    if (["xlsx", "xls", "csv"].includes(ext) || mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
      return <FileSpreadsheet className={`${sizeClass} text-emerald-500`} />;
    }
    if (["ppt", "pptx", "key"].includes(ext) || mimeType.includes("presentation") || mimeType.includes("powerpoint")) {
      return <Presentation className={`${sizeClass} text-amber-500`} />;
    }
    if (["doc", "docx", "txt", "rtf"].includes(ext) || mimeType.includes("word") || mimeType.includes("document")) {
      return <FileText className={`${sizeClass} text-blue-500`} />;
    }
    if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext) || mimeType.startsWith("image/")) {
      return <ImageIcon className={`${sizeClass} text-purple-500`} />;
    }
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext) || mimeType.includes("zip")) {
      return <FileArchive className={`${sizeClass} text-orange-500`} />;
    }
    return <File className={`${sizeClass} text-slate-400`} />;
  };

  return (
    <div className="flex-1 space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-purple-500/40 backdrop-blur-md flex items-center space-x-3 animate-slideUp">
          <CheckCircle2 className="w-5 h-5 text-purple-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-[11px] font-black uppercase tracking-wider border border-purple-500/30 flex items-center space-x-1.5">
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Enterprise Collateral Vault</span>
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-bold border border-emerald-500/30">
                Any Format • Cloudflare R2
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center space-x-2.5">
              <span>Document Library</span>
              <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Upload executive pitch decks, brochures, case studies, assessment catalogs, and proposals in any format. Seamlessly attach them to B2B outbound emails and track attachment engagement.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-2xl shadow-lg hover:shadow-purple-500/25 transition flex items-center space-x-2 group cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Upload Document</span>
            </button>

            <button
              onClick={() => exportLibraryMetadataToCSV(documents)}
              title="Export all document metadata to CSV"
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/10 text-xs font-bold transition flex items-center space-x-1.5"
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">Export Catalog</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-white/10">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center space-x-2 text-slate-300 text-xs font-semibold">
              <FileText className="w-4 h-4 text-purple-400" />
              <span>Total Collateral</span>
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {stats.totalDocs}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Documents in catalog</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center space-x-2 text-slate-300 text-xs font-semibold">
              <HardDrive className="w-4 h-4 text-indigo-400" />
              <span>Vault Storage</span>
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {stats.totalBytesFormatted}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Cloudflare R2 Bucket</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center space-x-2 text-slate-300 text-xs font-semibold">
              <Star className="w-4 h-4 text-amber-400" />
              <span>Pinned / Starred</span>
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {stats.totalStarred}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Key client decks</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center space-x-2 text-slate-300 text-xs font-semibold">
              <Send className="w-4 h-4 text-emerald-400" />
              <span>Email Attachments</span>
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {stats.totalUses}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Times attached & sent</p>
          </div>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Row 1: Search, Starred, Sort, View Toggle */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, original file name, tags, description, or author..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Starred filter button */}
            <button
              onClick={() => setOnlyStarred(!onlyStarred)}
              className={`px-3 py-2 text-xs font-bold rounded-2xl border flex items-center space-x-1.5 transition ${
                onlyStarred
                  ? "bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${onlyStarred ? "fill-amber-400" : ""}`} />
              <span>Starred</span>
            </button>

            {/* Sort selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="newest">Recently Uploaded</option>
              <option value="most_used">Most Used in Emails</option>
              <option value="title">Alphabetical (A-Z)</option>
              <option value="size">File Size (Largest)</option>
              <option value="oldest">Oldest First</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode("grid")}
                title="Grid Card View"
                className={`p-1.5 rounded-xl transition ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                title="Table List View"
                className={`p-1.5 rounded-xl transition ${
                  viewMode === "table"
                    ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Category Filter Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
              selectedCategory === "all"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            All Collateral ({documents.length})
          </button>
          {DOCUMENT_CATEGORIES.map((cat) => {
            const count = documents.filter((d) => d.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${
                  selectedCategory === cat.id
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <span>{cat.label}</span>
                <span className="opacity-70 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Batch Selection Banner */}
        {selectedDocIds.size > 0 && (
          <div className="p-3 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-black text-purple-900 dark:text-purple-200">
                {selectedDocIds.size} Document(s) Selected
              </span>
              <button
                onClick={handleSelectAll}
                className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
              >
                {selectedDocIds.size === processedDocuments.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleComposeWithSelectedDocs}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl shadow-sm transition flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Compose Email with Selected ({selectedDocIds.size})</span>
              </button>

              <button
                onClick={() => setSelectedDocIds(new Set())}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content: Documents Grid or Table */}
      {processedDocuments.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200 dark:border-slate-800 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 mx-auto flex items-center justify-center">
            <FolderOpen className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              No matching documents in Library
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Upload your pitch decks, proposals, or credentials to store them in your permanent collateral library.
            </p>
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-2xl shadow-md transition inline-flex items-center space-x-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processedDocuments.map((doc) => {
            const catConfig = getCategoryConfig(doc.category);
            const isSelected = selectedDocIds.has(doc.id);

            return (
              <div
                key={doc.id}
                className={`group bg-white dark:bg-slate-900 rounded-3xl p-5 border transition-all duration-200 flex flex-col justify-between hover:shadow-lg relative ${
                  isSelected
                    ? "border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/20 dark:bg-purple-950/10"
                    : "border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700"
                }`}
              >
                {/* Top Section */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      {/* Selection Checkbox */}
                      <button
                        onClick={() => toggleSelectDoc(doc.id)}
                        className="p-1 text-slate-400 hover:text-purple-600"
                        title={isSelected ? "Deselect" : "Select document"}
                      >
                        {isSelected ? (
                          <div className="w-4 h-4 rounded bg-purple-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-700" />
                        )}
                      </button>

                      {/* File Icon Capsule */}
                      <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80">
                        {getFileIcon(doc.fileName, doc.fileType)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      {/* Star Button */}
                      <button
                        onClick={() => toggleStarDocument(doc.id, !doc.isStarred)}
                        className="p-1.5 text-slate-400 hover:text-amber-500 rounded-lg transition"
                        title={doc.isStarred ? "Unstar" : "Star document"}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            doc.isStarred
                              ? "text-amber-500 fill-amber-400"
                              : "hover:text-amber-400"
                          }`}
                        />
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => openEditModal(doc)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition"
                        title="Edit metadata"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => setDeleteConfirmDoc(doc)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Category */}
                  <div>
                    <h3
                      onClick={() => setPreviewDoc(doc)}
                      className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition"
                      title={doc.title}
                    >
                      {doc.title || doc.fileName}
                    </h3>

                    <div className="flex items-center space-x-2 mt-2 flex-wrap gap-y-1">
                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${catConfig.badgeBg} ${catConfig.badgeText} ${catConfig.borderColor}`}
                      >
                        {catConfig.label}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 font-semibold">
                        {doc.fileSize}
                      </span>
                      {doc.useCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                          Used {doc.useCount}x
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {doc.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {doc.description}
                    </p>
                  )}

                  {/* Tags */}
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {doc.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md"
                        >
                          #{tag}
                        </span>
                      ))}
                      {doc.tags.length > 3 && (
                        <span className="text-[9px] text-slate-400 font-semibold">
                          +{doc.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-[10px] text-slate-400">
                    <span>By {doc.uploadedBy}</span>
                    <span className="mx-1">•</span>
                    <span>
                      {doc.uploadedAt
                        ? new Date(doc.uploadedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        : "Recent"}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {doc.downloadUrl && (
                      <a
                        href={doc.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Download / View document"
                        className="p-2 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    <button
                      onClick={() => handleComposeWithSingleDoc(doc)}
                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-black text-xs rounded-xl border border-purple-200 dark:border-purple-800/80 transition flex items-center space-x-1 shadow-2xs cursor-pointer"
                    >
                      <Paperclip className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                      <span>Attach in Email</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4 w-10">
                    <button onClick={handleSelectAll} className="p-1">
                      {selectedDocIds.size === processedDocuments.length ? (
                        <div className="w-4 h-4 rounded bg-purple-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-700" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-4">Document Title & File</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Size</th>
                  <th className="py-3.5 px-4">Usage</th>
                  <th className="py-3.5 px-4">Author</th>
                  <th className="py-3.5 px-4">Uploaded</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {processedDocuments.map((doc) => {
                  const catConfig = getCategoryConfig(doc.category);
                  const isSelected = selectedDocIds.has(doc.id);

                  return (
                    <tr
                      key={doc.id}
                      className={`hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition ${
                        isSelected ? "bg-purple-50/40 dark:bg-purple-950/30" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <button onClick={() => toggleSelectDoc(doc.id)} className="p-1">
                          {isSelected ? (
                            <div className="w-4 h-4 rounded bg-purple-600 text-white flex items-center justify-center">
                              <Check className="w-3 h-3" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-700" />
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 shrink-0">
                            {getFileIcon(doc.fileName, doc.fileType, "w-4 h-4")}
                          </div>
                          <div className="min-w-0 max-w-sm">
                            <div className="flex items-center space-x-1.5">
                              <h4
                                onClick={() => setPreviewDoc(doc)}
                                className="font-bold text-slate-900 dark:text-white truncate hover:text-purple-600 cursor-pointer"
                              >
                                {doc.title}
                              </h4>
                              {doc.isStarred && (
                                <Star className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono truncate">
                              {doc.fileName}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${catConfig.badgeBg} ${catConfig.badgeText} ${catConfig.borderColor}`}
                        >
                          {catConfig.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {doc.fileSize}
                      </td>

                      <td className="py-3 px-4">
                        {doc.useCount > 0 ? (
                          <span className="font-bold text-purple-600 dark:text-purple-400">
                            {doc.useCount} email{doc.useCount > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-slate-400">Not used yet</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {doc.uploadedBy}
                      </td>

                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {doc.uploadedAt
                          ? new Date(doc.uploadedAt).toLocaleDateString()
                          : "Recent"}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleComposeWithSingleDoc(doc)}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] rounded-lg shadow-2xs transition flex items-center space-x-1"
                            title="Compose email with this attachment"
                          >
                            <Send className="w-3 h-3" />
                            <span>Attach</span>
                          </button>

                          {doc.downloadUrl && (
                            <a
                              href={doc.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg transition"
                              title="Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            onClick={() => openEditModal(doc)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmDoc(doc)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* UPLOAD DOCUMENT MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    Upload Collateral to Library
                  </h3>
                  <p className="text-xs text-slate-500">
                    Store documents in Cloudflare R2 for instant one-click email attachments
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 overflow-y-auto">
              {uploadError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Drag & Drop Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files) {
                    setUploadFiles(Array.from(e.dataTransfer.files));
                    if (e.dataTransfer.files[0]) {
                      setUploadTitle(
                        e.dataTransfer.files[0].name
                          .replace(/\.[^/.]+$/, "")
                          .replace(/[-_]+/g, " ")
                      );
                    }
                  }
                }}
                onClick={() => uploadInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${
                  isDragging
                    ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/30"
                    : "border-slate-200 dark:border-slate-800 hover:border-purple-400 bg-slate-50/50 dark:bg-slate-950/40"
                }`}
              >
                <input
                  ref={uploadInputRef}
                  type="file"
                  multiple
                  accept="*/*"
                  onChange={(e) => {
                    if (e.target.files) {
                      setUploadFiles(Array.from(e.target.files));
                      if (e.target.files[0]) {
                        setUploadTitle(
                          e.target.files[0].name
                            .replace(/\.[^/.]+$/, "")
                            .replace(/[-_]+/g, " ")
                        );
                      }
                    }
                  }}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="p-3 rounded-2xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Choose files to upload
                    </span>{" "}
                    <span className="text-sm text-slate-500">or drag & drop</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Supports <strong>any file format</strong> (PDF, PowerPoint, Word, Excel, Keynote, MP4, Images, ZIP up to 100MB)
                  </p>

                  {uploadFiles.length > 0 && (
                    <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-950/60 rounded-xl border border-purple-200 dark:border-purple-800/80 w-full text-left space-y-1">
                      <span className="text-[10px] font-black uppercase text-purple-700 dark:text-purple-300">
                        Selected Files ({uploadFiles.length}):
                      </span>
                      {uploadFiles.map((f, i) => (
                        <div key={i} className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                          • {f.name} ({formatBytes(f.size)})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Document Title */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Display Title
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Executive Coaching CXO Impact Deck 2026"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as DocumentCategory)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
                >
                  {DOCUMENT_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Pitch Context & Usage Notes
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Describe when reps should attach this file (e.g. For VP and CXO outbound emails after 1st touch...)"
                  rows={2}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="coaching, deck, cxo, credentials"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || uploadFiles.length === 0}
                  className="px-5 py-2 text-xs font-black rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md disabled:opacity-50 transition flex items-center space-x-1.5"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading to R2...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload & Save to Library</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW & DETAILS MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300">
                  {getFileIcon(previewDoc.fileName, previewDoc.fileType)}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white truncate max-w-md">
                    {previewDoc.title}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {previewDoc.fileName} • {previewDoc.fileSize}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Category & Stats Badges */}
              <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                    getCategoryConfig(previewDoc.category).badgeBg
                  } ${getCategoryConfig(previewDoc.category).badgeText} ${
                    getCategoryConfig(previewDoc.category).borderColor
                  }`}
                >
                  {getCategoryConfig(previewDoc.category).label}
                </span>

                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Times Attached: {previewDoc.useCount || 0}
                </span>

                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Cloudflare R2 Storage
                </span>
              </div>

              {/* Description */}
              {previewDoc.description && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750">
                  <h4 className="text-xs font-black uppercase text-slate-400 mb-1">
                    Usage & Context:
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {previewDoc.description}
                  </p>
                </div>
              )}

              {/* Tags */}
              {previewDoc.tags && previewDoc.tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-400 mb-2">Tags:</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {previewDoc.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 text-xs font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-lg border border-purple-200 dark:border-purple-800"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Audit Details */}
              <div className="grid grid-cols-2 gap-3 text-xs p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block font-semibold">Uploaded By:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {previewDoc.uploadedBy}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Upload Date:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {new Date(previewDoc.uploadedAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Storage Key:</span>
                  <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 truncate block">
                    {previewDoc.storageKey}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Last Used:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {previewDoc.lastUsedAt
                      ? new Date(previewDoc.lastUsedAt).toLocaleDateString()
                      : "Never"}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
              <button
                onClick={() => {
                  setPreviewDoc(null);
                  openEditModal(previewDoc);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 rounded-xl"
              >
                Edit Metadata
              </button>

              <div className="flex items-center space-x-2">
                {previewDoc.downloadUrl && (
                  <a
                    href={previewDoc.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl transition flex items-center space-x-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                )}

                <button
                  onClick={() => {
                    handleComposeWithSingleDoc(previewDoc);
                    setPreviewDoc(null);
                  }}
                  className="px-5 py-2 text-xs font-black rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md transition flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Attach to Email</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT METADATA MODAL */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Edit Document Details
              </h3>
              <button onClick={() => setEditingDoc(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as DocumentCategory)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
                >
                  {DOCUMENT_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Description / Pitch Context
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={handleSaveEdit}
                className="px-5 py-2 text-xs font-black rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md disabled:opacity-50"
              >
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950/60">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Delete Document?
                </h3>
                <p className="text-xs text-slate-500">
                  This will remove the file from your Library and storage.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 font-medium">
              "{deleteConfirmDoc.title || deleteConfirmDoc.fileName}"
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setDeleteConfirmDoc(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDoc(deleteConfirmDoc)}
                className="px-5 py-2 text-xs font-black rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md"
              >
                Yes, Delete Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
