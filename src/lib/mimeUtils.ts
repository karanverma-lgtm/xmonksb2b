/**
 * MIME type and File type utilities for B2B Client Documents
 * Supports all formats: PDF, DOCX, XLSX, XLS, CSV, PPT, PPTX, TXT, Images, ZIP, etc.
 */

export function getFileExtension(fileName: string): string {
  if (!fileName) return "";
  const parts = fileName.split(".");
  if (parts.length <= 1) return "";
  return parts.pop()?.toLowerCase() || "";
}

export function getMimeType(fileName: string, fallback: string = "application/octet-stream"): string {
  const ext = getFileExtension(fileName);
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "xls":
      return "application/vnd.ms-excel";
    case "csv":
      return "text/csv; charset=utf-8";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "doc":
      return "application/msword";
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "ppt":
      return "application/vnd.ms-powerpoint";
    case "txt":
      return "text/plain; charset=utf-8";
    case "json":
      return "application/json";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "gif":
      return "image/gif";
    case "zip":
      return "application/zip";
    case "rar":
      return "application/vnd.rar";
    case "7z":
      return "application/x-7z-compressed";
    case "tar":
    case "gz":
      return "application/gzip";
    default:
      return fallback;
  }
}

export type FileCategory =
  | "pdf"
  | "spreadsheet"
  | "document"
  | "csv"
  | "presentation"
  | "image"
  | "archive"
  | "text"
  | "other";

export interface FileTypeBadgeInfo {
  ext: string;
  category: FileCategory;
  label: string;
  badgeText: string;
  color: string;
  bgColor: string;
  borderColor: string;
  canPreview: boolean;
}

export function getFileTypeBadgeInfo(fileName: string, mimeType?: string): FileTypeBadgeInfo {
  const ext = getFileExtension(fileName).toUpperCase() || "FILE";
  const lowerExt = ext.toLowerCase();

  if (lowerExt === "pdf" || mimeType?.includes("pdf")) {
    return {
      ext: "PDF",
      category: "pdf",
      label: "PDF Document",
      badgeText: "PDF",
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-500/10 dark:bg-rose-500/20",
      borderColor: "border-rose-500/25",
      canPreview: true,
    };
  }

  if (lowerExt === "xlsx" || lowerExt === "xls") {
    return {
      ext,
      category: "spreadsheet",
      label: "Excel Spreadsheet",
      badgeText: ext,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10 dark:bg-emerald-500/20",
      borderColor: "border-emerald-500/25",
      canPreview: false,
    };
  }

  if (lowerExt === "csv") {
    return {
      ext: "CSV",
      category: "csv",
      label: "CSV Spreadsheet",
      badgeText: "CSV",
      color: "text-teal-600 dark:text-teal-400",
      bgColor: "bg-teal-500/10 dark:bg-teal-500/20",
      borderColor: "border-teal-500/25",
      canPreview: true, // Plain text previewable!
    };
  }

  if (lowerExt === "docx" || lowerExt === "doc" || lowerExt === "rtf") {
    return {
      ext,
      category: "document",
      label: "Word Document",
      badgeText: ext,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10 dark:bg-blue-500/20",
      borderColor: "border-blue-500/25",
      canPreview: false,
    };
  }

  if (lowerExt === "pptx" || lowerExt === "ppt") {
    return {
      ext,
      category: "presentation",
      label: "PowerPoint Presentation",
      badgeText: ext,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10 dark:bg-amber-500/20",
      borderColor: "border-amber-500/25",
      canPreview: false,
    };
  }

  if (["png", "jpg", "jpeg", "webp", "svg", "gif"].includes(lowerExt) || mimeType?.startsWith("image/")) {
    return {
      ext,
      category: "image",
      label: "Image Asset",
      badgeText: ext,
      color: "text-violet-600 dark:text-violet-400",
      bgColor: "bg-violet-500/10 dark:bg-violet-500/20",
      borderColor: "border-violet-500/25",
      canPreview: true,
    };
  }

  if (["zip", "rar", "7z", "tar", "gz"].includes(lowerExt)) {
    return {
      ext,
      category: "archive",
      label: "Archive Package",
      badgeText: ext,
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-slate-500/10 dark:bg-slate-500/20",
      borderColor: "border-slate-500/25",
      canPreview: false,
    };
  }

  if (["txt", "json", "xml", "md"].includes(lowerExt) || mimeType?.startsWith("text/")) {
    return {
      ext,
      category: "text",
      label: "Text File",
      badgeText: ext,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-500/10 dark:bg-indigo-500/20",
      borderColor: "border-indigo-500/25",
      canPreview: true,
    };
  }

  return {
    ext: ext || "FILE",
    category: "other",
    label: "Document",
    badgeText: ext || "DOC",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-500/10 dark:bg-slate-500/20",
    borderColor: "border-slate-500/25",
    canPreview: false,
  };
}
