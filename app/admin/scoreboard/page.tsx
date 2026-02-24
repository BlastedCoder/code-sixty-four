'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const REGIONS = ['East', 'West', 'South', 'Midwest'];

export default function ScoreboardAdmin() {
  const [games, setGames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<number, { team1: string, team2: string }>>({});
  
  const router = useRouter();
  const ADMIN_EMAILS = ['your-email@example.com']; // UPDATE THIS

  useEffect(() => {
    const verifyAdminAndLoad = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user.email || !ADMIN_EMAILS.includes(session.user.email)) {
        router.push('/dashboard');
        return;
      }
      fetchActiveGames();
    };
    verifyAdminAndLoad();
  }, [router]);

  const fetchActiveGames = async () => {
    const { data, error } = await supabase
      .from('games')
      .select(`
        id, round, next_game_id,
        team1:teams!games_team1_id_fkey(id, name, seed, region),
        team2:teams!games_team2_id_fkey(id, name, seed, region)
      `)
      .not('team1_id', 'is', null)
      .not('team2_id', 'is', null)
      .eq('is_completed', false)
      .order('round', { ascending: true })
      .order('id', { ascending: true });

    if (!error) setGames(data || []);
    setIsLoading(false);
  };

  const handleScoreChange = (gameId: number, team: 'team1' | 'team2', val: string) => {
    setScores(prev => ({ ...prev, [gameId]: { ...prev[gameId], [team]: val } }));
  };

  const handleSubmitScore = async (game: any) => {
    const s1 = parseInt(scores[game.id]?.team1);
    const s2 = parseInt(scores[game.id]?.team2);

    if (isNaN(s1) || isNaN(s2) || s1 === s2) {
      alert("Please enter valid, non-tying scores for both teams.");
      return;
    }

    if (!window.confirm(`Finalize game? ${game.team1.name} (${s1}) vs ${game.team2.name} (${s2})`)) return;

    setIsProcessing(game.id);
    const winnerId = s1 > s2 ? game.team1.id : game.team2.id;
    const loserId = s1 > s2 ? game.team2.id : game.team1.id;

    try {
      await supabase.from('games').update({ team1_score: s1, team2_score: s2, winner_id: winnerId, is_completed: true }).eq('id', game.id);
      
      const { data: winnerData } = await supabase.from('teams').select('wins').eq('id', winnerId).single();
      await supabase.from('teams').update({ wins: (winnerData?.wins || 0) + 1 }).eq('id', winnerId);
      await supabase.from('teams').update({ is_eliminated: true }).eq('id', loserId);

      if (game.next_game_id) {
        const { data: nextGame } = await supabase.from('games').select('team1_id, team2_id').eq('id', game.next_game_id).single();
        if (!nextGame?.team1_id) {
          await supabase.from('games').update({ team1_id: winnerId }).eq('id', game.next_game_id);
        } else {
          await supabase.from('games').update({ team2_id: winnerId }).eq('id', game.next_game_id);
        }
      }

      setGames(prev => prev.filter(g => g.id !== game.id));
    } catch (err) {
      alert("Something went wrong updating the database.");
    }
    setIsProcessing(null);
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-slate-800" /></div>;

  const renderGameCard = (game: any) => (
    <div key={game.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="text-sm font-bold text-slate-400 w-full md:w-20 text-center md:text-left uppercase tracking-widest">
        Rnd {game.round}
      </div>
      <div className="flex-1 flex items-center justify-center gap-4 w-full">
        {/* Team 1 */}
        <div className="flex flex-col items-end flex-1">
          <span className="font-bold text-slate-800 mb-2 truncate max-w-[120px] sm:max-w-full">
            <span className="text-slate-400 text-xs mr-2">{game.team1.seed}</span>{game.team1.name}
          </span>
          <input 
            type="number" 
            placeholder="Score"
            // NEW: High Contrast Classes Added Here
            className="w-20 text-center font-black text-lg p-2 bg-slate-50 border-2 border-slate-400 text-slate-900 rounded-lg focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-inner outline-none placeholder:text-slate-400"
            value={scores[game.id]?.team1 || ''}
            onChange={(e) => handleScoreChange(game.id, 'team1', e.target.value)}
          />
        </div>
        <span className="text-slate-300 font-extrabold text-xl px-2">VS</span>
        {/* Team 2 */}
        <div className="flex flex-col items-start flex-1">
          <span className="font-bold text-slate-800 mb-2 truncate max-w-[120px] sm:max-w-full">
            {game.team2.name}<span className="text-slate-400 text-xs ml-2">{game.team2.seed}</span>
          </span>
          <input 
            type="number" 
            placeholder="Score"
            // NEW: High Contrast Classes Added Here
            className="w-20 text-center font-black text-lg p-2 bg-slate-50 border-2 border-slate-400 text-slate-900 rounded-lg focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-inner outline-none placeholder:text-slate-400"
            value={scores[game.id]?.team2 || ''}
            onChange={(e) => handleScoreChange(game.id, 'team2', e.target.value)}
          />
        </div>
      </div>
      <div className="w-full md:w-32 flex justify-end">
        <button 
          onClick={() => handleSubmitScore(game)}
          disabled={isProcessing === game.id || !scores[game.id]?.team1 || !scores[game.id]?.team2}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-50 shadow-md"
        >
          {isProcessing === game.id ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save Final'}
        </button>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
          <div><h1 className="text-3xl font-extrabold text-slate-900">Scoreboard Admin</h1></div>
          <button onClick={fetchActiveGames} className="text-sm font-bold bg-white border border-slate-200 hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors shadow-sm">Refresh Games</button>
        </div>

        {games.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm"><p className="text-slate-500 font-medium">No active games ready for scoring right now.</p></div>
        ) : (
          <div className="space-y-8">
            {/* Group Rounds 1-4 by Region */}
            {REGIONS.map(region => {
              const regionGames = games.filter(g => g.round <= 4 && g.team1?.region === region);
              if (regionGames.length === 0) return null;
              return (
                <div key={region} className="space-y-4">
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b-2 border-slate-200 pb-2 flex items-center">
                    <span className="bg-slate-300 w-2 h-2 rounded-full mr-2"></span>{region} Region
                  </h3>
                  <div className="grid gap-4">{regionGames.map(renderGameCard)}</div>
                </div>
              );
            })}

            {/* Group Final Four & Championship */}
            {games.filter(g => g.round > 4).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b-2 border-slate-200 pb-2 flex items-center">
                  <span className="bg-emerald-400 w-2 h-2 rounded-full mr-2"></span>Final Four & Championship
                </h3>
                <div className="grid gap-4">{games.filter(g => g.round > 4).map(renderGameCard)}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}