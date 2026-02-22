'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function CommissionerDashboard({ league, members, currentUser }: any) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const router = useRouter();

  // 1. Security Check: Only render if the current user created the league
  if (!league || !currentUser || league.created_by !== currentUser.id) return null;

  // 2. Hide most of the dashboard if the draft has already started
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

  // 4. Randomize Draft Order
  const handleRandomizeOrder = async () => {
    if (members.length < 2) {
      alert("You need more players to randomize the order!");
      return;
    }
    
    if (!window.confirm("This will overwrite any existing draft order. Are you sure?")) return;

    setIsProcessing(true);

    // Fisher-Yates Shuffle for a truly random order
    const shuffled = [...members];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Update each member in the database
    const updatePromises = shuffled.map((member, index) => 
      supabase.from('league_members')
        .update({ draft_position: index + 1 })
        .eq('league_id', league.id)
        .eq('user_id', member.user_id)
    );

    await Promise.all(updatePromises);
    setIsProcessing(false);
    alert("Draft order randomized! Refreshing board...");
    window.location.reload(); // Quick refresh to snap the grid into place
  };

  // 5. Start the Draft
  const handleStartDraft = async () => {
    if (missingPlayers > 0) {
      const proceed = window.confirm(`You are missing ${missingPlayers} players. Are you SURE you want to start? The math works best with exactly 8.`);
      if (!proceed) return;
    }

    setIsProcessing(true);
    await supabase.from('leagues').update({ status: 'drafting' }).eq('id', league.id);
    setIsProcessing(false);

    router.push(`/leagues/${league.id}/draft`);
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
          <form onSubmit={handleSendInvite} className="flex flex-col space-y-2">
            <input 
              type="email" 
              placeholder="friend@example.com" 
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
            <button type="submit" disabled={missingPlayers === 0} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 rounded-md text-sm transition-colors disabled:opacity-50">
              Draft Email Invite
            </button>
          </form>
        </div>

        {/* Middle Column: Draft Order */}
        <div className="md:col-span-1 space-y-4 border-t md:border-t-0 md:border-l border-slate-200 pt-6 md:pt-0 md:pl-8">
          <h3 className="font-bold text-slate-700">Draft Order</h3>
          <p className="text-sm text-slate-500">Assign the 1-8 draft slots randomly to current members.</p>
          <button 
            onClick={handleRandomizeOrder} 
            disabled={isProcessing}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 rounded-md text-sm transition-colors disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : '🎲 Randomize Order'}
          </button>
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