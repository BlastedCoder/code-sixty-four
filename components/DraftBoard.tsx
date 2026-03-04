// components/DraftBoard.tsx
'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import DraftTimer from './DraftTimer';

export default function DraftBoard({
  league,
  teams = [],
  members = [],
  draftPicks = [],
  onDraftTeam,
  onUndoPick,
  onTogglePause,
  onFinalizeDraft,
  currentUser,
  timerSeconds = 0,
  pickStartedAt = null
}: any) {

  const currentPick = (league?.current_pick && league?.current_pick > 0) ? league.current_pick : 1;
  const isDraftComplete = currentPick > 64;
  const isCommissioner = league?.created_by === currentUser?.id;
  const isPaused = league?.status === 'paused';

  // State for the inline confirmation step
  const [confirmTeamId, setConfirmTeamId] = useState<number | null>(null);
  const activePickRef = useRef<HTMLDivElement>(null);
  const timerSecondsRef = useRef(0);

  // State for collapsible regions on mobile
  const [collapsedRegions, setCollapsedRegions] = useState<Set<string>>(new Set());

  const toggleRegion = (region: string) => {
    setCollapsedRegions(prev => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      return next;
    });
  };


  // 1. Pad Members (Ensure exactly 8 slots)
  const paddedMembers = useMemo(() => {
    const actualMembers = [...members].sort((a: any, b: any) => (a.draft_position || 0) - (b.draft_position || 0));
    return Array.from({ length: 8 }).map((_, index) => {
      if (actualMembers[index]) return { ...actualMembers[index], draft_position: actualMembers[index].draft_position || index + 1 };
      return { user_id: `empty-slot-${index + 1}`, draft_position: index + 1, profiles: { display_name: `Open Slot ${index + 1}` } };
    });
  }, [members]);

  // 2. Snake Draft Math
  const getPlayerForPick = useCallback((pick: number) => {
    const round = Math.ceil(pick / 8);
    const pickInRound = pick % 8 === 0 ? 8 : pick % 8;
    const targetPosition = round % 2 !== 0 ? pickInRound : 9 - pickInRound;
    return paddedMembers.find((m: any) => m.draft_position === targetPosition);
  }, [paddedMembers]);

  const userOnTheClock = getPlayerForPick(currentPick);
  const isMyTurn = userOnTheClock?.user_id === currentUser?.id;
  const canDraft = (isMyTurn || isCommissioner) && !isPaused && !isDraftComplete;

  // 3. Generate all 64 picks for the Horizontal Ticker
  const all64Picks = useMemo(() => {
    return Array.from({ length: 64 }).map((_, i) => {
      const pickNum = i + 1;
      const player = getPlayerForPick(pickNum);
      const pickData = draftPicks.find((dp: any) => dp.pick_number === pickNum);
      const team = pickData ? teams?.find((t: any) => t.id === pickData.team_id) : null;
      return { pickNum, player, team };
    });
  }, [getPlayerForPick, draftPicks, teams]);

  // 4. Auto-Scroll Ticker to Current Pick
  useEffect(() => {
    if (activePickRef.current) {
      activePickRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentPick]);

  // 5. Group Teams by Region for the Grid
  const { regions, teamsByRegion } = useMemo(() => {
    const safeTeams: any[] = teams || [];
    const uniqueRegions = Array.from(new Set(safeTeams.map((t: any) => t.region))).filter(Boolean) as string[];

    const byRegion: Record<string, any[]> = {};
    uniqueRegions.forEach(region => {
      byRegion[region] = safeTeams
        .filter((t: any) => t.region === region)
        .sort((a: any, b: any) => a.seed - b.seed);
    });

    return { regions: uniqueRegions, teamsByRegion: byRegion };
  }, [teams]);

  // Action Handlers
  const handleCellClick = (teamId: number) => {
    if (!canDraft) return;
    setConfirmTeamId(teamId === confirmTeamId ? null : teamId); // Toggle confirm state
  };

  const executeDraft = (teamId: number) => {
    onDraftTeam(teamId, userOnTheClock?.user_id, canDraft);
    setConfirmTeamId(null);
  };

  return (
    <div className="w-full space-y-4 md:space-y-6">

      {/* STICKY MOBILE BANNER: Who's On the Clock */}
      {!isDraftComplete && (
        <div className="sticky top-[57px] z-40 md:relative md:top-auto">
          <div className={`flex items-center justify-between px-4 py-3 rounded-xl shadow-md border-2 transition-all ${isMyTurn
            ? 'bg-emerald-500 border-emerald-400 text-white'
            : isPaused
              ? 'bg-amber-500 border-amber-400 text-white'
              : 'bg-slate-900 border-slate-700 text-white'
            }`}>
            <div className="flex items-center gap-3">
              <span className="text-xs font-extrabold bg-black/20 px-2 py-1 rounded">
                #{currentPick}
              </span>
              <div>
                <p className="text-sm font-extrabold">
                  {isPaused ? '⏸ Draft Paused' : isMyTurn ? '🎯 Your Pick!' : `${userOnTheClock?.profiles?.display_name || 'Player'}'s Turn`}
                </p>
                <p className="text-[10px] opacity-80 font-medium">
                  Round {Math.ceil(currentPick / 8)} • Pick {((currentPick - 1) % 8) + 1} of 8
                </p>
              </div>
            </div>
            {isCommissioner && !isPaused && (
              <div className="flex gap-2">
                <button onClick={() => onTogglePause(timerSecondsRef.current)} className="px-3 py-1.5 text-xs font-bold bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                  ⏸ Pause
                </button>
                <button onClick={onUndoPick} disabled={currentPick <= 1} className="px-3 py-1.5 text-xs font-bold bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-40">
                  ↺ Undo
                </button>
              </div>
            )}
            {isCommissioner && isPaused && (
              <button onClick={() => onTogglePause(timerSecondsRef.current)} className="px-4 py-1.5 text-xs font-bold bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                ▶ Resume
              </button>
            )}
          </div>
        </div>
      )}

      {/* DRAFT TIMER */}
      {!isDraftComplete && timerSeconds > 0 && (
        <div className="px-0 md:px-0">
          <DraftTimer
            timerSeconds={timerSeconds}
            pickStartedAt={pickStartedAt}
            teams={teams}
            draftPicks={draftPicks}
            onAutoPickTeam={(teamId) => onDraftTeam(teamId, userOnTheClock?.user_id, true)}
            canAutoPick={isCommissioner}
            isPaused={isPaused}
            onTick={(s) => { timerSecondsRef.current = s; }}
          />
        </div>
      )}

      {/* TOP BAR: Finalize (only when draft is complete) */}
      {isDraftComplete && isCommissioner && (
        <div className="flex justify-center bg-white dark:bg-card p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-card-border">
          <button
            onClick={onFinalizeDraft}
            className="px-8 py-3 bg-emerald-600 border border-emerald-700 hover:bg-emerald-700 text-white text-sm font-extrabold rounded-xl shadow-md transition-all"
          >
            🏆 Lock League & Start Tournament
          </button>
        </div>
      )}

      {/* THE TICKER: Horizontal Scrolling Timeline (hidden on small mobile, visible md+) */}
      <div className="hidden md:block bg-slate-900 rounded-2xl shadow-inner p-4 overflow-hidden border-4 border-slate-800">
        <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
          {all64Picks.map((pick) => {
            const isCurrent = pick.pickNum === currentPick;
            const isPast = pick.pickNum < currentPick;

            return (
              <div
                key={pick.pickNum}
                ref={isCurrent ? activePickRef : null}
                className={`flex-shrink-0 w-32 md:w-40 rounded-xl p-3 flex flex-col justify-between transition-all snap-center ${isCurrent ? 'bg-emerald-400 border-2 border-emerald-300 transform scale-105 shadow-lg' :
                  isPast ? 'bg-slate-800 opacity-60' : 'bg-slate-800'
                  }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${isCurrent ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                    #{pick.pickNum}
                  </span>
                </div>
                <div className="flex-grow flex flex-col justify-center">
                  <span className={`text-xs font-bold truncate ${isCurrent ? 'text-slate-900' : 'text-white'}`}>
                    {pick.player?.profiles?.display_name?.split(' ')[0] || 'Player'}
                  </span>
                  {pick.team ? (
                    <span className="text-[10px] font-medium text-slate-400 truncate mt-1">{pick.team.name}</span>
                  ) : (
                    <span className={`text-[10px] font-medium italic mt-1 ${isCurrent ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {isCurrent ? 'On the Clock' : 'Waiting...'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* THE GRID: Teams by Region */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        {regions.map((region) => {
          const isCollapsed = collapsedRegions.has(region);
          const regionTeams = teamsByRegion[region] || [];
          const draftedCount = regionTeams.filter((t: any) => draftPicks.some((dp: any) => dp.team_id === t.id)).length;

          return (
            <div key={region} className="bg-white dark:bg-card rounded-2xl shadow-sm border border-slate-200 dark:border-card-border overflow-hidden flex flex-col">
              {/* Collapsible region header on mobile */}
              <button
                onClick={() => toggleRegion(region)}
                className="md:pointer-events-none bg-slate-800 text-white text-center py-3 font-extrabold uppercase tracking-widest text-sm shadow-sm flex items-center justify-center gap-2"
              >
                <span>{region} Region</span>
                <span className="text-xs font-bold opacity-60 md:hidden">({draftedCount}/{regionTeams.length} drafted)</span>
                <span className="md:hidden">
                  {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </span>
              </button>

              {/* Team list — collapsed on mobile when toggled */}
              {!isCollapsed && (
                <div className="flex flex-col p-2 space-y-1">
                  {regionTeams.map((team: any) => {

                    const pickData = draftPicks.find((dp: any) => dp.team_id === team.id);
                    const isDrafted = !!pickData;
                    const draftedBy = isDrafted ? getPlayerForPick(pickData.pick_number)?.profiles?.display_name : null;
                    const isConfirming = confirmTeamId === team.id;

                    // RENDER DRAFTED STATE
                    if (isDrafted) {
                      return (
                        <div key={team.id} className="flex justify-between items-center p-3 md:p-3 rounded-lg bg-slate-50 dark:bg-background border border-slate-100 dark:border-slate-700 opacity-60">
                          <div className="flex items-center space-x-3 truncate pr-2">
                            <span className="text-xs font-bold text-slate-400 w-5">{team.seed}</span>
                            <span className="text-sm font-semibold text-slate-500 dark:text-muted line-through truncate">{team.name}</span>
                          </div>
                          <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-muted px-2 py-1 rounded truncate max-w-[80px]">
                            {draftedBy?.split(' ')[0]}
                          </span>
                        </div>
                      );
                    }

                    // RENDER CONFIRMATION STATE — larger buttons for mobile
                    if (isConfirming) {
                      return (
                        <div key={team.id} className="flex flex-col justify-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border-2 border-emerald-400 shadow-md animate-in fade-in zoom-in duration-200">
                          <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300 text-center mb-3">Draft {team.name}?</span>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => executeDraft(team.id)}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-3 rounded-lg transition-colors active:scale-95"
                            >
                              ✓ Yes, Draft
                            </button>
                            <button
                              onClick={() => setConfirmTeamId(null)}
                              className="flex-1 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 text-sm font-bold py-3 rounded-lg transition-colors active:scale-95"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // RENDER AVAILABLE STATE (Clickable) — larger tap target on mobile
                    return (
                      <div
                        key={team.id}
                        onClick={() => handleCellClick(team.id)}
                        className={`flex justify-between items-center p-3 md:p-3 rounded-lg border transition-all ${canDraft
                          ? 'bg-white dark:bg-card border-slate-200 dark:border-card-border hover:border-emerald-400 hover:shadow-md cursor-pointer group active:scale-[0.98]'
                          : 'bg-white dark:bg-card border-slate-100 dark:border-slate-700 cursor-not-allowed opacity-80'
                          }`}
                      >
                        <div className="flex items-center space-x-3 truncate pr-2">
                          <span className="text-xs font-extrabold text-slate-400 w-5">{team.seed}</span>
                          <span className={`text-sm font-bold truncate transition-colors ${canDraft ? 'text-slate-700 dark:text-slate-300 group-hover:text-emerald-700' : 'text-slate-600 dark:text-slate-400'}`}>
                            {team.name}
                          </span>
                        </div>

                        {canDraft && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Select</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}