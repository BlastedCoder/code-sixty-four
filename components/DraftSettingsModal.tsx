// components/DraftSettingsModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { X, Play, Trash2, Users, AlertCircle, ChevronUp, ChevronDown, Shuffle, Lock, Crown } from 'lucide-react';

interface DraftSettingsModalProps {
  leagueId: string;
  members: any[];
  isOpen: boolean;
  onClose: () => void;
  onDraftStarted: () => void;
}

export default function DraftSettingsModal({ leagueId, members, isOpen, onClose, onDraftStarted }: DraftSettingsModalProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [isKicking, setIsKicking] = useState<string | null>(null);

  // New States for Draft Order
  const [draftOrder, setDraftOrder] = useState<any[]>([]);
  const [isRandomizedLocked, setIsRandomizedLocked] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Load the members into local state when the modal opens
  useEffect(() => {
    if (isOpen) {
      setDraftOrder([...members]);
      setIsRandomizedLocked(false);
    }
  }, [isOpen, members]);

  if (!isOpen) return null;

  // --- SORTING LOGIC ---
  const movePlayer = (index: number, direction: 'up' | 'down') => {
    if (isRandomizedLocked) return;

    const newOrder = [...draftOrder];
    if (direction === 'up' && index > 0) {
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
    }
    setDraftOrder(newOrder);
  };

  const doRandomize = () => {
    const shuffled = [...draftOrder];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setDraftOrder(shuffled);
    setIsRandomizedLocked(true);
    toast.success('Draft order randomized!');
  };

  const handleRandomize = () => {
    toast('Randomizing will lock the draft order. Continue?', {
      action: { label: 'Confirm', onClick: doRandomize },
      cancel: { label: 'Cancel', onClick: () => { } },
    });
  };

  // --- DATABASE ACTIONS ---
  const handleStartDraft = async () => {
    if (draftOrder.length === 0) return toast.error("You need players to start a draft!");
    setIsStarting(true);

    try {
      const updatePromises = draftOrder.map((member, index) =>
        supabase
          .from('league_members')
          .update({ draft_position: index + 1 })
          .eq('league_id', leagueId)
          .eq('user_id', member.user_id)
      );

      await Promise.all(updatePromises);

      // Save timer settings but keep status at pre_draft
      // The commissioner will start the draft from inside the war room
      await supabase
        .from('leagues')
        .update({
          draft_timer_seconds: timerSeconds,
        })
        .eq('id', leagueId);

      onDraftStarted();
      onClose();
    } catch (error: any) {
      toast.error("Error saving settings: " + error.message);
      setIsStarting(false);
    }
  };

  const handleKickPlayer = async (userId: string, isCommissioner: boolean) => {
    if (isCommissioner) return toast.error("You cannot kick yourself!");

    toast('Remove this player from the league?', {
      action: {
        label: 'Remove',
        onClick: async () => {
          setIsKicking(userId);
          const { error } = await supabase
            .from('league_members')
            .delete()
            .eq('league_id', leagueId)
            .eq('user_id', userId);

          if (error) toast.error("Error removing player: " + error.message);
          else window.location.reload();
          setIsKicking(null);
        },
      },
      cancel: { label: 'Cancel', onClick: () => { } },
    });
  };

  /*
  const handleTransferCommissioner = async (userId: string, userName: string) => {
    toast(`Make ${userName} the new Commissioner?`, {
      description: "You will lose your Commissioner privileges.",
      action: {
        label: 'Confirm Transfer',
        onClick: async () => {
          const { error } = await supabase
            .from('leagues')
            .update({ created_by: userId })
            .eq('id', leagueId);

          if (error) toast.error("Error transferring permissions: " + error.message);
          else {
            toast.success(`${userName} is now the Commissioner!`);
            setTimeout(() => window.location.reload(), 1000);
          }
        },
      },
      cancel: { label: 'Cancel', onClick: () => { } },
    });
  };
  */

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-card rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">

        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
          <h2 className="text-xl font-extrabold flex items-center gap-2"><Users size={20} /> Manage Draft Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800">
            <AlertCircle className="flex-shrink-0 mt-0.5" size={20} />
            <div className="text-sm">
              <p className="font-bold">Ready to draft?</p>
              <p className="mt-1">Set the draft order below. Once you start, the War Room will open for all {draftOrder.length} players.</p>
            </div>
          </div>

          {/* Draft Timer Setting */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Draft Timer</h3>
            <p className="text-xs text-slate-500 dark:text-muted">Set a per-pick time limit. When time expires, the best available team is auto-drafted.</p>
            <div className="flex gap-2">
              {[0, 60, 90, 120].map(val => (
                <button
                  key={val}
                  onClick={() => setTimerSeconds(val)}
                  className={`px-3 py-2 text-sm font-bold rounded-lg border transition-all ${timerSeconds === val
                    ? 'bg-emerald-500 border-emerald-600 text-white'
                    : 'bg-white dark:bg-card border-slate-200 dark:border-card-border text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                >
                  {val === 0 ? 'Off' : val + 's'}
                </button>
              ))}
            </div>
          </div>

          {/* Draft Order */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Set Draft Order</h3>

              {isRandomizedLocked ? (
                <span className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-muted bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg">
                  <Lock size={14} /> Order Locked
                </span>
              ) : (
                <button
                  onClick={handleRandomize}
                  className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Shuffle size={14} /> Randomize
                </button>
              )}
            </div>

            <div className="border border-slate-200 dark:border-card-border rounded-xl overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {draftOrder.map((member, index) => {
                const isCommish = member.user_id === draftOrder[0]?.created_by;

                return (
                  <div key={member.user_id} className={`p-2 flex items-center justify-between transition-colors ${isRandomizedLocked ? 'bg-slate-50 dark:bg-background opacity-90' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}>

                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-black ${index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-muted'}`}>
                        {index + 1}
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{member.profiles?.display_name || 'Unknown User'}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {!isRandomizedLocked && (
                        <div className="flex flex-col mr-2">
                          <button onClick={() => movePlayer(index, 'up')} disabled={index === 0} className="p-0.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30">
                            <ChevronUp size={16} />
                          </button>
                          <button onClick={() => movePlayer(index, 'down')} disabled={index === draftOrder.length - 1} className="p-0.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30">
                            <ChevronDown size={16} />
                          </button>
                        </div>
                      )}

                      {!isCommish && (
                        <div className="flex gap-1">
                          {/* Hidden for now per user request
                          <button
                            onClick={() => handleTransferCommissioner(member.user_id, member.profiles?.display_name || 'User')}
                            className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/40 p-2 rounded-lg transition-colors"
                            title="Make Commissioner"
                          >
                            <Crown size={18} />
                          </button>
                          */}

                          <button
                            onClick={() => handleKickPlayer(member.user_id, false)}
                            disabled={isKicking === member.user_id}
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            title="Kick Player"
                          >
                            {isKicking === member.user_id ? <span className="animate-pulse">...</span> : <Trash2 size={18} />}
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-background px-6 py-4 border-t border-slate-200 dark:border-card-border flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleStartDraft}
            disabled={isStarting || draftOrder.length === 0}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-300 text-slate-900 dark:text-white px-6 py-2.5 rounded-xl font-black transition-transform hover:scale-105 shadow-sm"
          >
            {isStarting ? 'Saving...' : <><Play size={18} fill="currentColor" /> Open the War Room</>}
          </button>
        </div>

      </div>
    </div>
  );
}