"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  Calendar,
  User,
  Clock,
  ArrowRight,
  Award,
  AlertTriangle,
  RotateCcw,
  Users,
  ChevronRight,
} from "lucide-react";
import { DeliveryRecord, DeliveryMilestoneTranche } from "@/types/delivery";
import { formatINR } from "@/lib/formatters";

interface DeliveryNextActionCardProps {
  record: DeliveryRecord;
  onMarkMilestoneCompleted: (milestoneId: string) => void;
  onRescheduleMilestone: (milestoneId: string, newDate: string) => void;
  onOpenCoachDrawer: () => void;
  onOpenSignoffModal: () => void;
}

export const DeliveryNextActionCard: React.FC<DeliveryNextActionCardProps> = ({
  record,
  onMarkMilestoneCompleted,
  onRescheduleMilestone,
  onOpenCoachDrawer,
  onOpenSignoffModal,
}) => {
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [customDate, setCustomDate] = useState("");

  const milestones = record.deliveryMilestones || [];

  // Find the next incomplete milestone
  const nextMilestone =
    milestones.find((m) => m.milestoneStatus === "in_progress") ||
    milestones.find((m) => m.milestoneStatus === "pending");

  // Check if all milestones are completed
  const allMilestonesCompleted =
    milestones.length > 0 &&
    milestones.every((m) => m.milestoneStatus === "completed");

  // Calculate relative due time
  const getDueInfo = (targetDateStr?: string) => {
    if (!targetDateStr) return { text: "No Target Date Set", urgency: "normal", days: 0 };
    const target = new Date(targetDateStr).getTime();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`,
        urgency: "overdue",
        days: diffDays,
      };
    }
    if (diffDays === 0) {
      return { text: "Due Today", urgency: "urgent", days: 0 };
    }
    if (diffDays <= 7) {
      return {
        text: `Due in ${diffDays} day${diffDays === 1 ? "" : "s"} (${targetDateStr})`,
        urgency: "urgent",
        days: diffDays,
      };
    }
    return {
      text: `Target: ${targetDateStr} (in ${diffDays} days)`,
      urgency: "normal",
      days: diffDays,
    };
  };

  const dueInfo = nextMilestone ? getDueInfo(nextMilestone.targetDate) : null;
  const assignedCoaches = record.coaches || [];

  if (allMilestonesCompleted) {
    return (
      <div className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-indigo-50/30 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-indigo-950/20 rounded-2xl border-2 border-emerald-300 dark:border-emerald-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-500/20 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  All Milestones Completed
                </span>
                <span className="text-xs text-slate-500">
                  100% Program Execution
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white mt-1">
                Ready for Client Sign-off & CSAT Pulse
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                All coaching phases have been delivered. Record formal client acceptance, CSAT score, and generate the completion certificate.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenSignoffModal}
            className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/20 transition cursor-pointer shrink-0"
          >
            <Award className="w-4 h-4 text-amber-300" />
            <span>Record Client Sign-off & CSAT</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>
      </div>
    );
  }

  if (!nextMilestone) {
    return null;
  }

  return (
    <div className="p-5 bg-gradient-to-r from-indigo-50/80 via-blue-50/40 to-slate-50 dark:from-indigo-950/40 dark:via-blue-950/20 dark:to-slate-900 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800/80 shadow-sm space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
          </span>
          <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            Next Required Delivery Action
          </span>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
            {nextMilestone.projectCompletionPercent}% Progress Milestone
          </span>
        </div>

        {/* Due Countdown Badge */}
        {dueInfo && (
          <div
            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
              dueInfo.urgency === "overdue"
                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                : dueInfo.urgency === "urgent"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse"
                : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
            }`}
          >
            {dueInfo.urgency === "overdue" ? (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            )}
            <span>{dueInfo.text}</span>
          </div>
        )}
      </div>

      {/* Main Content Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div className="space-y-1.5 flex-1 min-w-0">
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <span>{nextMilestone.milestoneTitle}</span>
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
            {nextMilestone.notes ||
              "Primary deliverable execution, cohort sessions, and leadership coaching cadence."}
          </p>

          {/* Assigned Faculty Strip */}
          <div className="flex items-center space-x-2 pt-1 text-xs">
            <span className="text-slate-400 font-medium">Assigned Faculty:</span>
            {nextMilestone.assignedCoach ? (
              <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs shadow-2xs">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{nextMilestone.assignedCoach}</span>
                </span>
                <button
                  type="button"
                  onClick={onOpenCoachDrawer}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold ml-1 cursor-pointer"
                >
                  Edit Faculty
                </button>
              </div>
            ) : assignedCoaches.length > 0 ? (
              <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                {assignedCoaches.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[11px]"
                  >
                    <User className="w-3 h-3 text-indigo-500" />
                    <span>{c.name}</span>
                    <span className="text-[10px] text-slate-400">({c.role.replace("_", " ")})</span>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={onOpenCoachDrawer}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold ml-1 cursor-pointer"
                >
                  Edit Faculty
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenCoachDrawer}
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-[11px] hover:bg-amber-100 transition cursor-pointer"
              >
                <Users className="w-3 h-3 text-amber-500" />
                <span>+ Assign Coach / Faculty</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Quick Reschedule Input / Toggle */}
          {isRescheduling ? (
            <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-indigo-300 dark:border-indigo-700 shadow-sm">
              <input
                type="date"
                defaultValue={nextMilestone.targetDate || ""}
                onChange={(e) => setCustomDate(e.target.value)}
                className="text-xs px-2 py-1 bg-transparent text-slate-900 dark:text-white font-bold outline-none cursor-pointer"
              />
              <button
                type="button"
                onClick={() => {
                  if (customDate) {
                    onRescheduleMilestone(nextMilestone.id, customDate);
                  }
                  setIsRescheduling(false);
                }}
                className="px-2.5 py-1 bg-indigo-600 text-white text-[11px] font-bold rounded-lg hover:bg-indigo-500 transition cursor-pointer"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsRescheduling(false)}
                className="px-1.5 py-1 text-slate-400 hover:text-slate-600 text-[11px] cursor-pointer"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsRescheduling(true)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Reschedule</span>
            </button>
          )}

          {/* Primary 1-Click Action: Mark Delivered */}
          <button
            type="button"
            onClick={() => onMarkMilestoneCompleted(nextMilestone.id)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/20 transition cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Mark Phase Delivered</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
