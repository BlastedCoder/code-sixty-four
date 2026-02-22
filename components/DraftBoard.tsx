'use client';

export default function DraftBoard({ league, teams = [], members = [], draftPicks = [], onDraftTeam, onUndoPick, onTogglePause, onFinalizeDraft, currentUser }: any) {
  // 1. Force the pick to be at least 1, even if the database sends 0 or null
  const currentPick = (league?.current_pick && league?.current_pick > 0) ? league.current_pick : 1;
  const isDraftComplete = currentPick > 64;

  // 👑 Identify the Commissioner and the Pause state
  const isCommissioner = league?.created_by === currentUser?.id;
  const isPaused = league?.status === 'paused';

  // 2. Sort existing members, then pad the array so it ALWAYS has exactly 8 slots
  const actualMembers = [...members].sort((a: any, b: any) => (a.draft_position || 0) - (b.draft_position || 0));
  
  const paddedMembers = Array.from({ length: 8 }).map((_, index) => {
    // If we have a real member for this column, use them. Otherwise, create a placeholder.
    if (actualMembers[index]) {
      return {
        ...actualMembers[index],
        draft_position: actualMembers[index].draft_position || index + 1
      };
    }
    return {
      user_id: `placeholder-${index}`,
      draft_position: index + 1,
      profiles: { display_name: `Open Slot ${index + 1}` }
    };
  });

  // 3. Snake Draft Math: Figure out exactly whose turn it is
  const getPlayerForPick = (pick: number) => {
    const round = Math.ceil(pick / 8);
    const pickInRound = pick % 8 === 0 ? 8 : pick % 8;
    
    // Odd rounds go 1-8, Even rounds go 8-1
    const targetPosition = round % 2 !== 0 ? pickInRound : 9 - pickInRound;
    
    return paddedMembers.find((m: any) => m.draft_position === targetPosition);
  };

  const userOnTheClock = getPlayerForPick(currentPick);
  // 🛡️ The Turn Lock: Does the user on the clock match the person looking at the screen?
  const isMyTurn = userOnTheClock?.user_id === currentUser?.id;
  
// 🛡️ The New Turn Lock: You can draft if it's your turn OR if you are the commissioner. 
  // However, NOBODY can draft if the board is paused.
  const canDraft = (isMyTurn || isCommissioner) && !isPaused && !isDraftComplete;

  // 4. Filter and sort the available teams by overall seed (1-16)
  const draftedTeamIds = draftPicks.map((dp: any) => dp.team_id);
  const availableTeams = teams
    ?.filter((t: any) => !draftedTeamIds.includes(t.id))
    .sort((a: any, b: any) => a.seed - b.seed) || [];

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full">
      
      {/* LEFT: The 8x8 Draft Board Grid */}
      <div className="flex-grow bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-x-auto">
        <div className="flex justify-between items-center mb-6 min-w-[800px]">
          <h2 className="text-2xl font-bold text-slate-800">Draft Board</h2>
          {/* 👑 Commissioner Quick Controls */}
            {isCommissioner && (
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1 pr-1">
                  Commissioner Controls
                </span>
                <div className="flex space-x-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200 shadow-sm">
                  <button 
                    onClick={onTogglePause}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                      isPaused ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isPaused ? '▶ Resume' : '⏸ Pause'}
                  </button>
                  <button 
                    onClick={onUndoPick}
                    disabled={currentPick <= 1}
                    className="px-3 py-1.5 text-xs font-bold bg-white text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ↺ Undo Pick
                  </button>
                </div>
              </div>
            )}
        </div>

        <div className="min-w-[800px]">
          {/* Headers: Player Names */}
          <div className="grid grid-cols-8 gap-2 mb-2">
            {paddedMembers.map((m: any) => (
              <div key={m.user_id} className="text-center font-extrabold text-sm text-slate-700 bg-slate-100 py-2 rounded-t-lg border-b-4 border-slate-300 truncate px-1">
                {m.profiles?.display_name || 'Player'}
              </div>
            ))}
          </div>
          
          {/* Draft Slots */}
          <div className="grid grid-cols-8 gap-2">
            {Array.from({ length: 8 }).map((_, rowIndex) => {
              const round = rowIndex + 1;
              
              return paddedMembers.map((member: any, index: number) => {
                // Fallback: use index + 1 if no position is assigned yet
                const position = member.draft_position || index + 1;
                
                const pickNum = round % 2 !== 0 
                  ? ((round - 1) * 8) + position 
                  : ((round - 1) * 8) + (9 - position);
                
                const pickData = draftPicks.find((dp: any) => dp.pick_number === pickNum);
                const team = pickData ? teams?.find((t: any) => t.id === pickData.team_id) : null;
                const isCurrentPick = pickNum === currentPick;

                return (
                  <div 
                    key={pickNum} 
                    className={`h-24 border rounded-md p-2 flex flex-col justify-between transition-all ${
                      team ? 'bg-slate-800 text-white border-slate-900 shadow-md' 
                      : isCurrentPick ? 'bg-emerald-50 border-2 border-emerald-400 shadow-inner' 
                      : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className={`text-[10px] font-bold ${team ? 'text-slate-400' : 'text-slate-400'}`}>
                      {pickNum}
                    </span>
                    <div className="text-center flex-grow flex flex-col justify-center">
                      {team ? (
                        <>
                          <div className="font-extrabold text-[13px] leading-tight line-clamp-2">{team.name}</div>
                          <div className="text-[11px] text-slate-300 font-mono mt-1">#{team.seed} {team.region.charAt(0)}</div>
                        </>
                      ) : (
                        <span className="text-xs text-slate-300 font-medium italic">Empty</span>
                      )}
                    </div>
                  </div>
                );
              });
            })}
          </div>
        </div>
      </div>

      {/* RIGHT: Available Teams */}
      <div className="w-full lg:w-96 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col max-h-[850px]">
        {/* NEW: Finalize Draft Section */}
        {isDraftComplete && isCommissioner && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <h4 className="text-emerald-800 font-bold text-sm mb-2">Draft Complete!</h4>
            <p className="text-emerald-600 text-xs mb-4">All 64 teams have been selected. Lock the league to start tracking standings.</p>
            <button 
                onClick={onFinalizeDraft} // We will pass this function in as a prop
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-lg shadow-md transition-all"
            >
                Finalize & Lock League
            </button>
            </div>
        )}
        <h3 className="text-xl font-bold text-slate-800 mb-4">Available Teams</h3>
        <div className="overflow-y-auto flex-grow space-y-2 pr-2">
          {availableTeams.map((team: any) => (
            <div key={team.id} className="flex justify-between items-center p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="flex flex-col truncate pr-2">
                <span className="font-bold text-slate-800 truncate">{team.name}</span>
                <span className="text-xs text-slate-500 font-medium">{team.region} Region</span>
              </div>
              <div className="flex items-center space-x-3 flex-shrink-0">
                <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2 py-1 rounded-full w-14 text-center">
                  Seed {team.seed}
                </span>
                <button 
                  onClick={() => onDraftTeam(team.id, userOnTheClock.user_id, canDraft)}
                  disabled={!canDraft}
                  className={`px-4 py-2 text-xs font-bold rounded-md transition-colors ${
                    canDraft
                      ? isCommissioner && !isMyTurn 
                        ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm' /* Orange for Proxy Pick */
                        : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm' /* Black for Normal Pick */
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  }`}
                >
                  {isDraftComplete ? 'Done' : isPaused ? 'Paused' : canDraft ? (isCommissioner && !isMyTurn ? 'Force' : 'Draft') : 'Wait'}
                </button>
              </div>
            </div>
          ))}
          {availableTeams.length === 0 && (
            <p className="text-center text-sm text-slate-500 italic mt-10">All teams drafted!</p>
          )}
        </div>
      </div>
      
    </div>
  );
}