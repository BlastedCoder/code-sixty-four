// components/ResultsPanel.tsx
'use client';

import React from 'react';
import { Trophy, Users, Star } from 'lucide-react';

export default function ResultsPanel({ members }: { members: any[] }) {
  if (!members || members.length === 0) return null;

  // 1. Points Leaders
  const maxPoints = Math.max(...members.map(m => m.totalPoints || 0));
  const pointLeaders = members.filter(m => m.totalPoints === maxPoints && maxPoints > 0);

  // 2. Champion Selectors (Team with 6 wins)
  const champWinners = members.filter(m => m.hasChampion);

  // 3. Elite Eight Gurus (Most teams with wins >= 3)
  const usersWithE8Count = members.map(m => ({
    name: m.displayName,
    count: m.teams?.filter((t: any) => t.wins >= 3).length || 0
  }));
  const maxE8 = Math.max(...usersWithE8Count.map(u => u.count));
  const e8Leaders = usersWithE8Count.filter(u => u.count === maxE8 && maxE8 > 0);

  const formatName = (name: string) => name.split(' ')[0];

  return (
    <div className="space-y-4">
      {/* Live Sync Status Indicator */}
      <div className="flex items-center space-x-2 px-1">
        <div className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          Live Tournament Feed
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Points Leader Card */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl shadow-sm flex items-start space-x-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-400">
            <Trophy size={20} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Points Leader</h3>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
              {pointLeaders.length > 0 ? pointLeaders.map(l => l.displayName.split(' ')[0]).join(', ') : '---'}
            </p>
            {maxPoints > 0 && <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{maxPoints} Wins Total</span>}
          </div>
        </div>

        {/* Champion Picker Card */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl shadow-sm flex items-start space-x-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-amber-600 dark:text-amber-400">
            <Star size={20} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Champion Pick</h3>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
              {champWinners.length > 0 ? champWinners.map(l => l.displayName.split(' ')[0]).join(', ') : '---'}
            </p>
            {/* Tag only appears when a champion is crowned */}
            {champWinners.length > 0 && (
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Finalist Tracked</span>
            )}
          </div>
        </div>

        {/* Elite 8 Master Card */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl shadow-sm flex items-start space-x-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400">
            <Users size={20} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Elite 8 Guru</h3>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
              {e8Leaders.length > 0 ? e8Leaders.map(l => l.name.split(' ')[0]).join(', ') : '---'}
            </p>
            {maxE8 > 0 && <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{maxE8} Teams Qualified</span>}
          </div>
        </div>
      </div>
    </div>
  );
}