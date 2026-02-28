import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use the Service Role key to bypass RLS for developer actions
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // 1. Security Check: Block this in production!
    if (process.env.NEXT_PUBLIC_ENABLE_DEV_MODE !== 'true') {
      return NextResponse.json({ error: "Dev mode disabled" }, { status: 403 });
    }

    const { leagueId } = await req.json();

    if (!leagueId) {
      return NextResponse.json({ error: "Missing league ID" }, { status: 400 });
    }

    // 2. Fetch the current members of the league so we don't duplicate them
    const { data: currentMembers, error: membersError } = await supabaseAdmin
      .from('league_members')
      .select('user_id')
      .eq('league_id', leagueId);

    if (membersError) throw membersError;

    const currentMemberIds = currentMembers.map(m => m.user_id);
    const slotsAvailable = 8 - currentMemberIds.length;

    if (slotsAvailable <= 0) {
      return NextResponse.json({ message: "League is already full!" });
    }

    // 3. Fetch random test users from profiles who aren't already in the league
    const { data: testUsers, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .not('id', 'in', `(${currentMemberIds.join(',')})`)
      .limit(slotsAvailable);

    if (usersError) throw usersError;

    if (!testUsers || testUsers.length === 0) {
      return NextResponse.json({ error: "No available test users found in profiles." }, { status: 400 });
    }

    // 4. Build the payload and insert them into the league
    const insertPayload = testUsers.map(u => ({
      league_id: leagueId,
      user_id: u.id
    }));

    const { error: insertError } = await supabaseAdmin
      .from('league_members')
      .insert(insertPayload);

    if (insertError) throw insertError;

    return NextResponse.json({ 
      success: true, 
      message: `Added ${testUsers.length} test users to the league.` 
    });

  } catch (error: any) {
    console.error("Dev Populate Users Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}