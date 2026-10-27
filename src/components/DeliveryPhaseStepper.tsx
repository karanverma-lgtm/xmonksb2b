"use client";

import React from "react";
import { Check, Clock, CircleDot, PlayCircle, Calendar } from "lucide-react";
import { DeliveryMilestoneTranche } from "@/types/delivery";

interface DeliveryPhaseStepperProps {
  milestones: DeliveryMilestoneTranche[];
  activeMilestoneId?: string | null;
  onSelectMilestone?: (milestoneId: string) => void;
  onToggleMilestoneStatus?: (milestoneId: string) => void;
}

export const DeliveryPhaseStepper: React.FC<DeliveryPhaseStepperProps> = ({
  milestones,
  activeMilestoneId,
  onSelectMilestone,
  onToggleMilestoneStatus,
}) => {
  if (!milestones || milestones.length === 0) return null;

  return (
    <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <CircleDot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Delivery Phase Stepper & Runway
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">
          {milestones.filter((m) => m.milestoneStatus === "completed").length} of {milestones.length} Phases Completed
        </span>
      </div>

      <div className="relative">
        {/* Connecting Progress Line */}
        <div className="hidden sm:block absolute top-5 left-6 right-6 h-1 bg-slate-100 dark:bg-slate-800 z-0">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-indigo-600 transition-all duration-500"
            style={{
              width: `${
                milestones.length > 1
                  ? (milestones.filter((m) => m.milestoneStatus === "completed").length /
                      (milestones.length - 1)) *
                    100
                  : 100
              }%`,
            }}
          />
        </div>

        {/* Stepper Nodes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-flow-col lg:auto-cols-fr gap-3 sm:gap-2 relative z-10">
          {milestones.map((m, idx) => {
            const isCompleted = m.milestoneStatus === "completed";
            const isInProgress = m.milestoneStatus === "in_progress";
            const isSelected = activeMilestoneId === m.id;

            return (
              <div
                key={m.id}
                onClick={() => onSelectMilestone?.(m.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 group ${
                  isSelected
                    ? "bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-600 shadow-sm ring-2 ring-indigo-500/20"
                    : isCompleted
                    ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-300"
                    : isInProgress
                    ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 shadow-2xs hover:border-amber-400"
                    : "bg-slate-50/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                {/* Node Top Row */}
                <div className="flex items-center justify-between">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs transition shadow-2xs shrink-0 ${
                      isCompleted
                        ? "bg-emerald-600 text-white shadow-emerald-500/30"
                        : isInProgress
                        ? "bg-indigo-600 text-white shadow-indigo-500/30 animate-pulse"
                        : "bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>

                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      isCompleted
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : isInProgress
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {isCompleted ? "Delivered" : isInProgress ? "In Delivery" : "Pending"}
                  </span>
                </div>

                {/* Title & Details */}
                <div className="space-y-0.5 min-w-0">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition" title={m.milestoneTitle}>
                    {m.milestoneTitle}
                  </h4>
                  <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{m.targetDate || "No date set"}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{m.projectCompletionPercent}%</span>
                  </div>
                </div>

                {/* Quick Toggle Action on hover */}
                {onToggleMilestoneStatus && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMilestoneStatus(m.id);
                    }}
                    className={`text-[10px] font-bold py-1 px-2 rounded-lg text-center transition cursor-pointer ${
                      isCompleted
                        ? "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white/60 dark:bg-slate-800/60"
                        : "text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 hover:bg-emerald-200"
                    }`}
                  >
                    {isCompleted ? "Reopen Phase" : "✓ Mark Delivered"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
