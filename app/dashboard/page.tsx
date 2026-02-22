'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil, Check, X } from 'lucide-react'; // Added icons for the UI

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [myLeagues, setMyLeagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New State for Editing
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const loadDashboard = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }
      
      setUser(session.user);

      const [ { data: profileData }, { data: leaguesData } ] = await Promise.all([
  supabase.from('profiles').select('*').eq('id', session.user.id).single(),
  supabase.from('league_members')
    .select(`
      league_id, 
      leagues(
        name, 
        invite_code, 
        status, 
        max_members,
        league_members(count)
      )
    `)
    .eq('user_id', session.user.id)
]);

      if (profileData) {
        setProfile(profileData);
        setNewName(profileData.display_name || ''); // Initialize edit state
      }
      if (leaguesData) setMyLeagues(leaguesData);
      
      setLoading(false);
    };

    loadDashboard();
  }, [router]);

  const handleUpdateName = async () => {
    setUpdateLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: newName })
      .eq('id', user.id);

    if (!error) {
      setProfile({ ...profile, display_name: newName });
      setIsEditing(false);
    }
    setUpdateLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500 font-bold animate-pulse">Loading Dashboard...</div>;
  }

  const initial = profile?.display_name ? profile.display_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase();

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Account Information Card */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 rounded-full bg-slate-900 text-white flex items-center justify-center font-extrabold text-3xl shadow-inner uppercase">
              {initial}
            </div>
            <div>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="text-2xl font-bold text-slate-900 border-b-2 border-emerald-500 outline-none bg-slate-50 px-2 py-1 rounded"
                    autoFocus
                  />
                  <button 
                    onClick={handleUpdateName}
                    disabled={updateLoading}
                    className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
                  >
                    <Check size={20} />
                  </button>
                  <button 
                    onClick={() => { setIsEditing(false); setNewName(profile.display_name); }}
                    className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                  >
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 group">
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {profile?.display_name || 'Player'}
                  </h1>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Pencil size={18} />
                  </button>
                </div>
              )}
              <p className="text-slate-500 font-medium">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="px-6 py-3 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-bold rounded-lg transition-colors border border-red-200"
          >
            Log Out
          </button>
        </section>

        {/* My Leagues Section (Unchanged logic) */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">My Leagues</h2>
              <p className="text-slate-500 text-sm mt-1">Manage your active pools and drafts.</p>
            </div>
            <Link 
              href="/leagues" 
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
            >
              + Join / Create
            </Link>
          </div>

          {myLeagues.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-12 text-center">
              <p className="text-slate-500 font-medium mb-4">You aren't in any leagues yet!</p>
              <Link href="/leagues" className="text-emerald-600 font-bold hover:underline">
                Go join your first pool &rarr;
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {myLeagues.map((ml: any) => (
                <Link 
                  href={`/leagues/${ml.league_id}`} 
                  key={ml.league_id}
                  className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:ring-2 hover:ring-emerald-500 transition-all cursor-pointer flex flex-col justify-between h-full group"
                >
                  <div className="mb-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-extrabold text-slate-900 text-xl group-hover:text-emerald-700 transition-colors">
                        {ml.leagues.name}
                      </h3>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        ml.leagues.status === 'pre_draft' ? 'bg-amber-100 text-amber-800' :
                        ml.leagues.status === 'drafting' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {ml.leagues.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Capacity</span>
                    <span className="text-xs font-bold text-slate-700">
                    {ml.member_count || 1} / {ml.leagues.max_members || 8} Players
                    </span>
                </div>
                <span className="text-sm font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                    Go to League &rarr;
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}