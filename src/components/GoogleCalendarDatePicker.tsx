"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Clock,
  Sparkles,
} from "lucide-react";
import { getDateComponents, formatClosureMonth } from "@/lib/formatters";

interface GoogleCalendarDatePickerProps {
  value?: string; // "YYYY-MM-DD" or "YYYY-MM"
  onChange: (newValue: string) => void;
  label?: string;
  readOnly?: boolean;
  compact?: boolean;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export const GoogleCalendarDatePicker: React.FC<GoogleCalendarDatePickerProps> = ({
  value,
  onChange,
  label = "Target Closure Date",
  readOnly = false,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial selected date
  const parsed = getDateComponents(value);

  const initialYear = parsed.isValid ? parsed.year : new Date().getFullYear();
  const initialMonth = parsed.isValid ? parsed.monthNum - 1 : new Date().getMonth();

  const [viewYear, setViewYear] = useState<number>(initialYear);
  const [viewMonth, setViewMonth] = useState<number>(initialMonth);

  // Sync viewed year/month when value changes
  useEffect(() => {
    if (parsed.isValid) {
      setViewYear(parsed.year);
      setViewMonth(parsed.monthNum - 1);
    }
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Calendar Calculation Helpers
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 (Sun) - 6 (Sat)

  // Previous month trailing days
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const cleanY = viewYear > 2099 ? parseInt(String(viewYear).slice(0, 4), 10) : viewYear;
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    const formatted = `${cleanY}-${m}-${d}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleQuickToday = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    onChange(`${y}-${m}-${d}`);
    setViewYear(y);
    setViewMonth(now.getMonth());
    setIsOpen(false);
  };

  const handleQuickEndOfMonth = () => {
    const cleanY = viewYear > 2099 ? parseInt(String(viewYear).slice(0, 4), 10) : viewYear;
    const lastDay = new Date(cleanY, viewMonth + 1, 0).getDate();
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(lastDay).padStart(2, "0");
    onChange(`${cleanY}-${m}-${d}`);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setIsOpen(false);
  };

  const today = new Date();
  const isCurrentMonthViewed =
    today.getFullYear() === viewYear && today.getMonth() === viewMonth;
  const todayDate = today.getDate();

  const isDaySelected = (day: number) => {
    if (!parsed.isValid) return false;
    return (
      parsed.year === viewYear &&
      parsed.monthNum - 1 === viewMonth &&
      parsed.dayNum === day
    );
  };

  // Year options for fast jumping (-2 to +5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 8 }, (_, i) => currentYear - 1 + i);

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button: Google Calendar Style Widget */}
      {!readOnly ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full text-left transition-all group flex items-center p-2.5 rounded-xl border relative cursor-pointer ${
            isOpen
              ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50/50 dark:bg-blue-950/30"
              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-600 shadow-sm hover:shadow"
          }`}
        >
          {parsed.isValid ? (
            <div className="flex items-center space-x-3 w-full min-w-0">
              {/* Google Calendar Tear-off Icon Sheet */}
              <div className="flex-shrink-0 w-11 h-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col text-center">
                {/* Red Google Calendar Header Bar */}
                <div className="bg-[#EA4335] text-white text-[9px] font-black uppercase tracking-wider py-0.5 leading-tight">
                  {parsed.monthShort}
                </div>
                {/* Date Number */}
                <div className="flex-1 flex items-center justify-center font-black text-base text-slate-900 dark:text-white leading-none">
                  {parsed.dayNum}
                </div>
                {/* Small Year */}
                <div className="text-[8px] font-bold text-slate-400 dark:text-slate-500 pb-0.5 leading-none">
                  {parsed.year}
                </div>
              </div>

              {/* Date description text - No overlapping elements */}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-slate-900 dark:text-white truncate flex items-center space-x-1">
                  <span>{parsed.dayNum}</span>
                  <span>{parsed.monthShort}</span>
                  <span className="text-blue-600 dark:text-blue-400 font-black">{parsed.year}</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center space-x-1.5 mt-0.5 truncate">
                  <span>{parsed.weekdayLong}</span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="text-blue-600 dark:text-blue-400 group-hover:underline font-bold">Edit ▾</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3 w-full py-1">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-50 dark:bg-blue-950/60 rounded-lg border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <CalendarIcon className="w-5 h-5 text-[#EA4335]" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Set Closure Date
                </div>
                <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                  Date, Month & Year ▾
                </div>
              </div>
            </div>
          )}
        </button>
      ) : (
        /* Readonly Display */
        <div className="flex items-center space-x-2.5">
          {parsed.isValid ? (
            <div className="flex-shrink-0 w-9 h-10 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col text-center">
              <div className="bg-[#EA4335] text-white text-[8px] font-black uppercase py-0.5 leading-none">
                {parsed.monthShort}
              </div>
              <div className="flex-1 flex items-center justify-center font-black text-xs text-slate-900 dark:text-white">
                {parsed.dayNum}
              </div>
            </div>
          ) : (
            <CalendarIcon className="w-4 h-4 text-slate-400" />
          )}
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {parsed.isValid
              ? `${parsed.dayNum} ${parsed.monthShort} ${parsed.year}`
              : "Not Set"}
          </span>
        </div>
      )}

      {/* Google Calendar Interactive Popover */}
      {isOpen && (
        <div className="absolute z-50 left-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 animate-in fade-in zoom-in-95 duration-150">
          {/* Top Bar: Google Calendar Style Header */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-[#4285F4] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-900 dark:text-white">
                  Google Calendar Picker
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  Select Date, Month & Year
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Month & Year Navigation */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-1">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="text-xs font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="text-xs font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Row */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[11px] font-bold text-slate-400">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Previous month padding days */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => {
              const dayNum = prevMonthDays - firstDayOfWeek + idx + 1;
              return (
                <div
                  key={`prev-${idx}`}
                  className="py-1.5 text-xs text-slate-300 dark:text-slate-600 font-medium select-none"
                >
                  {dayNum}
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const selected = isDaySelected(day);
              const isToday = isCurrentMonthViewed && day === todayDate;

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`py-1.5 text-xs font-bold rounded-full transition-all flex items-center justify-center relative ${
                    selected
                      ? "bg-[#1a73e8] text-white shadow-md shadow-blue-500/30 scale-105"
                      : isToday
                      ? "border border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                      : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>{day}</span>
                  {isToday && !selected && (
                    <span className="w-1 h-1 rounded-full bg-blue-500 absolute bottom-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Preset Action Chips */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-1.5">
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handleQuickToday}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-slate-300 transition"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleQuickEndOfMonth}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-slate-300 transition"
              >
                End of Month
              </button>
            </div>

            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] font-bold text-rose-500 hover:text-rose-600 hover:underline px-2 py-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
