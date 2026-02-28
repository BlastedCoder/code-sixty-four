// Path: app/leagues/[id]/page.tsx

'use client';

import { use, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trophy, Users, LayoutDashboard, ArrowRight, Clock, Settings, Copy, CheckCircle } from 'lucide-react';
import DraftSettingsModal from '@/components/DraftSettingsModal';

// Import your existing components
import Leaderboard from '@/components/Leaderboard';
import TournamentBracket from '@/components/TournamentBracket';
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
  const [activeTab, setActiveTab] = useState<'standings' | 'bracket' | 'roster'>('standings');

  useEffect(() => {
    const fetchLeagueData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setCurrentUser(session.user);

      const [ { data: lData }, { data: mData } ] = await Promise.all([
        supabase.from('leagues').select('*').eq('id', leagueId).single(),
        supabase.from('league_members').
          select('*, profiles(display_name)')
          .eq('league_id', leagueId)
          .order('draft_position', { ascending: true })
      ]);

      if (lData) setLeague(lData);
      if (mData) setMembers(mData);
      
      setLoading(false);
    };

    fetchLeagueData();

    // Listen for realtime status changes (e.g., Commissioner clicks "Start Draft")
    const channel = supabase.channel(`league-status-${leagueId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leagues', filter: `id=eq.${leagueId}` }, 
        (payload) => setLeague(payload.new)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [leagueId, router]);

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/join/${league?.invite_code}`;
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
  const isDrafting = league.status === 'drafting' || league.status === 'paused';
  const isCommissioner = league.created_by === currentUser?.id;

  // --- SUB-COMPONENT: LEAGUE ROSTER ---
  const LeagueRosterView = () => (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
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
          <div key={member.user_id} className="p-4 flex items-center justify-between hover:bg-slate-50">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-bold text-sm">
                {index + 1}
              </div>
              <div>
                <p className="font-bold text-slate-800">{member.profiles?.display_name || 'Unknown User'}</p>
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
    <main className="min-h-screen bg-slate-50 py-8 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* --- UNIVERSAL HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">{league.name}</h1>
            <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
              <span className="flex items-center gap-1"><LayoutDashboard size={16} /> ID: {league.id}</span>
              <span className="flex items-center gap-1 border-l border-slate-300 pl-4">
                Invite Code: <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{league.invite_code}</span>
              </span>
            </div>
          </div>
          
          <button
            onClick={copyInviteLink}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold transition-all text-sm border ${
              copied 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {copied ? <><CheckCircle size={16} /><span>Copied!</span></> : <><Copy size={16} /><span>Copy Invite Link</span></>}
          </button>
        </div>

        {/* --- PHASE 1: PRE-DRAFT / DRAFTING VIEW --- */}
        {!isDraftComplete && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* Action Card (Left Side - 7 cols) */}
            <div className="md:col-span-7">
              <div className="bg-white border-2 border-emerald-100 rounded-2xl p-8 shadow-sm text-center flex flex-col items-center justify-center h-full min-h-[300px]">
                <Clock size={48} className="text-emerald-400 mb-4" />
                <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
                  {isDrafting ? "The Draft is Live!" : "Waiting for Draft Day"}
                </h2>
                <p className="text-slate-500 mb-8 max-w-md">
                  {isDrafting 
                    ? "The War Room is open. Enter now to make your picks and build your championship squad."
                    : "Gather your friends. Once the league is full, the commissioner will set the order and begin the draft."}
                </p>
                
                {isDrafting ? (
                  <Link 
                    href={`/leagues/${league.id}/draft`}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-8 py-4 rounded-xl font-black text-lg transition-transform hover:scale-105 shadow-md"
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
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            
            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-2 pt-2 overflow-x-auto hide-scrollbar">
              <button 
                onClick={() => setActiveTab('standings')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-extrabold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'standings' ? 'border-emerald-500 text-emerald-700 bg-white rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-t-lg'
                }`}
              >
                <Trophy size={16} /> Live Standings
              </button>
              <button 
                onClick={() => setActiveTab('bracket')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-extrabold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'bracket' ? 'border-blue-500 text-blue-700 bg-white rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-t-lg'
                }`}
              >
                <LayoutDashboard size={16} /> Tournament Bracket
              </button>
              <button 
                onClick={() => setActiveTab('roster')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-extrabold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'roster' ? 'border-slate-800 text-slate-900 bg-white rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-t-lg'
                }`}
              >
                <Users size={16} /> League Roster
              </button>
            </div>

            {/* Tab Content Panels */}
            <div className="p-6 md:p-8 bg-white min-h-[500px]">
              
              {activeTab === 'standings' && (
                <div className="animate-in fade-in duration-300">
                  <Leaderboard leagueId={league.id} members={members} />
                </div>
              )}

              {activeTab === 'bracket' && (
                <div className="animate-in fade-in duration-300 space-y-4">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Current Matchups</h3>
                    <Link 
                      href={`/leagues/${league.id}/bracket`}
                      className="text-sm font-extrabold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors bg-blue-50 px-4 py-2 rounded-lg"
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
        onDraftStarted={() => router.refresh()} 
      />

      {/* Developer Testing Panel remains safely at the bottom */}
      <DevPanel leagueId={leagueId} />
    </main>
  );
}