"use client";

import React, { useState } from "react";
import {
  KeyRound,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { UserAccount } from "@/constants/users";
import { changeUserPassword } from "@/lib/userService";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onPasswordChanged?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onPasswordChanged,
}) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  if (!isOpen || !currentUser) return null;

  const handleResetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleClose = () => {
    handleResetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    // Client-side validations
    if (!currentPassword) {
      setErrorMessage("Please enter your current password.");
      return;
    }
    if (!newPassword) {
      setErrorMessage("Please enter a new password.");
      return;
    }
    if (newPassword.length < 3) {
      setErrorMessage("New password must be at least 3 characters long.");
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMessage("New password cannot be the same as your current password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("New password and confirm new password do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await changeUserPassword(
        currentUser.username,
        currentPassword,
        newPassword
      );

      if (res.success) {
        setSuccessMessage(res.message || "Password changed successfully!");
        if (onPasswordChanged) onPasswordChanged();
        setTimeout(() => {
          handleClose();
        }, 1800);
      } else {
        setErrorMessage(res.error || "Failed to update password. Please check your current password.");
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-scaleUp">
        {/* Header Banner */}
        <div className="p-5 bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white flex items-center justify-between border-b border-indigo-500/20">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Change Password</h2>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="text-xs text-indigo-200/80">{currentUser.name}</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full font-mono bg-indigo-500/30 text-indigo-200">
                  @{currentUser.username}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center space-x-2 animate-shake">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center space-x-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Field 1: Current Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Current Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type={showCurrent ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (errorMessage) setErrorMessage("");
                }}
                placeholder="Enter your current password"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                title={showCurrent ? "Hide password" : "Show password"}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Field 2: New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type={showNew ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errorMessage) setErrorMessage("");
                }}
                placeholder="Enter new password (min. 3 characters)"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                title={showNew ? "Hide password" : "Show password"}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Field 3: Confirm New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Confirm New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <ShieldCheck className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type={showConfirm ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errorMessage) setErrorMessage("");
                }}
                placeholder="Re-type your new password"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                title={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end space-x-2.5 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-500/25 transition transform hover:scale-[1.01] active:scale-[0.99] flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
