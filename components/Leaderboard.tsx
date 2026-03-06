// components/Leaderboard.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import ResultsPanel from './ResultsPanel';
import TraditionalBracket from './TraditionalBracket';
import TournamentBracket from './TournamentBracket';
import Avatar from './Avatar';

export default function Leaderboard({ leagueId, members }: any) {
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          avatarUrl: member.profiles?.avatar_url || null,
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

    // Debounced handler: when multiple teams update in quick succession
    // (e.g. a full round simulation), batch into a single re-fetch
    const debouncedFetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchStandings();
      }, 500);
    };

    const channel = supabase
      .channel(`realtime_standings_${leagueId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'teams'
        },
        () => {
          debouncedFetch();
        }
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [leagueId, members]);

  if (loading) return <div className="text-center text-slate-500 dark:text-muted font-bold py-8 animate-pulse">Calculating Standings...</div>;

  return (
    <div className="space-y-6">

      <ResultsPanel members={standings} />

      <div className="bg-white dark:bg-card border border-slate-200 dark:border-card-border rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-extrabold text-white">Live Standings</h2>
          <span className="text-xs font-bold bg-emerald-500 text-slate-900 dark:text-white px-3 py-1 rounded-full uppercase tracking-wider">
            Tournament Active
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {standings.map((teamOwner: any, index: number) => (
            <div key={teamOwner.user_id} className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-background transition-colors">
              <div className="flex items-center gap-4 min-w-[200px]">
                <div className={`w-8 h-8 flex items-center justify-center font-extrabold rounded-full ${index === 0 ? 'bg-amber-100 text-amber-700' :
                  index === 1 ? 'bg-slate-200 text-slate-700 dark:text-slate-300' :
                    index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-slate-100 dark:bg-slate-700 text-slate-400'
                  }`}>
                  {index + 1}
                </div>
                <Avatar src={teamOwner.avatarUrl} name={teamOwner.displayName} size="sm" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">{teamOwner.displayName}</h3>
                  <span className="text-sm font-extrabold text-emerald-600">{teamOwner.totalPoints} PTS</span>
                </div>
              </div>

              <div className="flex-grow">
                <div className="flex flex-wrap gap-2">
                  {teamOwner.teams.map((team: any, i: number) => (
                    <div
                      key={team.name}
                      className={`flex items-center space-x-2 text-xs font-bold border px-2.5 py-1.5 rounded-md shadow-sm transition-all ${team.is_eliminated
                        ? 'bg-red-50 border-red-200 text-red-800 opacity-80'
                        : 'bg-white dark:bg-card border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
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

                      <div className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${team.wins > 0
                        ? team.is_eliminated
                          ? 'bg-red-100 text-red-600'
                          : 'bg-emerald-100 text-emerald-700'
                        : team.is_eliminated
                          ? 'bg-red-100/50 text-red-400'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
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