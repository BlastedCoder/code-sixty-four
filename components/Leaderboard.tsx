// components/Leaderboard.tsx
// Path: components/Leaderboard.tsx (or app/leagues/[id]/Leaderboard.tsx)

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ResultsPanel from './ResultsPanel';
import TraditionalBracket from './TraditionalBracket';
import TournamentBracket from './TournamentBracket'; 

export default function Leaderboard({ leagueId, members }: any) {
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStandings = async () => {
      const { data: picksData, error } = await supabase
        .from('draft_picks')
        .select('user_id, teams(name, seed, wins, is_eliminated)')
        .eq('league_id', leagueId);

      if (error || !picksData) {
        setLoading(false);
        return;
      }

      const userScores = members.map((member: any) => {
        const userPicks = picksData.filter((p: any) => p.user_id === member.user_id);
        const draftedTeams = userPicks.map((p: any) => p.teams);
        
        const totalPoints = draftedTeams.reduce((sum: number, team: any) => {
          return sum + (team.wins || 0);
        }, 0);

        return {
          user_id: member.user_id,
          displayName: member.profiles?.display_name || 'Unknown Player',
          totalPoints,
          teams: draftedTeams,
          hasChampion: draftedTeams.some((t: any) => t.wins === 6)
        };
      });

      userScores.sort((a: any, b: any) => b.totalPoints - a.totalPoints);
      setStandings(userScores);
      setLoading(false);
    };

    if (members.length > 0) {
      fetchStandings();
    }

    const channel = supabase
      .channel('realtime_standings')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'teams'
        },
        () => {
          fetchStandings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leagueId, members]);

  if (loading) return <div className="text-center text-slate-500 font-bold py-8 animate-pulse">Calculating Standings...</div>;

  return (
    <div className="space-y-6">
      
      <ResultsPanel members={standings} />

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-extrabold text-white">Live Standings</h2>
          <span className="text-xs font-bold bg-emerald-500 text-slate-900 px-3 py-1 rounded-full uppercase tracking-wider">
            Tournament Active
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {standings.map((teamOwner: any, index: number) => (
            <div key={teamOwner.user_id} className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-4 min-w-[200px]">
                <div className={`w-8 h-8 flex items-center justify-center font-extrabold rounded-full ${
                  index === 0 ? 'bg-amber-100 text-amber-700' :
                  index === 1 ? 'bg-slate-200 text-slate-700' :
                  index === 2 ? 'bg-orange-100 text-orange-800' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{teamOwner.displayName}</h3>
                  <span className="text-sm font-extrabold text-emerald-600">{teamOwner.totalPoints} PTS</span>
                </div>
              </div>

              <div className="flex-grow">
                <div className="flex flex-wrap gap-2">
                  {teamOwner.teams.map((team: any, i: number) => (
                    <div 
                      key={i} 
                      className={`flex items-center space-x-2 text-xs font-bold border px-2.5 py-1.5 rounded-md shadow-sm transition-all ${
                        team.is_eliminated 
                          ? 'bg-red-50 border-red-200 text-red-800 opacity-80' // CHANGED: Light red background, deeper red text
                          : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5">
                        <span className={`${team.is_eliminated ? 'text-red-400' : 'text-slate-400'}`}>
                          {team.seed}
                        </span>
                        <span className={`${team.is_eliminated ? 'line-through text-red-900/60' : ''}`}>
                          {team.name}
                        </span>
                      </div>

                      <div className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                        team.wins > 0 
                          ? team.is_eliminated 
                            ? 'bg-red-100 text-red-600' // CHANGED: Muted red for points if eliminated
                            : 'bg-emerald-100 text-emerald-700' 
                          : team.is_eliminated 
                            ? 'bg-red-100/50 text-red-400' // CHANGED: Empty red badge if eliminated with 0 wins
                            : 'bg-slate-100 text-slate-400'
                      }`}>
                        {team.wins} {team.wins === 1 ? 'pt' : 'pts'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}