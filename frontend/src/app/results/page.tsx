'use client';

import { useEffect, useMemo, useState } from 'react';
import { Countdown } from '@/components/Countdown';
import {
  useGrantPicks,
  usePicks,
  usePredictions,
  useResults,
  type RaceKind,
} from '@/lib/hooks';
import { useUsername } from '@/lib/identity';
import type { Pick, RaceFinisher } from '@/lib/types';
import { CURRENT_YEAR } from '@/lib/year';

const TABS: { id: RaceKind; label: string }[] = [
  { id: 'derby', label: 'Derby' },
  { id: 'oaks', label: 'Oaks' },
];

const SLOTS: { key: 'win' | 'place' | 'show' | 'long_shot'; label: string }[] = [
  { key: 'win', label: 'Win' },
  { key: 'place', label: 'Place' },
  { key: 'show', label: 'Show' },
  { key: 'long_shot', label: 'Long shot' },
];

const POSITION_LABEL: Record<number, string> = { 1: 'Win', 2: 'Place', 3: 'Show' };
const POSITION_TONE: Record<number, string> = {
  1: 'bg-rose-red/10 border-rose-red/30',
  2: 'bg-mint-julep/10 border-mint-julep/30',
  3: 'bg-bourbon/5 border-bourbon/20',
};

const GRANT_ALIASES = new Set(['GRANT', 'GTATICH']);

