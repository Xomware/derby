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

  const hidePicks = !leaderboard?.locked;
  const showScores = !!leaderboard?.finished;

  return (
    <section className="pt-8 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-3xl text-rose-dark">
          {isArchive ? `${year} Leaderboard` : 'Leaderboard'}
        </h1>
        <p className="text-bourbon/80 text-sm mt-1">
          {hidePicks
            ? "Other players' picks are hidden until the race goes off."
            : showScores
            ? 'Final scoring — picks judged by Grant’s odds rules.'
            : 'Picks revealed — locked in. Scoring lights up once the race goes official.'}
        </p>
        <details className="mt-2">
          <summary className="text-xs text-bourbon/70 cursor-pointer hover:text-rose-red select-none">
            Scoring rules
          </summary>
          <ul className="mt-2 text-xs text-bourbon/70 space-y-0.5 pl-4 list-disc">
            <li><strong>Win:</strong> if pick wins → <strong>odds</strong> in points (5-1 → 5)</li>
            <li><strong>Place:</strong> if pick finishes 1st or 2nd → <strong>odds ÷ 2</strong></li>
            <li><strong>Show:</strong> if pick finishes top 3 → <strong>odds ÷ 3</strong></li>
            <li><strong>Long shot:</strong> 1 pt if your long shot finishes top 4</li>
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
          hidePicks={hidePicks}
          showScores={showScores}
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
