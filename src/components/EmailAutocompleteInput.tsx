"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { User, Check, Sparkles } from "lucide-react";
import {
  ContactSuggestion,
  getStoredContactSuggestions,
  subscribeToContactSuggestions,
} from "@/lib/contactSuggestionService";

interface EmailAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const EmailAutocompleteInput: React.FC<EmailAutocompleteInputProps> = ({
  value,
  onChange,
  placeholder = "Add email addresses (comma-separated)...",
  className = "",
  disabled = false,
  autoFocus = false,
}) => {
  const [contacts, setContacts] = useState<ContactSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Subscribe to real-time contacts
  useEffect(() => {
    setContacts(getStoredContactSuggestions());
    const unsub = subscribeToContactSuggestions((updated) => {
      setContacts(updated);
    });
    return () => unsub();
  }, []);

  // Determine the active search query from the text after the last comma
  const { currentQuery, prefix } = useMemo(() => {
    const lastCommaIndex = value.lastIndexOf(",");
    if (lastCommaIndex === -1) {
      return {
        prefix: "",
        currentQuery: value.trim(),
      };
    }
    return {
      prefix: value.slice(0, lastCommaIndex + 1).trim() + " ",
      currentQuery: value.slice(lastCommaIndex + 1).trim(),
    };
  }, [value]);

  // Filter suggestions matching currentQuery
  const filteredSuggestions = useMemo(() => {
    if (!currentQuery) {
      // If query is empty but user focused, show top 5 frequent contacts not already added
      return contacts
        .filter((c) => !value.toLowerCase().includes(c.email.toLowerCase()))
        .slice(0, 5);
    }

    const q = currentQuery.toLowerCase();
    return contacts
      .filter((c) => {
        const matches =
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q);
        const alreadyInValue = value
          .toLowerCase()
          .includes(c.email.toLowerCase());
        return matches && !alreadyInValue;
      })
      .slice(0, 7);
  }, [contacts, currentQuery, value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = (suggestion: ContactSuggestion) => {
    const newEmail = suggestion.email;
    const nextVal = `${prefix}${newEmail}, `;
    onChange(nextVal);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredSuggestions.length === 0) {
      if (e.key === "ArrowDown" && filteredSuggestions.length > 0) {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredSuggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev === 0 ? filteredSuggestions.length - 1 : prev - 1
      );
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (filteredSuggestions[selectedIndex]) {
        e.preventDefault();
        handleSelectSuggestion(filteredSuggestions[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Helper for avatar colors
  const getAvatarGradient = (name: string) => {
    const gradients = [
      "from-purple-500 to-indigo-600",
      "from-blue-500 to-cyan-600",
      "from-emerald-500 to-teal-600",
      "from-amber-500 to-orange-600",
      "from-rose-500 to-pink-600",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return gradients[Math.abs(hash) % gradients.length];
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setSelectedIndex(0);
        }}
        onFocus={() => {
          if (filteredSuggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={className}
      />

      {/* Floating Autocomplete Dropdown */}
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-64 overflow-y-auto">
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span className="flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-purple-500" />
              <span>Suggested Contacts</span>
            </span>
            <span>Press Tab/Enter to add</span>
          </div>

          <div className="p-1 space-y-0.5">
            {filteredSuggestions.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const initials = item.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={item.id || item.email}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectSuggestion(item);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-2.5 py-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                    isSelected
                      ? "bg-purple-50 dark:bg-purple-950/60 text-purple-950 dark:text-purple-100"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarGradient(
                        item.name
                      )} text-white flex items-center justify-center text-[10px] font-extrabold shadow-xs shrink-0`}
                    >
                      {initials || <User className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold truncate">
                          {item.name}
                        </span>
                        {item.tag && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                            {item.tag}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                        {item.email}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 shrink-0 ml-2">
                      ↵ Select
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
