'use client';

import { useEffect, useMemo, useState } from 'react';
import { CommentsBlock } from '@/components/CommentsBlock';
import { LeaderboardTable } from '@/components/LeaderboardTable';
import { PostTime } from '@/components/PostTime';
import { ResultsRecapModal } from '@/components/ResultsRecapModal';
import { ShareLeaderboardButton } from '@/components/ShareLeaderboardButton';
import { SharePicksButton } from '@/components/SharePicksButton';
import {
  PickDistribution,
  type DistributionData,
  type SlotEntry,
} from '@/components/PickDistribution';
import {
  useComments,
  useGrantPicks,
  useLeaderboard,
  usePicks,
  usePredictions,
  useResults,
  type RaceKind,
} from '@/lib/hooks';
import { useUsername } from '@/lib/identity';
import { CURRENT_YEAR } from '@/lib/year';
import { scoreGrantRow } from '@/lib/scoring';
import type { LeaderboardRow } from '@/lib/types';

const GRANT_ALIASES = new Set(['GRANT', 'GTATICH']);
const SLOT_KEYS = ['win', 'place', 'show', 'long_shot'] as const;
type SlotKey = (typeof SLOT_KEYS)[number];

const TABS: { id: RaceKind; label: string }[] = [
  { id: 'derby', label: 'Derby' },
  { id: 'oaks', label: 'Oaks' },
];

type View = 'board' | 'comments' | 'pool';
const VIEWS: { id: View; label: string }[] = [
  { id: 'board', label: 'Leaderboard' },
  { id: 'comments', label: 'Comments' },
  { id: 'pool', label: 'Pool' },
];

