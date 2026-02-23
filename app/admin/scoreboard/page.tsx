'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ScoreboardAdmin() {
  const [games, setGames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<number, { team1: string, team2: string }>>({});
  
  const router = useRouter();

  // HARDCODE YOUR ADMIN EMAIL(S) HERE
  const ADMIN_EMAILS = ['dnewton685@gmail.com']; 

  useEffect(() => {
    const verifyAdminAndLoad = async () => {
      // 1. Get the current logged-in user
      const { data: { session } } = await supabase.auth.getSession();

      // 2. Check if they exist AND if their email is in the admin list
      if (!session || !session.user.email || !ADMIN_EMAILS.includes(session.user.email)) {
        console.warn("Unauthorized access attempt to admin scoreboard.");
        router.push('/dashboard'); // Kick them back to the safe zone
        return;
      }

      // 3. If they pass the check, load the games
      fetchActiveGames();
    };

    verifyAdminAndLoad();
  }, [router]);

  const fetchActiveGames = async () => {
    // Fetch games that have both teams set, but are NOT completed yet
    const { data, error } = await supabase
      .from('games')
      .select(`
        id, 
        round, 
        next_game_id,
        team1:teams!games_team1_id_fkey(id, name, seed),
        team2:teams!games_team2_id_fkey(id, name, seed)
      `)
      .not('team1_id', 'is', null)
      .not('team2_id', 'is', null)
      .eq('is_completed', false)
      .order('round', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      console.error("Error fetching games:", error);
    } else {
      setGames(data || []);
    }
    setIsLoading(false);
  };

  const handleScoreChange = (gameId: number, team: 'team1' | 'team2', val: string) => {
    setScores(prev => ({
      ...prev,
      [gameId]: {
        ...prev[gameId],
        [team]: val
      }
    }));
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
      // 1. Update the current game with scores and the winner
      await supabase.from('games').update({
        team1_score: s1,
        team2_score: s2,
        winner_id: winnerId,
        is_completed: true
      }).eq('id', game.id);

      // 2. Update the winning team's win count (+1)
      const { data: winnerData } = await supabase
        .from('teams')
        .select('wins')
        .eq('id', winnerId)
        .single();
        
      await supabase.from('teams').update({ wins: (winnerData?.wins || 0) + 1 }).eq('id', winnerId);

      // 3. Mark the losing team as eliminated
      await supabase.from('teams').update({ is_eliminated: true }).eq('id', loserId);

      // 4. Advance the winner to the next game in the bracket (if not the Championship)
      if (game.next_game_id) {
        // Check if team1_id is empty in the next game. If so, fill it. If not, fill team2_id.
        const { data: nextGame } = await supabase
          .from('games')
          .select('team1_id, team2_id')
          .eq('id', game.next_game_id)
          .single();

        if (!nextGame?.team1_id) {
          await supabase.from('games').update({ team1_id: winnerId }).eq('id', game.next_game_id);
        } else {
          await supabase.from('games').update({ team2_id: winnerId }).eq('id', game.next_game_id);
        }
      }

      // Remove the game from the active list on the screen
      setGames(prev => prev.filter(g => g.id !== game.id));
      
    } catch (err) {
      console.error("Failed to process game:", err);
      alert("Something went wrong updating the database.");
    }

    setIsProcessing(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Scoreboard Admin</h1>
            <p className="text-slate-500">Record final scores to automatically advance teams and award points.</p>
          </div>
          <button onClick={fetchActiveGames} className="text-sm font-bold bg-white border border-slate-200 hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors shadow-sm">
            Refresh Games
          </button>
        </div>

        {games.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
            <p className="text-slate-500 font-medium">No active games ready for scoring right now.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {games.map(game => (
              <div key={game.id} className="bg-white rounded-xl p-4 md:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                
                <div className="text-sm font-bold text-slate-400 w-full md:w-24 text-center md:text-left uppercase tracking-widest">
                  Round {game.round}
                </div>

                {/* Score Inputs */}
                <div className="flex-1 flex items-center justify-center gap-4 w-full">
                  <div className="flex flex-col items-end flex-1">
                    <span className="font-bold text-slate-800 mb-2 truncate max-w-[120px] sm:max-w-full">
                      <span className="text-slate-400 text-xs mr-2">{game.team1.seed}</span>
                      {game.team1.name}
                    </span>
                    <input 
                      type="number" 
                      placeholder="Score"
                      className="w-20 text-center font-bold text-lg p-2 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-0 outline-none"
                      value={scores[game.id]?.team1 || ''}
                      onChange={(e) => handleScoreChange(game.id, 'team1', e.target.value)}
                    />
                  </div>
                  
                  <span className="text-slate-300 font-extrabold text-xl px-2">VS</span>

                  <div className="flex flex-col items-start flex-1">
                    <span className="font-bold text-slate-800 mb-2 truncate max-w-[120px] sm:max-w-full">
                      {game.team2.name}
                      <span className="text-slate-400 text-xs ml-2">{game.team2.seed}</span>
                    </span>
                    <input 
                      type="number" 
                      placeholder="Score"
                      className="w-20 text-center font-bold text-lg p-2 border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-0 outline-none"
                      value={scores[game.id]?.team2 || ''}
                      onChange={(e) => handleScoreChange(game.id, 'team2', e.target.value)}
                    />
                  </div>
                </div>

                {/* Action Button */}
                <div className="w-full md:w-32 flex justify-end">
                  <button 
                    onClick={() => handleSubmitScore(game)}
                    disabled={isProcessing === game.id || !scores[game.id]?.team1 || !scores[game.id]?.team2}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    {isProcessing === game.id ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save Final'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}