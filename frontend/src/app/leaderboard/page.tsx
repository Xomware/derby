'use client';

import { useEffect, useMemo, useState } from 'react';
import { CommentsBlock } from '@/components/CommentsBlock';
import { Countdown } from '@/components/Countdown';
import { LeaderboardTable } from '@/components/LeaderboardTable';
import {
  useComments,
  useGrantPicks,
  useLeaderboard,
  usePicks,
  useResults,
  type RaceKind,
} from '@/lib/hooks';
import { useUsername } from '@/lib/identity';
import { CURRENT_YEAR } from '@/lib/year';
import { scoreGrantRow } from '@/lib/scoring';
import type { LeaderboardRow } from '@/lib/types';

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
  const { picks } = usePicks(kind);
  const { results } = useResults(year);
  const { grantPicks } = useGrantPicks(kind);
  const isArchive = year !== CURRENT_YEAR;

  const hidePicks = !leaderboard?.locked;
  const showScores = !!leaderboard?.finished;

  const mainRaceNumber = kind === 'derby' ? 12 : 11;
  const finishers = useMemo(
    () =>
      (results?.races ?? []).find((r) => r.day === kind && r.race_number === mainRaceNumber)
        ?.finishers ?? [],
    [results, kind, mainRaceNumber]
  );

  // Collect odds for every horse in the field — used both to label the pick
  // cells (`Renegade (5-1)`) and to score Grant's synthetic row.
  const oddsByHorse = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of picks?.races ?? []) {
      for (const p of r.picks) {
        if (p.horse_name && p.odds_at_pick) {
          m.set(p.horse_name.trim().toLowerCase(), p.odds_at_pick);
        }
      }
    }
    return m;
  }, [picks]);

  const rowsWithGrant = useMemo(() => {
    const userRows = leaderboard?.rows ?? [];
    // Suppress any user account Grant himself signed up with — his picks are
    // already shown as the synthetic top "Grant" row, so showing his
    // pool entry as a second row would just duplicate.
    const isGrantAlias = (u: string) =>
      ['GRANT', 'GTATICH'].includes(u.toUpperCase());
    const filteredUsers = userRows.filter((r) => !isGrantAlias(r.username));
    if (!grantPicks) return filteredUsers;
    const grantRow = scoreGrantRow(grantPicks, finishers, oddsByHorse);
    const combined: LeaderboardRow[] = [grantRow, ...filteredUsers];
    combined.sort((a, b) => b.score - a.score || a.username.localeCompare(b.username));
    return combined.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [leaderboard, grantPicks, finishers, oddsByHorse]);

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

      {hidePicks && leaderboard?.post_time && !isArchive && (
        <div className="rounded-md border border-rose-red/30 bg-rose-red/5 px-3 py-2 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-bourbon/80">
            Picks reveal at post time:
          </span>
          <Countdown target={leaderboard.post_time} label="Reveal" />
        </div>
      )}

      {isLoading && <p className="text-bourbon/70">Loading…</p>}
      {leaderboard && (
        <LeaderboardTable
          rows={rowsWithGrant}
          highlightUsername={username}
          hidePicks={hidePicks}
          showScores={showScores}
          oddsByHorse={oddsByHorse}
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
