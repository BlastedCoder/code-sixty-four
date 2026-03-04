// components/DevPanel.tsx
'use client';
import { toast } from 'sonner';

import React, { useState } from 'react';
import { 
  Settings, Users, Play, FastForward, Dices, 
  RotateCcw, Trash2, Mail, ShieldAlert, ChevronUp, ChevronDown 
} from 'lucide-react';

export default function DevPanel({ leagueId }: { leagueId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [godMode, setGodMode] = useState(false);
  const [leagueStatus, setLeagueStatus] = useState('drafting');

  // Security Check: If not in dev mode, render nothing at all.
  if (process.env.NEXT_PUBLIC_ENABLE_DEV_MODE !== 'true') {
    return null;
  }

  const handleAction = async (actionName: string, apiRoute: string) => {
    setLoadingAction(actionName);
    try {
      console.log(`Firing ${actionName} for league ${leagueId}...`);
      
      // We are now hitting the real API route!
      const response = await fetch(apiRoute, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId }) 
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Request failed');
      
      console.log(`${actionName} complete!`, data);
      
      // Force a page refresh to show the new UI state
      window.location.reload(); 

    } catch (error) {
      console.error(`${actionName} failed:`, error);
      toast.error(`${actionName} failed. Check console.`);
    }
    setLoadingAction(null);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans shadow-2xl">
      {/* Panel Header / Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-slate-900 text-white font-bold border border-slate-700 hover:bg-slate-800 transition-colors ${isOpen ? 'rounded-t-xl' : 'rounded-xl'}`}
      >
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-pink-500 animate-spin-slow" />
          <span>Dev Control Panel</span>
        </div>
        {isOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
      </button>

      {/* Panel Content */}
      {isOpen && (
        <div className="bg-slate-800 border-x border-b border-slate-700 rounded-b-xl p-4 w-80 text-sm space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Section: Roster & Draft */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-700 pb-1">Draft Operations</h4>
            
            <button 
              onClick={() => handleAction('Populate Users', '/api/dev/populate-users')}
              disabled={!!loadingAction}
              className="w-full flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition disabled:opacity-50"
            >
              <Users size={16} className="text-blue-400" />
              Fill League (7 Test Users)
            </button>
            
            {/*<button 
              onClick={() => handleAction('Simulate Pick', '/api/dev/simulate-pick')}
              disabled={!!loadingAction}
              className="w-full flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition disabled:opacity-50"
            >
              <Play size={16} className="text-emerald-400" />
              Simulate Single Pick
            </button>*/}

            <button 
              onClick={() => handleAction('Auto-Complete Draft', '/api/dev/autocomplete-draft')}
              disabled={!!loadingAction}
              className="w-full flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition disabled:opacity-50"
            >
              <FastForward size={16} className="text-emerald-500" />
              Auto-Complete Draft
            </button>
          </div>

          {/* Section: Tournament Simulator */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-700 pb-1">Tournament Engine</h4>
            
            <button 
              onClick={() => handleAction('Simulate Round', '/api/dev/simulate-round')}
              disabled={!!loadingAction}
              className="w-full flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition disabled:opacity-50"
            >
              <Dices size={16} className="text-purple-400" />
              Simulate Next Round
            </button>

            <button 
              onClick={() => handleAction('Reset Bracket', '/api/dev/reset-bracket')}
              disabled={!!loadingAction}
              className="w-full flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition disabled:opacity-50"
            >
              <RotateCcw size={16} className="text-amber-400" />
              Reset Bracket Scores
            </button>
          </div>

          {/* Section: State Overrides */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-700 pb-1">State Overrides</h4>
            
            <div className="flex items-center justify-between px-1">
              <span className="text-slate-300 font-medium flex items-center gap-2">
                <ShieldAlert size={16} className="text-pink-500" />
                God Mode (Turn Override)
              </span>
              <button 
                onClick={() => setGodMode(!godMode)}
                className={`w-10 h-5 rounded-full relative transition-colors ${godMode ? 'bg-pink-500' : 'bg-slate-600'}`}
              >
                <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-transform ${godMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Force League Status</label>
              <select 
                value={leagueStatus}
                onChange={(e) => setLeagueStatus(e.target.value)}
                className="bg-slate-700 text-white text-sm rounded-lg px-2 py-1.5 border border-slate-600 outline-none"
              >
                <option value="pre_draft">Pre-Draft</option>
                <option value="drafting">Drafting</option>
                <option value="active">Active (Tournament)</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <button 
              onClick={() => handleAction('Send Test Email', '/api/dev/test-email')}
              disabled={!!loadingAction}
              className="w-full flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition disabled:opacity-50"
            >
              <Mail size={16} className="text-slate-300" />
              Fire Roster Email Blast
            </button>
          </div>

          {/* Section: Danger Zone */}
          <div className="space-y-2 pt-2">
            <button 
              onClick={() => handleAction('Clean Slate', '/api/dev/clean-slate')}
              disabled={!!loadingAction}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-900/50 hover:bg-red-900/80 text-red-200 border border-red-800 rounded-lg transition disabled:opacity-50 font-bold"
            >
              <Trash2 size={16} />
              Nuke League (Clean Slate)
            </button>
          </div>

        </div>
      )}
    </div>
  );
}