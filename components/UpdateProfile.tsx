// components/UpdateProfile.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Check, UserCircle, KeyRound, Eye, EyeOff, Camera, Loader2 } from 'lucide-react';
import Avatar from './Avatar';

export default function UpdateProfile({ user }: { user: any }) {
  // Profile States
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password States
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (user) getProfile();
  }, [user]);

  async function getProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .single();

    if (data) {
      setDisplayName(data.display_name || '');
      setAvatarUrl(data.avatar_url || null);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      return toast.error('Please select an image file.');
    }
    if (file.size > 2 * 1024 * 1024) {
      return toast.error('Image must be under 2MB.');
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add cache-buster to force refresh
      const url = `${publicUrl}?t=${Date.now()}`;

      // Save to profile
      await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', user.id);

      setAvatarUrl(url);
      toast.success('Avatar updated!');
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function updateProfile() {
    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        display_name: displayName,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      toast.error('Error updating profile.');
    } else {
      toast.success('Display name updated!');
      window.location.reload();
    }
    setLoading(false);
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setIsUpdatingPassword(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      toast.success('Password updated successfully!');
      setNewPassword('');
    }
    setIsUpdatingPassword(false);
  }

  return (
    <div className="bg-white dark:bg-card rounded-2xl shadow-sm border border-slate-200 dark:border-card-border p-6 space-y-8">

      {/* --- AVATAR & PROFILE SECTION --- */}
      <div>
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
            <UserCircle size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Profile Settings</h2>
        </div>

        {/* Avatar Upload */}
        <div className="flex items-center gap-6 mb-6">
          <div className="relative group">
            <Avatar src={avatarUrl} name={displayName} size="lg" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              {uploading ? (
                <Loader2 size={20} className="text-white animate-spin" />
              ) : (
                <Camera size={20} className="text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Profile Photo</p>
            <p className="text-xs text-slate-500 dark:text-muted">Click to upload • JPG, PNG, WebP • Max 2MB</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-muted uppercase tracking-wider mb-2">
              Your Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-background border border-slate-200 dark:border-card-border rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-white font-medium"
              placeholder="e.g. Captain America"
            />
          </div>

          <button
            onClick={updateProfile}
            disabled={loading}
            className="w-full py-3 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center space-x-2"
          >
            {loading ? 'Saving...' : (
              <>
                <Check size={18} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      <hr className="border-slate-200 dark:border-slate-700" />

      {/* --- ACCOUNT SECURITY SECTION --- */}
      <div>
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
            <KeyRound size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Account Security</h2>
        </div>

        <form onSubmit={updatePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-500 dark:text-muted uppercase tracking-wider mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-background border border-slate-200 dark:border-card-border rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-white font-medium pr-12"
                placeholder="Enter new password"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isUpdatingPassword || !newPassword}
            className="w-full py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center space-x-2"
          >
            {isUpdatingPassword ? 'Updating...' : (
              <>
                <Check size={18} />
                <span>Update Password</span>
              </>
            )}
          </button>
        </form>
      </div>

    </div>
  );
}