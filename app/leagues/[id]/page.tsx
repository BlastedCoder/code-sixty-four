// app/leagues/[id]/page.tsx

'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trophy, Users, LayoutDashboard, ArrowRight, Clock, Settings, Copy, CheckCircle, MessageCircle, Share2, Check, ShieldCheck, LogOut, Download } from 'lucide-react';
import DraftSettingsModal from '@/components/DraftSettingsModal';
import Avatar from '@/components/Avatar';

// Import your existing components
import Leaderboard from '@/components/Leaderboard';
import TournamentBracket from '@/components/TournamentBracket';
import GameLog from '@/components/GameLog';
import LeagueChat from '@/components/LeagueChat';
import DevPanel from '@/components/DevPanel';

export default function LeagueDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id: leagueId } = use(params);
  const router = useRouter();

  const [league, setLeague] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Tab State for Post-Draft View
  const [activeTab, setActiveTab] = useState<'standings' | 'bracket' | 'roster' | 'results' | 'chat'>('standings');
  const [unreadCount, setUnreadCount] = useState(0);

  // View control
  const isDrafting = league?.status === 'drafting';

  useEffect(() => {
    const fetchLeagueData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setCurrentUser(session.user);

      const [{ data: lData }, { data: mData }] = await Promise.all([
        supabase.from('leagues').select('*').eq('id', leagueId).single(),
        supabase.from('league_members')
          .select('*, profiles(display_name, avatar_url)')
          .eq('league_id', leagueId)
          .order('draft_position', { ascending: true })
      ]);

      if (lData) setLeague(lData);
      if (mData) setMembers(mData);

      setLoading(false);
    };

    fetchLeagueData();
  }, [leagueId, router]);

  // Separate effect for subscriptions so tab changes don't trigger re-fetches
  useEffect(() => {
    if (!currentUser) return; // Wait until we know who the user is

    // Listen for realtime status changes (e.g., Commissioner clicks "Start Draft")
    const channel = supabase.channel(`league_updates_${leagueId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leagues', filter: `id=eq.${leagueId}` }, (payload) => {
        setLeague(payload.new as any);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'league_messages', filter: `league_id=eq.${leagueId}` }, (payload) => {
        // Increment unread count if we are not currently looking at the chat tab
        if (activeTab !== 'chat' && payload.new.user_id !== currentUser?.id) {
          setUnreadCount(prev => prev + 1);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [leagueId, activeTab, currentUser]);

  const handleShareInvite = async () => {
    const inviteUrl = `${window.location.origin}/join/${league?.invite_code}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Code Sixty Four League!',
          text: `Join my 8-player bracket for ${league?.name}!`,
          url: inviteUrl,
        });
        return; // Early return if native share succeeded
      } catch (err) {
        // Fallback if user cancels or share fails
        console.log("Share cancelled or failed, falling back to clipboard", err);
      }
    }

    // Fallback to clipboard
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-emerald-500 font-bold animate-pulse text-lg">Loading Dashboard...</div>
      </div>
    );
  }

  if (!league) {
    return <div className="p-12 text-center font-bold text-red-500">League not found.</div>;
  }

  const isDraftComplete = league.status === 'in_progress' || league.status === 'active' || league.status === 'completed';
  const isCommissioner = league.created_by === currentUser?.id;

  // --- SUB-COMPONENT: LEAGUE ROSTER ---
  const LeagueRosterView = () => (
    <div className="bg-white dark:bg-card border border-slate-200 dark:border-card-border rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
        <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
          <Users size={20} className="text-blue-400" /> League Roster
        </h2>
        <span className="text-xs font-bold bg-slate-800 text-slate-300 px-3 py-1 rounded-full">
          {members.length} / 8 Players
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        {members.map((member, index) => (
          <div key={member.user_id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-muted rounded-full flex items-center justify-center font-bold text-sm">
                {index + 1}
              </div>
              <Avatar src={member.profiles?.avatar_url} name={member.profiles?.display_name} size="sm" />
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">{member.profiles?.display_name || 'Unknown User'}</p>
                {member.user_id === league.created_by && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Commissioner</span>
                )}
              </div>
            </div>
            {member.user_id === currentUser?.id && (
              <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">You</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-background py-8 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* --- UNIVERSAL HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-card p-6 rounded-2xl border border-slate-200 dark:border-card-border shadow-sm">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-1">{league.name}</h1>
            <div className="flex items-center gap-4 text-sm font-medium text-slate-500 dark:text-muted">
              <span className="flex items-center gap-1"><LayoutDashboard size={16} /> ID: {league.id}</span>
              <span className="flex items-center gap-1 border-l border-slate-300 dark:border-slate-600 pl-4">
                Invite Code: <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{league.invite_code}</span>
              </span>
            </div>
          </div>

          <button
            onClick={handleShareInvite}
            className={`w-full flex items-center justify-center space-x-2 py-3 rounded-xl font-bold transition-all border ${copied
              ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
              : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:hover:bg-emerald-800/60 dark:text-emerald-400 border-transparent'
              }`}
          >
            {copied ? <><Check size={18} /><span>Copied!</span></> : <><Share2 size={18} /><span>Share Invite Link</span></>}
          </button>
        </div>

        {/* --- PHASE 1: PRE-DRAFT / DRAFTING VIEW --- */}
        {!isDraftComplete && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

            {/* Action Card (Left Side - 7 cols) */}
            <div className="md:col-span-7">
              <div className="bg-white dark:bg-card border-2 border-emerald-100 rounded-2xl p-8 shadow-sm text-center flex flex-col items-center justify-center h-full min-h-[300px]">
                <Clock size={48} className="text-emerald-400 mb-4" />
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
                  {isDrafting ? "The Draft is Live!" : "Waiting for Draft Day"}
                </h2>
                <p className="text-slate-500 dark:text-muted mb-8 max-w-md">
                  {isDrafting
                    ? "The War Room is open. Enter now to make your picks and build your championship squad."
                    : "Gather your friends. Once the league is full, the commissioner will set the order and begin the draft."}
                </p>

                {isDrafting ? (
                  <Link
                    href={`/leagues/${league.id}/draft`}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 dark:text-white px-8 py-4 rounded-xl font-black text-lg transition-transform hover:scale-105 shadow-md"
                  >
                    Enter War Room <ArrowRight size={20} />
                  </Link>
                ) : (
                  isCommissioner && (
                    <button
                      onClick={() => setIsSettingsModalOpen(true)}
                      className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-md"
                    >
                      <Settings size={18} /> Manage Draft Settings
                    </button>
                  )
                )}
              </div>
            </div>

            {/* League Roster (Right Side - 5 cols) */}
            <div className="md:col-span-5">
              <LeagueRosterView />
            </div>

          </div>
        )}

        {/* --- PHASE 2: POST-DRAFT TOURNAMENT VIEW --- */}
        {isDraftComplete && (
          <div className="bg-white dark:bg-card border border-slate-200 dark:border-card-border rounded-2xl shadow-sm overflow-hidden">

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 dark:border-card-border bg-slate-50 dark:bg-background px-2 pt-2 overflow-x-auto hide-scrollbar">
              <button
                onClick={() => setActiveTab('standings')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-extrabold border-b-2 transition-all whitespace-nowrap ${activeTab === 'standings' ? 'border-emerald-500 text-emerald-700 bg-white dark:bg-card rounded-t-lg' : 'border-transparent text-slate-500 dark:text-muted hover:text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-t-lg'
                  }`}
              >
                <Trophy size={16} /> Live Standings
              </button>
              <button
                onClick={() => setActiveTab('bracket')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-extrabold border-b-2 transition-all whitespace-nowrap ${activeTab === 'bracket' ? 'border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-400 bg-white dark:bg-card rounded-t-lg' : 'border-transparent text-slate-500 dark:text-muted hover:text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-t-lg'
                  }`}
              >
                <LayoutDashboard size={16} /> Tournament Bracket
              </button>
              <button
                onClick={() => setActiveTab('roster')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-extrabold border-b-2 transition-all whitespace-nowrap ${activeTab === 'roster' ? 'border-slate-800 text-slate-900 dark:text-white bg-white dark:bg-card rounded-t-lg' : 'border-transparent text-slate-500 dark:text-muted hover:text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-t-lg'
                  }`}
              >
                <Users size={16} /> League Roster
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-extrabold border-b-2 transition-all whitespace-nowrap ${activeTab === 'results' ? 'border-amber-500 text-amber-700 bg-white dark:bg-card rounded-t-lg' : 'border-transparent text-slate-500 dark:text-muted hover:text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-t-lg'
                  }`}
              >
                <CheckCircle size={16} /> Game Results
              </button>
              <button
                onClick={() => {
                  setActiveTab('chat');
                  setUnreadCount(0); // Clear notifications on open
                }}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-extrabold border-b-2 transition-all whitespace-nowrap relative ${activeTab === 'chat' ? 'border-purple-500 dark:border-purple-400 text-purple-700 dark:text-purple-400 bg-white dark:bg-card rounded-t-lg' : 'border-transparent text-slate-500 dark:text-muted hover:text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-t-lg'
                  }`}
              >
                <MessageCircle size={16} /> Chat
                {unreadCount > 0 && activeTab !== 'chat' && (
                  <span className="ml-1 bg-red-500 text-white text-[10px] items-center justify-center flex h-5 w-5 rounded-full shadow-sm animate-bounce">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Content Panels */}
            <div className="p-6 md:p-8 bg-white dark:bg-card min-h-[500px]">

              {activeTab === 'standings' && (
                <div className="animate-in fade-in duration-300">
                  <Leaderboard leagueId={league.id} members={members} />
                </div>
              )}

              {activeTab === 'bracket' && (
                <div className="animate-in fade-in duration-300 space-y-4">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Current Matchups</h3>
                    <Link
                      href={`/leagues/${league.id}/bracket`}
                      className="text-sm font-extrabold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:text-blue-300 px-4 py-2 rounded-lg"
                    >
                      View Full Bracket <ArrowRight size={16} />
                    </Link>
                  </div>
                  <TournamentBracket leagueId={league.id} />
                </div>
              )}

              {activeTab === 'roster' && (
                <div className="animate-in fade-in duration-300 max-w-2xl mx-auto">
                  <LeagueRosterView />
                </div>
              )}

              {activeTab === 'results' && (
                <div className="animate-in fade-in duration-300">
                  <GameLog leagueId={league.id} />
                </div>
              )}

              {activeTab === 'chat' && (
                <div className="animate-in fade-in duration-300">
                  <LeagueChat leagueId={league.id} currentUser={currentUser} />
                </div>
              )}

            </div>
          </div>
        )}

      </div>
      {/* Draft Settings Modal */}
      <DraftSettingsModal
        leagueId={league.id}
        members={members}
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onDraftStarted={() => router.push(`/leagues/${league.id}/draft`)}
      />

      {/* Developer Testing Panel remains safely at the bottom */}
      <DevPanel leagueId={leagueId} />
    </main>
  );
}