'use client';

import { useEffect, useState } from 'react';
import { GrantsPlays } from '@/components/GrantsPlays';
import { useGrantPicks, type RaceKind } from '@/lib/hooks';
import { CURRENT_YEAR } from '@/lib/year';

const TABS: { id: RaceKind; label: string }[] = [
  { id: 'derby', label: 'Derby' },
  { id: 'oaks', label: 'Oaks' },
];

export default function PlaysPage() {
  const [kind, setKind] = useState<RaceKind>('derby');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get('event');
    if (e === 'oaks' || e === 'derby') setKind(e);
  }, []);

  const { grantPicks, year } = useGrantPicks(kind);
  const isArchive = year !== CURRENT_YEAR;

  return (
    <section className="pt-8 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-3xl text-rose-dark">Grant&apos;s plays</h1>
        <p className="text-bourbon/80 text-sm mt-1">
          {isArchive ? `${year} archive — his betting card and tier rankings.` : 'His betting card and tier rankings for this year.'}
        </p>
      </header>

      <nav className="flex gap-1 border-b border-bourbon/20" aria-label="Event">
        {TABS.map((t) => {
          const active = kind === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setKind(t.id);
                const url = new URL(window.location.href);
                url.searchParams.set('event', t.id);
                window.history.replaceState(null, '', url.toString());
              }}
              className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition ${
                active
                  ? 'border-rose-red text-rose-dark'
                  : 'border-transparent text-bourbon/70 hover:text-rose-red'
              }`}
              aria-pressed={active}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {grantPicks ? (
        <GrantsPlays
          powerRankings={grantPicks.power_rankings ?? null}
          bettingPlays={grantPicks.betting_plays ?? null}
        />
      ) : (
        <p className="text-bourbon/70 text-sm">No plays for this event.</p>
      )}
    </section>
  );
}
