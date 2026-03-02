// app/api/dev/simulate-pick/route.ts
// Path: app/api/dev/simulate-pick/route.ts

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

    const { leagueId } = await req.json();
    if (!leagueId) return NextResponse.json({ error: "Missing league ID" }, { status: 400 });

    // 1. Fetch the entire draft board
    const { data: picks, error: picksError } = await supabaseAdmin
      .from('draft_picks')
      .select('*')
      .eq('league_id', leagueId)
      .order('pick_number', { ascending: true });

    if (picksError) throw picksError;

    // 2. Find the exact pick that is currently "On the Clock"
    const currentPick = picks.find(p => !p.team_id);
    
    if (!currentPick) {
      return NextResponse.json({ message: "Draft is already complete!" });
    }

    // 3. Find the best available team
    const draftedTeamIds = picks.filter(p => p.team_id).map(p => p.team_id);
    
    const { data: availableTeams, error: teamsError } = await supabaseAdmin
      .from('teams')
      .select('*')
      .not('id', 'in', `(${draftedTeamIds.length > 0 ? draftedTeamIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
      .order('seed', { ascending: true })
      .limit(1);

    if (teamsError) throw teamsError;
    if (!availableTeams || availableTeams.length === 0) {
      return NextResponse.json({ error: "No available teams left in the database." }, { status: 400 });
    }

    const teamToDraft = availableTeams[0];

    // 4. Execute the pick in the draft board!
    const { error: updateError } = await supabaseAdmin
      .from('draft_picks')
      .update({ team_id: teamToDraft.id })
      .eq('id', currentPick.id);

    if (updateError) throw updateError;

    // 5. Increment the league's pick counter (and activate if it was the last pick)
    await supabaseAdmin
      .from('leagues')
      .update({ 
        current_pick: currentPick.pick_number + 1,
        status: currentPick.pick_number === 64 ? 'active' : 'drafting'
      })
      .eq('id', leagueId);

    return NextResponse.json({ 
      success: true, 
      message: `Simulated Pick #${currentPick.pick_number}: Auto-drafted the ${teamToDraft.seed}-seed.` 
    });

  } catch (error: any) {
    console.error("Simulate Single Pick Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}