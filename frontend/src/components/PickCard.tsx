'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { usePicks } from '@/lib/hooks';
import type { Pick, ResultValue, VoteValue } from '@/lib/types';

const RESULT_LABEL: Record<ResultValue, string> = {
  pending: 'Pending',
  won: 'Won',
  placed: 'Placed (2nd)',
  showed: 'Showed (3rd)',
  finished: 'Out of money',
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
}

export function PickCard({ pick, isAuthed, onRequireAuth }: PickCardProps) {
  const { refresh } = usePicks();
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

  const total = pick.counts.tail + pick.counts.fade + pick.counts.pass;

  return (
    <article className="rounded-xl border border-rose-red/20 bg-white shadow-sm p-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-bourbon/60 mb-1">
            Race {pick.race_number}
            {pick.post_position != null && (
              <span> · Post {pick.post_position}</span>
            )}
            {pick.odds_at_pick && <span> · {pick.odds_at_pick}</span>}
          </div>
          <h3 className="font-display text-2xl text-rose-dark leading-tight">
            {pick.horse_name}
          </h3>
          <div className="text-xs text-bourbon/70 mt-0.5">
            {pick.jockey ?? 'Jockey TBD'}
            {pick.trainer && ` · ${pick.trainer}`}
          </div>
        </div>
        <span
          className={`text-xs font-semibold px-2 py-1 rounded ${RESULT_TONE[pick.result]}`}
        >
          {RESULT_LABEL[pick.result]}
        </span>
      </header>

      {pick.writeup && (
        <p className="mt-3 text-sm text-ink/85 leading-relaxed italic">
          {pick.writeup}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-bourbon/70">Confidence</span>
        <span aria-hidden className="text-rose-red">
          {'★'.repeat(pick.confidence)}
          <span className="text-rose-red/30">
            {'★'.repeat(5 - pick.confidence)}
          </span>
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {(['tail', 'fade', 'pass'] as VoteValue[]).map((v) => {
          const active = pick.my_vote === v;
          const count = pick.counts[v];
          const disabled = pick.locked || pending !== null || pick.result === 'scratched';
          const base =
            'rounded-lg py-2 text-sm font-semibold transition border';
          const tone = active
            ? v === 'tail'
              ? 'bg-mint-julep text-cream border-mint-julep'
              : v === 'fade'
                ? 'bg-rose-red text-cream border-rose-red'
                : 'bg-bourbon text-cream border-bourbon'
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

      {total > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-bourbon/70 cursor-pointer select-none">
            Who voted ({total})
          </summary>
          <div className="mt-2 grid sm:grid-cols-3 gap-2 text-xs">
            {(['tail', 'fade', 'pass'] as VoteValue[]).map((v) => (
              <div key={v}>
                <div className="font-semibold capitalize text-bourbon">
                  {v} ({pick.counts[v]})
                </div>
                <ul className="text-bourbon/80">
                  {pick.voters[v].map((voter) => (
                    <li key={`${v}-${voter.username}`}>@{voter.username}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      )}
    </article>
  );
}
