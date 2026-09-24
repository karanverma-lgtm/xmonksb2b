"use client";

import React, { useState, useEffect } from "react";
import {
  Code2,
  KeyRound,
  Mail,
  Server,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Save,
  HelpCircle,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Plus,
  Trash2,
  Edit3,
  Check,
  Zap,
  Layers,
  ArrowRight,
  Bot,
  Wand2,
  Cpu,
} from "lucide-react";
import {
  saveSMTPConfig,
  testSMTPConnection,
  subscribeToSenderProfiles,
  saveSenderProfile,
  setActiveSender,
  deleteSenderProfile,
  getAllSenderProfiles,
  SMTPSenderProfile,
  SMTPConfig,
} from "@/lib/emailService";
import {
  getStoredGeminiKey,
  saveGeminiKey,
  subscribeToGeminiKey,
  testGeminiApiKey,
  fetchEnvGeminiConfig,
} from "@/lib/geminiService";

export const DeveloperTab: React.FC = () => {
  const [senders, setSenders] = useState<SMTPSenderProfile[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State for Adding / Editing a Sender Capsule
  const [formData, setFormData] = useState<{
    userEmail: string;
    appPassword: string;
    senderName: string;
    host: string;
    port: number;
    secure: boolean;
    setAsActive: boolean;
  }>({
    userEmail: "",
    appPassword: "",
    senderName: "",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    setAsActive: true,
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testingSenderId, setTestingSenderId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    status: "idle" | "success" | "error";
    message: string;
  }>({ status: "idle", message: "" });
  const [feedbackToast, setFeedbackToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Subscribe to real-time sender profiles
  useEffect(() => {
    const unsub = subscribeToSenderProfiles((updatedSenders) => {
      setSenders(updatedSenders);
    });
    return () => unsub();
  }, []);

  // Gemini AI Integration State
  const [geminiKey, setGeminiKey] = useState<string>("");
  const [showGeminiKey, setShowGeminiKey] = useState<boolean>(false);
  const [isTestingGemini, setIsTestingGemini] = useState<boolean>(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{
    status: "idle" | "success" | "error";
    message: string;
    model?: string;
  }>({ status: "idle", message: "" });
  const [envGeminiInfo, setEnvGeminiInfo] = useState<{
    hasEnvKey: boolean;
    envKey: string;
    maskedKey: string;
  } | null>(null);

  // Subscribe to real-time Gemini Key & check .env
  useEffect(() => {
    const local = getStoredGeminiKey();
    if (local) setGeminiKey(local);

    fetchEnvGeminiConfig().then((info) => {
      setEnvGeminiInfo(info);
      if (!local && info.hasEnvKey && info.envKey) {
        setGeminiKey(info.envKey);
      }
    });

    const unsubGemini = subscribeToGeminiKey((syncedKey) => {
      if (syncedKey) {
        setGeminiKey(syncedKey);
      }
    });

    return () => unsubGemini();
  }, []);

  const handleSaveGemini = () => {
    if (!geminiKey.trim()) {
      setGeminiTestResult({
        status: "error",
        message: "Please enter a valid Gemini API Key to save.",
      });
      return;
    }
    saveGeminiKey(geminiKey.trim());
    showToast("✨ Google Gemini API Key saved locally and synced to cloud!");
  };

  const handleTestGemini = async () => {
    const keyToTest = geminiKey.trim();
    if (!keyToTest) {
      setGeminiTestResult({
        status: "error",
        message: "No Gemini API Key provided. Enter a key or click 'Load from .env'.",
      });
      return;
    }

    setIsTestingGemini(true);
    setGeminiTestResult({ status: "idle", message: "" });

    try {
      const res = await testGeminiApiKey(keyToTest);
      if (res.success) {
        setGeminiTestResult({
          status: "success",
          message: res.message || "Gemini AI connection verified and operational!",
          model: res.message?.includes("model") ? res.message.split("model ")[1]?.replace("!", "") : "gemini-flash-latest",
        });
        showToast("✅ Gemini API Key is valid and active!");
      } else {
        setGeminiTestResult({
          status: "error",
          message: res.error || "Failed to verify Gemini API Key.",
        });
      }
    } catch (e: unknown) {
      setGeminiTestResult({
        status: "error",
        message: e instanceof Error ? e.message : "Error verifying Gemini API Key.",
      });
    } finally {
      setIsTestingGemini(false);
    }
  };

  const handleLoadFromEnv = () => {
    if (envGeminiInfo?.envKey) {
      setGeminiKey(envGeminiInfo.envKey);
      setGeminiTestResult({ status: "idle", message: "" });
      showToast("Loaded Gemini API key from .env file!");
    }
  };

  const activeSender = senders.find((s) => s.isDefault) || senders[0];

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setFeedbackToast({ type, text });
    setTimeout(() => {
      setFeedbackToast((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  const handleInputChange = <K extends keyof typeof formData>(
    field: K,
    value: (typeof formData)[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTestResult({ status: "idle", message: "" });
  };

  // Reset form to Add New mode
  const handleAddNew = () => {
    setEditingId(null);
    setFormData({
      userEmail: "",
      appPassword: "",
      senderName: "",
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      setAsActive: senders.length === 0,
    });
    setTestResult({ status: "idle", message: "" });
  };

  // Load a sender capsule into the form for editing
  const handleEdit = (sender: SMTPSenderProfile) => {
    setEditingId(sender.id);
    setFormData({
      userEmail: sender.userEmail,
      appPassword: sender.appPassword,
      senderName: sender.senderName,
      host: sender.host,
      port: sender.port,
      secure: sender.secure,
      setAsActive: Boolean(sender.isDefault),
    });
    setTestResult({ status: "idle", message: "" });
  };

  // Activate a sender capsule
  const handleActivate = (sender: SMTPSenderProfile) => {
    if (sender.isDefault) return;
    const activated = setActiveSender(sender.id);
    if (activated) {
      showToast(`Active sender changed to: ${activated.senderName} (${activated.userEmail})`);
    }
  };

  // Delete a sender capsule
  const handleDelete = (sender: SMTPSenderProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (senders.length <= 1) {
      showToast("Cannot delete the only sender capsule.", "error");
      return;
    }
    const confirmDelete = window.confirm(
      `Are you sure you want to remove the sender capsule for ${sender.senderName} (${sender.userEmail})?`
    );
    if (!confirmDelete) return;

    deleteSenderProfile(sender.id);
    if (editingId === sender.id) {
      handleAddNew();
    }
    showToast(`Sender capsule for ${sender.userEmail} deleted.`);
  };

  // Save the form into a sender capsule
  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.userEmail || !formData.appPassword) {
      setTestResult({
        status: "error",
        message: "Please provide both User Email ID and Google Apps Password.",
      });
      return;
    }

    const saved = saveSenderProfile({
      id: editingId || undefined,
      userEmail: formData.userEmail.trim(),
      appPassword: formData.appPassword.trim(),
      senderName: formData.senderName.trim() || formData.userEmail.split("@")[0],
      host: formData.host.trim() || "smtp.gmail.com",
      port: Number(formData.port) || 587,
      secure: formData.secure,
      isDefault: formData.setAsActive || senders.length === 0,
      isVerified: true,
      lastVerifiedAt: new Date().toLocaleTimeString(),
    });

    showToast(
      editingId
        ? `Updated sender capsule: ${saved.senderName}`
        : `Created new sender capsule: ${saved.senderName}`
    );

    if (editingId) {
      setEditingId(null);
    }
    handleAddNew();
  };

  // Test live connection for form credentials
  const handleTestFormConnection = async () => {
    setIsTesting(true);
    setTestResult({ status: "idle", message: "" });
    try {
      const res = await testSMTPConnection({
        userEmail: formData.userEmail,
        appPassword: formData.appPassword,
        host: formData.host,
        port: formData.port,
        secure: formData.secure,
      });

      if (res.success) {
        setTestResult({
          status: "success",
          message: res.message || "Connection established successfully! Sender credentials verified.",
        });
      } else {
        setTestResult({
          status: "error",
          message: res.error || "Failed to authenticate with SMTP server. Check email and 16-character App Password.",
        });
      }
    } catch (err: unknown) {
      setTestResult({
        status: "error",
        message: err instanceof Error ? err.message : "Network error testing SMTP connection.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Test a specific sender capsule directly
  const handleTestSpecificSender = async (sender: SMTPSenderProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setTestingSenderId(sender.id);
    try {
      const res = await testSMTPConnection({
        userEmail: sender.userEmail,
        appPassword: sender.appPassword,
        host: sender.host,
        port: sender.port,
        secure: sender.secure,
      });

      if (res.success) {
        showToast(`✅ Verified live connection for ${sender.userEmail}`);
        saveSenderProfile({
          ...sender,
          isVerified: true,
          lastVerifiedAt: new Date().toLocaleTimeString(),
        });
      } else {
        showToast(`❌ Connection failed for ${sender.userEmail}: ${res.error}`, "error");
      }
    } catch {
      showToast(`❌ Error connecting to ${sender.userEmail}`, "error");
    } finally {
      setTestingSenderId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white shadow-xl border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 bg-indigo-500/20 rounded-2xl border border-indigo-400/30 text-indigo-300 flex-shrink-0">
            <Code2 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black tracking-tight">Developer & Multi-Sender Setup</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Capsule Mode Active
              </span>
            </div>
            <p className="text-xs text-indigo-200/80 mt-1 max-w-xl">
              Configure multiple authenticated Gmail/Google Workspace sender accounts in capsule mode. Switch between active senders with a single click.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddNew}
          className="flex items-center justify-center space-x-2 px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/30 transition transform hover:scale-[1.02] active:scale-[0.98] flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Sender Capsule</span>
        </button>
      </div>

      {/* Toast Feedback Alert */}
      {feedbackToast && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between animate-fadeIn ${
            feedbackToast.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400"
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedbackToast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            )}
            <span>{feedbackToast.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackToast(null)}
            className="text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* SENDER CAPSULES BAR / SECTION */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>Configured Sender Profiles ({senders.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any capsule to activate it as the primary sender for campaigns & CRM emails
            </p>
          </div>

          <div className="text-xs text-slate-500 flex items-center space-x-2">
            <span>Primary Active:</span>
            <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900">
              {activeSender?.userEmail || "None"}
            </span>
          </div>
        </div>

        {/* Sender Capsules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {senders.map((sender) => {
            const isActive = sender.isDefault;
            const isEditingThis = editingId === sender.id;
            const isTestingThis = testingSenderId === sender.id;

            return (
              <div
                key={sender.id}
                onClick={() => handleActivate(sender)}
                className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                  isActive
                    ? "bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-500 shadow-md ring-2 ring-indigo-500/20"
                    : "bg-slate-50/60 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800 hover:border-indigo-400"
                } ${isEditingThis ? "ring-2 ring-purple-500" : ""}`}
              >
                <div>
                  {/* Top Capsule Header */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                        {sender.senderName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {sender.senderName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          {sender.userEmail}
                        </div>
                      </div>
                    </div>

                    {/* Active Pill */}
                    {isActive ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>ACTIVE</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400 group-hover:text-indigo-500 transition-colors">
                        Click to Activate
                      </span>
                    )}
                  </div>

                  {/* Host and Security Info */}
                  <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <span className="font-mono truncate">{sender.host}:{sender.port}</span>
                    <span>•</span>
                    <span>{sender.secure ? "SSL" : "TLS"}</span>
                    {sender.lastVerifiedAt && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400">Verified</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Capsule Action Buttons */}
                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={(e) => handleTestSpecificSender(sender, e)}
                    disabled={isTestingThis}
                    className="inline-flex items-center space-x-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 py-1 px-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                    title="Test SMTP connection for this capsule"
                  >
                    {isTestingThis ? (
                      <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                    ) : (
                      <Zap className="w-3 h-3 text-amber-500" />
                    )}
                    <span>Test</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(sender);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                      title="Edit credentials in form"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {senders.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleDelete(sender, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                        title="Delete sender capsule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add New Sender Capsule Card */}
          <div
            onClick={handleAddNew}
            className="p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/30 dark:bg-slate-950/20 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-2 min-h-[140px]"
          >
            <div className="p-2.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">
                Add Another Sender Capsule
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Configure additional Gmail or Workspace account
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GOOGLE GEMINI AI CONFIGURATION */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 text-white shadow-md flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>Google Gemini AI Engine</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                  Powers AI HTML Templates
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Save your Gemini API key from <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">.env</code> to generate beautiful, responsive HTML email templates automatically from any context or prompt.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            {geminiKey ? (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>API Key Configured</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>API Key Missing</span>
              </span>
            )}
          </div>
        </div>

        {/* Gemini Test Feedback Banner */}
        {geminiTestResult.status === "success" && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between animate-fadeIn">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div>
                <span className="font-bold text-sm block">Gemini API Key Verified & Working!</span>
                <span>{geminiTestResult.message}</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
              {geminiTestResult.model || "gemini-flash-latest"}
            </span>
          </div>
        )}

        {geminiTestResult.status === "error" && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center space-x-3 animate-fadeIn">
            <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <div>
              <span className="font-bold text-sm block">Gemini Key Verification Failed</span>
              <span>{geminiTestResult.message}</span>
            </div>
          </div>
        )}

        {/* Gemini API Key Form & Actions */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                <span>Google Gemini API Key</span>
              </label>

              {envGeminiInfo?.hasEnvKey && (
                <button
                  type="button"
                  onClick={handleLoadFromEnv}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline flex items-center space-x-1"
                  title="Load key from project .env file"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Load from .env file ({envGeminiInfo.maskedKey})</span>
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type={showGeminiKey ? "text" : "password"}
                value={geminiKey}
                onChange={(e) => {
                  setGeminiKey(e.target.value);
                  setGeminiTestResult({ status: "idle", message: "" });
                }}
                placeholder="AIzaSy... or AQ.Ab8... (paste or load your Google Gemini API key)"
                className="w-full pl-3.5 pr-20 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey(!showGeminiKey)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                title={showGeminiKey ? "Hide key" : "Show key"}
              >
                {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Key is stored locally in your browser and synced securely to Firestore for all team workspace sessions.
            </p>
          </div>

          {/* Model info strip and Action buttons */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500">
              <span className="font-medium text-[11px]">Supported Models:</span>
              <span className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                gemini-flash-latest
              </span>
              <span className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                gemini-3.6-flash
              </span>
              <span className="text-[10px] text-slate-400">(with auto failover)</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleTestGemini}
                disabled={isTestingGemini || !geminiKey.trim()}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isTestingGemini ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
                )}
                <span>Test Live Key</span>
              </button>

              <button
                type="button"
                onClick={handleSaveGemini}
                disabled={!geminiKey.trim()}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Gemini Key</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CONNECTION TEST STATUS ALERT */}
      {testResult.status === "success" && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <div>
              <span className="font-bold text-sm block">SMTP Authentication Successful!</span>
              <span>{testResult.message}</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
            Live Verified
          </span>
        </div>
      )}

      {testResult.status === "error" && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center space-x-3 animate-fadeIn">
          <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <div>
            <span className="font-bold text-sm block">Connection Test Failed</span>
            <span>{testResult.message}</span>
          </div>
        </div>
      )}

      {/* CREDENTIALS FORM & GUIDE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings Form */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <form onSubmit={handleSave} className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                  <KeyRound className="w-4 h-4 text-indigo-500" />
                  <span>Google Apps Password Credentials</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your Gmail / Google Workspace account details below.
                </p>
              </div>

              {editingId ? (
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                    Editing Capsule
                  </span>
                  <button
                    type="button"
                    onClick={handleAddNew}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                  New Capsule
                </span>
              )}
            </div>

            {/* User Email ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                User Email ID (Sender Email) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={formData.userEmail}
                  onChange={(e) => handleInputChange("userEmail", e.target.value)}
                  placeholder="e.g. ruby.dayal@xmonks.com or user@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Google App Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Google Apps Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.appPassword}
                  onChange={(e) => handleInputChange("appPassword", e.target.value)}
                  placeholder="16-character Google App Password (e.g. ombg ustr bodg bxnp)"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Use an App Password generated from your Google Account security page (not your regular Gmail password).
              </p>
            </div>

            {/* Sender Name Display */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Sender Name Display
              </label>
              <input
                type="text"
                value={formData.senderName}
                onChange={(e) => handleInputChange("senderName", e.target.value)}
                placeholder="e.g. Ruby - xMonks or xMonks B2B Sales"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* SMTP Server Configurations */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center space-x-2 mb-3">
                <Server className="w-4 h-4 text-purple-500" />
                <span>SMTP Server Configurations</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={formData.host}
                    onChange={(e) => handleInputChange("host", e.target.value)}
                    placeholder="smtp.gmail.com"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    SMTP Port
                  </label>
                  <select
                    value={formData.port}
                    onChange={(e) => {
                      const p = Number(e.target.value);
                      handleInputChange("port", p);
                      handleInputChange("secure", p === 465);
                    }}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value={465}>465 (SSL / Secure)</option>
                    <option value={587}>587 (TLS / STARTTLS)</option>
                    <option value={25}>25 (Standard)</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="smtp-secure"
                    checked={formData.secure}
                    onChange={(e) => handleInputChange("secure", e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="smtp-secure"
                    className="text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Use Secure TLS/SSL Encryption Connection
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="smtp-set-active"
                    checked={formData.setAsActive}
                    onChange={(e) => handleInputChange("setAsActive", e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="smtp-set-active"
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400"
                  >
                    Set as Primary Active Sender immediately upon save
                  </label>
                </div>
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleTestFormConnection}
                disabled={isTesting || !formData.userEmail || !formData.appPassword}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isTesting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>Test Live SMTP</span>
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{editingId ? "Update Capsule" : "Save Credentials"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Info & Google App Password Guide */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <HelpCircle className="w-4 h-4" />
              <span>How to Get Google App Password</span>
            </div>

            <ol className="text-xs text-slate-300 space-y-3 list-decimal list-inside leading-relaxed">
              <li>
                Go to your <strong className="text-white">Google Account Security</strong> settings page.
              </li>
              <li>
                Ensure <strong className="text-indigo-400">2-Step Verification</strong> is enabled for your account.
              </li>
              <li>
                Search for <strong className="text-white">&quot;App Passwords&quot;</strong> in the Google search bar.
              </li>
              <li>
                Create a new App Password (select App: <em>Mail</em>, Device: <em>Other / B2B CRM</em>).
              </li>
              <li>
                Copy the generated <strong className="text-emerald-400 font-mono">16-character code</strong> and paste it into the field on the left.
              </li>
            </ol>

            <div className="pt-2 border-t border-slate-800">
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-2 text-xs font-bold text-indigo-400 hover:text-indigo-300"
              >
                <span>Google App Passwords Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Active Sender Profile Card */}
          <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 dark:bg-slate-900 rounded-3xl p-5 border border-purple-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-purple-400 font-bold text-xs">
                <Sparkles className="w-4 h-4" />
                <span>Primary Outgoing Sender</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Ready to Send
              </span>
            </div>

            <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
              <p>
                <strong>Current Email:</strong>{" "}
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  {activeSender?.userEmail || "Not configured"}
                </span>
              </p>
              <p>
                <strong>Sender Name:</strong> {activeSender?.senderName || "xMonks B2B"}
              </p>
              <p>
                <strong>Server:</strong> {activeSender?.host}:{activeSender?.port} ({activeSender?.secure ? "SSL" : "TLS"})
              </p>
              <p className="text-[11px] text-slate-400 pt-1 border-t border-purple-500/10">
                Total Configured Capsules: <strong className="text-white">{senders.length}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
