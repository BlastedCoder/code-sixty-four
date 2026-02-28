// Path: components/TraditionalBracket.tsx

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TraditionalBracket() {
  const [gamesByRound, setGamesByRound] = useState<Record<number, any[]>>({});
  const [teams, setTeams] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBracketData = async () => {
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .order('id', { ascending: true });

      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, seed');

      if (gamesError || teamsError || !gamesData || !teamsData) {
        setLoading(false);
        return;
      }

      const teamDict: Record<number, any> = {};
      teamsData.forEach(t => { teamDict[t.id] = t; });
      setTeams(teamDict);

      const grouped: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
      gamesData.forEach(game => {
        if (grouped[game.round]) {
          grouped[game.round].push(game);
        }
      });
      
      setGamesByRound(grouped);
      setLoading(false);
    };

    fetchBracketData();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold animate-pulse">Loading Bracket...</div>;

  const renderTeam = (teamId: number | null, score: number | null, isWinner: boolean) => {
    const team = teamId ? teams[teamId] : null;
    return (
      <div className={`flex items-center justify-between p-2 border-b border-slate-100 last:border-0 ${isWinner ? 'bg-emerald-50/50' : 'bg-white'}`}>
        <div className="flex items-center space-x-2 truncate pr-2">
          {team ? (
            <>
              <span className="text-[10px] font-bold text-slate-400">{team.seed}</span>
              <span className={`text-sm truncate ${isWinner ? 'font-extrabold text-slate-900' : 'font-medium text-slate-600'}`}>
                {team.name}
              </span>
            </>
          ) : (
            <span className="text-sm font-medium text-slate-400 italic">TBD</span>
          )}
        </div>
        <div className={`text-sm ${isWinner ? 'font-extrabold text-emerald-600' : 'font-medium text-slate-400'}`}>
          {score !== null ? score : '-'}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl shadow-inner overflow-hidden">
      <div className="bg-slate-900 px-6 py-4">
        <h2 className="text-xl font-extrabold text-white tracking-tight">Full Tournament Bracket</h2>
      </div>

      <div className="p-8 overflow-x-auto custom-scrollbar">
        <div className="flex space-x-8 min-w-max pb-8">
          {[1, 2, 3, 4, 5, 6].map((roundNumber) => (
            <div key={roundNumber} className="flex flex-col justify-around w-56 flex-shrink-0 space-y-4">
              <div className="text-center mb-4">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                  {roundNumber === 1 ? 'Round of 64' :
                   roundNumber === 2 ? 'Round of 32' :
                   roundNumber === 3 ? 'Sweet 16' :
                   roundNumber === 4 ? 'Elite 8' :
                   roundNumber === 5 ? 'Final 4' : 'Championship'}
                </span>
              </div>

              {gamesByRound[roundNumber]?.map((game, index) => {
                const team1IsWinner = game.is_completed && game.winner_id === game.team1_id;
                const team2IsWinner = game.is_completed && game.winner_id === game.team2_id;

                // --- NEW: Inject Region Labels for Round 1 ---
                let regionLabel = null;
                if (roundNumber === 1 && index % 8 === 0) {
                  const regions = ['SOUTH', 'EAST', 'MIDWEST', 'WEST'];
                  regionLabel = (
                    <div className={`text-center mb-1 ${index > 0 ? 'mt-6' : ''}`}>
                      <span className="text-xs font-black text-slate-800 tracking-widest uppercase bg-slate-200/80 px-3 py-1 rounded">
                        {regions[Math.floor(index / 8)]}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={game.id} className="relative group flex flex-col">
                    {regionLabel}
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden transition-all hover:border-slate-300 hover:shadow-md">
                      {renderTeam(game.team1_id, game.team1_score, team1IsWinner)}
                      {renderTeam(game.team2_id, game.team2_score, team2IsWinner)}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}