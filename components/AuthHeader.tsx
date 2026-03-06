// components/AuthHeader.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from './ThemeToggle';
import Avatar from './Avatar';

export default function AuthHeader() {
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', userId).single();
      if (data) {
        setDisplayName(data.display_name);
        setAvatarUrl(data.avatar_url || null);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setDisplayName(''); setAvatarUrl(null); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };



  return (
    <div className="w-full bg-white dark:bg-card border-b border-slate-200 dark:border-card-border px-6 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm">
      <Link href="/" className="flex items-center gap-3 font-extrabold text-xl text-slate-900 dark:text-white tracking-tight">
        <Image
          src="/logo.png"
          alt="Code Sixty Four Logo"
          width={40}
          height={40}
          className="rounded-md"
        />
        <span>Code Sixty Four</span>
      </Link>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        {user ? (
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <Avatar src={avatarUrl} name={displayName || user.email} size="sm" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300 hidden md:block">{displayName || user.email}</span>
            </Link>
            <button onClick={handleLogOut} className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              Log Out
            </button>
          </div>
        ) : (
          <Link href="/login" className="px-5 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white text-sm font-bold rounded-lg transition-colors">
            Log In
          </Link>
        )}
      </div>
    </div>
  );
}