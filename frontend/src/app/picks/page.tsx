'use client';

import { useEffect, useMemo, useState } from 'react';
import { Countdown } from '@/components/Countdown';
import { GrantPinned } from '@/components/GrantPinned';
import { PickForm } from '@/components/PickForm';
import { SidePanel, SidePanelItem } from '@/components/SidePanel';
import { useGrantPicks, usePicks, usePredictions, useResults, type RaceKind } from '@/lib/hooks';
import { useUsername } from '@/lib/identity';
import { CURRENT_YEAR } from '@/lib/year';
import type { Pick } from '@/lib/types';

const TABS: { id: RaceKind; label: string }[] = [
  { id: 'derby', label: 'Derby' },
  { id: 'oaks', label: 'Oaks' },
];

export default function PicksPage() {
  const { username } = useUsername();
  const [kind, setKind] = useState<RaceKind>('derby');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get('event');
    if (e === 'oaks' || e === 'derby') setKind(e);
  }, []);

  const { picks, year } = usePicks(kind);
  const { grantPicks } = useGrantPicks(kind);
  const { data: predictions, refresh } = usePredictions(kind, username);
  const { results } = useResults(year);
  const isArchive = year !== CURRENT_YEAR;

  const mainRaceNumber = kind === 'derby' ? 12 : 11;
  const finishers = useMemo(
    () =>
      (results?.races ?? [])
        .find((r) => r.day === kind && r.race_number === mainRaceNumber)?.finishers ?? [],
    [results, kind, mainRaceNumber]
  );

  const horses = useMemo<Pick[]>(
    () => (picks?.races ?? []).flatMap((r) => r.picks),
    [picks]
  );

  const tocItems: SidePanelItem[] = useMemo(() => {
    const items: SidePanelItem[] = [];
    if (grantPicks) items.push({ id: 'grants-picks', label: 'Grant’s picks' });
    if (horses.length > 0)
      items.push({ id: 'race-summary', label: 'Race summary', meta: `${horses.length} horses` });
    if (!isArchive) items.push({ id: 'your-picks', label: 'Your picks' });
    return items;
  }, [grantPicks, horses.length, isArchive]);

  return (
    <div className="pt-8 lg:grid lg:grid-cols-[1fr_220px] lg:gap-6">
      <section className="space-y-6 min-w-0 max-w-3xl">
        <header>
          <h1 className="font-display text-3xl text-rose-dark">Picks</h1>
          <p className="text-bourbon/80 text-sm mt-1">
            Grant&apos;s pinned plays, the field at a glance, and your top 3 + long shot.
            See everyone else&apos;s picks on the leaderboard.
          </p>
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

        {predictions?.post_time && !isArchive && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-bourbon/80">
            {predictions.locked ? (
              <span className="font-semibold text-rose-dark">Locked — race is off</span>
            ) : (
              <>
                <span>Picks lock at post time:</span>
                <Countdown target={predictions.post_time} label="Lock" />
              </>
            )}
            {predictions.others_count > 0 && (
              <span className="ml-auto text-xs text-bourbon/60">
                {predictions.others_count} {predictions.others_count === 1 ? 'pool entry' : 'pool entries'}
              </span>
            )}
          </div>
        )}

        {grantPicks && (
          <div id="grants-picks" className="scroll-mt-24">
            <GrantPinned
              picks={grantPicks}
              kind={kind}
              year={year}
              isArchive={isArchive}
              finishers={finishers}
            />
          </div>
        )}

        <div id="race-summary" className="scroll-mt-24">
          <RaceSummary horses={horses} kind={kind} />
        </div>

        {!isArchive && (
          <PickForm
            horses={horses}
            eventId={predictions?.event_id ?? ''}
            locked={predictions?.locked ?? false}
            existing={predictions?.my ?? null}
            username={username}
            finishers={finishers}
            onSaved={() => void refresh()}
          />
        )}
      </section>

      <SidePanel title="Jump to" items={tocItems} />
    </div>
  );
}

function RaceSummary({ horses, kind }: { horses: Pick[]; kind: RaceKind }) {
  if (horses.length === 0) return null;
  const fav = [...horses]
    .sort((a, b) => oddsScore(a.odds_at_pick) - oddsScore(b.odds_at_pick))
    .slice(0, 3);
  return (
    <section className="rounded-xl border border-bourbon/15 bg-white p-4">
      <h2 className="font-display text-xl text-bourbon mb-1.5">
        {kind === 'derby' ? 'Kentucky Derby' : 'Kentucky Oaks'} — at a glance
      </h2>
      <p className="text-sm text-bourbon/80">
        {horses.length} horses in the field. Top of the morning line:
      </p>
      <ul className="mt-2 text-sm flex flex-wrap gap-x-3 gap-y-1">
        {fav.map((h) => (
          <li key={h.id}>
            <span className="font-semibold text-rose-dark">{h.horse_name}</span>{' '}
            <span className="text-bourbon/60">{h.odds_at_pick ?? ''}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function oddsScore(odds: string | null): number {
  if (!odds) return Number.POSITIVE_INFINITY;
  const m = odds.match(/^(\d+)[-/](\d+)$/);
  if (!m) return Number.POSITIVE_INFINITY;
  const n = Number(m[1]);
  const d = Number(m[2]);
  return d === 0 ? Number.POSITIVE_INFINITY : n / d;
}
