'use client';

import type { LeaderboardRow } from '@/lib/types';

interface Props {
  rows: LeaderboardRow[];
  highlightUsername?: string | null;
  limit?: number;
}

export function LeaderboardTable({ rows, highlightUsername, limit }: Props) {
  const displayed = limit ? rows.slice(0, limit) : rows;
  if (rows.length === 0) {
    return (
      <p className="text-sm text-bourbon/70">
        No votes yet. Be the first to tail or fade.
      </p>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wider text-bourbon/70 border-b border-bourbon/20">
          <th className="py-2 pr-2 w-10">#</th>
          <th className="py-2 pr-2">User</th>
          <th className="py-2 px-2 text-right">Score</th>
          <th className="py-2 px-2 text-right">Tails✓</th>
          <th className="py-2 px-2 text-right">Fades✓</th>
          <th className="py-2 pl-2 text-right">Voted</th>
        </tr>
      </thead>
      <tbody>
        {displayed.map((r) => {
          const me = highlightUsername && r.username === highlightUsername;
          return (
            <tr
              key={`${r.rank}-${r.username}`}
              className={`border-b border-bourbon/10 ${me ? 'bg-mint-julep/15' : ''}`}
            >
              <td className="py-2 pr-2 font-mono">{r.rank}</td>
              <td className="py-2 pr-2">
                @{r.username}
                {me && <span className="ml-1 text-xs text-mint-julep">(you)</span>}
              </td>
              <td className="py-2 px-2 text-right font-semibold">{r.score}</td>
              <td className="py-2 px-2 text-right">{r.correct_tails}</td>
              <td className="py-2 px-2 text-right">{r.correct_fades}</td>
              <td className="py-2 pl-2 text-right">{r.picks_voted}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
