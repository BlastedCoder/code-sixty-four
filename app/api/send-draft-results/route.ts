// app/api/send-draft-results/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// We MUST use the service_role key here to bypass RLS and access user emails
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PickWithTeam {
  user_id: string;
  teams: {
    name: string;
    seed: number;
    region: string;
  };
}

interface MemberWithProfile {
  user_id: string;
  profiles: {
    display_name: string;
  };
}

export async function POST(req: Request) {
  try {
    const { leagueId } = await req.json();
    console.log("1. Received League ID:", leagueId);

    // Fetch all three pieces of data in parallel instead of sequentially
    const [
      { data: league, error: leagueError },
      { data: picks, error: picksError },
      { data: members, error: membersError }
    ] = await Promise.all([
      supabaseAdmin
        .from('leagues')
        .select('name')
        .eq('id', leagueId)
        .single(),
      supabaseAdmin
        .from('draft_picks')
        .select(`
          user_id,
          team_id,
          teams ( name, seed, region )
        `)
        .eq('league_id', leagueId),
      supabaseAdmin
        .from('league_members')
        .select(`
          user_id,
          profiles ( display_name )
        `)
        .eq('league_id', leagueId)
    ]);

    if (leagueError) console.error("Supabase League Error:", leagueError);
    if (picksError) console.error("Supabase Picks Error:", picksError);
    if (membersError) console.error("Supabase Members Error:", membersError);

    if (!members || !picks || !league) {
      throw new Error(`Missing data! League exists: ${!!league}, Picks exist: ${!!picks}, Members exist: ${!!members}`);
    }

    const typedMembers = members as unknown as MemberWithProfile[];
    const typedPicks = picks as unknown as PickWithTeam[];

    // 4. Build Rosters and Fetch Emails independently
    const emailPromises = typedMembers.map(async (m) => {

      // A. Build this user's picks regardless of whether they have a valid email
      const userPicks = typedPicks
        .filter(p => p.user_id === m.user_id)
        .map(p => `<li>(${p.teams.seed}) ${p.teams.name} - ${p.teams.region}</li>`)
        .join('');

      const rosterHtml = `
        <h3 style="color: #0f172a; margin-top: 20px;">${m.profiles.display_name}'s Squad</h3>
        <ul style="color: #475569; padding-left: 20px;">${userPicks}</ul>
      `;

      // B. Try to fetch their email for delivery
      let userEmail = null;
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(m.user_id);

      if (!authError && authData?.user?.email) {
        userEmail = authData.user.email;
      } else {
        console.warn(`No valid email found for ${m.profiles.display_name}. Roster will be included, but email skipped.`);
      }

      return {
        email: userEmail,
        rosterHtml: rosterHtml
      };
    });

    const allMemberData = await Promise.all(emailPromises);

    // 5. Build the master HTML using EVERYONE'S roster (no filtering out null emails here!)
    const allRostersHtml = allMemberData.map(md => md.rosterHtml).join('');

    const emailHtml = `
      <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #059669;">The Draft is Complete! 🏀</h1>
        <p style="color: #334155; font-size: 16px;">
          The war room has closed for <strong>${league.name}</strong>. The board is locked. 
          Here are the final rosters heading into the tournament:
        </p>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
          ${allRostersHtml}
        </div>

        <p style="color: #64748b; font-size: 14px; margin-top: 30px; text-align: center;">
          Log in to <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://your-vercel-url.com'}" style="color: #059669;">Code Sixty Four</a> to follow the live bracket!
        </p>
      </div>
    `;

    // 6. Blast the email ONLY to the users who actually have an email address
    const validEmails = allMemberData.map(md => md.email).filter(Boolean) as string[];
    console.log("Successfully generated rosters for:", validEmails);

    // Send via Resend and capture any errors
    const { data: resendData, error: resendError } = await resend.emails.send({
      from: 'onboarding@resend.dev', // MUST be this while testing
      to: ['dnewton685@gmail.com'], // ⚠️ TESTING ONLY — replace with `validEmails` before going live
      subject: `🏆 Draft Results: ${league.name}`,
      html: emailHtml,
    });

    // If Resend rejects it, log the exact reason to the terminal!
    if (resendError) {
      console.error("Resend API Error:", resendError);
      return NextResponse.json({ error: resendError.message }, { status: 500 });
    }

    console.log("Resend Success!", resendData);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Catch Block Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}