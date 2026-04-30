'use client';

import { LeaderboardTable } from '@/components/LeaderboardTable';
import { useLeaderboard } from '@/lib/hooks';
import { useUsername } from '@/lib/identity';

export default function LeaderboardPage() {
  const { leaderboard, isLoading } = useLeaderboard();
  const { username } = useUsername();

  return (
    <section className="pt-8">
      <h1 className="font-display text-3xl text-rose-dark mb-2">Leaderboard</h1>
      <p className="text-bourbon/80 text-sm mb-6">
        Pool standings — picks scored after each race goes official.
      </p>
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
