// Path: app\api\dev\autocomplete-draft\route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    console.log("🏁 AUTO-DRAFT: Script Started");

    if (process.env.NEXT_PUBLIC_ENABLE_DEV_MODE !== 'true') {
      console.log("❌ AUTO-DRAFT: Dev mode disabled");
      return NextResponse.json({ error: "Dev mode disabled" }, { status: 403 });
    }

    const { leagueId } = await req.json();
    if (!leagueId) return NextResponse.json({ error: "Missing league ID" }, { status: 400 });

    console.log(`🔍 AUTO-DRAFT: Fetching members for League ${leagueId}`);
    
    // FETCH MEMBERS (Using the correct draft_position column!)
    const { data: members, error: membersError } = await supabaseAdmin
      .from('league_members')
      .select('user_id')
      .eq('league_id', leagueId)
      .order('draft_position', { ascending: true });

    if (membersError) throw membersError;
    if (!members || members.length === 0) throw new Error("No members found in this league");

    const userIds = members.map(m => m.user_id);
    console.log(`✅ AUTO-DRAFT: Found ${userIds.length} members`);

    // FETCH TEAMS
    const { data: teams, error: teamsError } = await supabaseAdmin
      .from('teams')
      .select('*')
      .order('seed', { ascending: true });

    if (teamsError) throw teamsError;

    // FETCH CURRENT PICKS
    const { data: currentPicks, error: picksError } = await supabaseAdmin
      .from('draft_picks')
      .select('*')
      .eq('league_id', leagueId);

    if (picksError) throw picksError;

    const draftedTeamIds = currentPicks.map(p => p.team_id);
    const availableTeams = teams.filter(t => !draftedTeamIds.includes(t.id));

    console.log(`🏀 AUTO-DRAFT: ${availableTeams.length} teams available to draft`);

    if (availableTeams.length === 0) {
      console.log("🛑 AUTO-DRAFT: Draft already complete. Forcing status update just in case.");
      // Force the league to update if it got stuck!
      await supabaseAdmin.from('leagues').update({ status: 'in_progress', current_pick: 65 }).eq('id', leagueId);
      return NextResponse.json({ message: "Draft was already complete. Status forced to in_progress." });
    }

    // GENERATE PICKS
    const newPicks = [];
    let currentPickNumber = currentPicks.length > 0 ? Math.max(...currentPicks.map(p => p.pick_number)) + 1 : 1;

    for (let i = 0; i < availableTeams.length; i++) {
      const round = Math.ceil(currentPickNumber / userIds.length);
      const positionInRound = (currentPickNumber - 1) % userIds.length;
      const isReverseRound = round % 2 === 0;
      const userIndex = isReverseRound ? (userIds.length - 1 - positionInRound) : positionInRound;

      newPicks.push({
        league_id: leagueId,
        user_id: userIds[userIndex],
        team_id: availableTeams[i].id,
        pick_number: currentPickNumber
      });

      currentPickNumber++;
    }

    console.log(`💾 AUTO-DRAFT: Inserting ${newPicks.length} picks into database...`);

    // INSERT PICKS
    if (newPicks.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('draft_picks')
        .insert(newPicks);

      if (insertError) throw insertError;
    }

    console.log(`🔒 AUTO-DRAFT: Locking league. Updating status to 'in_progress' and pick to 65.`);

    // UPDATE LEAGUE (Now with proper error checking!)
    const { error: leagueUpdateError } = await supabaseAdmin
      .from('leagues')
      .update({ 
        status: 'in_progress', // Matches what the dashboard expects!
        current_pick: 65
      })
      .eq('id', leagueId);

    if (leagueUpdateError) throw leagueUpdateError;

    console.log("🎉 AUTO-DRAFT: Mission Accomplished!");

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("🚨 AUTO-DRAFT CRASHED:", error.message || error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}