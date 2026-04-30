'use client';

import { useEffect, useState } from 'react';
import { CommentsBlock } from '@/components/CommentsBlock';
import { LeaderboardTable } from '@/components/LeaderboardTable';
import { useComments, useLeaderboard, type RaceKind } from '@/lib/hooks';
import { useUsername } from '@/lib/identity';
import { CURRENT_YEAR } from '@/lib/year';

const TABS: { id: RaceKind; label: string }[] = [
  { id: 'derby', label: 'Derby' },
  { id: 'oaks', label: 'Oaks' },
];

export default function LeaderboardPage() {
  const { username } = useUsername();
  const [kind, setKind] = useState<RaceKind>('derby');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get('event');
    if (e === 'oaks' || e === 'derby') setKind(e);
  }, []);

  const { leaderboard, isLoading, year } = useLeaderboard(undefined, kind);
  const {
    comments,
    refresh: refreshComments,
    eventId: commentsEventId,
  } = useComments(kind);
  const isArchive = year !== CURRENT_YEAR;

  return (
    <section className="pt-8 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-3xl text-rose-dark">
          {isArchive ? `${year} Leaderboard` : 'Leaderboard'}
        </h1>
        <p className="text-bourbon/80 text-sm mt-1">
          Pool standings — picks scored after each race goes official.
        </p>
        <details className="mt-2">
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
      </header>

      <nav className="flex gap-1 border-b border-bourbon/20" aria-label="Event">
        {TABS.map((t) => {
          const active = kind === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setKind(t.id);
                const url = new URL(window.location.href);
                url.searchParams.set('event', t.id);
                window.history.replaceState(null, '', url.toString());
              }}
              className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition ${
                active
                  ? 'border-rose-red text-rose-dark'
                  : 'border-transparent text-bourbon/70 hover:text-rose-red'
              }`}
              aria-pressed={active}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {isLoading && <p className="text-bourbon/70">Loading…</p>}
      {leaderboard && (
        <LeaderboardTable
          rows={leaderboard.rows}
          highlightUsername={username}
        />
      )}

      {!isArchive && (
        <CommentsBlock
          eventId={commentsEventId}
          comments={comments}
          username={username}
          onPosted={() => void refreshComments()}
          onDeleted={() => void refreshComments()}
        />
      )}
    </section>
  );
}
