"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Search,
  Filter,
  Check,
  Paperclip,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  FileArchive,
  File,
  Sparkles,
  Star,
  Download,
  ExternalLink,
  BookOpen,
  Presentation,
  CheckSquare,
  Square,
  Layers,
  Award,
  CheckCircle2,
  FolderOpen,
} from "lucide-react";
import { LibraryDocument, DocumentCategory, DOCUMENT_CATEGORIES, getCategoryConfig, libraryDocToEmailAttachment } from "@/types/library";
import { subscribeToLibraryDocuments, getStoredLocalLibraryDocs } from "@/lib/libraryService";
import { EmailAttachment } from "@/constants/emailTemplates";

interface AttachFromLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttach: (attachments: EmailAttachment[]) => void;
  alreadyAttachedIds?: string[];
  maxSelectable?: number;
}

export const AttachFromLibraryModal: React.FC<AttachFromLibraryModalProps> = ({
  isOpen,
  onClose,
  onAttach,
  alreadyAttachedIds = [],
  maxSelectable = 6,
}) => {
  const [documents, setDocuments] = useState<LibraryDocument[]>(() => getStoredLocalLibraryDocs());
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [onlyStarred, setOnlyStarred] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const unsub = subscribeToLibraryDocuments((docs) => {
        setDocuments(docs);
      });
      return unsub;
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSelectedDocIds(new Set());
      setSearchQuery("");
      setSelectedCategory("all");
      setOnlyStarred(false);
    }
  }, [isOpen]);

  const alreadyAttachedSet = useMemo(() => new Set(alreadyAttachedIds), [alreadyAttachedIds]);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
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
  }, [documents, searchQuery, selectedCategory, onlyStarred]);

  const toggleSelect = (docId: string) => {
    if (alreadyAttachedSet.has(docId)) return;

    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        if (next.size >= maxSelectable) {
          alert(`You can attach up to ${maxSelectable} documents at once.`);
          return prev;
        }
        next.add(docId);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    const selectable = filteredDocs.filter((d) => !alreadyAttachedSet.has(d.id));
    const next = new Set(selectedDocIds);
    const allSelected = selectable.every((d) => next.has(d.id));

    if (allSelected) {
      selectable.forEach((d) => next.delete(d.id));
    } else {
      selectable.forEach((d) => {
        if (next.size < maxSelectable) {
          next.add(d.id);
        }
      });
    }
    setSelectedDocIds(next);
  };

  const handleConfirmAttach = () => {
    const docsToAttach = documents.filter((d) => selectedDocIds.has(d.id));
    const attachments: EmailAttachment[] = docsToAttach.map(libraryDocToEmailAttachment);
    onAttach(attachments);
    onClose();
  };

  const getFileIcon = (fileName: string, mimeType: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (ext === "pdf" || mimeType.includes("pdf")) {
      return <FileText className="w-5 h-5 text-rose-500" />;
    }
    if (["xlsx", "xls", "csv"].includes(ext) || mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    }
    if (["ppt", "pptx", "key"].includes(ext) || mimeType.includes("presentation") || mimeType.includes("powerpoint")) {
      return <Presentation className="w-5 h-5 text-amber-500" />;
    }
    if (["doc", "docx", "txt", "rtf"].includes(ext) || mimeType.includes("word") || mimeType.includes("document")) {
      return <FileText className="w-5 h-5 text-blue-500" />;
    }
    if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext) || mimeType.startsWith("image/")) {
      return <ImageIcon className="w-5 h-5 text-purple-500" />;
    }
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext) || mimeType.includes("zip")) {
      return <FileArchive className="w-5 h-5 text-orange-500" />;
    }
    return <File className="w-5 h-5 text-slate-400" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl border border-purple-500/20">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Select from Document Library</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300">
                  {documents.length} Collateral Assets
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pick pitch decks, brochures, case studies, or documents to attach directly to your email
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents by title, tags, format, or author..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Starred Toggle */}
            <button
              onClick={() => setOnlyStarred(!onlyStarred)}
              className={`px-3 py-2 text-xs font-bold rounded-xl border flex items-center space-x-1.5 transition ${
                onlyStarred
                  ? "bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${onlyStarred ? "fill-amber-400" : ""}`} />
              <span>Starred</span>
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                selectedCategory === "all"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              All Assets ({documents.length})
            </button>
            {DOCUMENT_CATEGORIES.map((cat) => {
              const count = documents.filter((d) => d.category === cat.id).length;
              if (count === 0 && selectedCategory !== cat.id) return null;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${
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
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredDocs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30 text-purple-500" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No matching library documents found</p>
              <p className="text-xs mt-1">Try tweaking your search or upload new collateral in the Library tab.</p>
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isSelected = selectedDocIds.has(doc.id);
              const isAlreadyAttached = alreadyAttachedSet.has(doc.id);
              const catConfig = getCategoryConfig(doc.category);

              return (
                <div
                  key={doc.id}
                  onClick={() => !isAlreadyAttached && toggleSelect(doc.id)}
                  className={`group p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                    isAlreadyAttached
                      ? "bg-slate-100/70 dark:bg-slate-850/40 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed"
                      : isSelected
                      ? "bg-purple-50/70 dark:bg-purple-950/40 border-purple-400 dark:border-purple-600 shadow-sm cursor-pointer"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-sm cursor-pointer"
                  }`}
                >
                  {/* Left: Checkbox & File Info */}
                  <div className="flex items-start space-x-3.5 min-w-0">
                    <button
                      type="button"
                      disabled={isAlreadyAttached}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isAlreadyAttached) toggleSelect(doc.id);
                      }}
                      className="mt-1 flex-shrink-0"
                    >
                      {isAlreadyAttached ? (
                        <div className="w-5 h-5 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : isSelected ? (
                        <div className="w-5 h-5 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-lg border-2 border-slate-300 dark:border-slate-700 group-hover:border-purple-400" />
                      )}
                    </button>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 flex-shrink-0">
                      {getFileIcon(doc.fileName, doc.fileType)}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {doc.title || doc.fileName}
                        </h4>
                        {doc.isStarred && (
                          <Star className="w-3 h-3 text-amber-500 fill-amber-400 flex-shrink-0" />
                        )}
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${catConfig.badgeBg} ${catConfig.badgeText} ${catConfig.borderColor}`}>
                          {catConfig.label}
                        </span>
                        {isAlreadyAttached && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                            Already Attached
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                        {doc.fileName} • <span className="font-semibold text-slate-700 dark:text-slate-300">{doc.fileSize}</span>
                        {doc.useCount > 0 && (
                          <span className="ml-2 text-purple-600 dark:text-purple-400 font-sans font-bold">
                            • Used in {doc.useCount} email{doc.useCount > 1 ? "s" : ""}
                          </span>
                        )}
                      </p>

                      {doc.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                          {doc.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center space-x-1 flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                    {doc.downloadUrl && (
                      <a
                        href={doc.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Download / View document"
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition"
            >
              Toggle Select All Filtered
            </button>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
              {selectedDocIds.size} of {maxSelectable} Selected
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedDocIds.size === 0}
              onClick={handleConfirmAttach}
              className="px-5 py-2 text-xs font-black rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-md flex items-center space-x-1.5 transition"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>Attach Selected ({selectedDocIds.size})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
