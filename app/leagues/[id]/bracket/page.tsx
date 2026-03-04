// app/leagues/[id]/bracket/page.tsx

'use client';

import { use } from 'react';
import Link from 'next/link';
import TraditionalBracket from '@/components/TraditionalBracket';
import HTraditionalBracket from '@/components/HTraditionalBracket';

export default function FullBracketPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params exactly like you do on the main league page
  const { id: leagueId } = use(params);

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <Link 
            href={`/leagues/${leagueId}`}
            className="text-sm font-bold text-slate-500 hover:text-slate-900 flex items-center gap-2 transition-colors border border-slate-200 bg-white px-4 py-2 rounded-lg shadow-sm"
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