// components/LeagueChat.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send } from 'lucide-react';
import Avatar from './Avatar';

interface ChatMessage {
    id: number;
    user_id: string;
    message: string;
    created_at: string;
    profiles: {
        display_name: string;
        avatar_url: string | null;
    };
}

export default function LeagueChat({ leagueId, currentUser }: { leagueId: string; currentUser: any }) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom helper
    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    // Fetch existing messages
    useEffect(() => {
        const fetchMessages = async () => {
            // Fetch messages
            const { data, error } = await supabase
                .from('league_messages')
                .select('id, user_id, message, created_at')
                .eq('league_id', leagueId)
                .order('created_at', { ascending: true })
                .limit(200);

            if (error) {
                console.error('Chat fetch error:', error);
                return;
            }

            if (!data || data.length === 0) {
                setMessages([]);
                return;
            }

            // Batch-fetch profiles for all unique user IDs
            const userIds = [...new Set(data.map(m => m.user_id))];
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, display_name, avatar_url')
                .in('id', userIds);

            const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

            const enriched = data.map(m => ({
                ...m,
                profiles: profileMap.get(m.user_id) || { display_name: 'Unknown', avatar_url: null },
            }));

            setMessages(enriched as any);
            setTimeout(scrollToBottom, 100);
        };

        fetchMessages();

        // Real-time subscription for new messages
        const channel = supabase.channel(`chat-${leagueId}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'league_messages', filter: `league_id=eq.${leagueId}` },
                async (payload) => {
                    const newMsg = payload.new as any;
                    // Fetch the sender's profile
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id, display_name, avatar_url')
                        .eq('id', newMsg.user_id)
                        .single();

                    const enriched = {
                        ...newMsg,
                        profiles: profile || { display_name: 'Unknown', avatar_url: null },
                    };

                    setMessages(prev => [...prev, enriched as any]);
                    setTimeout(scrollToBottom, 100);
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [leagueId]);

    const handleSend = async () => {
        const trimmed = newMessage.trim();
        if (!trimmed || sending || !currentUser) return;

        setSending(true);
        setNewMessage('');

        const { error } = await supabase.from('league_messages').insert({
            league_id: leagueId,
            user_id: currentUser.id,
            message: trimmed,
        });

        if (error) {
            setNewMessage(trimmed); // Restore on failure
        }

        setSending(false);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Format timestamp
    const formatTime = (ts: string) => {
        const date = new Date(ts);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        if (isToday) return time;
        if (isYesterday) return `Yesterday ${time}`;
        return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
    };

    return (
        <div className="flex flex-col h-[500px]">
            {/* Messages area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth"
            >
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="text-4xl mb-3">💬</div>
                        <p className="font-bold text-slate-500 dark:text-muted">No messages yet</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500">Be the first to say something!</p>
                    </div>
                ) : (
                    messages.map((msg, i) => {
                        const isMe = msg.user_id === currentUser?.id;
                        const showAvatar = i === 0 || messages[i - 1].user_id !== msg.user_id;

                        return (
                            <div key={msg.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                                {/* Avatar column */}
                                <div className="w-8 flex-shrink-0">
                                    {showAvatar && (
                                        <Avatar
                                            src={msg.profiles?.avatar_url}
                                            name={msg.profiles?.display_name}
                                            size="sm"
                                        />
                                    )}
                                </div>

                                {/* Message bubble */}
                                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                                    {showAvatar && (
                                        <p className={`text-[11px] font-bold mb-0.5 px-1 ${isMe ? 'text-right text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {msg.profiles?.display_name || 'Unknown'}
                                        </p>
                                    )}
                                    <div
                                        className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${isMe
                                            ? 'bg-emerald-500 text-white rounded-tr-sm'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                                            }`}
                                    >
                                        {msg.message}
                                    </div>
                                    <p className={`text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 px-1 ${isMe ? 'text-right' : ''}`}>
                                        {formatTime(msg.created_at)}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input area */}
            <div className="border-t border-slate-200 dark:border-card-border px-4 py-3 bg-white dark:bg-card">
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value.slice(0, 500))}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        maxLength={500}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-background text-slate-900 dark:text-white text-sm font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sending}
                        className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white transition-all hover:scale-105 disabled:hover:scale-100"
                    >
                        <Send size={18} />
                    </button>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 text-right">
                    {newMessage.length}/500
                </p>
            </div>
        </div>
    );
}
