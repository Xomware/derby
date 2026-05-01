'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RaceKind } from '@/lib/hooks';
import type { Leaderboard, LeaderboardRow } from '@/lib/types';

const SLOTS: {
  key: 'win' | 'place' | 'show' | 'long_shot';
  label: string;
}[] = [
  { key: 'win', label: 'Win' },
  { key: 'place', label: 'Place' },
  { key: 'show', label: 'Show' },
  { key: 'long_shot', label: 'Long shot' },
];

function rowKey(row: LeaderboardRow, kind: RaceKind, year: number): string {
  return `derby:recap-seen:${kind}:${year}:${row.username.toUpperCase()}`;
}

interface Props {
  leaderboard: Leaderboard | null | undefined;
  username: string | null;
  kind: RaceKind;
  year: number;
}

/**
 * Auto-pops once on first load after a race goes official, for the
 * current user only. Stores a "seen" marker in localStorage keyed by
 * year+kind+user so it doesn't reappear after dismissal.
 */
export function ResultsRecapModal({ leaderboard, username, kind, year }: Props) {
  const [open, setOpen] = useState(false);

  const myRow = useMemo<LeaderboardRow | null>(() => {
    if (!leaderboard?.rows || !username) return null;
    return (
      leaderboard.rows.find(
        (r) => r.username.toUpperCase() === username.toUpperCase()
      ) ?? null
    );
  }, [leaderboard, username]);

  useEffect(() => {
    if (!leaderboard?.finished) return;
    if (!myRow) return;
    if (typeof window === 'undefined') return;
    const key = rowKey(myRow, kind, year);
    if (window.localStorage.getItem(key)) return;
    setOpen(true);
  }, [leaderboard?.finished, myRow, kind, year]);

  function dismiss() {
    if (myRow) {
      try {
        window.localStorage.setItem(rowKey(myRow, kind, year), '1');
      } catch {
        /* private mode */
      }
    }
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !myRow || !leaderboard) return null;

  const totalPlayers = leaderboard.rows.length;
  const ahead =
    myRow.rank === 1 ? null : leaderboard.rows.find((r) => r.rank === myRow.rank - 1) ?? null;
  const winnerText =
    myRow.rank === 1
      ? '🏆 You took the whole damn thing.'
      : myRow.rank <= 3
      ? `Top ${myRow.rank} — money on the board.`
      : `${myRow.rank}/${totalPlayers}. There's always next year.`;
  const eventLabel = kind === 'derby' ? 'Derby' : 'Oaks';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Race recap"
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={dismiss}
        className="absolute inset-0 bg-bourbon/60 backdrop-blur-sm"
      />
      <div className="relative w-full sm:w-auto sm:max-w-md bg-cream rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="sm:hidden pt-2 pb-1 flex justify-center">
          <div className="h-1.5 w-10 rounded-full bg-bourbon/30" />
        </div>
        <header className="px-5 pt-3 sm:pt-5 pb-3 border-b border-bourbon/15">
          <p className="text-[11px] uppercase tracking-wider text-bourbon/60">
            {year} {eventLabel} · Final
          </p>
          <h2 className="font-display text-2xl text-rose-dark">
            How you finished
          </h2>
        </header>

        <div className="px-5 py-4 space-y-3">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-5xl text-rose-dark tabular-nums">
              #{myRow.rank}
            </span>
            <span className="font-display text-2xl text-bourbon">
              {myRow.score} pts
            </span>
          </div>
          <p className="text-sm text-bourbon/80">{winnerText}</p>

          <ul className="space-y-1.5 text-sm">
            {SLOTS.map((s) => {
              const pick = myRow[`${s.key}_pick` as keyof LeaderboardRow] as
                | string
                | null;
              const score = (myRow[`${s.key}_score` as keyof LeaderboardRow] as
                | number
                | null) ?? 0;
              const won = score > 0;
              return (
                <li
                  key={s.key}
                  className={`flex items-baseline justify-between gap-2 rounded px-2 py-1 ${
                    won ? 'bg-mint-julep/10' : 'bg-bourbon/5'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider text-bourbon/60 font-semibold w-20 shrink-0">
                    {s.label}
                  </span>
                  <span className="flex-1 truncate text-bourbon">
                    {pick ?? '—'}
                  </span>
                  <span
                    className={`tabular-nums font-bold ${
                      won ? 'text-mint-julep' : 'text-bourbon/40'
                    }`}
                  >
                    {won ? `+${score}` : '0'}
                  </span>
                </li>
              );
            })}
          </ul>

          {ahead && (
            <p className="text-xs text-bourbon/70">
              <span className="font-semibold">@{ahead.username}</span> finished
              just ahead of you with {ahead.score} pts.
            </p>
          )}

          <button
            type="button"
            onClick={dismiss}
            className="w-full rounded bg-rose-red px-4 py-2 text-sm font-semibold text-white hover:bg-rose-dark transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
