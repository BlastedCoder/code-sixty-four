'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, UserCircle } from 'lucide-react';

export default function UpdateProfile({ user }: { user: any }) {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) getProfile();
  }, [user]);

  async function getProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();

    if (data) setDisplayName(data.display_name || '');
  }

  async function updateProfile() {
    setLoading(true);
    setMessage('');

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        display_name: displayName,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      setMessage('Error updating profile.');
    } else {
      setMessage('Display name updated!');
      // Optional: Refresh the page to update the leaderboard names
      window.location.reload(); 
    }
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
          <UserCircle size={24} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Profile Settings</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
            Your Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-800 font-medium"
            placeholder="e.g. Captain America"
          />
        </div>

        <button
          onClick={updateProfile}
          disabled={loading}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center space-x-2"
        >
          {loading ? 'Saving...' : (
            <>
              <Check size={18} />
              <span>Save Changes</span>
            </>
          )}
        </button>

        {message && (
          <p className={`text-center text-sm font-bold ${message.includes('Error') ? 'text-red-500' : 'text-emerald-600'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}