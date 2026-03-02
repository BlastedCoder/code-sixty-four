// components/DraftBoard2.tsx
// Path: components/DraftBoard.tsx

'use client';

import React from 'react';
import { Clock, Undo, Play, CheckCircle } from 'lucide-react';

interface DraftBoardProps {
  league: any;
  teams: any[];
  members: any[];
  draftPicks: any[];
  currentUser: any;
  onDraftTeam: (teamId: number, pickUserId: string, canDraft: boolean) => void;
  onUndoPick: () => void;
  onTogglePause: () => void;
  onFinalizeDraft: () => void;
}

export default function DraftBoard({
  league,
  teams,
  members,
  draftPicks,
  currentUser,
  onDraftTeam,
  onUndoPick,
  onTogglePause,
  onFinalizeDraft
}: DraftBoardProps) {
  
  const isCommissioner = league?.created_by === currentUser?.id;
  const isDraftComplete = league?.current_pick > 64;

  // 1. Figure out whose turn it is using Snake Draft Math
  const getCurrentDrafter = () => {
    if (isDraftComplete || members.length === 0) return null;
    
    // Assumes members are sorted by draft order (1 to 8)
    const round = Math.ceil(league.current_pick / members.length);
    const positionInRound = (league.current_pick - 1) % members.length;
    const isReverseRound = round % 2 === 0;
    
    const userIndex = isReverseRound ? (members.length - 1 - positionInRound) : positionInRound;
    return members[userIndex];
  };

  const currentDrafter = getCurrentDrafter();
  const isMyTurn = currentDrafter?.user_id === currentUser?.id;

  // 2. Filter available teams
  const draftedTeamIds = draftPicks.map(p => p.team_id).filter(Boolean);
  const availableTeams = teams.filter(t => !draftedTeamIds.includes(t.id));

  return (
    <div className="flex flex-col space-y-6">
      
      {/* --- ON THE CLOCK BANNER --- */}
      {!isDraftComplete && currentDrafter && (
        <div className={`flex items-center justify-between p-4 rounded-xl border-2 shadow-sm ${
          isMyTurn ? 'bg-emerald-50 border-emerald-400' : 'bg-white border-blue-200'
        }`}>
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-full ${isMyTurn ? 'bg-emerald-200 text-emerald-700 animate-pulse' : 'bg-blue-100 text-blue-600'}`}>
              <Clock size={24} />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">On The Clock - Pick {league.current_pick}</h2>
              <p className={`text-xl font-extrabold ${isMyTurn ? 'text-emerald-700' : 'text-slate-900'}`}>
                {isMyTurn ? '🚨 IT IS YOUR TURN!' : `${currentDrafter.profiles?.display_name || 'Unknown'} is drafting...`}
              </p>
            </div>
          </div>
          
          {/* Commissioner Controls inside the banner */}
          {isCommissioner && (
            <div className="flex space-x-2">
              <button onClick={onUndoPick} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Undo Last Pick">
                <Undo size={20} />
              </button>
              <button onClick={onTogglePause} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition" title="Pause Draft">
                <Play size={20} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- DRAFT COMPLETE BANNER --- */}
      {isDraftComplete && (
        <div className="bg-slate-900 text-white p-6 rounded-xl flex items-center justify-between shadow-lg">
          <div>
            <h2 className="text-2xl font-extrabold flex items-center gap-2"><CheckCircle className="text-emerald-400" /> Draft Complete!</h2>
            <p className="text-slate-400 font-medium mt-1">All 64 teams have been selected.</p>
          </div>
          {isCommissioner && league.status !== 'in_progress' && (
            <button 
              onClick={onFinalizeDraft}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-6 py-3 rounded-lg font-bold transition shadow-sm"
            >
              Finalize & Email Results
            </button>
          )}
        </div>
      )}

      {/* --- SPLIT PANE LAYOUT --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT PANE: Available Teams (Takes up 5 columns) */}
        <div className="lg:col-span-5 flex flex-col h-[700px]">
          <div className="bg-slate-900 text-white px-4 py-3 rounded-t-xl border-b border-slate-700 flex justify-between items-center">
            <h3 className="font-extrabold tracking-tight">Available Teams</h3>
            <span className="text-xs font-bold bg-slate-800 px-2 py-1 rounded text-slate-300">{availableTeams.length} Left</span>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-b-xl shadow-sm flex-1 overflow-y-auto custom-scrollbar p-2">
            <div className="grid grid-cols-1 gap-1">
              {availableTeams.map(team => (
                <div key={team.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition group">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 text-center text-[10px] font-black bg-slate-100 text-slate-500 py-1 rounded">
                      {team.seed}
                    </span>
                    <span className="font-bold text-slate-700">{team.name}</span>
                  </div>
                  
                  <button 
                    onClick={() => onDraftTeam(team.id, currentDrafter?.user_id, isMyTurn || isCommissioner)}
                    disabled={(!isMyTurn && !isCommissioner) || isDraftComplete}
                    className="text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition disabled:opacity-0 disabled:cursor-not-allowed hover:bg-emerald-200"
                  >
                    Draft
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Draft History (Takes up 7 columns) */}
        <div className="lg:col-span-7 flex flex-col h-[700px]">
          <div className="bg-slate-900 text-white px-4 py-3 rounded-t-xl border-b border-slate-700">
            <h3 className="font-extrabold tracking-tight">Draft Board</h3>
          </div>

          <div className="bg-white border border-slate-200 rounded-b-xl shadow-sm flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
            
            {/* The new Requested Layout: Pick -> Team -> Owner */}
            {draftPicks.map((pick) => {
              const draftedTeam = teams.find(t => t.id === pick.team_id);
              const owner = members.find(m => m.user_id === pick.user_id);

              return (
                <div key={pick.id} className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                  
                  {/* 1. Pick Number */}
                  <div className="w-16 flex-shrink-0">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      #{pick.pick_number}
                    </span>
                  </div>

                  {/* 2. Drafted Team */}
                  <div className="flex-1 flex items-center space-x-3 border-l border-slate-200 pl-4">
                    {draftedTeam ? (
                      <>
                        <span className="w-6 text-center text-[10px] font-black bg-slate-200 text-slate-600 py-1 rounded">
                          {draftedTeam.seed}
                        </span>
                        <span className="font-extrabold text-slate-900">{draftedTeam.name}</span>
                      </>
                    ) : (
                      <span className="font-medium text-slate-400 italic">Empty Slot</span>
                    )}
                  </div>

                  {/* 3. Player / Owner */}
                  <div className="w-32 flex-shrink-0 text-right">
                    <span className="text-sm font-bold text-blue-600 truncate block">
                      {owner?.profiles?.display_name || 'Unknown'}
                    </span>
                  </div>

                </div>
              );
            })}
            
            {draftPicks.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 font-medium">
                <p>The draft has not started yet.</p>
                <p className="text-sm">Waiting for the first pick...</p>
              </div>
            )}
            
          </div>
        </div>

      </div>
    </div>
  );
}