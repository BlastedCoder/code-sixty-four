// components/DraftSettingsModal.tsx
// Path: components/DraftSettingsModal.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Play, Trash2, Users, AlertCircle, ChevronUp, ChevronDown, Shuffle, Lock } from 'lucide-react';

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

  // Load the members into local state when the modal opens
  useEffect(() => {
    if (isOpen) {
      setDraftOrder([...members]);
      setIsRandomizedLocked(false); // Reset lock state when reopened
    }
  }, [isOpen, members]);

  if (!isOpen) return null;

  // --- SORTING LOGIC ---
  const movePlayer = (index: number, direction: 'up' | 'down') => {
    if (isRandomizedLocked) return; // Prevent manual edits if locked
    
    const newOrder = [...draftOrder];
    if (direction === 'up' && index > 0) {
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
    }
    setDraftOrder(newOrder);
  };

  const handleRandomize = () => {
    const confirm = window.confirm("Are you sure? Randomizing will lock the draft order permanently for this draft session.");
    if (!confirm) return;

    // Fisher-Yates shuffle
    const shuffled = [...draftOrder].sort(() => Math.random() - 0.5);
    setDraftOrder(shuffled);
    setIsRandomizedLocked(true); // Lock manual editing
  };

  // --- DATABASE ACTIONS ---
  const handleStartDraft = async () => {
    if (draftOrder.length === 0) return alert("You need players to start a draft!");
    setIsStarting(true);

    try {
      // 1. Save the new draft order to the database
      const updatePromises = draftOrder.map((member, index) => 
        supabase
          .from('league_members')
          .update({ draft_position: index + 1 })
          .eq('league_id', leagueId)
          .eq('user_id', member.user_id)
      );
      
      await Promise.all(updatePromises);

      // 2. Flip the league status to open the War Room
      const { error } = await supabase
        .from('leagues')
        .update({ status: 'drafting', current_pick: 1 })
        .eq('id', leagueId);

      if (error) throw error;

      onDraftStarted();
      onClose();
    } catch (error: any) {
      alert("Error starting draft: " + error.message);
      setIsStarting(false);
    }
  };

  const handleKickPlayer = async (userId: string, isCommissioner: boolean) => {
    if (isCommissioner) return alert("You cannot kick yourself!");
    
    const confirmKick = window.confirm("Are you sure you want to remove this player from the league?");
    if (!confirmKick) return;

    setIsKicking(userId);
    const { error } = await supabase
      .from('league_members')
      .delete()
      .eq('league_id', leagueId)
      .eq('user_id', userId);

    if (error) alert("Error removing player: " + error.message);
    else window.location.reload(); 
    
    setIsKicking(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        
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

          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Set Draft Order</h3>
              
              {/* Shuffle / Locked Button */}
              {isRandomizedLocked ? (
                <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
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

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {draftOrder.map((member, index) => {
                const isCommish = member.user_id === draftOrder[0]?.created_by; 

                return (
                  <div key={member.user_id} className={`p-2 flex items-center justify-between transition-colors ${isRandomizedLocked ? 'bg-slate-50 opacity-90' : 'hover:bg-slate-50'}`}>
                    
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-black ${index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        {index + 1}
                      </span>
                      <span className="font-bold text-slate-700">{member.profiles?.display_name || 'Unknown User'}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {/* Manual Sorting Arrows (Hidden if locked) */}
                      {!isRandomizedLocked && (
                        <div className="flex flex-col mr-2">
                          <button onClick={() => movePlayer(index, 'up')} disabled={index === 0} className="p-0.5 text-slate-400 hover:text-slate-800 disabled:opacity-30">
                            <ChevronUp size={16} />
                          </button>
                          <button onClick={() => movePlayer(index, 'down')} disabled={index === draftOrder.length - 1} className="p-0.5 text-slate-400 hover:text-slate-800 disabled:opacity-30">
                            <ChevronDown size={16} />
                          </button>
                        </div>
                      )}

                      {!isCommish && (
                        <button 
                          onClick={() => handleKickPlayer(member.user_id, false)}
                          disabled={isKicking === member.user_id}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="Kick Player"
                        >
                          {isKicking === member.user_id ? <span className="animate-pulse">...</span> : <Trash2 size={18} />}
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleStartDraft}
            disabled={isStarting || draftOrder.length === 0}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-300 text-slate-900 px-6 py-2.5 rounded-xl font-black transition-transform hover:scale-105 shadow-sm"
          >
            {isStarting ? 'Saving & Starting...' : <><Play size={18} fill="currentColor" /> Start Draft Now</>}
          </button>
        </div>

      </div>
    </div>
  );
}