'use client';

import type { LeaderboardRow } from '@/lib/types';

interface Props {
  rows: LeaderboardRow[];
  highlightUsername?: string | null;
  /** Show '?' instead of horse names when picks are still hidden. */
  hidePicks: boolean;
  /** Show per-slot score columns once race is official. */
  showScores: boolean;
}

const SLOTS: { key: 'win' | 'place' | 'show' | 'long_shot'; label: string }[] = [
  { key: 'win', label: 'Win' },
  { key: 'place', label: 'Place' },
  { key: 'show', label: 'Show' },
  { key: 'long_shot', label: 'Long shot' },
];

function pickKey(s: 'win' | 'place' | 'show' | 'long_shot'): keyof LeaderboardRow {
  return `${s}_pick` as keyof LeaderboardRow;
}

function scoreKey(s: 'win' | 'place' | 'show' | 'long_shot'): keyof LeaderboardRow {
  return `${s}_score` as keyof LeaderboardRow;
}

export function LeaderboardTable({ rows, highlightUsername, hidePicks, showScores }: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-bourbon/70">
        Nobody&apos;s entered yet. Head to /picks to get on the board.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-bourbon/70 border-b border-bourbon/20">
            <th className="py-2 pr-2 sm:pl-0 pl-4 w-10">#</th>
            <th className="py-2 pr-2">User</th>
            <th className="py-2 px-2 text-right">Score</th>
            {SLOTS.map((s) => (
              <th key={s.key} className="py-2 px-2">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const me = highlightUsername && r.username === highlightUsername;
            return (
              <tr
                key={`${r.rank}-${r.username}`}
                className={`border-b border-bourbon/10 align-top ${me ? 'bg-mint-julep/15' : ''}`}
              >
                <td className="py-2 pr-2 sm:pl-0 pl-4 font-mono">{r.rank}</td>
                <td className="py-2 pr-2 whitespace-nowrap">
                  @{r.username}
                  {me && <span className="ml-1 text-xs text-mint-julep">(you)</span>}
                </td>
                <td className="py-2 px-2 text-right font-semibold">{r.score}</td>
                {SLOTS.map((s) => {
                  const pick = r[pickKey(s.key)] as string | null;
                  const score = (r[scoreKey(s.key)] as number | null) ?? 0;
                  const display =
                    me || !hidePicks
                      ? pick ?? '—'
                      : pick
                      ? '?'
                      : '—';
                  return (
                    <td key={s.key} className="py-2 px-2 whitespace-nowrap">
                      <div className="text-bourbon">{display}</div>
                      {showScores && score > 0 && (
                        <div className="text-[10px] text-mint-julep font-bold">+{score}</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
