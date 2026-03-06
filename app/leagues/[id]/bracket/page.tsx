// app/leagues/[id]/bracket/page.tsx

'use client';

import { use } from 'react';
import Link from 'next/link';
import TraditionalBracket from '@/components/TraditionalBracket';
import HTraditionalBracket from '@/components/HTraditionalBracket';

export default function FullBracketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: leagueId } = use(params);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-background p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <Link
            href={`/leagues/${leagueId}`}
            className="text-sm font-bold text-slate-500 dark:text-muted hover:text-slate-900 dark:hover:text-white flex items-center gap-2 transition-colors border border-slate-200 dark:border-card-border bg-white dark:bg-card px-4 py-2 rounded-lg shadow-sm"
          >
            &larr; Back to League Dashboard
          </Link>
        </div>

        {/* The massive, horizontally scrolling bracket */}
        <TraditionalBracket />

        <HTraditionalBracket />

      </div>
    </main>
  );
}