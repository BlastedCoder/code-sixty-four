'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LeaguesPage() {
  const [myLeagues, setMyLeagues] = useState<any[]>([]);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetchUserAndLeagues();
  }, []);

  const fetchUserAndLeagues = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    setUser(session.user);

    // Fetch ONLY the leagues the user is already a member of
    const { data: userLeagues } = await supabase
      .from('league_members')
      .select('league_id, leagues(name, invite_code)')
      .eq('user_id', session.user.id);
  };

  const generateCode = () => {
    // Generates a random 6-character alphanumeric string
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeagueName || !user) return;

    const newCode = generateCode();

    // 1. Create the new league with the generated code
    const { data: leagueData, error: leagueError } = await supabase
      .from('leagues')
      .insert({ name: newLeagueName, created_by: user.id, invite_code: newCode })
      .select('id')
      .single();

    if (leagueError) {
      alert('Error creating league: ' + leagueError.message);
      return;
    }

    // 2. Automatically add the creator (Commissioner) to the league
    await supabase
      .from('league_members')
      .insert({ league_id: leagueData.id, user_id: user.id });

    setNewLeagueName('');
    fetchUserAndLeagues();

    router.push(`/leagues/${leagueData.id}`);
  };

  const handleJoinLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode || !user) return;

    const formattedCode = inviteCode.trim().toUpperCase();

    //Look up the league by its invite code
    const { data: leagueData, error: lookupError } = await supabase
      .from('leagues')
      .select('id, name')
      .eq('invite_code', formattedCode)
      .single();

    if (lookupError || !leagueData) {
      alert(`Invalid Code Error: ${lookupError?.message || 'League not found'}`);
      return;
    }

    //Add the user to the found league
    const { error: joinError } = await supabase
      .from('league_members')
      .insert({ league_id: leagueData.id, user_id: user.id });

    //Show exact join error
    if (joinError) {
      alert(`Failed to join: ${joinError.message}`);
    } else {
      setInviteCode('');
      fetchUserAndLeagues();
      alert(`Successfully joined ${leagueData.name}!`);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <header className="mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">League Hub</h1>
          <p className="text-lg text-slate-600 mt-2">Create a new 8-player pool or join using an invite code.</p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Create League Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Create a League</h2>
            <p className="text-sm text-slate-500 mb-6">Start a fresh bracket pool and invite your friends.</p>
            
            <form onSubmit={handleCreateLeague} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">League Name</label>
                <input
                  type="text"
                  value={newLeagueName}
                  onChange={(e) => setNewLeagueName(e.target.value)}
                  placeholder="e.g., The Code Sixty Four Cup"
                  className="w-full px-4 py-3 border-2 border-slate-300 text-slate-900 font-bold rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 placeholder:text-slate-400"
                  required
                />
              </div>
              <button type="submit" className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold tracking-wide transition-colors">
                Create & Generate Code
              </button>
            </form>
          </div>

          {/* Join League Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Join a League</h2>
            <p className="text-sm text-slate-500 mb-6">Enter the 6-character code provided by your Commissioner.</p>
            
            <form onSubmit={handleJoinLeague} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Invite Code</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="e.g., X7B9TQ"
                  className="w-full px-4 py-3 border-2 border-slate-300 text-slate-900 font-mono font-bold uppercase rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 placeholder:text-slate-400"
                  required
                />
              </div>
              <button type="submit" className="w-full py-3 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-300 rounded-lg font-bold tracking-wide transition-colors">
                Join League
              </button>
            </form>
          </div>

        </div>
      </div>
    </main>
  );
}