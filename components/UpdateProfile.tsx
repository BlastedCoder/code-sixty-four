'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, UserCircle, KeyRound, Eye, EyeOff } from 'lucide-react';

export default function UpdateProfile({ user }: { user: any }) {
  // Profile States
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Password States
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

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
      window.location.reload(); 
    }
    setLoading(false);
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setIsUpdatingPassword(true);
    setPasswordMessage('');

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordMessage(`Error: ${error.message}`);
    } else {
      setPasswordMessage('Password updated successfully!');
      setNewPassword(''); // Clear the input on success
    }
    setIsUpdatingPassword(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-8">
      
      {/* --- PROFILE SETTINGS SECTION --- */}
      <div>
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
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-slate-800 font-medium"
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

      <hr className="border-slate-200" />

      {/* --- ACCOUNT SECURITY SECTION --- */}
      <div>
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
            <KeyRound size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Account Security</h2>
        </div>

        <form onSubmit={updatePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-slate-800 font-medium pr-12"
                placeholder="Enter new password"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isUpdatingPassword || !newPassword}
            className="w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center space-x-2"
          >
            {isUpdatingPassword ? 'Updating...' : (
              <>
                <Check size={18} />
                <span>Update Password</span>
              </>
            )}
          </button>

          {passwordMessage && (
            <p className={`text-center text-sm font-bold ${passwordMessage.includes('Error') ? 'text-red-500' : 'text-emerald-600'}`}>
              {passwordMessage}
            </p>
          )}
        </form>
      </div>

    </div>
  );
}