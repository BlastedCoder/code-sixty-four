// app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminPage() {
  const [games, setGames] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [ { data: t }, { data: g } ] = await Promise.all([
      supabase.from('teams').select('*'),
      supabase.from('games').select('*').order('id', { ascending: true })
    ]);
    if (t) setTeams(t);
    if (g) setGames(g);
  };

  const getTeamName = (id: number | null) => teams.find(t => t.id === id)?.name || 'TBA';

  const updateGame = async (gameId: number, t1Score: number, t2Score: number, nextGameId: number | null, team1Id: number, team2Id: number) => {
    // 1. Determine the winner based on the inputted scores
    const winnerId = t1Score > t2Score ? team1Id : team2Id;

    // 2. Update the current game with scores and the winner
    await supabase
      .from('games')
      .update({ team1_score: t1Score, team2_score: t2Score, winner_id: winnerId })
      .eq('id', gameId);

    // 3. Advance the winner to the next game in the bracket
    if (nextGameId) {
      // Odd game IDs feed into the top slot (team1_id), Evens feed into the bottom slot (team2_id)
      const isTopSlot = gameId % 2 !== 0;
      
      if (isTopSlot) {
        await supabase.from('games').update({ team1_id: winnerId }).eq('id', nextGameId);
      } else {
        await supabase.from('games').update({ team2_id: winnerId }).eq('id', nextGameId);
      }
    }

    alert('Game updated and bracket advanced!');
    fetchData(); // Refresh the data
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-8">Tournament Admin Panel</h1>
        
        <div className="space-y-6">
          {games.filter(g => g.team1_id && g.team2_id && !g.winner_id).map((game) => (
            <AdminGameCard key={game.id} game={game} team1Name={getTeamName(game.team1_id)} team2Name={getTeamName(game.team2_id)} onUpdate={updateGame} />
          ))}
          {games.filter(g => g.team1_id && g.team2_id && !g.winner_id).length === 0 && (
            <p className="text-slate-500">No active games ready to be scored.</p>
          )}
        </div>
      </div>
    </main>
  );
}

// Sub-component to handle the individual game forms cleanly
function AdminGameCard({ game, team1Name, team2Name, onUpdate }: any) {
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between p-5 border border-slate-300 rounded-xl bg-white shadow-sm">
      <div className="flex items-center space-x-4 flex-grow mb-4 md:mb-0">
        <span className="font-bold text-slate-600 w-16">Game {game.id}</span>
        
        <div className="flex flex-col space-y-3 flex-grow">
          {/* Top Team Input Row */}
          <div className="flex justify-between items-center pr-4 md:pr-8">
            <span className="font-extrabold text-slate-900 text-lg">{team1Name}</span>
            <input 
              type="text" 
              inputMode="numeric"
              pattern="[0-9]*"
              value={score1} 
              onChange={(e) => setScore1(e.target.value)} 
              placeholder="Score" 
              className="w-20 px-3 py-2 border border-slate-400 rounded-md text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 text-center" 
            />
          </div>
          
          {/* Bottom Team Input Row */}
          <div className="flex justify-between items-center pr-4 md:pr-8">
            <span className="font-extrabold text-slate-900 text-lg">{team2Name}</span>
            <input 
              type="text" 
              inputMode="numeric"
              pattern="[0-9]*"
              value={score2} 
              onChange={(e) => setScore2(e.target.value)} 
              placeholder="Score" 
              className="w-20 px-3 py-2 border border-slate-400 rounded-md text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 text-center" 
            />
          </div>
        </div>
      </div>

      <button 
        onClick={() => onUpdate(game.id, parseInt(score1), parseInt(score2), game.next_game_id, game.team1_id, game.team2_id)}
        disabled={!score1 || !score2 || score1 === score2}
        className="w-full md:w-auto md:ml-4 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-bold tracking-wide disabled:opacity-50 transition-colors"
      >
        Submit Final
      </button>
    </div>
  );
}