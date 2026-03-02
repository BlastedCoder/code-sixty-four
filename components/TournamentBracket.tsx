// components/TournamentBracket.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

const ROUND_NAMES = {
  1: 'Round of 64',
  2: 'Round of 32',
  3: 'Sweet 16',
  4: 'Elite 8',
  5: 'Final Four',
  6: 'Championship'
};

// Must match the exact order your SQL generation script used
const REGIONS = ['East', 'West', 'South', 'Midwest'];

export default function TournamentBracket({ leagueId }: { leagueId: string }) {
  const [games, setGames] = useState<any[]>([]);
  const [draftPicks, setDraftPicks] = useState<any[]>([]);
  const [activeRound, setActiveRound] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBracketData = async () => {
      const { data: gamesData } = await supabase
        .from('games')
        .select(`
          id, 
          round, 
          team1_score, 
          team2_score, 
          winner_id, 
          is_completed,
          team1:teams!games_team1_id_fkey(id, name, seed),
          team2:teams!games_team2_id_fkey(id, name, seed)
        `)
        .order('id', { ascending: true });

      const { data: picksData } = await supabase
        .from('draft_picks')
        .select(`
          team_id,
          profiles(display_name)
        `)
        .eq('league_id', leagueId);

      setGames(gamesData || []);
      setDraftPicks(picksData || []);
      
      const currentRound = gamesData?.find(g => !g.is_completed && g.team1 && g.team2)?.round || 1;
      setActiveRound(currentRound);
      
      setIsLoading(false);
    };

    fetchBracketData();
  }, [leagueId]);

  const getOwner = (teamId: number) => {
    const pick = draftPicks.find(p => p.team_id === teamId);
    return pick?.profiles?.display_name || 'Undrafted';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  const activeGames = games.filter(g => g.round === activeRound);

  // Helper to render a single game card
  const renderGameCard = (game: any) => (
    <div key={game.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      {/* Team 1 Row */}
      <div className={`flex justify-between items-center p-3 border-b border-slate-100 ${
        game.is_completed && game.winner_id !== game.team1?.id ? 'opacity-40 bg-slate-50' : ''
      }`}>
        <div className="flex flex-col truncate pr-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-400 w-4">{game.team1?.seed || '-'}</span>
            <span className={`text-sm font-bold truncate ${game.winner_id === game.team1?.id ? 'text-emerald-700' : 'text-slate-800'}`}>
              {game.team1?.name || 'TBD'}
            </span>
          </div>
          {game.team1 && (
            <span className="text-[10px] font-semibold text-slate-400 ml-6 truncate">
              {getOwner(game.team1.id)}
            </span>
          )}
        </div>
        <div className="font-extrabold text-slate-700">{game.team1_score ?? '-'}</div>
      </div>

      {/* Team 2 Row */}
      <div className={`flex justify-between items-center p-3 ${
        game.is_completed && game.winner_id !== game.team2?.id ? 'opacity-40 bg-slate-50' : ''
      }`}>
        <div className="flex flex-col truncate pr-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-400 w-4">{game.team2?.seed || '-'}</span>
            <span className={`text-sm font-bold truncate ${game.winner_id === game.team2?.id ? 'text-emerald-700' : 'text-slate-800'}`}>
              {game.team2?.name || 'TBD'}
            </span>
          </div>
          {game.team2 && (
            <span className="text-[10px] font-semibold text-slate-400 ml-6 truncate">
              {getOwner(game.team2.id)}
            </span>
          )}
        </div>
        <div className="font-extrabold text-slate-700">{game.team2_score ?? '-'}</div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      
      {/* Round Navigation Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 scrollbar-hide bg-slate-50">
        {[1, 2, 3, 4, 5, 6].map((roundNum) => (
          <button
            key={roundNum}
            onClick={() => setActiveRound(roundNum)}
            className={`whitespace-nowrap px-6 py-4 text-sm font-extrabold transition-colors ${
              activeRound === roundNum 
                ? 'text-emerald-600 border-b-4 border-emerald-500 bg-white' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-b-4 border-transparent'
            }`}
          >
            {ROUND_NAMES[roundNum as keyof typeof ROUND_NAMES]}
          </button>
        ))}
      </div>

      {/* Matchups Grid */}
      <div className="p-4 md:p-6 bg-slate-100">
        
        {/* Rounds 1-4: Grouped by Region */}
        {activeRound <= 4 ? (
          <div className="space-y-8">
            {REGIONS.map((regionName, regionIndex) => {
              // Calculate how many games belong to each region for the active round
              const gamesPerRegion = activeGames.length / 4;
              // Slice out just the games for this specific region
              const regionGames = activeGames.slice(regionIndex * gamesPerRegion, (regionIndex + 1) * gamesPerRegion);
              
              return (
                <div key={regionName} className="space-y-4">
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b-2 border-slate-200 pb-2 flex items-center">
                    <span className="bg-slate-200 w-2 h-2 rounded-full mr-2"></span>
                    {regionName} Region
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {regionGames.map(game => renderGameCard(game))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Rounds 5-6 (Final Four & Championship): No region groupings */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
             {activeGames.map(game => renderGameCard(game))}
          </div>
        )}
        
      </div>
    </div>
  );
}