"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  X,
  Loader2,
  Copy,
  Check,
  Eye,
  Code,
  Save,
  Send,
  Users,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Lightbulb,
  ArrowRight,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import {
  generateAIEmailTemplate,
  getStoredGeminiKey,
  saveGeminiKey,
  fetchEnvGeminiConfig,
  GeneratedTemplateResult,
} from "@/lib/geminiService";
import { EmailTemplate } from "@/constants/emailTemplates";

interface AITemplateGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveToLibrary: (template: {
    name: string;
    subject: string;
    category: EmailTemplate["category"];
    htmlContent: string;
    description: string;
  }) => void;
  onApplyToSingle?: (template: { subject: string; htmlContent: string }) => void;
  onApplyToBulk?: (template: { subject: string; htmlContent: string }) => void;
  senderName?: string;
  onNavigateToDeveloper?: () => void;
}

const PROMPT_PRESETS = [
  {
    label: "Executive Coaching Pitch",
    tone: "executive",
    program: "Executive Coaching",
    context:
      "Pitch our 1-on-1 Executive Coaching program to senior leaders (VP, CXO, Director). Highlight customized ICF-certified coaching, behavioral transformation, 360-degree assessment insights, and invite them for a confidential 20-minute strategic consultation.",
  },
  {
    label: "L&D Transformation Proposal",
    tone: "consultative",
    program: "L&D Transformation",
    context:
      "Introduce xMonks enterprise L&D transformation framework. Focus on custom leadership journeys, manager-to-leader transition programs, measurable business ROI, and suggest scheduling an enterprise curriculum review.",
  },
  {
    label: "Post-Discovery Follow-Up",
    tone: "warm",
    program: "General B2B",
    context:
      "Professional follow-up after an initial discovery discussion. Thank the client for their time, recap our shared vision for elevating their team's leadership performance, and propose concrete next steps with a tailored roadmap.",
  },
  {
    label: "Re-engage Stalled Opportunity",
    tone: "persuasive",
    program: "Executive Coaching",
    context:
      "Warm re-engagement email to a decision maker whose deal has stalled. Share recent enterprise case study results, emphasize upcoming quarter leadership priorities, and check if revisiting our collaboration makes sense now.",
  },
  {
    label: "Quarter-End Retainer Opportunity",
    tone: "urgent",
    program: "TASC Inhouse",
    context:
      "Executive outreach regarding remaining annual leadership development budgets. Mention our multi-cohort retainer packages, executive coaching blocks, and priority scheduling for upcoming quarters.",
  },
];

