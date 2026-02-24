'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function AuthHeader() {
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('display_name').eq('id', userId).single();
      if (data) setDisplayName(data.display_name);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setDisplayName('');
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  const initial = displayName ? displayName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || '?';

  return (
<div className="w-full bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm">
  
  {/* Group the Image and Text together inside the Link */}
  <Link href="/" className="flex items-center gap-3 font-extrabold text-xl text-slate-900 tracking-tight">
    <Image 
      src="/logo.png" 
      alt="Code Sixty Four Logo" 
      width={40} 
      height={40} 
      className="rounded-md" // Optional: gives the logo nice, soft edges
    />
    <span>Code Sixty Four</span>
  </Link>

  {/* Any other items you add here later (like a user avatar or menu) will be pushed to the far right! */}
      <Link href="/rules" className="text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors mx-4">
  How to Play
</Link>
      {user ? (
        <div className="flex items-center space-x-4">
          {/* Wrap the avatar and name in a Link pointing to /dashboard */}
          <Link href="/dashboard" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
              {initial}
            </div>
            <span className="text-sm font-bold text-slate-700 hidden md:block">{displayName || user.email}</span>
          </Link>
          
          <button onClick={handleSignOut} className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
            Sign Out
          </button>
        </div>
      ) : (
        <Link href="/login" className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-lg transition-colors">
          Log In
        </Link>
      )}
    </div>
  );
}