export default function LeaderboardPage() {
  const { username } = useUsername();
  const [kind, setKind] = useState<RaceKind>('derby');
  const [view, setView] = useState<View>('board');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get('event');
    if (e === 'oaks' || e === 'derby') setKind(e);
    const v = params.get('view');
    if (v === 'comments' || v === 'pool' || v === 'board') setView(v);
  }, []);

  function pushView(nextView: View, nextKind: RaceKind = kind) {
    const url = new URL(window.location.href);
    url.searchParams.set('event', nextKind);
    if (nextView === 'board') url.searchParams.delete('view');
    else url.searchParams.set('view', nextView);
    window.history.replaceState(null, '', url.toString());
  }

  const { leaderboard, isLoading, year, refresh: refreshLeaderboard } =
    useLeaderboard(undefined, kind);
  const { picks } = usePicks(kind);
  const { results } = useResults(year);
  const { grantPicks } = useGrantPicks(kind);
  const {
    data: predictions,
    refresh: refreshPredictions,
    eventId,
  } = usePredictions(kind, username);
  const { comments, refresh: refreshComments } = useComments(kind, {
    horseId: null,
  });
  const isArchive = year !== CURRENT_YEAR;
  const showScores = !!leaderboard?.finished;

  const mainRaceNumber = kind === 'derby' ? 12 : 11;
  const finishers = useMemo(
    () =>
      (results?.races ?? []).find((r) => r.day === kind && r.race_number === mainRaceNumber)
        ?.finishers ?? [],
    [results, kind, mainRaceNumber]
  );

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

  const scratchedHorses = useMemo(() => {
    const s = new Set<string>();
    for (const r of picks?.races ?? []) {
      for (const p of r.picks) {
        if (p.scratched && p.horse_name) {
          s.add(p.horse_name.trim().toLowerCase());
        }
      }
    }
    return s;
  }, [picks]);

  const distribution = useMemo<DistributionData>(() => {
    const empty = (): SlotEntry => ({ voters: {}, total: 0 });
    const out: DistributionData = {
      win: empty(),
      place: empty(),
      show: empty(),
      long_shot: empty(),
    };
    const all = [
      ...(predictions?.my ? [predictions.my] : []),
      ...(predictions?.others ?? []),
    ];
    const add = (slot: SlotKey, horse: string | null, voter: string) => {
      if (!horse) return;
      const bucket = out[slot];
      (bucket.voters[horse] ||= []).push(voter);
      bucket.total += 1;
    };
    for (const p of all) {
      if (GRANT_ALIASES.has((p.username ?? '').toUpperCase())) continue;
      for (const s of SLOT_KEYS) add(s, p[s], `@${p.username}`);
    }
    if (grantPicks) {
      for (const s of SLOT_KEYS) add(s, grantPicks[s] ?? null, 'Grant');
    }
    return out;
  }, [predictions, grantPicks]);

  const rowsWithGrant = useMemo(() => {
    const userRows = leaderboard?.rows ?? [];
    const isGrantAlias = (u: string) =>
      ['GRANT', 'GTATICH'].includes(u.toUpperCase());
    const filteredUsers = userRows.filter((r) => !isGrantAlias(r.username));
    if (!grantPicks) return filteredUsers;
    const grantRow = scoreGrantRow(grantPicks, finishers, oddsByHorse);
    const combined: LeaderboardRow[] = [grantRow, ...filteredUsers];
    combined.sort((a, b) => b.score - a.score || a.username.localeCompare(b.username));
    return combined.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [leaderboard, grantPicks, finishers, oddsByHorse]);

  const userOnLeaderboard = useMemo(
    () =>
      !!username &&
      rowsWithGrant.some((r) => r.username.toUpperCase() === username.toUpperCase()),
    [rowsWithGrant, username]
  );
  const showMissingPickCta =
    !!username && !isArchive && !!leaderboard && !leaderboard.finished && !userOnLeaderboard;

  const editorHorses = useMemo(
    () =>
      (picks?.races ?? [])
        .flatMap((r) => r.picks)
        .map((p) => ({
          name: p.horse_name,
          scratched: p.scratched,
          odds: p.odds_at_pick,
        })),
    [picks]
  );

  // Client-side lock check so the UI flips instantly at lock time even
  // if SWR hasn't re-fetched yet. Lock is post_time - 5 min (matches
  // backend LOCK_BUFFER_SECONDS).
  const clientLocked = useMemo(() => {
    if (!predictions?.post_time) return false;
    const lockMs = new Date(predictions.post_time).getTime() - 5 * 60 * 1000;
    return Date.now() >= lockMs;
  }, [predictions?.post_time]);

  const isLocked = !!predictions?.locked || clientLocked;

  const canEditPicks =
    !isArchive &&
    !!username &&
    userOnLeaderboard &&
    !!predictions &&
    !isLocked &&
    !leaderboard?.finished;

  const editConfig = canEditPicks
    ? {
        eventId,
        existing: predictions?.my ?? null,
        horses: editorHorses,
        canEdit: true,
        onSaved: () => {
          refreshPredictions();
          refreshLeaderboard();
        },
      }
    : null;

  return (
    <section className="pt-8 max-w-4xl mx-auto space-y-6">
      <header>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-3xl text-rose-dark">
            {isArchive ? `${year} Leaderboard` : 'Leaderboard'}
          </h1>
          {!isArchive && predictions?.post_time && (
            <PostTime iso={predictions.post_time} className="text-sm" />
          )}
        </div>

        {!isArchive && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {predictions?.my && (
              <SharePicksButton
                prediction={predictions.my}
                kind={kind}
                year={year}
              />
            )}
            <ShareLeaderboardButton
              rows={rowsWithGrant}
              kind={kind}
              year={year}
              finished={!!leaderboard?.finished}
            />
          </div>
        )}
        <p className="text-bourbon/80 text-sm mt-1">
          {showScores
            ? 'Final scoring — picks judged by Grant’s odds rules.'
            : 'Everyone’s picks are open. Scoring lights up once the race goes official.'}
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
                pushView(view, t.id);
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

      <div className="flex flex-wrap gap-2">
        {VIEWS.map((v) => {
          const active = view === v.id;
          const count = v.id === 'comments' ? comments.length : 0;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setView(v.id);
                pushView(v.id);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                active
                  ? 'bg-rose-red text-cream border-rose-red'
                  : 'border-bourbon/30 text-bourbon hover:border-rose-red'
              }`}
              aria-pressed={active}
            >
              {v.label}
              {v.id === 'comments' && count > 0 && (
                <span className={`ml-1 ${active ? 'text-cream/80' : 'text-bourbon/60'}`}>
                  · {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {view === 'board' && (
        <>
          {isLoading && <p className="text-bourbon/70">Loading…</p>}
          {leaderboard && (
            <LeaderboardTable
              rows={rowsWithGrant}
              kind={kind}
              highlightUsername={username}
              hidePicks={false}
              showScores={showScores}
              oddsByHorse={oddsByHorse}
              scratchedHorses={scratchedHorses}
              longShotThreshold={8}
              missingPick={
                showMissingPickCta && username
                  ? { username, href: `/picks?event=${kind}#your-picks` }
                  : null
              }
              editConfig={editConfig}
              showLockedChip={
                !isArchive && userOnLeaderboard && isLocked && !leaderboard?.finished
              }
            />
          )}
        </>
      )}

      {view === 'comments' && !isArchive && (
        <CommentsBlock
          eventId={eventId}
          horseId={null}
          comments={comments}
          username={username}
          onPosted={refreshComments}
          onDeleted={refreshComments}
          title={`${kind === 'derby' ? 'Derby' : 'Oaks'} Comments`}
          placeholder={`Drop a take on the ${kind === 'derby' ? 'Derby' : 'Oaks'}…`}
        />
      )}
      {view === 'comments' && isArchive && (
        <p className="text-sm text-bourbon/70">
          Comments aren&apos;t archived for past years.
        </p>
      )}

      {view === 'pool' && !isArchive && <PickDistribution data={distribution} />}
      {view === 'pool' && isArchive && (
        <p className="text-sm text-bourbon/70">
          Pool distribution isn&apos;t archived for past years.
        </p>
      )}

      {!isArchive && (
        <ResultsRecapModal
          leaderboard={leaderboard}
          username={username}
          kind={kind}
          year={year}
        />
      )}
    </section>
  );
}
