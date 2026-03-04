// app/join/[code]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export default function JoinLeaguePage() {
  const { code } = useParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your invite...');

  useEffect(() => {
    const joinLeague = async () => {
      // 1. Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Store the invite code in local storage to join after they log in
        localStorage.setItem('pending_invite_code', code as string);
        router.push(`/login?returnTo=/join/${code}`);
        return;
      }

      // 2. Find the league AND count current members
      const { data: league, error: leagueError } = await supabase
        .from('leagues')
        .select(`
            id, 
            name,
            status, 
            max_members,
            league_members (count)
        `)
        .eq('invite_code', code)
        .single();

      // Always check for errors/null BEFORE checking properties like status
      if (leagueError || !league) {
        setStatus('error');
        setMessage('Invalid invite code.');
        return;
      }

      if (league.status !== 'pre_draft') {
        setStatus('error');
        setMessage('This league is already in progress or locked.');
        return;
      }

      // 3. Check if user is already a member BEFORE attempting insert
      const { data: existingMember } = await supabase
        .from('league_members')
        .select('id')
        .eq('league_id', league.id)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (existingMember) {
        // Already a member — redirect directly (status check above still applies)
        router.push(`/leagues/${league.id}`);
        return;
      }

      // 4. Check if the league is full
      const currentCount = league.league_members[0]?.count || 0;
      if (currentCount >= league.max_members) {
        setStatus('error');
        setMessage(`Sorry, ${league.name} is full (Limit: ${league.max_members} players).`);
        return;
      }

      // 5. Proceed with the insertion if not full
      const { error: joinError } = await supabase
        .from('league_members')
        .insert({
          league_id: league.id,
          user_id: session.user.id,
        });

      if (joinError) {
        // Handle race condition where they join between our check and insert
        if (joinError.code === '23505') {
          router.push(`/leagues/${league.id}`);
          return;
        }
        setStatus('error');
        setMessage('Could not join the league. It might be full or closed.');
      } else {
        setStatus('success');
        setMessage(`Success! You have joined ${league.name}.`);
        setTimeout(() => router.push(`/leagues/${league.id}`), 2000);
      }
    };

    if (code) joinLeague();
  }, [code, router]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center">
        {status === 'loading' && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto" />
            <h1 className="text-xl font-bold text-slate-800">{message}</h1>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
            <h1 className="text-xl font-bold text-slate-800">{message}</h1>
            <p className="text-slate-500">Redirecting to the league home...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h1 className="text-xl font-bold text-slate-800">Oops!</h1>
            <p className="text-slate-600 font-medium">{message}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </main>
  );
}