'use client';

import { useMemo } from 'react';
import { Countdown } from '@/components/Countdown';
import { usePicks, useResults, type RaceKind } from '@/lib/hooks';
import type { Pick, RaceFinisher } from '@/lib/types';
import { CURRENT_YEAR } from '@/lib/year';

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
  const { picks: derby, isLoading: derbyLoading, year } = usePicks('derby');
  const { picks: oaks, isLoading: oaksLoading } = usePicks('oaks');
  const { results } = useResults(year);
  const isArchive = year !== CURRENT_YEAR;

  const finishersFor = (kind: RaceKind): RaceFinisher[] => {
    const main = kind === 'derby' ? 12 : 11;
    return (
      (results?.races ?? []).find((r) => r.day === kind && r.race_number === main)
        ?.finishers ?? []
    );
  };

  return (
    <section className="pt-8 max-w-3xl mx-auto space-y-10">
      <header>
        <h1 className="font-display text-3xl text-rose-dark">
          {isArchive ? `${year} Results` : 'Live Results'}
        </h1>
        <p className="text-bourbon/80 text-sm mt-1">
          {isArchive
            ? `Final order from the ${year} Oaks and Derby.`
            : 'Oaks and Derby. Horses sit in post-position order until the race goes official, then re-sort to Win / Place / Show on top.'}
        </p>
      </header>

      <RaceSection
        title="Kentucky Oaks"
        eyebrow={isArchive ? `${year} Oaks` : 'The Run for the Lilies'}
        horses={oaks?.races.flatMap((r) => r.picks) ?? []}
        finishers={finishersFor('oaks')}
        lockTime={oaks?.races[0]?.lock_time}
        loading={oaksLoading}
        isArchive={isArchive}
      />

      <RaceSection
        title="Kentucky Derby"
        eyebrow={isArchive ? `${year} Derby` : 'The Run for the Roses'}
        horses={derby?.races.flatMap((r) => r.picks) ?? []}
        finishers={finishersFor('derby')}
        lockTime={derby?.races[0]?.lock_time}
        loading={derbyLoading}
        isArchive={isArchive}
      />
    </section>
  );
}

function RaceSection({
  title,
  eyebrow,
  horses,
  finishers,
  lockTime,
  loading,
  isArchive,
}: {
  title: string;
  eyebrow: string;
  horses: Pick[];
  finishers: RaceFinisher[];
  lockTime?: string;
  loading: boolean;
  isArchive: boolean;
}) {
  const sorted = useMemo(() => sortForResults(horses, finishers), [horses, finishers]);
  const official = finishers.length > 0;

  return (
    <section>
      <header className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <div>
          <p className="font-display italic text-mint-julep text-xs uppercase tracking-[0.3em]">
            {eyebrow}
          </p>
          <h2 className="font-display text-2xl text-bourbon">{title}</h2>
        </div>
        {lockTime && !official && !isArchive && <Countdown target={lockTime} label="Lock" />}
        {official && (
          <span className="text-xs uppercase tracking-wider font-semibold text-rose-dark">
            Official
          </span>
        )}
      </header>

      {loading && (
        <div className="text-bourbon/70 py-6 text-center text-sm">Loading…</div>
      )}

      {!loading && sorted.length === 0 && (
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
  );
}

function HorseRow({ pick: p, position }: { pick: Pick; position: number | null }) {
  return (
    <li
      className={`rounded-lg border bg-white px-4 py-2.5 flex items-center gap-3 ${
        position && position <= 3
          ? POSITION_TONE[position]
          : 'border-bourbon/15'
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
