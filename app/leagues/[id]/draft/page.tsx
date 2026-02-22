'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Copy, CheckCircle } from 'lucide-react'; // Premium icons
import DraftBoard from '@/components/DraftBoard';

export default function LiveDraftRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: leagueId } = use(params);
  
  const [league, setLeague] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [draftPicks, setDraftPicks] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
        alert("The draft hasn't started yet!");
        return router.push(`/leagues/${leagueId}`);
      }

      if (lData) setLeague(lData);
      if (tData) setTeams(tData);
      if (mData) setMembers(mData);
      if (dpData) setDraftPicks(dpData);
    };

    loadDraftRoom();

    // Set up WebSockets
    const channel = supabase.channel(`draft-room-${leagueId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'draft_picks', filter: `league_id=eq.${leagueId}` }, 
        (payload) => setDraftPicks((prev) => [...prev, payload.new])
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
    if (!canDraft) return alert("You cannot make a pick right now.");

    // Insert the pick using the ID of the person ON THE CLOCK, not necessarily the person clicking
    const { error: pickError } = await supabase.from('draft_picks').insert({
      league_id: league.id,
      user_id: pickUserId, 
      team_id: teamId,
      pick_number: league.current_pick
    });

    if (pickError) return alert('Error making pick: ' + pickError.message);

    await supabase.from('leagues')
      .update({ current_pick: league.current_pick + 1 })
      .eq('id', league.id);
  };

  // 2. Undo the Last Pick
  const handleUndoPick = async () => {
    if (league.current_pick <= 1) return;
    const pickToUndo = league.current_pick - 1;
    
    // Delete the most recent pick
    await supabase.from('draft_picks')
      .delete()
      .eq('league_id', league.id)
      .eq('pick_number', pickToUndo);
      
    // Roll back the clock
    await supabase.from('leagues')
      .update({ current_pick: pickToUndo })
      .eq('id', league.id);
  };

  // 3. Pause / Resume Draft
  const handleTogglePause = async () => {
    const newStatus = league.status === 'paused' ? 'drafting' : 'paused';
    await supabase.from('leagues')
      .update({ status: newStatus })
      .eq('id', league.id);
  };

  const handleFinalizeDraft = async () => {
  // 1. Double-check the pick count in the DB for safety
  const { count, error: countError } = await supabase
    .from('draft_picks')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', league.id);

  if (countError || count !== 64) {
    alert(`Cannot finalize. Found ${count}/64 picks.`);
    return;
  }

  // 2. Transition league to 'in_progress'
  const { error } = await supabase
    .from('leagues')
    .update({ status: 'in_progress' })
    .eq('id', league.id);

  if (!error) {
    // 3. Redirect back to the League Home where the Leaderboard now shows
    router.push(`/leagues/${league.id}`);
  } else {
    alert("Error locking league. Please try again.");
  }
};

// Pass it to your DraftBoard component
<DraftBoard 
  onFinalizeDraft={handleFinalizeDraft} 
/>

  const copyInviteLink = () => {
    // Generate the full URL based on the current window location
    const inviteUrl = `${window.location.origin}/join/${league.invite_code}`;
    
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    
    // Reset the "Copied" state after 2 seconds
    setTimeout(() => setCopied(false), 2000);
  };

  if (fetchError) return <div className="p-12 text-center text-red-600 font-bold bg-red-50 m-6 rounded-lg">{fetchError}</div>;
  if (!league) return <div className="p-12 text-center text-slate-500 font-bold animate-pulse">Entering War Room...</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* League Header */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              {league?.name || 'League'}
            </h1>
            <div className="flex items-center mt-2 space-x-3">
               <span className="text-slate-500 font-medium">Invite Code:</span>
               <code className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-mono font-bold">
                 {league?.invite_code}
               </code>
            </div>
          </div>

          {/* Copy Invite Link Button */}
          <button
            onClick={copyInviteLink}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm border ${
              copied 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {copied ? (
              <>
                <CheckCircle size={18} />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Copy size={18} />
                <span>Invite Friends</span>
              </>
            )}
          </button>
        </section>

        {/* ... Rest of your page content (ResultsPanel, Leaderboard, etc.) ... */}
      </div>
    </main>
  );
}