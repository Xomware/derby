'use client';

import type { GrantPicks, RaceKind } from '@/lib/hooks';

const SLOTS: { key: keyof GrantPicks; label: string }[] = [
  { key: 'win', label: 'Win' },
  { key: 'place', label: 'Place' },
  { key: 'show', label: 'Show' },
  { key: 'long_shot', label: 'Long shot' },
];

export function GrantPinned({
  picks,
  kind,
  year,
  isArchive,
}: {
  picks: GrantPicks;
  kind: RaceKind;
  year: number;
  isArchive: boolean;
}) {
  return (
    <section className="rounded-xl border-2 border-rose-red/30 bg-rose-red/5 p-4">
      <header className="flex items-baseline gap-2 mb-3">
        <h2 className="font-display text-xl text-rose-dark">
          Grant&apos;s {year} {kind === 'derby' ? 'Derby' : 'Oaks'} picks
        </h2>
        {picks.inferred && (
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-bourbon/10 text-bourbon/70">
            Inferred from writeup
          </span>
        )}
        {isArchive && (
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-bourbon/10 text-bourbon/70">
            Archive
          </span>
        )}
      </header>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SLOTS.map((s) => {
          const value = picks[s.key] as string | null;
          return (
            <div
              key={s.key}
              className="rounded-md border border-rose-red/20 bg-white px-3 py-2"
            >
              <dt className="text-[10px] uppercase tracking-wider text-rose-red font-semibold">
                {s.label}
              </dt>
              <dd className="text-sm font-semibold text-bourbon mt-0.5">
                {value ?? '—'}
              </dd>
            </div>
          );
        })}
      </dl>
      {picks.notes && (
        <p className="mt-3 text-xs text-bourbon/70 italic">{picks.notes}</p>
      )}
    </section>
  );
}
