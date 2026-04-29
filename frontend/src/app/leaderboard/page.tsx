'use client';

import { LeaderboardTable } from '@/components/LeaderboardTable';
import { useLeaderboard, useMe } from '@/lib/hooks';

export default function LeaderboardPage() {
  const { leaderboard, isLoading } = useLeaderboard();
  const { me } = useMe();

  return (
    <section className="pt-8">
      <h1 className="font-display text-3xl text-rose-dark mb-6">Leaderboard</h1>
      {isLoading && <p className="text-bourbon/70">Loading…</p>}
      {leaderboard && (
        <LeaderboardTable
          rows={leaderboard.rows}
          highlightUsername={me?.username ?? null}
        />
      )}
    </section>
  );
}
