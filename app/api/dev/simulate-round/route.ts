// app/api/dev/simulate-round/route.ts
// Path: app/api/dev/simulate-round/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    if (process.env.NEXT_PUBLIC_ENABLE_DEV_MODE !== 'true') {
      return NextResponse.json({ error: "Dev mode disabled" }, { status: 403 });
    }

    // 1. Fetch all games and teams
    const { data: allGames, error: gamesError } = await supabaseAdmin
      .from('games')
      .select('*')
      .order('id', { ascending: true });

    const { data: teams, error: teamsError } = await supabaseAdmin
      .from('teams')
      .select('*');

    if (gamesError) throw gamesError;
    if (teamsError) throw teamsError;

    // 2. Find the lowest round that still has uncompleted games
    const uncompletedGames = allGames.filter(g => !g.is_completed);
    
    if (uncompletedGames.length === 0) {
      return NextResponse.json({ message: "Tournament is already over! A champion has been crowned." });
    }

    const currentRound = Math.min(...uncompletedGames.map(g => g.round));
    const gamesToSimulate = uncompletedGames.filter(g => g.round === currentRound);

    const gameUpdates = [];
    const nextGameUpdates: any[] = [];
    const teamUpdates = [];

    // 3. Simulate each game in the current round
    for (const game of gamesToSimulate) {
      if (!game.team1_id || !game.team2_id) continue; // Skip if matchups aren't set yet

      const team1 = teams.find(t => t.id === game.team1_id);
      const team2 = teams.find(t => t.id === game.team2_id);

      if (!team1 || !team2) continue;

      // Calculate winner using seed weighting (e.g., 1-seed heavily favored over 16-seed)
      const totalSeeds = team1.seed + team2.seed;
      const team1WinProb = team2.seed / totalSeeds; 
      
      const isTeam1Winner = Math.random() <= team1WinProb;
      const winner = isTeam1Winner ? team1 : team2;
      const loser = isTeam1Winner ? team2 : team1;

      // Generate realistic basketball scores (Winner: 70-95, Loser: 55-69)
      const winningScore = Math.floor(Math.random() * 26) + 70; 
      const losingScore = Math.floor(Math.random() * 15) + 55;

      // Update the current game's box score
      gameUpdates.push({
        ...game, 
        winner_id: winner.id,
        team1_score: isTeam1Winner ? winningScore : losingScore,
        team2_score: isTeam1Winner ? losingScore : winningScore,
        is_completed: true
      });

      // Update the winning team's global win count (for the Results Panel!)
      teamUpdates.push({
        ...winner, 
        wins: (winner.wins || 0) + 1
      });

      // Update the losing team so the UI turns them red!
      teamUpdates.push({
        ...loser,
        is_eliminated: true
      });

      // 4. Advance the winner into the next bracket slot
      if (game.next_game_id) {
        const nextGame = allGames.find(g => g.id === game.next_game_id);
        
        if (nextGame) {
          // Check if we've already queued an update for this next game from the other branch
          let queuedNextGame = nextGameUpdates.find(g => g.id === game.next_game_id);
          
          if (!queuedNextGame) {
            queuedNextGame = { ...nextGame }; 
            nextGameUpdates.push(queuedNextGame);
          }

          // Slot the winner into the first available spot in the next game
          if (!queuedNextGame.team1_id) {
            queuedNextGame.team1_id = winner.id;
          } else {
            queuedNextGame.team2_id = winner.id;
          }
        }
      }
    }

    // 5. Combine game updates (current round + next round advancements)
    const allGameUpdates = [...gameUpdates, ...nextGameUpdates];

    if (allGameUpdates.length > 0) {
      const { error: gameUpdateError } = await supabaseAdmin
        .from('games')
        .upsert(allGameUpdates);

      if (gameUpdateError) throw gameUpdateError;
    }

    // 6. Update the teams table so the Results Panel syncs up
    if (teamUpdates.length > 0) {
      const { error: teamUpdateError } = await supabaseAdmin
        .from('teams')
        .upsert(teamUpdates);

      if (teamUpdateError) throw teamUpdateError;
    }

    return NextResponse.json({ 
      success: true, 
      message: `Simulated Round ${currentRound}! ${gameUpdates.length} games completed.` 
    });

  } catch (error: any) {
    console.error("Tournament Simulator Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}