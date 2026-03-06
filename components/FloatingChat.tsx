// components/FloatingChat.tsx
'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import LeagueChat from './LeagueChat';
import { supabase } from '@/lib/supabase';

export default function FloatingChat({ leagueId, currentUser }: { leagueId: string; currentUser: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Listen for new messages when chat is closed
    useEffect(() => {
        if (isOpen) {
            setUnreadCount(0); // Reset when opened
            return;
        }

        const channel = supabase.channel(`chat_notifications_${leagueId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'league_messages',
                    filter: `league_id=eq.${leagueId}`,
                },
                (payload) => {
                    // Don't count our own messages (though we shouldn't be sending if closed, just safe)
                    if (payload.new.user_id !== currentUser?.id) {
                        setUnreadCount(prev => prev + 1);
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [leagueId, isOpen, currentUser?.id]);

    const handleToggleChat = () => {
        if (!isOpen) setUnreadCount(0);
        setIsOpen(!isOpen);
    };

    return (
        <>
            {/* Chat Panel */}
            {isOpen && (
                <div className="fixed bottom-20 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-white dark:bg-card rounded-2xl shadow-2xl border border-slate-200 dark:border-card-border overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-900 dark:bg-slate-800">
                        <div className="flex items-center gap-2">
                            <MessageCircle size={16} className="text-purple-400" />
                            <span className="text-sm font-extrabold text-white">War Room Chat</span>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Chat body */}
                    <LeagueChat leagueId={leagueId} currentUser={currentUser} />
                </div>
            )}

            {/* Floating Action Button */}
            <div className="fixed bottom-4 right-4 z-50">
                {/* Notification Badge */}
                {!isOpen && unreadCount > 0 && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-slate-50 dark:border-slate-900 z-10 animate-bounce">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                )}
                <button
                    onClick={handleToggleChat}
                    className={`p-4 rounded-full shadow-lg transition-all hover:scale-110 relative ${isOpen
                        ? 'bg-slate-700 hover:bg-slate-600 text-white'
                        : 'bg-purple-600 hover:bg-purple-500 text-white'
                        }`}
                >
                    {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
                </button>
            </div>
        </>
    );
}
