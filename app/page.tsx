import { supabase } from '@/lib/supabase';
import Bracket from '@/components/Bracket';
import AuthHeader from '@/components/AuthHeader';

export default async function Home() {
  // 1. Fetch BOTH tables concurrently for maximum performance
  const [ { data: teams, error: teamsError }, { data: games, error: gamesError } ] = await Promise.all([
    supabase.from('teams').select('*').order('id', { ascending: true }),
    supabase.from('games').select('*').order('id', { ascending: true })
  ]);

  

  // 2. Log any errors to your terminal
  if (teamsError || gamesError) {
    console.error('Error fetching data:', teamsError?.message || gamesError?.message);
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center p-6 md:p-12">
      <header className="w-full max-w-4xl text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
          Code Sixty Four
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          The ultimate 8-player NCAA tournament draft pool. Track standings, view the bracket, and claim the championship.
        </p>
      </header>

      <section className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-10 flex-grow">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Live Bracket</h2>
          <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-full">
            64 Teams
          </span>
        </div>
        
        {/* 3. Pass both arrays down to the Bracket component */}
        <Bracket teams={teams || []} games={games || []} />
      </section>

      <footer className="w-full max-w-4xl text-center mt-12 text-sm font-medium text-slate-400">
        <p>Built by Blasted Coders</p>
      </footer>
    </main>
  );
}