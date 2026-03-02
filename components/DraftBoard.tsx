// components/DraftBoard.tsx
// Path: components\DraftBoard.tsx
'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function DraftBoard({
  league,
  teams = [],
  members = [],
  draftPicks = [],
  onDraftTeam,
  onUndoPick,
  onTogglePause,
  onFinalizeDraft,
  currentUser
}: any) {

  const router = useRouter();
  const currentPick = (league?.current_pick && league?.current_pick > 0) ? league.current_pick : 1;
  const isDraftComplete = currentPick > 64;
  const isCommissioner = league?.created_by === currentUser?.id;
  const isPaused = league?.status === 'paused';

  // State for the inline confirmation step
  const [confirmTeamId, setConfirmTeamId] = useState<number | null>(null);
  const activePickRef = useRef<HTMLDivElement>(null);

  // ==========================================
  // NEW: THE REAL-TIME ENGINE
  // ==========================================
  useEffect(() => {
    if (!league?.id) return;

    // Open a dedicated websocket channel for this specific draft room
    const draftChannel = supabase.channel(`draft-room-${league.id}`)
      // 1. Listen for anyone making a pick or the commissioner hitting 'Undo'
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'draft_picks',
        filter: `league_id=eq.${league.id}`
      }, () => {
        router.refresh(); // Soft-refresh the UI with the new data
      })
      // 2. Listen for the Commissioner pausing/resuming or the pick counter advancing
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'leagues',
        filter: `id=eq.${league.id}`
      }, () => {
        router.refresh();
      })
      .subscribe();

    // Clean up the websocket connection if the user leaves the page
    return () => {
      supabase.removeChannel(draftChannel);
    };
  }, [league?.id, router]);
  // ==========================================

  // 1. Pad Members (Ensure exactly 8 slots)
  const paddedMembers = useMemo(() => {
    const actualMembers = [...members].sort((a: any, b: any) => (a.draft_position || 0) - (b.draft_position || 0));
    return Array.from({ length: 8 }).map((_, index) => {
      if (actualMembers[index]) return { ...actualMembers[index], draft_position: actualMembers[index].draft_position || index + 1 };
      return { user_id: `placeholder-${index}`, draft_position: index + 1, profiles: { display_name: `Open Slot ${index + 1}` } };
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
    <div className="w-full space-y-6">

      {/* TOP BAR: Commissioner Controls & Finalize */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col items-center md:items-start">
          <h2 className="text-xl font-bold text-slate-800">Draft Room</h2>
          <p className="text-sm text-slate-500 font-medium">
            {isDraftComplete ? 'Draft Complete!' : isPaused ? 'Draft is Paused' : `Pick ${currentPick} of 64`}
          </p>
        </div>

        {isCommissioner && (
          <div className="flex flex-col items-center md:items-end">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1 pr-1">
              Commissioner Controls
            </span>

            <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shadow-inner">
              {!isDraftComplete && (
                <>
                  <button
                    onClick={onTogglePause}
                    className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all shadow-sm border ${isPaused
                      ? 'bg-amber-500 border-amber-600 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                  >
                    {isPaused ? '▶ Resume' : '⏸ Pause'}
                  </button>
                  <button
                    onClick={onUndoPick}
                    disabled={currentPick <= 1}
                    className="px-4 py-1.5 text-sm font-bold bg-white border border-slate-200 text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50 shadow-sm"
                  >
                    ↺ Undo
                  </button>
                </>
              )}
              {isDraftComplete && (
                <button
                  onClick={onFinalizeDraft}
                  className="px-6 py-1.5 bg-emerald-600 border border-emerald-700 hover:bg-emerald-700 text-white text-sm font-extrabold rounded-lg shadow-md transition-all"
                >
                  Lock League & Start
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* THE TICKER: Horizontal Scrolling Timeline */}
      <div className="bg-slate-900 rounded-2xl shadow-inner p-4 overflow-hidden border-4 border-slate-800">
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {regions.map((region) => (
          <div key={region} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-800 text-white text-center py-3 font-extrabold uppercase tracking-widest text-sm shadow-sm">
              {region} Region
            </div>

            <div className="flex flex-col p-2 space-y-1">
              {teamsByRegion[region]?.map((team: any) => {

                const pickData = draftPicks.find((dp: any) => dp.team_id === team.id);
                const isDrafted = !!pickData;
                const draftedBy = isDrafted ? getPlayerForPick(pickData.pick_number)?.profiles?.display_name : null;
                const isConfirming = confirmTeamId === team.id;

                // RENDER DRAFTED STATE
                if (isDrafted) {
                  return (
                    <div key={team.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-100 opacity-60">
                      <div className="flex items-center space-x-3 truncate pr-2">
                        <span className="text-xs font-bold text-slate-400 w-5">{team.seed}</span>
                        <span className="text-sm font-semibold text-slate-500 line-through truncate">{team.name}</span>
                      </div>
                      <span className="text-[10px] font-bold bg-slate-200 text-slate-500 px-2 py-1 rounded truncate max-w-[80px]">
                        {draftedBy?.split(' ')[0]}
                      </span>
                    </div>
                  );
                }

                // RENDER CONFIRMATION STATE
                if (isConfirming) {
                  return (
                    <div key={team.id} className="flex flex-col justify-center p-2 rounded-lg bg-emerald-50 border-2 border-emerald-400 shadow-md animate-in fade-in zoom-in duration-200">
                      <span className="text-xs font-bold text-emerald-800 text-center mb-2">Draft {team.name}?</span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => executeDraft(team.id)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-md transition-colors"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmTeamId(null)}
                          className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold py-2 rounded-md transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                }

                // RENDER AVAILABLE STATE (Clickable)
                return (
                  <div
                    key={team.id}
                    onClick={() => handleCellClick(team.id)}
                    className={`flex justify-between items-center p-3 rounded-lg border transition-all ${canDraft
                      ? 'bg-white border-slate-200 hover:border-emerald-400 hover:shadow-md cursor-pointer group'
                      : 'bg-white border-slate-100 cursor-not-allowed opacity-80'
                      }`}
                  >
                    <div className="flex items-center space-x-3 truncate pr-2">
                      <span className="text-xs font-extrabold text-slate-400 w-5">{team.seed}</span>
                      <span className={`text-sm font-bold truncate transition-colors ${canDraft ? 'text-slate-700 group-hover:text-emerald-700' : 'text-slate-600'}`}>
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
          </div>
        ))}
      </div>

    </div>
  );
}