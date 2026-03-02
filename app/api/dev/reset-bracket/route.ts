// app/api/dev/reset-bracket/route.ts
// Path: app/api/dev/reset-bracket/route.ts

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

    // 1. Reset team wins back to zero on the global teams table
    const { error: teamsError } = await supabaseAdmin
      .from('teams')
      .update({ 
        wins: 0,
        is_eliminated: false
       })
      .gt('id', 0);

    if (teamsError) throw teamsError;

    // 2. Scrub the game results for ALL rounds
    const { error: gamesError } = await supabaseAdmin
      .from('games')
      .update({ 
        team1_score: null,
        team2_score: null,
        winner_id: null,
        is_completed: false
      })
      .gt('id', 0); // Safely targets all rows

    if (gamesError) throw gamesError;

    // 3. Clear the advancing teams out of Rounds 2 through 6
    // (We leave Round 1 alone so the initial bracket matchups aren't destroyed!)
    const { error: advancedTeamsError } = await supabaseAdmin
      .from('games')
      .update({ 
        team1_id: null,
        team2_id: null
      })
      .gt('round', 1);

    if (advancedTeamsError) throw advancedTeamsError;

    return NextResponse.json({ 
      success: true, 
      message: "Bracket wins and game scores have been completely reset to a clean slate." 
    });

  } catch (error: any) {
    console.error("Reset Bracket Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}