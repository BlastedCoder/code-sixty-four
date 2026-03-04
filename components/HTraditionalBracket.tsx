// components/HTraditionalBracket.tsx

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function HTraditionalBracket() {
  const [leftBracket, setLeftBracket] = useState<Record<number, any[]>>({});
  const [rightBracket, setRightBracket] = useState<Record<number, any[]>>({});
  const [championship, setChampionship] = useState<any>(null);
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
        console.error("Error fetching bracket:", gamesError || teamsError);
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

      const left: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
      const right: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };

      [1, 2, 3, 4, 5].forEach(roundNum => {
        const roundGames = grouped[roundNum] || [];
        const midpoint = Math.ceil(roundGames.length / 2);
        left[roundNum] = roundGames.slice(0, midpoint);
        right[roundNum] = roundGames.slice(midpoint);
      });

      setLeftBracket(left);
      setRightBracket(right);
      
      if (grouped[6] && grouped[6].length > 0) {
        setChampionship(grouped[6][0]);
      }
      
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

  const getRoundLabel = (round: number) => {
    switch (round) {
      case 1: return 'Round of 64';
      case 2: return 'Round of 32';
      case 3: return 'Sweet 16';
      case 4: return 'Elite 8';
      case 5: return 'Final 4';
      default: return '';
    }
  };

  const renderColumn = (games: any[], round: number, side: 'left' | 'right') => (
    <div key={`${side}-${round}`} className="flex flex-col justify-around w-48 flex-shrink-0 space-y-4">
      <div className="text-center mb-4">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
          {getRoundLabel(round)}
        </span>
      </div>
      {games.map((game, index) => {
        const team1IsWinner = game.is_completed && game.winner_id === game.team1_id;
        const team2IsWinner = game.is_completed && game.winner_id === game.team2_id;
        
        // --- NEW: Inject Region Labels for Round 1 ---
        let regionLabel = null;
        if (round === 1 && index % 8 === 0) {
          const regions = side === 'left' ? ['SOUTH', 'EAST'] : ['MIDWEST', 'WEST'];
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
  );

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl shadow-inner overflow-hidden">
      <div className="bg-slate-900 px-6 py-4">
        <h2 className="text-xl font-extrabold text-white tracking-tight">H-Style Tournament Bracket</h2>
      </div>

      <div className="p-8 overflow-x-auto custom-scrollbar">
        <div className="flex justify-center items-stretch space-x-6 min-w-max pb-8">
          {[1, 2, 3, 4, 5].map(round => renderColumn(leftBracket[round], round, 'left'))}

          <div className="flex flex-col justify-center w-56 flex-shrink-0 px-2 relative z-10">
            <div className="text-center mb-4">
              <span className="text-xs font-extrabold text-amber-500 uppercase tracking-widest">
                National Championship
              </span>
            </div>
            {championship && (
              <div className="bg-white border-2 border-amber-300 rounded-xl shadow-lg overflow-hidden transform scale-105">
                {renderTeam(
                  championship.team1_id, 
                  championship.team1_score, 
                  championship.is_completed && championship.winner_id === championship.team1_id
                )}
                {renderTeam(
                  championship.team2_id, 
                  championship.team2_score, 
                  championship.is_completed && championship.winner_id === championship.team2_id
                )}
              </div>
            )}
          </div>

          {[5, 4, 3, 2, 1].map(round => renderColumn(rightBracket[round], round, 'right'))}
        </div>
      </div>
    </div>
  );
}