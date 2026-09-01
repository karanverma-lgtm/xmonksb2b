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
} from "lucide-react";
import {
  getStoredSMTPConfig,
  saveSMTPConfig,
  testSMTPConnection,
  SMTPConfig,
} from "@/lib/emailService";

export const DeveloperTab: React.FC = () => {
  const [config, setConfig] = useState<SMTPConfig>({
    userEmail: "",
    appPassword: "",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    senderName: "xMonks B2B Sales",
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    status: "idle" | "success" | "error";
    message: string;
  }>({ status: "idle", message: "" });
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    const stored = getStoredSMTPConfig();
    setConfig(stored);
  }, []);

  const handleInputChange = (field: keyof SMTPConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setTestResult({ status: "idle", message: "" });
    setIsSaved(false);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    saveSMTPConfig(config);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult({ status: "idle", message: "" });
    try {
      const res = await testSMTPConnection(config);
      if (res.success) {
        setTestResult({
          status: "success",
          message: res.message || "Connection established successfully! SMTP server verified.",
        });
        saveSMTPConfig(config); // Auto save working config
      } else {
        setTestResult({
          status: "error",
          message: res.error || "Failed to authenticate with SMTP server.",
        });
      }
    } catch (err: any) {
      setTestResult({
        status: "error",
        message: err?.message || "Network error testing SMTP connection.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white shadow-xl border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 bg-indigo-500/20 rounded-2xl border border-indigo-400/30 text-indigo-300">
            <Code2 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black tracking-tight">Developer & SMTP Email Setup</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Active Integration
              </span>
            </div>
            <p className="text-xs text-indigo-200/80 mt-1 max-w-xl">
              Configure your Google Apps password & SMTP gateway to enable direct email delivery, campaign dispatches, and automatic CRM notifications.
            </p>
          </div>
        </div>

        <button
          onClick={handleTestConnection}
          disabled={isTesting || !config.userEmail || !config.appPassword}
          className="flex items-center justify-center space-x-2 px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/30 transition transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {isTesting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Verifying Connection...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Test Connection</span>
            </>
          )}
        </button>
      </div>

      {/* Connection Test Status Alert */}
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

      {isSaved && (
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          <span>SMTP settings saved successfully!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings Form */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <form onSubmit={handleSave} className="space-y-5">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-indigo-500" />
                <span>Google Apps Password Credentials</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter your Gmail / Google Workspace account details below.
              </p>
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
                  value={config.userEmail}
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
                  value={config.appPassword}
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
                value={config.senderName}
                onChange={(e) => handleInputChange("senderName", e.target.value)}
                placeholder="e.g. xMonks B2B Sales"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

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
                    value={config.host}
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
                    value={config.port}
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

              <div className="mt-3 flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="smtp-secure"
                  checked={config.secure}
                  onChange={(e) => handleInputChange("secure", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="smtp-secure" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Use Secure TLS/SSL Encryption Connection
                </label>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition flex items-center space-x-1.5"
              >
                {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Test Live SMTP</span>
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Credentials</span>
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

          <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 dark:bg-slate-900 rounded-3xl p-5 border border-purple-500/20 space-y-3">
            <div className="flex items-center space-x-2 text-purple-400 font-bold text-xs">
              <Sparkles className="w-4 h-4" />
              <span>Active Sender Profile</span>
            </div>
            <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
              <p>
                <strong>Current Email:</strong>{" "}
                <span className="font-mono text-indigo-600 dark:text-indigo-400">
                  {config.userEmail || "Not configured"}
                </span>
              </p>
              <p>
                <strong>Sender Name:</strong> {config.senderName}
              </p>
              <p>
                <strong>Server:</strong> {config.host}:{config.port} ({config.secure ? "SSL" : "TLS"})
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
