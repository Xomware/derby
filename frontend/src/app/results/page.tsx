'use client';

import { useEffect, useMemo, useState } from 'react';
import { Countdown } from '@/components/Countdown';
import { SidePanel, SidePanelItem } from '@/components/SidePanel';
import { usePicks, useResults, type RaceKind } from '@/lib/hooks';
import type { Pick, RaceFinisher } from '@/lib/types';
import { CURRENT_YEAR } from '@/lib/year';

const TABS: { id: RaceKind; label: string }[] = [
  { id: 'derby', label: 'Derby' },
  { id: 'oaks', label: 'Oaks' },
];

const POSITION_LABEL: Record<number, string> = {
  1: 'Win',
  2: 'Place',
  3: 'Show',
};

const POSITION_TONE: Record<number, string> = {
  1: 'bg-rose-red/15 text-rose-dark border-rose-red/30',
  2: 'bg-mint-julep/15 text-mint-julep border-mint-julep/30',
  3: 'bg-bourbon/10 text-bourbon border-bourbon/20',
};

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/[’']/g, "'");
}

function positionOf(horse: Pick, finishers: RaceFinisher[]): number | null {
  const target = normalizeName(horse.horse_name);
  const m = finishers.find((f) => normalizeName(f.horse_name) === target);
  return m ? m.position : null;
}

function sortForResults(horses: Pick[], finishers: RaceFinisher[]): Pick[] {
  const arr = [...horses];
  if (finishers.length === 0) {
    return arr.sort((a, b) => (a.post_position ?? 99) - (b.post_position ?? 99));
  }
  return arr.sort((a, b) => {
    const pa = positionOf(a, finishers) ?? 99;
    const pb = positionOf(b, finishers) ?? 99;
    if (pa !== pb) return pa - pb;
    return (a.post_position ?? 99) - (b.post_position ?? 99);
  });
}

export default function ResultsPage() {
  const [kind, setKind] = useState<RaceKind>('derby');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get('event');
    if (e === 'oaks' || e === 'derby') setKind(e);
  }, []);

  const { picks, isLoading, year } = usePicks(kind);
  const { results } = useResults(year);
  const isArchive = year !== CURRENT_YEAR;

  const main = kind === 'derby' ? 12 : 11;
  const finishers =
    (results?.races ?? []).find((r) => r.day === kind && r.race_number === main)
      ?.finishers ?? [];

  const horses = useMemo<Pick[]>(
    () => (picks?.races ?? []).flatMap((r) => r.picks),
    [picks]
  );
  const sorted = useMemo(() => sortForResults(horses, finishers), [horses, finishers]);
  const lockTime = picks?.races[0]?.lock_time;
  const official = finishers.length > 0;

  const tocItems: SidePanelItem[] = useMemo(
    () =>
      sorted.map((p) => {
        const pos = positionOf(p, finishers);
        const label =
          pos && pos <= 3
            ? `${POSITION_LABEL[pos]} — ${p.horse_name}`
            : pos
            ? `#${pos} — ${p.horse_name}`
            : p.horse_name;
        return {
          id: `result-horse-${p.id}`,
          label,
          meta: p.odds_at_pick ?? undefined,
        };
      }),
    [sorted, finishers]
  );

  return (
    <div className="pt-8 lg:grid lg:grid-cols-[1fr_240px] lg:gap-6">
      <section className="space-y-6 min-w-0 max-w-3xl">
        <header>
          <h1 className="font-display text-3xl text-rose-dark">
            {isArchive ? `${year} Results` : 'Live Results'}
          </h1>
          <p className="text-bourbon/80 text-sm mt-1">
            {isArchive
              ? `Final order from the ${year} Oaks and Derby.`
              : 'Post order until the race goes official, then re-sorts to Win / Place / Show on top.'}
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

        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="font-display italic text-mint-julep text-xs uppercase tracking-[0.3em]">
              {kind === 'derby' ? 'The Run for the Roses' : 'The Run for the Lilies'}
            </p>
            <h2 className="font-display text-2xl text-bourbon">
              {kind === 'derby' ? 'Kentucky Derby' : 'Kentucky Oaks'}
            </h2>
          </div>
          {lockTime && !official && !isArchive && <Countdown target={lockTime} label="Lock" />}
          {official && (
            <span className="text-xs uppercase tracking-wider font-semibold text-rose-dark">
              Official
            </span>
          )}
        </header>

        {isLoading && (
          <div className="text-bourbon/70 py-6 text-center text-sm">Loading…</div>
        )}

        {!isLoading && sorted.length === 0 && (
          <div className="rounded-lg border border-bourbon/20 bg-white p-6 text-center text-bourbon/70 text-sm">
            No horses posted yet.
          </div>
        )}

        <ol className="space-y-2">
          {sorted.map((p) => (
            <HorseRow key={p.id} pick={p} position={positionOf(p, finishers)} />
          ))}
        </ol>
      </section>

      <SidePanel title="Jump to" items={tocItems} />
    </div>
  );
}

function HorseRow({ pick: p, position }: { pick: Pick; position: number | null }) {
  return (
    <li
      id={`result-horse-${p.id}`}
      className={`scroll-mt-24 rounded-lg border bg-white px-4 py-2.5 flex items-center gap-3 ${
        position && position <= 3 ? POSITION_TONE[position] : 'border-bourbon/15'
      }`}
    >
      <span className="text-xs uppercase tracking-wider w-12 shrink-0 font-semibold">
        {position && position <= 3
          ? POSITION_LABEL[position]
          : position
          ? `#${position}`
          : `#${p.post_position ?? '?'}`}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-bourbon truncate">{p.horse_name}</div>
        {(p.jockey || p.trainer) && (
          <div className="text-[11px] text-bourbon/70 truncate">
            {p.jockey ?? 'Jockey TBD'}
            {p.trainer && ` · ${p.trainer}`}
          </div>
        )}
      </div>
      <span className="text-[11px] text-bourbon/60 whitespace-nowrap">
        {p.odds_at_pick ?? '—'}
      </span>
    </li>
  );
}
