'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import UpdateProfile from '@/components/UpdateProfile';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const loadSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
      }
    };
    loadSession();
  }, [router]);

  if (!user) return null;

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/dashboard" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors">
          <ArrowLeft size={16} className="mr-2" />
          Back to Dashboard
        </Link>
        
        <h1 className="text-3xl font-extrabold text-slate-900 mb-8">Account Settings</h1>
        
        {/* Render the component we built earlier */}
        <UpdateProfile user={user} />
      </div>
    </main>
  );
}