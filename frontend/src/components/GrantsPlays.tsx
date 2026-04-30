'use client';

import { useState } from 'react';
import { PowerRankings } from '@/components/PowerRankings';
import { WriteupSection } from '@/components/WriteupSection';
import type { PowerRankingTier } from '@/lib/hooks';

type Tab = 'plays' | 'rankings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'plays', label: 'Betting plays' },
  { id: 'rankings', label: 'Power rankings' },
];

export function GrantsPlays({
  powerRankings,
  bettingPlays,
}: {
  powerRankings?: PowerRankingTier[] | null;
  bettingPlays?: string | null;
}) {
  const hasRankings = !!powerRankings && powerRankings.length > 0;
  const hasPlays = !!bettingPlays;
  const [tab, setTab] = useState<Tab>(hasPlays ? 'plays' : 'rankings');

  if (!hasRankings && !hasPlays) return null;

  return (
    <section className="rounded-xl border-2 border-rose-red/30 bg-rose-red/5 overflow-hidden">
      <header className="px-4 pt-3 pb-0">
        <h2 className="font-display text-xl text-rose-dark">Grant&apos;s plays</h2>
        <p className="text-xs text-bourbon/70 mt-0.5">
          His full betting card and tier rankings.
        </p>
      </header>
      <nav className="flex gap-1 border-b border-rose-red/15 px-4 mt-2" aria-label="Section">
        {TABS.map((t) => {
          const disabled = (t.id === 'plays' && !hasPlays) || (t.id === 'rankings' && !hasRankings);
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => !disabled && setTab(t.id)}
              disabled={disabled}
              className={`px-3 py-1.5 text-xs font-semibold border-b-2 -mb-px transition ${
                active
                  ? 'border-rose-red text-rose-dark'
                  : disabled
                  ? 'border-transparent text-bourbon/30 cursor-not-allowed'
                  : 'border-transparent text-bourbon/70 hover:text-rose-red'
              }`}
              aria-pressed={active}
            >
              {t.label}
            </button>
          );
        })}
      </nav>
      <div className="bg-cream/40 px-2 py-3">
        {tab === 'plays' && hasPlays && (
          <WriteupSection title="" body={bettingPlays!} tone="rose" />
        )}
        {tab === 'rankings' && hasRankings && <PowerRankings tiers={powerRankings!} />}
      </div>
    </section>
  );
}
