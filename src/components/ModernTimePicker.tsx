"use client";

import React, { useState, useRef, useEffect } from "react";
import { Clock, ChevronUp, ChevronDown, Check, RotateCcw } from "lucide-react";

interface ModernTimePickerProps {
  value: string; // HH:mm format (24-hour, e.g. "15:30")
  onChange: (time24: string) => void;
  label?: string;
  onResetNow?: () => void;
  className?: string;
}

export const ModernTimePicker: React.FC<ModernTimePickerProps> = ({
  value,
  onChange,
  label = "Activity Time",
  onResetNow,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse value (HH:mm) into 12-hour components
  const parseTime = (timeStr: string) => {
    let hours24 = 12;
    let minutes = 0;
    if (timeStr && timeStr.includes(":")) {
      const parts = timeStr.split(":");
      hours24 = parseInt(parts[0], 10) || 0;
      minutes = parseInt(parts[1], 10) || 0;
    }
    const period: "AM" | "PM" = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    return { hours24, hours12, minutes, period };
  };

  const { hours24, hours12, minutes, period } = parseTime(value);

  // Helper to construct 24h string and emit
  const emitChange = (h12: number, mins: number, prd: "AM" | "PM") => {
    let h24 = h12;
    if (prd === "PM") {
      h24 = h12 === 12 ? 12 : h12 + 12;
    } else {
      h24 = h12 === 12 ? 0 : h12;
    }
    const safeH = String(h24).padStart(2, "0");
    const safeM = String(mins).padStart(2, "0");
    onChange(`${safeH}:${safeM}`);
  };

  // Up/Down navigation for Hour
  const stepHour = (delta: number) => {
    let nextH = hours12 + delta;
    if (nextH > 12) nextH = 1;
    if (nextH < 1) nextH = 12;
    emitChange(nextH, minutes, period);
  };

  // Up/Down navigation for Minute (steps by 1, holding or clicking)
  const stepMinute = (delta: number) => {
    let nextM = minutes + delta;
    if (nextM > 59) nextM = 0;
    if (nextM < 0) nextM = 59;
    emitChange(hours12, nextM, period);
  };

  // Offset by arbitrary minutes (e.g. +/-15 min, +/-60 min)
  const offsetMinutes = (deltaM: number) => {
    const d = new Date();
    d.setHours(hours24, minutes + deltaM, 0, 0);
    const newH24 = d.getHours();
    const newM = d.getMinutes();
    onChange(`${String(newH24).padStart(2, "0")}:${String(newM).padStart(2, "0")}`);
  };

  // Switch AM / PM
  const togglePeriod = (newPeriod: "AM" | "PM") => {
    if (newPeriod === period) return;
    emitChange(hours12, minutes, newPeriod);
  };

  // Snap to current IST time
  const handleNowClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const d = new Date();
    const h24 = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    onChange(`${h24}:${m}`);
    if (onResetNow) onResetNow();
  };

  // Close popup on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const formattedDisplay = `${String(hours12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Label & Quick Now Link */}
      <div className="flex items-center justify-between mb-0.5">
        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <span>{label}</span>
          <span className="px-1 py-0.2 rounded text-[9px] font-extrabold bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
            IST
          </span>
        </label>
        <button
          type="button"
          onClick={handleNowClick}
          className="text-[9px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
          title="Reset to current time in IST"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          <span>Now</span>
        </button>
      </div>

      {/* Modern Trigger Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full mt-0.5 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-between shadow-2xs hover:border-blue-400 dark:hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-1.5 truncate">
          <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0 group-hover:scale-110 transition-transform" />
          <span className="font-semibold tracking-wide font-mono text-[11px] sm:text-xs">
            {formattedDisplay}
          </span>
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">
            IST
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-blue-500" : ""
          }`}
        />
      </button>

      {/* Floating Modern Picker Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 sm:right-auto sm:w-80 mt-1.5 p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-50 animate-in fade-in zoom-in-95 backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Select Activity Time
              </span>
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                IST (UTC+5:30)
              </span>
            </div>
            <button
              type="button"
              onClick={handleNowClick}
              className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Current</span>
            </button>
          </div>

          {/* Stepper Controls (Up / Down Navigation Buttons) */}
          <div className="flex items-center justify-center gap-2 py-1.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800/80 mb-3">
            {/* Hour Stepper */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => stepHour(1)}
                className="w-10 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Increment Hour (Up)"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <div className="my-1.5 w-12 py-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-center font-mono font-bold text-base text-slate-900 dark:text-white shadow-2xs select-none">
                {String(hours12).padStart(2, "0")}
              </div>
              <button
                type="button"
                onClick={() => stepHour(-1)}
                className="w-10 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Decrement Hour (Down)"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <span className="text-[9px] font-bold text-slate-400 mt-1">HR</span>
            </div>

            {/* Colon Divider */}
            <div className="text-xl font-bold font-mono text-slate-400 dark:text-slate-500 pb-4 select-none">
              :
            </div>

            {/* Minute Stepper */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => stepMinute(1)}
                className="w-10 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Increment Minute (Up)"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <div className="my-1.5 w-12 py-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-center font-mono font-bold text-base text-slate-900 dark:text-white shadow-2xs select-none">
                {String(minutes).padStart(2, "0")}
              </div>
              <button
                type="button"
                onClick={() => stepMinute(-1)}
                className="w-10 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Decrement Minute (Down)"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <span className="text-[9px] font-bold text-slate-400 mt-1">MIN</span>
            </div>

            {/* AM / PM Segmented Toggle */}
            <div className="flex flex-col gap-1.5 ml-1 pb-4">
              <button
                type="button"
                onClick={() => togglePeriod("AM")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  period === "AM"
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => togglePeriod("PM")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  period === "PM"
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                PM
              </button>
            </div>
          </div>

          {/* Quick Adjustment Navigation Bar */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold px-0.5">
              <span>Quick Steppers:</span>
              <span className="text-[9px] text-slate-400">Jump in intervals</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => offsetMinutes(-15)}
                className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors text-center cursor-pointer"
                title="Subtract 15 minutes"
              >
                -15m
              </button>
              <button
                type="button"
                onClick={() => offsetMinutes(15)}
                className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors text-center cursor-pointer"
                title="Add 15 minutes"
              >
                +15m
              </button>
              <button
                type="button"
                onClick={() => offsetMinutes(-60)}
                className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors text-center cursor-pointer"
                title="Subtract 1 hour"
              >
                -1h
              </button>
              <button
                type="button"
                onClick={() => offsetMinutes(60)}
                className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors text-center cursor-pointer"
                title="Add 1 hour"
              >
                +1h
              </button>
            </div>
          </div>

          {/* Common Touchpoint Preset Times */}
          <div className="space-y-1.5 mb-3">
            <span className="text-[10px] font-semibold text-slate-400 px-0.5">
              Preset Slots (IST):
            </span>
            <div className="grid grid-cols-3 gap-1">
              {[
                { label: "10:00 AM", val: "10:00" },
                { label: "11:30 AM", val: "11:30" },
                { label: "02:30 PM", val: "14:30" },
                { label: "04:00 PM", val: "16:00" },
                { label: "05:30 PM", val: "17:30" },
                { label: "07:00 PM", val: "19:00" },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => onChange(preset.val)}
                  className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                    value === preset.val
                      ? "bg-blue-50 dark:bg-blue-950/80 border-blue-400 text-blue-600 dark:text-blue-300 font-extrabold"
                      : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Done Button */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Set Time ({formattedDisplay} IST)</span>
          </button>
        </div>
      )}
    </div>
  );
};
