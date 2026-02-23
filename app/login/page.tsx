'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signUp({ email, password });
    
    if (error) {
      setError(error.message);
      setLoading(false); // Only stop loading if there is an error
    } else {
      // Navigate immediately without blocking the thread
      router.push('/');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Code Sixty Four</h1>
          <p className="text-slate-500 font-medium">Sign in to manage your draft picks</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md text-center font-medium">
            {error}
          </div>
        )}

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-400 text-slate-900 font-bold rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 placeholder:text-slate-500 placeholder:font-normal"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-400 text-slate-900 font-bold rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 placeholder:text-slate-500 placeholder:font-normal"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="flex flex-col space-y-3 pt-4">
            <button
              onClick={handleSignIn}
              disabled={loading || !email || !password}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold tracking-wide disabled:opacity-50 transition-colors"
            >
              {loading ? 'Processing...' : 'Sign In'}
            </button>
            <button
              onClick={handleSignUp}
              disabled={loading || !email || !password}
              className="w-full py-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 rounded-lg font-bold tracking-wide disabled:opacity-50 transition-colors"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}