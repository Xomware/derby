'use client';

import { LeaderboardTable } from '@/components/LeaderboardTable';
import { useLeaderboard } from '@/lib/hooks';
import { useUsername } from '@/lib/identity';
import { CURRENT_YEAR } from '@/lib/year';

export default function LeaderboardPage() {
  const { leaderboard, isLoading, year } = useLeaderboard();
  const { username } = useUsername();
  const isArchive = year !== CURRENT_YEAR;

  return (
    <section className="pt-8">
      <h1 className="font-display text-3xl text-rose-dark mb-2">
        {isArchive ? `${year} Leaderboard` : 'Leaderboard'}
      </h1>
      <p className="text-bourbon/80 text-sm mb-2">
        Pool standings — picks scored after each race goes official.
      </p>
      <details className="mb-6">
        <summary className="text-xs text-bourbon/70 cursor-pointer hover:text-rose-red select-none">
          Scoring rules
        </summary>
        <ul className="mt-2 text-xs text-bourbon/70 space-y-0.5 pl-4 list-disc">
          <li>Win pick at 1st: <strong>5 pts</strong> · any other top-3: 1 pt</li>
          <li>Place pick at 2nd: <strong>3 pts</strong> · any other top-3: 1 pt</li>
          <li>Show pick at 3rd: <strong>2 pts</strong> · any other top-3: 1 pt</li>
          <li>Long shot wins: <strong>5 pts</strong> · long shot top-3: 3 pts</li>
        </ul>
      </details>
      {isLoading && <p className="text-bourbon/70">Loading…</p>}
      {leaderboard && (
        <LeaderboardTable
          rows={leaderboard.rows}
          highlightUsername={username}
        />
      )}
    </section>
  );
}
