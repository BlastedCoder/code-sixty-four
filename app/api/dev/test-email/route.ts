// app/api/dev/test-email/route.ts

import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
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

    // 1. Fetch league details to put in the email
    const { data: league } = await supabaseAdmin
      .from('leagues')
      .select('name')
      .eq('id', leagueId)
      .single();

    // 2. Fire the test email using your preferred testing address
    // (Resend requires sending from a verified domain, or 'onboarding@resend.dev' if testing)
    const { data, error } = await resend.emails.send({
      from: 'Code Sixty Four <onboarding@resend.dev>', // Update this when your domain is verified
      to: ['dnewton685@gmail.com'], // Hardcoded to your test inbox
      subject: `[Dev Test] Draft Completed: ${league?.name || 'Test League'}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h1 style="color: #0f172a;">Your Draft is Complete!</h1>
          <p>This is a test email triggered from the Code Sixty Four Developer Panel.</p>
          <p>League ID: <strong>${leagueId}</strong></p>
          <hr style="border: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">
            To modify this template, check your API route or React Email components.
          </p>
        </div>
      `,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ 
      success: true, 
      message: "Test email successfully fired to your inbox." 
    });

  } catch (error: any) {
    console.error("Test Email Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}