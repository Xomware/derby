'use client';

import { useMemo } from 'react';
import { Countdown } from '@/components/Countdown';
import { EVENT_DERBY, EVENT_OAKS, usePicks } from '@/lib/hooks';
import type { Pick, ResultValue } from '@/lib/types';

const RESULT_TO_POSITION: Record<ResultValue, number | null> = {
  won: 1,
  placed: 2,
  showed: 3,
  finished: null,
  scratched: null,
  pending: null,
};

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

function sortForResults(picks: Pick[]): Pick[] {
  const arr = [...picks];
  const positioned = arr.filter((p) => RESULT_TO_POSITION[p.result] !== null);
  const others = arr.filter((p) => RESULT_TO_POSITION[p.result] === null);

  positioned.sort((a, b) => {
    const ap = RESULT_TO_POSITION[a.result] ?? 99;
    const bp = RESULT_TO_POSITION[b.result] ?? 99;
    return ap - bp;
  });
  others.sort((a, b) => (a.post_position ?? 99) - (b.post_position ?? 99));
  return [...positioned, ...others];
}

export default function ResultsPage() {
  const { picks: derby, isLoading: derbyLoading } = usePicks(EVENT_DERBY);
  const { picks: oaks, isLoading: oaksLoading } = usePicks(EVENT_OAKS);

  return (
    <section className="pt-8 max-w-3xl mx-auto space-y-10">
      <header>
        <h1 className="font-display text-3xl text-rose-dark">Live Results</h1>
        <p className="text-bourbon/80 text-sm mt-1">
          Oaks and Derby. Horses sit in post-position order until the race goes
          official, then re-sort to Win / Place / Show on top.
        </p>
      </header>

      <RaceSection
        title="Kentucky Oaks"
        eyebrow="Friday, May 1, 2026"
        picks={oaks?.races.flatMap((r) => r.picks) ?? []}
        lockTime={oaks?.races[0]?.lock_time}
        loading={oaksLoading}
      />

      <RaceSection
        title="Kentucky Derby"
        eyebrow="Saturday, May 2, 2026"
        picks={derby?.races.flatMap((r) => r.picks) ?? []}
        lockTime={derby?.races[0]?.lock_time}
        loading={derbyLoading}
      />
    </section>
  );
}

function RaceSection({
  title,
  eyebrow,
  picks,
  lockTime,
  loading,
}: {
  title: string;
  eyebrow: string;
  picks: Pick[];
  lockTime?: string;
  loading: boolean;
}) {
  const sorted = useMemo(() => sortForResults(picks), [picks]);
  const anyOfficial = sorted.some((p) => RESULT_TO_POSITION[p.result] !== null);

  return (
    <section>
      <header className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <div>
          <p className="font-display italic text-mint-julep text-xs uppercase tracking-[0.3em]">
            {eyebrow}
          </p>
          <h2 className="font-display text-2xl text-bourbon">{title}</h2>
        </div>
        {lockTime && !anyOfficial && <Countdown target={lockTime} label="Lock" />}
        {anyOfficial && (
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
          <HorseRow key={p.id} pick={p} />
        ))}
      </ol>
    </section>
  );
}

function HorseRow({ pick: p }: { pick: Pick }) {
  const position = RESULT_TO_POSITION[p.result];
  const isScratched = p.result === 'scratched';
  const isOut = p.result === 'finished';
  const isPending = p.result === 'pending';

  return (
    <li
      className={`rounded-lg border bg-white px-4 py-2.5 flex items-center gap-3 ${
        position
          ? POSITION_TONE[position]
          : 'border-bourbon/15 ' + (isScratched ? 'opacity-50 line-through' : '')
      }`}
    >
      <span className="text-xs uppercase tracking-wider w-12 shrink-0 font-semibold">
        {position ? POSITION_LABEL[position] : `#${p.post_position ?? '?'}`}
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
      <span className="text-[11px] text-bourbon/70 w-16 text-right whitespace-nowrap">
        {isPending && 'Pending'}
        {isScratched && 'Scratched'}
        {isOut && 'Out'}
        {position && 'Official'}
      </span>
    </li>
  );
}
