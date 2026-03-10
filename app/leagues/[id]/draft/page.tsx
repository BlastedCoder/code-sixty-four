// app/leagues/[id]/draft/page.tsx
'use client';
import { toast } from 'sonner';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  Menu, X, CheckCircle, ShieldAlert, Trophy, ShieldHalf,
  SendHorizontal, Loader2, Volume2, VolumeX, Mail, Search, Info, MessageSquare, Check, Share2
} from 'lucide-react';
import DraftBoard from '@/components/DraftBoard';
import DevPanel from '@/components/DevPanel';
import FloatingChat from '@/components/FloatingChat';

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
        supabase.from('league_members').select('*, profiles(display_name, avatar_url)').eq('league_id', leagueId),
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

      // Note: pre_draft is now allowed — commissioners will see a "Start Draft" button
      // and all players can see the war room before it begins

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

    const { error: pickError } = await supabase.from('draft_picks').insert({
      league_id: league.id,
      user_id: pickUserId,
      team_id: teamId,
      pick_number: league.current_pick
    });

    if (pickError) return toast.error('making pick: ' + pickError.message);

    // Also dispatch a system chat message announcing the pick
    const teamName = teams.find(t => t.id === teamId)?.name || 'a team';
    const playerName = members.find((u: any) => u.user_id === pickUserId)?.profiles?.display_name || 'A player';

    await supabase.from('league_messages').insert({
      league_id: league.id,
      user_id: null, // System message (no associated user profile)
      message: `🏀 **${playerName}** selected **${teamName}** with Pick #${league.current_pick}!`
    });

    await supabase.from('leagues')
      .update({ current_pick: league.current_pick + 1, current_pick_started_at: league.draft_timer_seconds > 0 ? new Date().toISOString() : null })
      .eq('id', league.id);
  };

  // 2. Undo the Last Pick
  const handleUndoPick = async () => {
    if (league.status !== 'paused') {
      return toast.error("The draft must be paused to undo a pick.");
    }
    if (league.current_pick <= 1) return;
    const pickToUndo = league.current_pick - 1;

    await supabase.from('draft_picks')
      .delete()
      .eq('league_id', league.id)
      .eq('pick_number', pickToUndo);

    await supabase.from('leagues')
      .update({
        current_pick: pickToUndo,
        // Reset the clock for the undone pick. Since the draft is Paused, 
        // we store the full limit in remaining_seconds so it starts fresh on Resume.
        ...(league.draft_timer_seconds > 0 ? {
          remaining_seconds_on_pause: league.draft_timer_seconds,
          current_pick_started_at: null
        } : {})
      })
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
          // Store the remaining seconds explicitly
          updates.remaining_seconds_on_pause = Math.max(0, Math.round(secondsLeft));
        } else if (!isPausing) {
          // Resume: calculate a new start time so the timer picks up where it left off
          const saved = league.remaining_seconds_on_pause ?? league.draft_timer_seconds;
          const elapsed = league.draft_timer_seconds - saved;
          updates.current_pick_started_at = new Date(Date.now() - (elapsed * 1000)).toISOString();
          updates.remaining_seconds_on_pause = null;
        }
      }

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

  const handleStartDraft = async () => {
    try {
      const timerSec = league?.draft_timer_seconds || 0;
      const { error } = await supabase
        .from('leagues')
        .update({
          status: 'drafting',
          current_pick: 1,
          current_pick_started_at: timerSec > 0 ? new Date().toISOString() : null
        })
        .eq('id', league.id);

      if (error) throw error;
      toast.success('Draft started! Let\'s go!');
    } catch (err: any) {
      toast.error('Failed to start draft: ' + err.message);
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
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to send draft emails:", errorData);
        toast.error(`Email failed: ${errorData.error || response.statusText}`);
      } else {
        toast.success("Draft complete! Results emailed to the league.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Email exception: ${err.message}`);
    }
  };

  const handleShareInvite = async () => {
    const inviteUrl = `${window.location.origin}/join/${league.invite_code}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Code Sixty Four League!',
          text: `Join my 8-player bracket for ${league?.name}!`,
          url: inviteUrl,
        });
        return; // Early return if native share succeeded
      } catch (err) {
        console.log("Share cancelled or failed, falling back to clipboard", err);
      }
    }

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

  const inviteCodeUrl = `${window.location.origin}/join/${league?.invite_code}`;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-background p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* League Header */}
        <section className="flex items-center justify-between gap-4">
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {league?.name || 'League'}
          </h1>
          {league?.invite_code && (
            <button
              onClick={handleShareInvite}
              className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-700 flex items-center space-x-2 transition-colors flex-1 justify-center whitespace-nowrap overflow-hidden max-w-[250px]"
              title="Share Invite Link"
            >
              <span className="truncate">{inviteCodeUrl}</span>
              {copied ? <Check size={16} className="text-emerald-400 flex-shrink-0" /> : <Share2 size={16} className="text-slate-400 flex-shrink-0" />}
            </button>
          )}
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
          onStartDraft={handleStartDraft}
        />

      </div>
      <DevPanel leagueId={leagueId} />
      <FloatingChat leagueId={league?.id} currentUser={user} />
    </main>
  );
}