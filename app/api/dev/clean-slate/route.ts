// app/api/dev/clean-slate/route.ts
// Path: app/api/dev/clean-slate/route.ts

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

    // 1. Delete all draft picks for this specific league
    const { error: picksError } = await supabaseAdmin
      .from('draft_picks')
      .delete()
      .eq('league_id', leagueId);
    
    if (picksError) throw picksError;

    // 2. Fetch the commissioner ID so we don't accidentally boot you!
    const { data: league, error: leagueError } = await supabaseAdmin
      .from('leagues')
      .select('created_by') 
      .eq('id', leagueId)
      .single();

    if (leagueError) throw leagueError;

    // 3. Kick out all members EXCEPT the commissioner
    if (league?.created_by) {
      const { error: membersError } = await supabaseAdmin
        .from('league_members')
        .delete()
        .eq('league_id', leagueId)
        .neq('user_id', league.created_by);
      
      if (membersError) throw membersError;
    }

    // 4. Reset the league status AND the pick counter back to the starting line
    const { error: statusError } = await supabaseAdmin
      .from('leagues')
      .update({ 
        status: 'pre_draft',
        current_pick: 1 
      }) 
      .eq('id', leagueId);

    if (statusError) throw statusError;

    return NextResponse.json({ 
      success: true, 
      message: "League nuked! Welcome back to a clean slate." 
    });

  } catch (error: any) {
    console.error("Clean Slate Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}