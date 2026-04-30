'use client';

import { useEffect, useMemo, useState } from 'react';
import { Countdown } from '@/components/Countdown';
import {
  PickDistribution,
  type DistributionData,
  type SlotEntry,
} from '@/components/PickDistribution';
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
const POSITION_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
const POSITION_TONE: Record<number, string> = {
  1: 'bg-amber-100/60 border-amber-400/40',
  2: 'bg-slate-100/70 border-slate-400/40',
  3: 'bg-orange-100/60 border-orange-500/40',
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

type View = 'horses' | 'distribution';

export default function ResultsPage() {
  const { username } = useUsername();
  const [kind, setKind] = useState<RaceKind>('derby');
  const [view, setView] = useState<View>('horses');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get('event');
    if (e === 'oaks' || e === 'derby') setKind(e);
    const v = params.get('view');
    if (v === 'distribution' || v === 'horses') setView(v);
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
  // Pool counts + voters are always visible (Grant: no more question marks).
  const locked = true;

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

  // Distribution view = same data as the per-horse tally, pivoted to
  // slot → horse → voter list, with totals.
  const distribution = useMemo<DistributionData>(() => {
    const empty = (): SlotEntry => ({ voters: {}, total: 0 });
    const out: DistributionData = {
      win: empty(),
      place: empty(),
      show: empty(),
      long_shot: empty(),
    };
    for (const horseName of Object.keys(tally)) {
      // Recover the canonical horse name (we used normalize() as the key).
      const display = horses.find((h) => normalize(h.name) === horseName)?.name ?? horseName;
      const slots = tally[horseName];
      for (const s of SLOTS) {
        const voters = slots[s.key].voters;
        if (voters.length === 0) continue;
        out[s.key].voters[display] = voters;
        out[s.key].total += voters.length;
      }
    }
    return out;
  }, [tally, horses]);

  function pushUrl(nextKind: RaceKind, nextView: View) {
    const url = new URL(window.location.href);
    url.searchParams.set('event', nextKind);
    if (nextView === 'horses') url.searchParams.delete('view');
    else url.searchParams.set('view', nextView);
    window.history.replaceState(null, '', url.toString());
  }

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
                pushUrl(t.id, view);
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
        {(['horses', 'distribution'] as const).map((v) => {
          const active = view === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => {
                setView(v);
                pushUrl(kind, v);
              }}
              className={`px-3 py-1.5 rounded text-xs font-semibold border transition ${
                active
                  ? 'bg-rose-red text-cream border-rose-red'
                  : 'border-bourbon/30 text-bourbon hover:border-rose-red'
              }`}
              aria-pressed={active}
            >
              {v === 'horses' ? 'By horse' : 'Pool distribution'}
            </button>
          );
        })}
      </div>

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

      {view === 'horses' && sorted.length > 0 && (
        <div className="rounded-xl border border-bourbon/15 bg-white overflow-hidden">
          <div className="hidden sm:grid grid-cols-[11rem_1fr_1fr_1fr_1fr] gap-2 bg-bourbon/5 border-b border-bourbon/15 px-4 py-2 text-[10px] uppercase tracking-wider font-semibold text-bourbon/70">
            <div>Horse</div>
            <div>Win</div>
            <div>Place</div>
            <div>Show</div>
            <div>Long shot</div>
          </div>
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

      {view === 'distribution' && <PickDistribution data={distribution} />}
    </section>
  );
}

function VoterIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
        <path
          d="M4 4l8 8M12 4l-8 8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    );
  }
  // Three-dots-in-rose-red rosette — picks up the derby motif.
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
      <circle cx="3.5" cy="8" r="1.5" fill="currentColor" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
      <circle cx="12.5" cy="8" r="1.5" fill="currentColor" />
    </svg>
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

  const tone = official && position && position <= 3 ? POSITION_TONE[position] : '';

  // Top 3 → medal emoji. Other finishers → "#N". Pre-official horses → just
  // their post position so it's visually distinct from finish numbers.
  let badge: React.ReactNode;
  if (official && position && position <= 3) {
    badge = (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-white border border-bourbon/15 px-2 py-0.5 text-xs font-bold tracking-wide shrink-0"
        title={POSITION_LABEL[position]}
      >
        <span className="text-base leading-none" aria-hidden>{POSITION_MEDAL[position]}</span>
        <span className="text-bourbon">{POSITION_LABEL[position]}</span>
      </span>
    );
  } else if (official && position) {
    badge = (
      <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-bourbon/15 text-bourbon shrink-0">
        {position}th
      </span>
    );
  } else {
    badge = (
      <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-bourbon/10 text-bourbon/70 shrink-0">
        Post {horse.post_position ?? '?'}
      </span>
    );
  }

  return (
    <li className={`px-3 sm:px-4 py-3 ${tone}`}>
      <div className="sm:grid sm:grid-cols-[11rem_1fr_1fr_1fr_1fr] sm:gap-2 sm:items-start">
        <div className="flex items-center gap-2 min-w-0 mb-2 sm:mb-0">
          {badge}
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-bourbon truncate">{horse.name}</div>
            {horse.odds && (
              <div className="text-[11px] text-bourbon/60 tabular-nums">{horse.odds}</div>
            )}
          </div>
        </div>

        <div className="contents">
          {/* Mobile: 4 chips inline. Desktop: 4 grid cells. */}
          <div className="grid grid-cols-4 gap-1.5 sm:contents">
            {SLOTS.map((s) => {
              const slot = tally?.[s.key];
              const count = showCounts ? slot?.count ?? 0 : null;
              const expanded = expandedSlot === s.key;
              const canExpand = showVoters && (slot?.voters?.length ?? 0) > 0;
              return (
                <div
                  key={s.key}
                  className="rounded-md border border-bourbon/15 bg-cream/40 px-2 py-1 sm:py-1.5"
                >
                  <div className="text-[9px] sm:hidden uppercase tracking-wider text-bourbon/60 font-semibold leading-none">
                    {s.label === 'Long shot' ? 'LS' : s.label.slice(0, 3)}
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5 sm:mt-0">
                    <span className="text-sm font-bold text-bourbon tabular-nums">
                      {count === null ? '?' : count}
                    </span>
                    {canExpand && (
                      <button
                        type="button"
                        onClick={() => setExpandedSlot(expanded ? null : s.key)}
                        aria-label={`${expanded ? 'Hide' : 'Show'} voters for ${s.label}`}
                        title={expanded ? 'Hide voters' : 'Show voters'}
                        className="grid place-items-center w-5 h-5 rounded-full text-rose-red hover:bg-rose-red/10 transition"
                      >
                        <VoterIcon open={expanded} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Voter list — full width on mobile, inside the chip on desktop. */}
          {expandedSlot && (() => {
            const slot = tally?.[expandedSlot];
            if (!slot || slot.voters.length === 0) return null;
            return (
              <div className="sm:hidden mt-2 rounded-md bg-bourbon/5 px-2 py-1.5 text-[11px] text-bourbon/80">
                <div className="text-[9px] uppercase tracking-wider font-semibold mb-0.5">
                  {SLOTS.find((s) => s.key === expandedSlot)?.label} picks
                </div>
                <ul className="space-y-0.5">
                  {slot.voters.map((v) => (
                    <li key={v} className="truncate">{v}</li>
                  ))}
                </ul>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Desktop voter list inside its chip cell — render as floating */}
      {expandedSlot && (() => {
        const slot = tally?.[expandedSlot];
        if (!slot || slot.voters.length === 0) return null;
        return (
          <ul className="hidden sm:block mt-2 ml-44 text-[11px] text-bourbon/80 space-y-0.5 rounded-md bg-bourbon/5 px-3 py-1.5">
            <li className="text-[9px] uppercase tracking-wider font-semibold mb-0.5 text-bourbon/60">
              {SLOTS.find((s) => s.key === expandedSlot)?.label} picks
            </li>
            {slot.voters.map((v) => (
              <li key={v} className="truncate">{v}</li>
            ))}
          </ul>
        );
      })()}
    </li>
  );
}
