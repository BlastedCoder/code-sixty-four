// app/leagues/[id]/draft/page.tsx
'use client';
import { toast } from 'sonner';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Copy, CheckCircle, Loader2 } from 'lucide-react';
import DraftBoard from '@/components/DraftBoard';
import DevPanel from '@/components/DevPanel';

export default function LiveDraftRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: leagueId } = use(params);

  const [league, setLeague] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [draftPicks, setDraftPicks] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // NEW: Loading state to prevent hydration errors
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadDraftRoom = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/login');
      setUser(session.user);

      const [
        { data: lData, error: lError },
        { data: tData },
        { data: mData, error: mError },
        { data: dpData, error: dpError }
      ] = await Promise.all([
        supabase.from('leagues').select('*').eq('id', leagueId).single(),
        supabase.from('teams').select('*').order('id', { ascending: true }),
        supabase.from('league_members').select('*, profiles(display_name)').eq('league_id', leagueId),
        supabase.from('draft_picks').select('*').eq('league_id', leagueId)
      ]);

      if (lError) setFetchError(`League fetch failed: ${lError.message}`);
      if (mError) setFetchError(`Members fetch failed: ${mError.message}`);
      if (dpError) setFetchError(`Draft picks fetch failed: ${dpError.message}`);

      // 🛡️ THE BOUNCER: Check membership
      if (mData && session.user) {
        const isMember = mData.some((m: any) => m.user_id === session.user.id);
        if (!isMember) return router.push('/leagues');
      }

      // 🛡️ THE SECOND BOUNCER: Check if the draft has actually started
      if (lData && lData.status === 'pre_draft') {
        toast.error("The draft hasn't started yet!");
        return router.push(`/leagues/${leagueId}`);
      }

      if (lData) setLeague(lData);
      if (tData) setTeams(tData);
      if (mData) setMembers(mData);
      if (dpData) setDraftPicks(dpData);

      // Tell the component it is safe to render the board now
      setLoading(false);
    };

    loadDraftRoom();

    // Set up WebSockets — handles both new picks (INSERT) and undone picks (DELETE)
    const channel = supabase.channel(`draft-room-${leagueId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'draft_picks', filter: `league_id=eq.${leagueId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setDraftPicks((prev) => [...prev, payload.new]);
          } else if (payload.eventType === 'DELETE') {
            setDraftPicks((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leagues', filter: `id=eq.${leagueId}` },
        (payload) => setLeague(payload.new)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [leagueId, router]);

  // --- COMMISSIONER CONTROLS ---

  // 1. Make a Pick (Now supports Proxy Drafting)
  const handleDraftTeam = async (teamId: number, pickUserId: string, canDraft: boolean) => {
    if (!league || !user) return;
    if (!canDraft) return toast.error("You cannot make a pick right now.");

    // Insert the pick using the ID of the person ON THE CLOCK
    const { error: pickError } = await supabase.from('draft_picks').insert({
      league_id: league.id,
      user_id: pickUserId,
      team_id: teamId,
      pick_number: league.current_pick
    });

    if (pickError) return toast.error('making pick: ' + pickError.message);

    await supabase.from('leagues')
      .update({ current_pick: league.current_pick + 1, current_pick_started_at: league.draft_timer_seconds > 0 ? new Date().toISOString() : null })
      .eq('id', league.id);
  };

  // 2. Undo the Last Pick
  const handleUndoPick = async () => {
    if (league.current_pick <= 1) return;
    const pickToUndo = league.current_pick - 1;

    await supabase.from('draft_picks')
      .delete()
      .eq('league_id', league.id)
      .eq('pick_number', pickToUndo);

    await supabase.from('leagues')
      .update({ current_pick: pickToUndo })
      .eq('id', league.id);
  };

  // 3. Pause / Resume Draft
  const handleTogglePause = async (secondsLeft?: number) => {
    try {
      const isPausing = league.status !== 'paused';
      const newStatus = isPausing ? 'paused' : 'drafting';
      let updates: any = { status: newStatus };

      if (league.draft_timer_seconds > 0) {
        if (isPausing && secondsLeft !== undefined) {
          // Encode the remaining seconds into an absolute 1970 epoch date while paused
          updates.current_pick_started_at = new Date(secondsLeft * 1000).toISOString();
        } else if (!isPausing && league.current_pick_started_at) {
          // Decode the remaining seconds from the 1970 epoch date
          const savedDate = new Date(league.current_pick_started_at);
          // Ensure it's the 1970 encoded date (year 1970)
          let savedSecondsLeft = league.draft_timer_seconds;
          if (savedDate.getUTCFullYear() === 1970) {
            savedSecondsLeft = savedDate.getTime() / 1000;
          }

          // Calculate the elapsed time and set a new start time from NOW
          const elapsed = league.draft_timer_seconds - savedSecondsLeft;
          updates.current_pick_started_at = new Date(Date.now() - (elapsed * 1000)).toISOString();
        }
      }

      console.log('Sending pause updates:', updates);
      const { error } = await supabase.from('leagues')
        .update(updates)
        .eq('id', league.id);

      if (error) {
        console.error('Pause error:', error);
        toast.error('Failed to toggle pause: ' + error.message);
      }
    } catch (err: any) {
      console.error('Pause exception:', err);
      toast.error('Error toggling pause: ' + err.message);
    }
  };

  const handleFinalizeDraft = async () => {
    // Prevent double-clicks
    // setIsFinalizing(true); 

    const { count, error: countError } = await supabase
      .from('draft_picks')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', league.id);

    if (countError || count !== 64) {
      toast.error(`Cannot finalize. Found ${count}/64 picks.`);
      // setIsFinalizing(false);
      return;
    }

    const { error } = await supabase
      .from('leagues')
      .update({ status: 'in_progress' })
      .eq('id', league.id);

    if (!error) {
      // 2. AWAIT THE EMAILS FIRST
      await sendDraftResults();

      // 3. THEN NAVIGATE AWAY
      router.push(`/leagues/${league.id}`);
    } else {
      toast.error("locking league. Please try again.");
      // setIsFinalizing(false);
    }
  };

  const sendDraftResults = async () => {
    try {
      const response = await fetch('/api/send-draft-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId: league.id })
      });

      if (!response.ok) {
        console.error("Failed to send draft emails");
        toast.error("League finalized, but the emails failed to send.");
      } else {
        toast.success("Draft complete! Results emailed to the league.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/join/${league.invite_code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- RENDERING GUARDS ---

  if (fetchError) return <div className="p-12 text-center text-red-600 font-bold bg-red-50 m-6 rounded-lg">{fetchError}</div>;

  // FIX: Wait for data before rendering the board to avoid Hydration Error
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">Loading Draft Board...</h2>
      </div>
    );
  }

  // FIX: Extra safety check to prevent rendering a blank board
  if (!teams || teams.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="p-8 text-center text-red-500 font-bold bg-white dark:bg-card border border-red-200 rounded-xl shadow-sm">
          Error: No tournament teams found in the database.
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-background p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* League Header */}
        <section>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {league?.name || 'League'}
          </h1>
        </section>

        {/* FIX: DraftBoard passed correctly with all necessary props */}
        <DraftBoard
          league={league}
          teams={teams}
          members={members}
          draftPicks={draftPicks}
          currentUser={user}
          timerSeconds={league?.draft_timer_seconds || 0}
          pickStartedAt={league?.current_pick_started_at || null}
          onDraftTeam={handleDraftTeam}
          onUndoPick={handleUndoPick}
          onTogglePause={handleTogglePause}
          onFinalizeDraft={handleFinalizeDraft}
        />

      </div>
      <DevPanel leagueId={leagueId} />
    </main>
  );
}