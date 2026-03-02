// components/CommissionerDashboard.tsx
// Path: components/CommissionerDashboard.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function CommissionerDashboard({ league, members, currentUser }: any) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [localMembers, setLocalMembers] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (members) {
      setLocalMembers([...members].sort((a: any, b: any) => (a.draft_position || 0) - (b.draft_position || 0)));
    }
  }, [members]);

  // 1. Security Check: Uses `created_by` per your DB schema
  if (!league || !currentUser || league.created_by !== currentUser.id) return null;

  if (league.status !== 'pre_draft') {
    return (
      <div className="bg-slate-900 text-white rounded-xl p-4 mb-6 flex justify-between items-center shadow-md">
        <span className="font-bold">Commissioner Controls</span>
        <span className="text-sm text-slate-300">Draft is currently active.</span>
      </div>
    );
  }

  const missingPlayers = 8 - (members?.length || 0);

  // 3. Email Invite Generator
  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    const subject = encodeURIComponent(`You're invited to join ${league.name}!`);
    const body = encodeURIComponent(
      `Hey!\n\nI've set up our NCAA Tournament Draft Pool: ${league.name}.\n\n` +
      `Click here to go to the app: ${window.location.origin}/leagues\n` +
      `Then, enter this Invite Code to join the room: ${league.invite_code}\n\n` +
      `See you in the draft room!`
    );

    window.location.href = `mailto:${inviteEmail}?subject=${subject}&body=${body}`;
    setInviteEmail('');
  };

  // 4a. Move Member Up or Down in the Local List
  const moveMember = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...localMembers];
    if (direction === 'up' && index > 0) {
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
    }
    setLocalMembers(newOrder);
  };

  const handleSaveOrder = async () => {
    setIsProcessing(true);
    const updatePromises = localMembers.map((member, index) => 
      supabase.from('league_members')
        .update({ draft_position: index + 1 })
        .eq('league_id', league.id)
        .eq('user_id', member.user_id)
    );

    await Promise.all(updatePromises);
    setIsProcessing(false);
    
    router.refresh(); 
  };

    const handleRandomizeOrder = async () => {
    if (members.length < 2) return alert("You need more players to randomize the order!");
    if (!window.confirm("This will overwrite any existing draft order. Are you sure?")) return;

    setIsProcessing(true);

    const shuffled = [...members];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const updatePromises = shuffled.map((member, index) => 
      supabase.from('league_members')
        .update({ draft_position: index + 1 })
        .eq('league_id', league.id)
        .eq('user_id', member.user_id)
    );

    await Promise.all(updatePromises);
    setIsProcessing(false);
    
    router.refresh(); 
  };

  const handleStartDraft = async () => {
    if (missingPlayers > 0) {
      const proceed = window.confirm(`You are missing ${missingPlayers} players. Are you SURE you want to start?`);
      if (!proceed) return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase
        .from('leagues')
        .update({ status: 'drafting', current_pick: 1 })
        .eq('id', league.id)
        .select(); // Adding .select() forces Supabase to return the updated row

      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error("Update failed. Are you sure you are the Commissioner?");
      }

      // If successful, push to the draft room
      router.push(`/leagues/${league.id}/draft`);

    } catch (err: any) {
      console.error("START DRAFT ERROR:", err);
      alert(`Error starting draft: ${err.message}`);
    } finally {
      // This guarantees the button un-freezes even if it crashes
      setIsProcessing(false); 
    }
  };

  return (
    <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 mb-8 shadow-sm">
      <div className="flex items-center space-x-3 mb-6">
        <span className="bg-slate-900 text-white text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">
          Commissioner
        </span>
        <h2 className="text-xl font-bold text-slate-800">League Setup Dashboard</h2>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Left Column: Invites */}
        <div className="md:col-span-1 space-y-4">
          <h3 className="font-bold text-slate-700">Recruit Players</h3>
          <p className="text-sm text-slate-500">
            {missingPlayers > 0 ? `You need ${missingPlayers} more players to fill the 8-team grid.` : 'Your league is full!'}
          </p>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!inviteEmail) return;

            const emails = inviteEmail.split(/[\s,]+/).filter(Boolean).join(',');
            const subject = encodeURIComponent(`You're invited to join ${league.name}!`);
            const body = encodeURIComponent(
              `Hey!\n\nI've set up our NCAA Tournament Draft Pool: ${league.name}.\n\n` +
              `Click here to go to the app: ${window.location.origin}/leagues\n` +
              `Then, enter this Invite Code to join the room: ${league.invite_code}\n\n` +
              `See you in the draft room!`
            );

            window.location.href = `mailto:${emails}?subject=${subject}&body=${body}`;
            setInviteEmail('');
          }} className="flex flex-col space-y-3">
            <textarea 
              placeholder="pete@example.com, sarah@example.com" 
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-400 rounded-md text-sm text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 focus:outline-none resize-none shadow-sm"
            />
            <button type="submit" disabled={missingPlayers === 0} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-900 font-extrabold py-2 rounded-md text-sm transition-colors disabled:opacity-50">
              Open Email App
            </button>
          </form>
        </div>

        {/* Middle Column: Draft Order */}
        <div className="md:col-span-1 space-y-4 border-t md:border-t-0 md:border-l border-slate-200 pt-6 md:pt-0 md:pl-8 flex flex-col">
          <div>
            <h3 className="font-bold text-slate-700">Draft Order</h3>
            <p className="text-xs text-slate-500 mt-1 mb-3">Set the order manually or let the app randomize it.</p>
          </div>
          
          <div className="space-y-2 flex-grow overflow-y-auto max-h-48 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
            {localMembers.map((member, index) => (
              <div key={member.user_id} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200 text-sm">
                <div className="flex items-center space-x-2 truncate pr-2">
                  <span className="font-bold text-slate-400 w-4">{index + 1}.</span>
                  <span className="font-semibold text-slate-700 truncate">{member.profiles?.display_name || 'Player'}</span>
                </div>
                <div className="flex space-x-1 flex-shrink-0">
                  <button 
                    onClick={() => moveMember(index, 'up')} 
                    disabled={index === 0 || isProcessing} 
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors"
                  >
                    ▲
                  </button>
                  <button 
                    onClick={() => moveMember(index, 'down')} 
                    disabled={index === localMembers.length - 1 || isProcessing} 
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors"
                  >
                    ▼
                  </button>
                </div>
              </div>
            ))}
            {localMembers.length === 0 && (
              <p className="text-center text-xs text-slate-400 italic py-4">No members joined yet.</p>
            )}
          </div>

          <div className="flex space-x-2 pt-2">
            <button 
              onClick={handleSaveOrder} 
              disabled={isProcessing || localMembers.length === 0}
              className="flex-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold py-2.5 rounded-md text-xs transition-colors disabled:opacity-50"
            >
              💾 Save
            </button>
            <button 
              onClick={handleRandomizeOrder} 
              disabled={isProcessing || localMembers.length < 2}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 rounded-md text-xs transition-colors disabled:opacity-50"
            >
              🎲 Randomize
            </button>
          </div>
        </div>

        {/* Right Column: Launch */}
        <div className="md:col-span-1 space-y-4 border-t md:border-t-0 md:border-l border-slate-200 pt-6 md:pt-0 md:pl-8 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-700">Launch Draft</h3>
            <p className="text-sm text-slate-500">Lock the roster and open the draft board for selections.</p>
          </div>
          <button 
            onClick={handleStartDraft} 
            disabled={isProcessing}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-md shadow-sm transition-colors disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'START DRAFT'}
          </button>
        </div>

      </div>
    </div>
  );
}