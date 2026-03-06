// components/GameLog.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, Swords } from 'lucide-react';

interface GameResult {
    id: number;
    round: number;
    team1_score: number;
    team2_score: number;
    winner_id: number;
    team1: { id: number; name: string; seed: number; region: string };
    team2: { id: number; name: string; seed: number; region: string };
}

const ROUND_NAMES: Record<number, string> = {
    1: 'Round of 64',
    2: 'Round of 32',
    3: 'Sweet 16',
    4: 'Elite 8',
    5: 'Final Four',
    6: 'Championship',
};

export default function GameLog({ leagueId }: { leagueId: number }) {
    const [results, setResults] = useState<GameResult[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchResults = async () => {
        const { data } = await supabase
            .from('games')
            .select(`
        id, round, team1_score, team2_score, winner_id,
        team1:teams!games_team1_id_fkey(id, name, seed, region),
        team2:teams!games_team2_id_fkey(id, name, seed, region)
      `)
            .eq('is_completed', true)
            .order('id', { ascending: false });

        if (data) setResults(data as any);
        setLoading(false);
    };

    useEffect(() => {
        fetchResults();

        // Real-time updates when games are scored
        const channel = supabase.channel(`game-log-${leagueId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games' },
                (payload) => {
                    if (payload.new.is_completed) fetchResults();
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [leagueId]);

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="text-emerald-500 font-bold animate-pulse">Loading results...</div>
            </div>
        );
    }

    if (results.length === 0) {
        return (
            <div className="text-center py-16">
                <Swords size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                <p className="font-bold text-slate-500 dark:text-muted">No games have been completed yet.</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Results will appear here as games are scored.</p>
            </div>
        );
    }

    // Group results by round
    const grouped = results.reduce<Record<number, GameResult[]>>((acc, game) => {
        if (!acc[game.round]) acc[game.round] = [];
        acc[game.round].push(game);
        return acc;
    }, {});

    const rounds = Object.keys(grouped).map(Number).sort((a, b) => b - a);

    return (
        <div className="space-y-8">
            {rounds.map((round) => (
                <div key={round}>
                    <div className="flex items-center gap-3 mb-4">
                        <h3 className="text-sm font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            {ROUND_NAMES[round] || `Round ${round}`}
                        </h3>
                        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                            {grouped[round].length} game{grouped[round].length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {grouped[round].map((game) => {
                            const t1Won = game.winner_id === game.team1.id;
                            const winner = t1Won ? game.team1 : game.team2;
                            const loser = t1Won ? game.team2 : game.team1;
                            const winScore = t1Won ? game.team1_score : game.team2_score;
                            const loseScore = t1Won ? game.team2_score : game.team1_score;

                            return (
                                <div
                                    key={game.id}
                                    className="flex items-center justify-between p-4 bg-white dark:bg-card border border-slate-200 dark:border-card-border rounded-xl shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="font-extrabold text-slate-900 dark:text-white text-sm truncate">
                                                <span className="text-slate-400 dark:text-slate-500 font-mono text-xs mr-1">({winner.seed})</span>
                                                {winner.name}
                                            </p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                                def. <span className="font-mono">({loser.seed})</span> {loser.name}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{winScore}</span>
                                        <span className="text-xs text-slate-300 dark:text-slate-600 font-bold">-</span>
                                        <span className="text-lg font-black text-slate-400 dark:text-slate-500 tabular-nums">{loseScore}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
