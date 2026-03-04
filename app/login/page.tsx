// app/login/page.tsx
'use client';
import { toast } from 'sonner';

import { useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, Eye, EyeOff } from 'lucide-react';

function LoginPageInner() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/';

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push(returnTo);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push(returnTo);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address first.");
      return;
    }
    setIsResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/dashboard`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset email sent! Check your inbox.");
    }
    setIsResetting(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-card rounded-2xl shadow-sm border border-slate-200 dark:border-card-border p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Image
              src="/logo.png"
              alt="Tournament Logo"
              width={64}
              height={64}
              className="" // Optional: adds slight rounding and depth
              priority // Tells Next.js to load this instantly
            />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">Code Sixty Four</h1>
          <p className="text-slate-500 dark:text-muted font-medium">Sign in to manage your draft picks</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md text-center font-medium">
            {error}
          </div>
        )}

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-400 dark:border-slate-500 text-slate-900 dark:text-white font-bold rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 placeholder:text-slate-500 dark:text-muted placeholder:font-normal"
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Password</label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-400 dark:border-slate-500 text-slate-900 dark:text-white font-bold rounded-lg focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-muted hover:text-slate-800 dark:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="flex justify-between items-center">
              <button type="button" onClick={handleForgotPassword} className="text-xs font-bold text-emerald-600 hover:text-emerald-700">
                Forgot Password?
              </button>
            </div>
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
              className="w-full py-3 bg-white dark:bg-card hover:bg-slate-50 dark:bg-background text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg font-bold tracking-wide disabled:opacity-50 transition-colors"
            >
              Create Account
            </button>
          </div>
        </form>
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 text-center">
          <p className="text-sm text-slate-500 dark:text-muted font-medium">
            New to the tournament pool?{' '}
            <Link href="/rules" className="text-emerald-600 hover:text-emerald-700 font-extrabold underline decoration-2 underline-offset-2 transition-colors">
              See how to play
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}