export const AITemplateGeneratorModal: React.FC<AITemplateGeneratorModalProps> = ({
  isOpen,
  onClose,
  onSaveToLibrary,
  onApplyToSingle,
  onApplyToBulk,
  senderName = "xMonks Team",
  onNavigateToDeveloper,
}) => {
  // Input Form States
  const [context, setContext] = useState<string>("");
  const [tone, setTone] = useState<string>("executive");
  const [program, setProgram] = useState<string>("Executive Coaching");
  const [includeTags, setIncludeTags] = useState<boolean>(true);

  // Gemini Key Management in Modal
  const [currentKey, setCurrentKey] = useState<string>("");
  const [tempKeyInput, setTempKeyInput] = useState<string>("");
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);

  // Generation & Results States
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string>("");
  const [generatedResult, setGeneratedResult] = useState<GeneratedTemplateResult | null>(null);

  // Editable outputs
  const [editedSubject, setEditedSubject] = useState<string>("");
  const [editedTemplateName, setEditedTemplateName] = useState<string>("");
  const [editedCategory, setEditedCategory] = useState<EmailTemplate["category"]>("outreach");
  const [editedHtml, setEditedHtml] = useState<string>("");

  // Preview tab: 'visual' or 'code'
  const [previewTab, setPreviewTab] = useState<"visual" | "code">("visual");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>("");

  // Check stored key and env on open
  useEffect(() => {
    if (isOpen) {
      const stored = getStoredGeminiKey();
      if (stored) {
        setCurrentKey(stored);
      } else {
        fetchEnvGeminiConfig().then((info) => {
          if (info.hasEnvKey && info.envKey) {
            setCurrentKey(info.envKey);
            saveGeminiKey(info.envKey);
          }
        });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: (typeof PROMPT_PRESETS)[0]) => {
    setContext(preset.context);
    setTone(preset.tone);
    setProgram(preset.program);
    setGenerationError("");
  };

  const handleSaveInlineKey = () => {
    if (!tempKeyInput.trim()) return;
    saveGeminiKey(tempKeyInput.trim());
    setCurrentKey(tempKeyInput.trim());
    setShowKeyInput(false);
    setTempKeyInput("");
    setGenerationError("");
  };

  const handleGenerate = async () => {
    if (!context.trim()) {
      setGenerationError("Please enter your email context, requirements, or rough thoughts.");
      return;
    }

    const key = currentKey || getStoredGeminiKey();
    if (!key) {
      setGenerationError(
        "Google Gemini API Key is missing. Please enter your key below or configure it in the Developer tab."
      );
      setShowKeyInput(true);
      return;
    }

    setIsGenerating(true);
    setGenerationError("");
    setActionSuccessMsg("");

    try {
      const result = await generateAIEmailTemplate({
        context: context.trim(),
        tone,
        program,
        senderName,
        includeTags,
        apiKey: key,
      });

      if (result.success && result.htmlContent) {
        setGeneratedResult(result);
        setEditedSubject(result.subject || "Strategic Collaboration with xMonks");
        setEditedTemplateName(result.templateName || "AI Leadership Template");
        setEditedHtml(result.htmlContent);
      } else {
        setGenerationError(result.error || "Failed to generate email template. Please check API key.");
      }
    } catch (err: unknown) {
      setGenerationError(
        err instanceof Error ? err.message : "Network error generating template. Please retry."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(editedHtml);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSaveLibrary = () => {
    if (!editedHtml) return;
    onSaveToLibrary({
      name: editedTemplateName || "AI Generated Template",
      subject: editedSubject || "Important update from xMonks",
      category: editedCategory,
      htmlContent: editedHtml,
      description: generatedResult?.summary || "Custom tailored AI template",
    });
    setActionSuccessMsg("✅ Template saved to your Library and synced to Firestore!");
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleUseInSingle = () => {
    if (!editedHtml) return;
    if (onApplyToSingle) {
      onApplyToSingle({
        subject: editedSubject,
        htmlContent: editedHtml,
      });
      onClose();
    }
  };

  const handleUseInBulk = () => {
    if (!editedHtml) return;
    if (onApplyToBulk) {
      onApplyToBulk({
        subject: editedSubject,
        htmlContent: editedHtml,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-6xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between border-b border-purple-500/20 flex-shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-gradient-to-tr from-purple-500 to-indigo-500 rounded-2xl shadow-lg shadow-purple-500/30 text-white flex-shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Gemini AI HTML Email Generator
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-400/20 text-purple-200 border border-purple-400/30">
                  Google Gemini Flash
                </span>
              </div>
              <p className="text-xs text-purple-200/80 mt-0.5 max-w-xl">
                Enter your business objective, target audience, or draft copy. Gemini will craft a high-converting, responsive HTML email template with inline styles.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Missing API Key Warning & Quick Config */}
        {(!currentKey || showKeyInput) && (
          <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>
                Gemini API Key required to generate templates. It is loaded automatically from your <code className="font-mono bg-amber-500/20 px-1 py-0.5 rounded">.env</code> or can be saved below.
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="password"
                value={tempKeyInput}
                onChange={(e) => setTempKeyInput(e.target.value)}
                placeholder="Paste Gemini API Key"
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveInlineKey}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition"
              >
                Save Key
              </button>
              {onNavigateToDeveloper && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToDeveloper();
                  }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 underline font-semibold flex items-center space-x-1"
                >
                  <span>Developer Tab</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal Content Grid */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Context & Controls (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Quick Inspiration Presets */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 mb-2">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Quick Prompt Inspirations:</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PROMPT_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 transition"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Business Context / Requirements Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Business Context & Requirements <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400">{context.length} characters</span>
              </div>
              <textarea
                rows={5}
                value={context}
                onChange={(e) => {
                  setContext(e.target.value);
                  if (generationError) setGenerationError("");
                }}
                placeholder="Describe your email objective, key value props, target executive role, offer, and call to action. e.g.:

'Reach out to VP of HR offering Executive Coaching for their high-potential director cohort. Mention our 94% retention impact and invite them to a 20-min strategy session next week.'"
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-white leading-relaxed focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            {/* Tone & Solution Area Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tone of Voice
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="executive">Executive & Authoritative</option>
                  <option value="consultative">Consultative & Value-Led</option>
                  <option value="warm">Warm & Relationship-Focused</option>
                  <option value="urgent">Urgent & Direct CTA</option>
                  <option value="storytelling">Story-Driven & Case Study</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Program Focus
                </label>
                <select
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="Executive Coaching">Executive Coaching</option>
                  <option value="L&D Transformation">L&D Transformation</option>
                  <option value="TASC Inhouse">TASC Inhouse</option>
                  <option value="Leadership Assessments">Leadership Assessments</option>
                  <option value="General B2B">General B2B Outreach</option>
                </select>
              </div>
            </div>

            {/* Personalization Merge Tags Option */}
            <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-900/40 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  CRM Dynamic Merge Tags
                </span>
                <span className="text-[11px] text-slate-500">
                  Embeds <code className="font-mono text-purple-600 dark:text-purple-400">{"{{contactName}}"}</code>, <code className="font-mono text-purple-600 dark:text-purple-400">{"{{companyName}}"}</code>, <code className="font-mono text-purple-600 dark:text-purple-400">{"{{designation}}"}</code>
                </span>
              </div>
              <input
                type="checkbox"
                checked={includeTags}
                onChange={(e) => setIncludeTags(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              />
            </div>

            {/* Error Message */}
            {generationError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2 animate-fadeIn">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{generationError}</span>
              </div>
            )}

            {/* Primary Generate Button */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !context.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-purple-500/20 transition transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Converting into Beautiful HTML Template...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Beautiful HTML Template</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Output & Live Preview (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            {generatedResult ? (
              <div className="flex-1 flex flex-col space-y-4 animate-fadeIn">
                {/* Meta details: Subject, Name, Category */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="sm:col-span-7">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Generated Subject Line
                    </label>
                    <input
                      type="text"
                      value={editedSubject}
                      onChange={(e) => setEditedSubject(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Template Name
                    </label>
                    <input
                      type="text"
                      value={editedTemplateName}
                      onChange={(e) => setEditedTemplateName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Category
                    </label>
                    <select
                      value={editedCategory}
                      onChange={(e) => setEditedCategory(e.target.value as EmailTemplate["category"])}
                      className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="outreach">Outreach</option>
                      <option value="proposal">Proposal</option>
                      <option value="followup">Followup</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>

                {/* Preview Tabs: Visual Preview vs HTML Code */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewTab("visual")}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        previewTab === "visual"
                          ? "bg-purple-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Visual Preview</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewTab("code")}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        previewTab === "code"
                          ? "bg-purple-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>HTML Code</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleCopyHtml}
                      className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                      title="Copy HTML to clipboard"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-500 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy HTML</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950 rounded-lg transition"
                      title="Regenerate with current context"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                      <span>Regenerate</span>
                    </button>
                  </div>
                </div>

                {/* Preview Window */}
                <div className="flex-1 min-h-[380px] max-h-[460px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 flex flex-col">
                  {previewTab === "visual" ? (
                    <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-slate-100 dark:bg-slate-950">
                      <div
                        className="w-full max-w-[620px] bg-white rounded-xl shadow-md overflow-hidden text-slate-900 border border-slate-200"
                        dangerouslySetInnerHTML={{
                          __html: editedHtml
                            .replace(/{{contactName}}/g, "Rahul Mehta")
                            .replace(/{{companyName}}/g, "Vertex Global Enterprises")
                            .replace(/{{designation}}/g, "Chief People Officer")
                            .replace(/{{industry}}/g, "Technology & Consulting")
                            .replace(/{{senderName}}/g, senderName),
                        }}
                      />
                    </div>
                  ) : (
                    <textarea
                      value={editedHtml}
                      onChange={(e) => setEditedHtml(e.target.value)}
                      className="w-full h-full p-4 font-mono text-xs bg-slate-950 text-emerald-400 focus:outline-none resize-none leading-relaxed overflow-y-auto"
                    />
                  )}
                </div>

                {/* Feedback Toast */}
                {actionSuccessMsg && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center space-x-2 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>{actionSuccessMsg}</span>
                  </div>
                )}

                {/* Action Buttons Strip */}
                <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5">
                  {onApplyToSingle && (
                    <button
                      type="button"
                      onClick={handleUseInSingle}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center space-x-1.5"
                    >
                      <Send className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Use in Single Email</span>
                    </button>
                  )}

                  {onApplyToBulk && (
                    <button
                      type="button"
                      onClick={handleUseInBulk}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center space-x-1.5"
                    >
                      <Users className="w-3.5 h-3.5 text-purple-500" />
                      <span>Use in Bulk Campaign</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveLibrary}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-purple-500/20 transition flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save to Template Library</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Empty Placeholder State */
              <div className="flex-1 min-h-[420px] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-slate-50/40 dark:bg-slate-950/40">
                <div className="p-4 rounded-3xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 shadow-sm">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="max-w-md space-y-1.5">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Ready to Generate Your Email Template
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Select one of the prompt inspirations on the left or type your custom business goals. Click <strong>Generate Beautiful HTML Template</strong> to see an interactive preview here.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-left max-w-sm pt-2">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]">
                    <span className="font-bold text-slate-900 dark:text-white block">Email Client Safe</span>
                    <span className="text-slate-500">Inline CSS optimized for Gmail & Outlook</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]">
                    <span className="font-bold text-slate-900 dark:text-white block">Smart Personalization</span>
                    <span className="text-slate-500">Automatic CRM merge tags insertion</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
