// app/api/send-draft-results/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Service role key to bypass RLS and access user emails
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PickWithTeam {
  user_id: string;
  pick_number: number;
  teams: {
    name: string;
    seed: number;
    region: string;
  };
}

interface MemberWithProfile {
  user_id: string;
  draft_position: number;
  profiles: {
    display_name: string;
  };
}

export async function POST(req: Request) {
  try {
    const { leagueId } = await req.json();

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
        .select('user_id, pick_number, teams ( name, seed, region )')
        .eq('league_id', leagueId)
        .order('pick_number', { ascending: true }),
      supabaseAdmin
        .from('league_members')
        .select('user_id, draft_position, profiles ( display_name )')
        .eq('league_id', leagueId)
    ]);

    if (leagueError || picksError || membersError || !members || !picks || !league) {
      throw new Error(`Missing data! League: ${!!league} (${leagueError?.message || 'no err'}), Picks: ${!!picks} (${picksError?.message || 'no err'}), Members: ${!!members} (${membersError?.message || 'no err'})`);
    }

    const typedMembers = members as unknown as MemberWithProfile[];
    const typedPicks = picks as unknown as PickWithTeam[];

    // Build roster data with emails
    const memberData = await Promise.all(typedMembers.map(async (m) => {
      const userPicks = typedPicks
        .filter(p => p.user_id === m.user_id)
        .sort((a, b) => a.pick_number - b.pick_number);

      // Fetch email via admin auth
      let userEmail = null;
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(m.user_id);
      if (!authError && authData?.user?.email) {
        userEmail = authData.user.email;
      }

      return {
        email: userEmail,
        name: m.profiles.display_name,
        draftPosition: m.draft_position,
        picks: userPicks,
      };
    }));

    // Sort by draft position for display
    memberData.sort((a, b) => (a.draftPosition || 99) - (b.draftPosition || 99));

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://codesixtyfour.com';

    // Build polished HTML email
    const allRostersHtml = memberData.map((m, idx) => `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
        <tr>
          <td style="background: ${idx % 2 === 0 ? '#f8fafc' : '#f1f5f9'}; border-radius: 12px; padding: 16px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-bottom: 12px; border-bottom: 2px solid #e2e8f0;">
                  <span style="font-size: 18px; font-weight: 800; color: #0f172a;">${m.name}</span>
                  <span style="font-size: 12px; color: #94a3b8; margin-left: 8px; font-weight: 600;">Draft Position #${m.draftPosition || '—'}</span>
                </td>
              </tr>
              ${m.picks.map(p => `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                  <table cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td width="36" style="text-align: center;">
                        <span style="display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; border-radius: 50%; background: #059669; color: white; font-size: 11px; font-weight: 800;">
                          #${p.pick_number}
                        </span>
                      </td>
                      <td style="padding-left: 10px;">
                        <span style="font-weight: 700; color: #1e293b; font-size: 14px;">(${p.teams.seed}) ${p.teams.name}</span>
                        <br/>
                        <span style="font-size: 11px; color: #94a3b8; font-weight: 600;">${p.teams.region} Region</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`).join('')}
            </table>
          </td>
        </tr>
      </table>
    `).join('');

    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 32px 16px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px 16px 0 0; padding: 32px 28px; text-align: center;">
                  <p style="margin: 0 0 4px 0; font-size: 12px; color: #94a3b8; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">Code Sixty Four</p>
                  <h1 style="margin: 0; font-size: 28px; color: white; font-weight: 800;">The Draft is Complete! 🏀</h1>
                  <p style="margin: 12px 0 0 0; font-size: 15px; color: #94a3b8;">
                    The war room for <strong style="color: #10b981;">${league.name}</strong> has closed.<br/>
                    The board is locked. Here are the final rosters.
                  </p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="background: white; padding: 28px 24px;">

                  <p style="margin: 0 0 24px 0; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                    📋 All Rosters (${typedPicks.length} Picks · ${memberData.length} Players)
                  </p>

                  ${allRostersHtml}

                </td>
              </tr>

              <!-- CTA -->
              <tr>
                <td style="background: white; padding: 0 24px 28px 24px; text-align: center;">
                  <a href="${siteUrl}" style="display: inline-block; background: #059669; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 800; font-size: 15px;">
                    View Live Bracket →
                  </a>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background: #f8fafc; border-radius: 0 0 16px 16px; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: 600;">
                    Code Sixty Four — Draft. Compete. Win.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    // Send via Resend
    // Resend's free tier ONLY allows sending to the verified owner email.
    // To prevent the entire draft from failing for everyone, we must filter out unverified emails 
    // unless a proper domain is verified in Resend.
    let validEmails = memberData.map(md => md.email).filter(Boolean) as string[];

    // Safety check for Resend Free Tier 
    // (Remove this restriction once you verify a real domain on resend.com)
    const isDevelopmentOrUnverified = true; // Set to false when you verify your domain
    if (isDevelopmentOrUnverified) {
      console.warn("Draft Email API - Forcing emails to ONLY go to the verified test address (dnewton685@gmail.com).");
      validEmails = validEmails.filter(e => e.toLowerCase() === 'dnewton685@gmail.com');

      // If none of the drafted players are the dev, send a copy to the dev anyway so the API doesn't fail
      if (validEmails.length === 0) {
        validEmails = ['dnewton685@gmail.com'];
      }
    }

    console.log("Attempting to send email via Resend to:", validEmails);

    if (!process.env.RESEND_API_KEY) {
      console.error("Draft Email API - CRITICAL: RESEND_API_KEY is entirely missing from environment variables!");
    }

    const { data: resendData, error: resendError } = await resend.emails.send({
      from: 'onboarding@resend.dev', // Replace with verified domain (e.g., 'Draft <noreply@codesixtyfour.com>') in production
      to: validEmails,
      subject: `🏆 Draft Results: ${league.name}`,
      html: emailHtml,
    });

    if (resendError) {
      console.error("Resend API Full Error Object:", JSON.stringify(resendError, null, 2));
      return NextResponse.json({ error: resendError.message, details: resendError }, { status: 500 });
    }

    console.log("Resend Success API Response:", resendData);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Draft email catch block error:", error);
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