function normalize(s: string | null | undefined): string {
  if (!s) return '';
  return s.trim().toLowerCase().replace(/[’']/g, "'");
}

interface DisplayHorse {
  key: string;
  name: string;
  post_position: number | null;
  odds: string | null;
}

interface SlotTally {
  count: number;
  voters: string[]; // Includes 'Grant' label when applicable.
}

type Tally = Record<string, Record<'win' | 'place' | 'show' | 'long_shot', SlotTally>>;

function emptySlot(): SlotTally {
  return { count: 0, voters: [] };
}

export default function ResultsPage() {
  const { username } = useUsername();
  const [kind, setKind] = useState<RaceKind>('derby');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get('event');
    if (e === 'oaks' || e === 'derby') setKind(e);
  }, []);

  const { picks, isLoading, year } = usePicks(kind);
  const { results } = useResults(year);
  const { grantPicks } = useGrantPicks(kind);
  const { data: predictions } = usePredictions(kind, username);
  const isArchive = year !== CURRENT_YEAR;

  const main = kind === 'derby' ? 12 : 11;
  const finishers: RaceFinisher[] =
    (results?.races ?? []).find((r) => r.day === kind && r.race_number === main)
      ?.finishers ?? [];
  const official = finishers.length > 0;
  const lockTime = predictions?.post_time ?? picks?.races[0]?.lock_time ?? null;
  // Archive years: race is in the past, so counts + voters are always visible
  // (Grant's row is the only "voter" for archive). Current year: gate on
  // predictions endpoint's lock signal.
  const locked = isArchive ? true : predictions?.locked ?? false;

  // Derive horse list — DDB picks for current year, archive horses (Grant's
  // static JSON) for historical years.
  const horses = useMemo<DisplayHorse[]>(() => {
    const live = (picks?.races ?? []).flatMap((r) => r.picks);
    if (live.length > 0) {
      return live.map((p: Pick) => ({
        key: p.id,
        name: p.horse_name,
        post_position: p.post_position,
        odds: p.odds_at_pick,
      }));
    }
    if (isArchive && grantPicks?.horses?.length) {
      return grantPicks.horses.map((h, i) => ({
        key: `archive-${i}`,
        name: h.horse_name,
        post_position: h.post_position ?? null,
        odds: h.odds_at_pick ?? null,
      }));
    }
    // Last fallback: just render finishers as horses.
    if (finishers.length > 0) {
      return [...finishers]
        .sort((a, b) => a.position - b.position)
        .map((f) => ({
          key: `finish-${f.position}-${normalize(f.horse_name)}`,
          name: f.horse_name,
          post_position: null,
          odds: null,
        }));
    }
    return [];
  }, [picks, isArchive, grantPicks, finishers]);

  // Tally — only meaningful post-lock (others list is empty pre-lock).
  const tally = useMemo<Tally>(() => {
    const t: Tally = {};
    const ensure = (n: string) => {
      const k = normalize(n);
      if (!t[k]) {
        t[k] = {
          win: emptySlot(),
          place: emptySlot(),
          show: emptySlot(),
          long_shot: emptySlot(),
        };
      }
      return t[k];
    };

    const allPredictions = [
      ...(predictions?.my ? [predictions.my] : []),
      ...(predictions?.others ?? []),
    ];

    for (const p of allPredictions) {
      if (GRANT_ALIASES.has((p.username ?? '').toUpperCase())) continue;
      for (const s of SLOTS) {
        const horse = p[`${s.key}` as 'win' | 'place' | 'show' | 'long_shot'];
        if (!horse) continue;
        const entry = ensure(horse);
        entry[s.key].count += 1;
        entry[s.key].voters.push(`@${p.username}`);
      }
    }

    if (grantPicks) {
      for (const s of SLOTS) {
        const horse = grantPicks[s.key];
        if (!horse) continue;
        const entry = ensure(horse);
        entry[s.key].count += 1;
        entry[s.key].voters.push('Grant');
      }
    }

    return t;
  }, [predictions, grantPicks]);

  const sorted = useMemo(() => {
    if (!official) {
      return [...horses].sort(
        (a, b) => (a.post_position ?? 99) - (b.post_position ?? 99)
      );
    }
    const positionOf = (h: DisplayHorse) => {
      const f = finishers.find((x) => normalize(x.horse_name) === normalize(h.name));
      return f?.position ?? 99;
    };
    return [...horses].sort(
      (a, b) =>
        positionOf(a) - positionOf(b) ||
        (a.post_position ?? 99) - (b.post_position ?? 99)
    );
  }, [horses, finishers, official]);

  const positionMap = useMemo(() => {
    const m = new Map<string, number>();
    finishers.forEach((f) => m.set(normalize(f.horse_name), f.position));
    return m;
  }, [finishers]);

  return (
    <section className="pt-8 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-3xl text-rose-dark">
          {isArchive ? `${year} Results` : 'Live Results'}
        </h1>
        <p className="text-bourbon/80 text-sm mt-1">
          {isArchive
            ? `Final order from the ${year} ${kind === 'derby' ? 'Derby' : 'Oaks'} with Grant's pinned picks tagged.`
            : !locked
            ? 'Pool tally hidden until post time. Counts reveal once the race goes off.'
            : official
            ? 'Race official — pool tally + voters revealed.'
            : 'Picks locked — tally revealed. Finish positions stamp once official.'}
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

      {lockTime && !official && !locked && !isArchive && (
        <div className="rounded-md border border-rose-red/30 bg-rose-red/5 px-3 py-2 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-bourbon/80">Picks lock at:</span>
          <Countdown target={lockTime} label="Lock" />
        </div>
      )}

      {isLoading && (
        <div className="text-bourbon/70 py-6 text-center text-sm">Loading…</div>
      )}

      {!isLoading && sorted.length === 0 && (
        <div className="rounded-lg border border-bourbon/20 bg-white p-6 text-center text-bourbon/70 text-sm">
          {isArchive
            ? `No archived horse data for the ${year} ${kind === 'derby' ? 'Derby' : 'Oaks'}.`
            : 'No horses posted yet.'}
        </div>
      )}

      {sorted.length > 0 && (
        <div className="rounded-xl border border-bourbon/15 bg-white overflow-hidden">
          <ol className="divide-y divide-bourbon/10">
            {sorted.map((h) => (
              <HorseTallyRow
                key={h.key}
                horse={h}
                tally={tally[normalize(h.name)]}
                position={positionMap.get(normalize(h.name)) ?? null}
                showCounts={locked}
                showVoters={locked}
                official={official}
              />
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function HorseTallyRow({
  horse,
  tally,
  position,
  showCounts,
  showVoters,
  official,
}: {
  horse: DisplayHorse;
  tally: Record<'win' | 'place' | 'show' | 'long_shot', SlotTally> | undefined;
  position: number | null;
  showCounts: boolean;
  showVoters: boolean;
  official: boolean;
}) {
  const [expandedSlot, setExpandedSlot] = useState<
    'win' | 'place' | 'show' | 'long_shot' | null
  >(null);

  const tone = position && position <= 3 ? POSITION_TONE[position] : '';

  return (
    <li className={`p-3 sm:p-4 ${tone}`}>
      <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 sm:w-44 shrink-0">
          {official && position ? (
            <span
              className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                position <= 3
                  ? 'bg-rose-red text-cream'
                  : 'bg-bourbon/20 text-bourbon'
              }`}
              title={position <= 3 ? POSITION_LABEL[position] : `Finished ${position}`}
            >
              {position <= 3 ? POSITION_LABEL[position] : `#${position}`}
            </span>
          ) : (
            <span className="font-mono text-bourbon/60 text-xs w-8 shrink-0">
              {horse.post_position != null ? `#${horse.post_position}` : '—'}
            </span>
          )}
          <div className="min-w-0">
            <div className="font-semibold text-bourbon truncate">{horse.name}</div>
            {horse.odds && (
              <div className="text-[11px] text-bourbon/60 tabular-nums">{horse.odds}</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 min-w-0">
          {SLOTS.map((s) => {
            const slot = tally?.[s.key];
            const count = showCounts ? slot?.count ?? 0 : null;
            const expanded = expandedSlot === s.key;
            const canExpand = showVoters && (slot?.voters?.length ?? 0) > 0;
            return (
              <div key={s.key} className="rounded-md border border-bourbon/15 bg-cream/40 px-2 py-1.5">
                <div className="text-[10px] uppercase tracking-wider text-bourbon/60 font-semibold">
                  {s.label}
                </div>
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  <span className="text-sm font-bold text-bourbon">
                    {count === null ? '?' : count}
                  </span>
                  {canExpand && (
                    <button
                      type="button"
                      onClick={() => setExpandedSlot(expanded ? null : s.key)}
                      aria-label={`Show voters for ${s.label}`}
                      className="text-[11px] text-bourbon/60 hover:text-rose-red"
                    >
                      {expanded ? '×' : '👥'}
                    </button>
                  )}
                </div>
                {expanded && slot && slot.voters.length > 0 && (
                  <ul className="mt-1.5 text-[11px] text-bourbon/80 space-y-0.5">
                    {slot.voters.map((v) => (
                      <li key={v} className="truncate">{v}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </li>
  );
}
