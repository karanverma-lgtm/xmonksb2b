"use client";

import React, { useState, useRef } from "react";
import {
  Paperclip,
  UploadCloud,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  FileArchive,
  FileCheck,
  File,
  X,
  Download,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { EmailAttachment } from "@/constants/emailTemplates";
import { uploadEmailAttachment } from "@/lib/emailService";
import { formatBytes } from "@/lib/formatters";

interface EmailAttachmentManagerProps {
  attachments: EmailAttachment[];
  onChange?: (attachments: EmailAttachment[]) => void;
  readOnly?: boolean;
  label?: string;
  description?: string;
  maxFileSizeMB?: number;
  className?: string;
}

export const EmailAttachmentManager: React.FC<EmailAttachmentManagerProps> = ({
  attachments = [],
  onChange,
  readOnly = false,
  label = "Email Attachments",
  description = "Attach PDFs, pitch decks, enterprise brochures, spreadsheets, or images (up to 25MB).",
  maxFileSizeMB = 25,
  className = "",
}) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (fileName: string, mimeType: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (ext === "pdf" || mimeType.includes("pdf")) {
      return <FileText className="w-4 h-4 text-rose-500" />;
    }
    if (["xlsx", "xls", "csv"].includes(ext) || mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
    }
    if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext) || mimeType.startsWith("image/")) {
      return <ImageIcon className="w-4 h-4 text-purple-500" />;
    }
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext) || mimeType.includes("zip")) {
      return <FileArchive className="w-4 h-4 text-amber-500" />;
    }
    if (["doc", "docx", "txt", "rtf"].includes(ext) || mimeType.includes("word") || mimeType.includes("document")) {
      return <FileText className="w-4 h-4 text-blue-500" />;
    }
    return <File className="w-4 h-4 text-slate-400" />;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || readOnly) return;
    setUploadError(null);
    setIsUploading(true);

    const newAttachments: EmailAttachment[] = [...attachments];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        errors.push(`"${file.name}" exceeds the ${maxFileSizeMB}MB limit.`);
        continue;
      }

      // Check if file with same name already attached
      if (newAttachments.some((a) => a.name === file.name && a.size === file.size)) {
        continue;
      }

      try {
        const uploaded = await uploadEmailAttachment(file);
        newAttachments.push(uploaded);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : `Failed to upload "${file.name}"`;
        errors.push(msg);
      }
    }

    if (errors.length > 0) {
      setUploadError(errors.join(" "));
    }

    if (onChange) {
      onChange(newAttachments);
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = (id: string, index: number) => {
    if (readOnly || !onChange) return;
    const updated = attachments.filter((att, idx) => (att.id ? att.id !== id : idx !== index));
    onChange(updated);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Paperclip className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {label}
          </label>
          {attachments.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              {attachments.length} {attachments.length === 1 ? "file" : "files"}
            </span>
          )}
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center space-x-1.5 px-3 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 rounded-xl text-[11px] font-bold transition disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Attach Files</span>
              </>
            )}
          </button>
        )}
      </div>

      {description && !readOnly && attachments.length === 0 && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{description}</p>
      )}

      {/* Hidden File Input */}
      {!readOnly && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.zip,.txt"
        />
      )}

      {/* Drag & Drop Zone (if no attachments and not read-only) */}
      {!readOnly && attachments.length === 0 && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition ${
            isDragging
              ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/30"
              : "border-slate-200 dark:border-slate-800 hover:border-purple-400 bg-slate-50/60 dark:bg-slate-950/40"
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-1.5">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Click to attach files
              </span>{" "}
              <span className="text-xs text-slate-500">or drag and drop here</span>
            </div>
            <p className="text-[10px] text-slate-400">
              PDF, Word, Excel, PowerPoint, Images, ZIP (up to {maxFileSizeMB}MB each)
            </p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {uploadError && (
        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="p-0.5 hover:bg-rose-200/50 dark:hover:bg-rose-900/50 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Attachment Chips / Cards List */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((att, idx) => (
            <div
              key={att.id || `att-${idx}`}
              className="group flex items-center space-x-2.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-purple-300 dark:hover:border-purple-800 transition max-w-full"
            >
              <div className="shrink-0 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                {getFileIcon(att.name, att.type || "")}
              </div>

              <div className="min-w-0 max-w-[200px] sm:max-w-[260px]">
                <div
                  className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate"
                  title={att.name}
                >
                  {att.name}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center space-x-1">
                  <span>{formatBytes(att.size || 0)}</span>
                  {att.storageKey && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">• Cloud Stored</span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-1 shrink-0 ml-1">
                {att.downloadUrl && (
                  <a
                    href={att.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                    title="Download / View Attachment"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                )}

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemove(att.id, idx)}
                    className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                    title="Remove attachment"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {!readOnly && attachments.length > 0 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center space-x-1 px-3 py-2 border border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-400 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>+ Add More</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
