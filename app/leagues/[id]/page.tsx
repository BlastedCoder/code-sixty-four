'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CommissionerDashboard from '@/components/CommissionerDashboard';
import Leaderboard from '@/components/Leaderboard';
import TournamentBracket from '@/components/TournamentBracket';

export default function LeagueHomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: leagueId } = use(params);
  
  const [league, setLeague] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const loadLeagueHome = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/login');
      setUser(session.user);

      const [ { data: lData }, { data: mData } ] = await Promise.all([
        supabase.from('leagues').select('*').eq('id', leagueId).single(),
        supabase.from('league_members').select('*, profiles(display_name)').eq('league_id', leagueId)
      ]);

      if (mData && session.user) {
        const isMember = mData.some((m: any) => m.user_id === session.user.id);
        if (!isMember) return router.push('/leagues');
      }

      if (lData) setLeague(lData);
      if (mData) setMembers(mData);
    };

    loadLeagueHome();
  }, [leagueId, router]);

  if (!league) return <div className="p-12 text-center text-slate-500 font-bold animate-pulse">Loading League...</div>;

  const isDraftActive = league.status !== 'pre_draft';

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* League Header */}
        <header className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2">{league.name}</h1>
          <div className="flex justify-center items-center space-x-4">
            <span className="text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-md">
              Invite Code: <span className="font-mono font-bold text-slate-800">{league.invite_code}</span>
            </span>
            <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
              isDraftActive ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {isDraftActive ? 'Live' : 'Pre-Draft'}
            </span>
          </div>
        </header>

{/* Dynamic Display: Settings vs. Standings */}
        {isDraftActive ? (
          <Leaderboard leagueId={league.id} members={members} />
        ) : (
          <CommissionerDashboard 
            league={league} 
            members={members} 
            currentUser={user} 
          />
        )}

        <div className="mt-8 mb-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
          <span className="bg-slate-900 text-white w-8 h-8 rounded-lg flex items-center justify-center mr-3 text-sm">🏀</span>
          Tournament Bracket
        </h2>
        
        {/* The new Bracket Component */}
        <TournamentBracket leagueId={league.id} />
      </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Roster Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">League Roster ({members.length}/8)</h2>
            <div className="space-y-3">
              {members.map((member: any) => (
                <div key={member.user_id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-700">{member.profiles?.display_name || 'Player'}</span>
                  {member.draft_position && (
                    <span className="text-xs font-bold bg-slate-900 text-white px-2 py-1 rounded">
                      Pick #{member.draft_position}
                    </span>
                  )}
                </div>
              ))}
              {Array.from({ length: 8 - members.length }).map((_, i) => (
                <div key={`empty-${i}`} className="p-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 text-sm font-medium text-center">
                  Open Slot
                </div>
              ))}
            </div>
          </div>

          {/* Action Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center items-center text-center space-y-4">
            <h2 className="text-xl font-bold text-slate-800">Draft Status</h2>
            {isDraftActive ? (
              <>
                <p className="text-slate-500 text-sm">The draft room is currently open and active.</p>
                <Link href={`/leagues/${league.id}/draft`} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-sm transition-colors text-lg">
                  Enter Draft Room &rarr;
                </Link>
              </>
            ) : (
              <>
                <p className="text-slate-500 text-sm">Waiting for the Commissioner to finalize the roster and start the draft.</p>
                <button disabled className="w-full py-4 bg-slate-100 text-slate-400 font-extrabold rounded-xl text-lg cursor-not-allowed border border-slate-200">
                  Draft Room Locked
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}