"use client";

import React, { useMemo } from "react";
import { Lead } from "@/types/lead";
import { STAGES } from "@/constants/stages";
import { VALID_USERS } from "@/constants/users";
import { formatINR } from "@/lib/formatters";
import { Trophy, Award, Medal, User, ArrowUpRight } from "lucide-react";

interface SalesLeaderboardProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

export const SalesLeaderboard: React.FC<SalesLeaderboardProps> = ({
  leads,
  onSelectLead,
}) => {
  const leaderboard = useMemo(() => {
    const map = new Map<
      string,
      {
        ownerName: string;
        totalValue: number;
        weightedValue: number;
        leads: Lead[];
        count: number;
        wonCount: number;
        wonValue: number;
        avatarColor: string;
      }
    >();

    // Seed from VALID_USERS
    VALID_USERS.forEach((u) => {
      map.set(u.name.toLowerCase(), {
        ownerName: u.name,
        totalValue: 0,
        weightedValue: 0,
        leads: [],
        count: 0,
        wonCount: 0,
        wonValue: 0,
        avatarColor: u.avatarColor || "from-indigo-600 to-purple-600",
      });
    });

    leads.forEach((l) => {
      const rawOwner = l.owner?.trim() || "Unassigned";
      const key = rawOwner.toLowerCase();

      // Find matching user or create entry
      let entry = map.get(key);
      if (!entry) {
        // Check partial match
        for (const [k, val] of map.entries()) {
          if (k.includes(key) || key.includes(k)) {
            entry = val;
            break;
          }
        }
      }

      if (!entry) {
        entry = {
          ownerName: rawOwner,
          totalValue: 0,
          weightedValue: 0,
          leads: [],
          count: 0,
          wonCount: 0,
          wonValue: 0,
          avatarColor: "from-slate-600 to-indigo-600",
        };
        map.set(key, entry);
      }

      const val = l.dealValue || 0;
      const weight = STAGES[l.stage]?.weightage ?? l.weightage ?? 0;
      const wVal = Math.round(val * (weight / 100));

      entry.totalValue += val;
      entry.weightedValue += wVal;
      entry.count += 1;
      entry.leads.push(l);

      if (l.stage === "closure") {
        entry.wonCount += 1;
        entry.wonValue += val;
      }
    });

    const list = Array.from(map.values()).filter((item) => item.count > 0);

    // Sort by total pipeline value descending (or wonValue if equal)
    list.sort((a, b) => b.totalValue - a.totalValue || b.wonValue - a.wonValue);

    return list;
  }, [leads]);

  const getRankBadge = (rank: number) => {
    if (rank === 0) {
      return (
        <span className="w-5 h-5 rounded-full bg-amber-400 text-amber-950 font-black text-[10px] flex items-center justify-center shadow-xs">
          1
        </span>
      );
    }
    if (rank === 1) {
      return (
        <span className="w-5 h-5 rounded-full bg-slate-300 text-slate-900 font-black text-[10px] flex items-center justify-center shadow-xs">
          2
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-black text-[10px] flex items-center justify-center shadow-xs">
          3
        </span>
      );
    }
    return (
      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-[10px] flex items-center justify-center">
        {rank + 1}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span>Sales Team & Deal Owner Leaderboard</span>
            </h3>
            <p className="text-xs text-slate-500">
              Pipeline volume, active account quota, and probability-weighted realization
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {leaderboard.length} Active Reps
          </span>
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 italic">
            No active deal ownership data found
          </div>
        ) : (
          <div className="space-y-2.5">
            {leaderboard.map((item, idx) => (
              <div
                key={item.ownerName}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-3 hover:border-indigo-500/40 transition-colors"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {getRankBadge(idx)}
                  <div
                    className={`w-8 h-8 rounded-full bg-gradient-to-tr ${item.avatarColor} text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0`}
                  >
                    {item.ownerName.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {item.ownerName}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center space-x-2 mt-0.5">
                      <span>{item.count} Active Deals</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {item.wonCount} Won ({formatINR(item.wonValue)})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                    {formatINR(item.totalValue)}
                  </div>
                  <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                    {formatINR(item.weightedValue)} wtd
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
