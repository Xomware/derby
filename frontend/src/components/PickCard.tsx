'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api';
import { usePicks } from '@/lib/hooks';
import type { Pick, ResultValue, VoteValue } from '@/lib/types';

const RESULT_LABEL: Record<ResultValue, string> = {
  pending: 'Pending',
  won: 'Won',
  placed: '2nd',
  showed: '3rd',
  finished: 'Out',
  scratched: 'Scratched',
};

const RESULT_TONE: Record<ResultValue, string> = {
  pending: 'bg-bourbon/10 text-bourbon',
  won: 'bg-mint-julep/30 text-mint-julep',
  placed: 'bg-mint-julep/15 text-mint-julep',
  showed: 'bg-mint-julep/15 text-mint-julep',
  finished: 'bg-bourbon/10 text-bourbon',
  scratched: 'bg-rose-red/10 text-rose-dark',
};

interface PickCardProps {
  pick: Pick;
  isAuthed: boolean;
  onRequireAuth: () => void;
  /** href for the "View rationale →" link, e.g. `/rationale#horse-<id>` */
  rationaleHref?: string;
}

export function PickCard({ pick, isAuthed, onRequireAuth, rationaleHref }: PickCardProps) {
  const { refresh } = usePicks(pick.event_id);
  const [pending, setPending] = useState<VoteValue | null>(null);

  async function vote(v: VoteValue) {
    if (!isAuthed) return onRequireAuth();
    if (pick.locked) return;
    setPending(v);
    try {
      await api.vote(pick.id, v);
      await refresh();
    } finally {
      setPending(null);
    }
  }

  const tailFadeTotal = pick.counts.tail + pick.counts.fade;

  return (
    <article
      id={`pick-${pick.id}`}
      className="rounded-xl border border-rose-red/20 bg-white shadow-sm p-4 sm:p-5"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-bourbon/60">
            {pick.post_position != null && <>Post {pick.post_position}</>}
            {pick.odds_at_pick && <> · {pick.odds_at_pick}</>}
            {pick.style && <> · {pick.style}</>}
          </div>
          <h3 className="font-display text-2xl text-rose-dark leading-tight truncate">
            {pick.horse_name}
          </h3>
          <div
            className="mt-0.5 text-rose-red leading-none"
            aria-label={`${pick.confidence} of 5 stars`}
          >
            {'★'.repeat(pick.confidence)}
            <span className="text-rose-red/30">{'★'.repeat(5 - pick.confidence)}</span>
          </div>
        </div>
        <span
          className={`text-[11px] font-semibold px-2 py-1 rounded shrink-0 ${RESULT_TONE[pick.result]}`}
        >
          {RESULT_LABEL[pick.result]}
        </span>
      </header>

      {(pick.last_race || pick.beyer || pick.brisnet) && (
        <div className="mt-2 text-xs text-bourbon/80 leading-snug">
          {pick.last_race && (
            <span>
              <span className="text-bourbon/60">Last:</span> {pick.last_race}
            </span>
          )}
          {(pick.beyer || pick.brisnet) && (
            <span className="ml-3 text-bourbon/60">
              {pick.beyer && <>Beyer {pick.beyer}</>}
              {pick.beyer && pick.brisnet && ' · '}
              {pick.brisnet && <>Brisnet {pick.brisnet}</>}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        {(['tail', 'fade'] as VoteValue[]).map((v) => {
          const active = pick.my_vote === v;
          const count = pick.counts[v];
          const disabled = pick.locked || pending !== null || pick.result === 'scratched';
          const base =
            'rounded-lg py-2 text-sm font-semibold transition border';
          const tone = active
            ? v === 'tail'
              ? 'bg-mint-julep text-cream border-mint-julep'
              : 'bg-rose-red text-cream border-rose-red'
            : 'bg-cream border-bourbon/20 hover:border-rose-red';
          return (
            <button
              key={v}
              onClick={() => vote(v)}
              disabled={disabled}
              className={`${base} ${tone} disabled:opacity-60 disabled:cursor-not-allowed`}
              aria-pressed={active}
            >
              <div className="capitalize">{v}</div>
              <div className="text-xs opacity-90">{count}</div>
            </button>
          );
        })}
      </div>

      {pick.locked && (
        <p className="text-xs text-rose-dark mt-2">
          Voting locked at post time.
        </p>
      )}

      <div className="mt-3 flex items-center justify-between text-xs">
        {rationaleHref ? (
          <Link
            href={rationaleHref}
            className="text-rose-red hover:underline font-semibold"
          >
            View rationale →
          </Link>
        ) : <span />}
        {tailFadeTotal > 0 && (
          <span className="text-bourbon/60">
            {tailFadeTotal} {tailFadeTotal === 1 ? 'vote' : 'votes'}
          </span>
        )}
      </div>
    </article>
  );
}
