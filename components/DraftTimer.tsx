// components/DraftTimer.tsx
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Clock, Zap, Pause } from 'lucide-react';

interface DraftTimerProps {
    timerSeconds: number;
    pickStartedAt: string | null;
    teams: any[];
    draftPicks: any[];
    onAutoPickTeam: (teamId: number) => void;
    canAutoPick: boolean;
    isPaused: boolean;
    onTick?: (secondsLeft: number) => void;
}

export default function DraftTimer({
    timerSeconds,
    pickStartedAt,
    teams,
    draftPicks,
    onAutoPickTeam,
    canAutoPick,
    isPaused,
    onTick
}: DraftTimerProps) {
    const [secondsLeft, setSecondsLeft] = useState(timerSeconds);
    const autoPickFired = useRef(false);
    const pausedAtRef = useRef<number | null>(null);

    // Find the best available team (lowest overall_seed that hasn't been drafted)
    const bestAvailableTeam = useMemo(() => {
        const draftedIds = new Set(draftPicks.map((dp: any) => dp.team_id));
        const available = teams
            .filter((t: any) => !draftedIds.has(t.id))
            .sort((a: any, b: any) => (a.overall_seed || a.seed) - (b.overall_seed || b.seed));
        return available[0] || null;
    }, [teams, draftPicks]);

    // Countdown logic — freezes when paused
    useEffect(() => {
        if (!timerSeconds || !pickStartedAt) {
            setSecondsLeft(timerSeconds);
            return;
        }

        autoPickFired.current = false;

        // When paused, freeze the current value
        if (isPaused) {
            pausedAtRef.current = secondsLeft;
            return;
        }

        const tick = () => {
            const elapsed = Math.floor((Date.now() - new Date(pickStartedAt).getTime()) / 1000);
            const remaining = Math.max(0, timerSeconds - elapsed);
            setSecondsLeft(remaining);
            if (onTick) onTick(remaining);

            if (remaining === 0 && !autoPickFired.current && canAutoPick && bestAvailableTeam) {
                autoPickFired.current = true;
                onAutoPickTeam(bestAvailableTeam.id);
            }
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [timerSeconds, pickStartedAt, canAutoPick, bestAvailableTeam, onAutoPickTeam, isPaused]);

    if (!timerSeconds) return null;

    const percentage = timerSeconds > 0 ? (secondsLeft / timerSeconds) * 100 : 0;
    const isUrgent = secondsLeft <= 10 && !isPaused;
    const isCritical = secondsLeft <= 5 && !isPaused;
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;

    return (
        <div className="space-y-2">
            <div className={`flex items-center justify-between px-4 py-2 rounded-xl border-2 transition-all ${isPaused ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-400' :
                isCritical ? 'bg-red-50 dark:bg-red-900/30 border-red-400 animate-pulse' :
                    isUrgent ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-400' :
                        'bg-white dark:bg-card border-slate-200 dark:border-card-border'
                }`}>
                <div className="flex items-center gap-2">
                    {isPaused ? (
                        <Pause size={16} className="text-amber-500" />
                    ) : (
                        <Clock size={16} className={isCritical ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-slate-500'} />
                    )}
                    <span className={`text-lg font-mono font-extrabold tabular-nums ${isPaused ? 'text-amber-600 dark:text-amber-400' :
                        isCritical ? 'text-red-600 dark:text-red-400' :
                            isUrgent ? 'text-amber-600 dark:text-amber-400' :
                                'text-slate-900 dark:text-white'
                        }`}>
                        {minutes}:{seconds.toString().padStart(2, '0')}
                        {isPaused && <span className="text-xs ml-2 font-bold">PAUSED</span>}
                    </span>
                </div>

                {bestAvailableTeam && !isPaused && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-muted">
                        <Zap size={12} className={isCritical ? 'text-red-400' : 'text-slate-400'} />
                        <span>Auto: <span className={isCritical ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}>({bestAvailableTeam.seed}) {bestAvailableTeam.name}</span></span>
                    </div>
                )}
            </div>

            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-1000 ease-linear ${isPaused ? 'bg-amber-400' :
                        isCritical ? 'bg-red-500' : isUrgent ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
