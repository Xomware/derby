'use client';

import { useEffect, useMemo, useState } from 'react';
import { Countdown } from '@/components/Countdown';
import { PostTime } from '@/components/PostTime';
import { SidePanel, SidePanelItem } from '@/components/SidePanel';
import { WriteupSection } from '@/components/WriteupSection';
import { CommentsBlock } from '@/components/CommentsBlock';
import { OddsSparkline } from '@/components/OddsSparkline';
import {
  useComments,
  useGrantPicks,
  usePicks,
  usePredictions,
  type RaceKind,
} from '@/lib/hooks';
import { useUsername } from '@/lib/identity';
import type { RaceFinisher } from '@/lib/types';
import { CURRENT_YEAR } from '@/lib/year';
import { BettingPlays } from '@/components/BettingPlays';
import { GrantPinned } from '@/components/GrantPinned';
import { PowerRankings } from '@/components/PowerRankings';
import { StatTile } from '@/components/StatTile';
import { useResults } from '@/lib/hooks';

type SortKey = 'post' | 'name' | 'odds' | 'beyer' | 'brisnet' | 'equibase';

type SubTab = 'overview' | 'plays' | 'rankings' | 'talk';
const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'overview', label: 'Race & horses' },
  { id: 'plays', label: 'Betting plays' },
  { id: 'rankings', label: 'Power rankings' },
  { id: 'talk', label: 'Comments' },
];

interface DisplayHorse {
  id: string;
  horse_name: string;
  post_position: number | null;
  odds_at_pick: string | null;
  jockey: string | null;
  trainer: string | null;
  record: string | null;
  beyer: string | null;
  brisnet: string | null;
  equibase_rating: string | null;
  last_race: string | null;
  style: string | null;
  final_take: string | null;
  writeup: string | null;
  scratched: boolean;
  odds_history?: { ts: string; odds: string }[];
}

const SORTS_BY_KIND: Record<RaceKind, { id: SortKey; label: string }[]> = {
  derby: [
    { id: 'post', label: 'Post' },
    { id: 'name', label: 'Name' },
    { id: 'odds', label: 'Odds' },
    { id: 'beyer', label: 'Beyer' },
    { id: 'brisnet', label: 'Brisnet' },
  ],
  oaks: [
    { id: 'post', label: 'Post' },
    { id: 'name', label: 'Name' },
    { id: 'odds', label: 'Odds' },
    { id: 'equibase', label: 'Equibase' },
  ],
};

function statToNumber(v: string | null | undefined): number {
  if (!v) return -1;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : -1;
}

const STAT_DESCRIPTIONS: Record<string, string> = {
  Odds:
    'Latest odds. "5-1" means a $1 bet returns $5 plus the original stake if the horse wins.',
  Record:
    'Career record: starts: wins-places-shows. "5: 2-2-1" = 5 starts, 2 wins, 2 places (2nd), 1 show (3rd).',
  Beyer:
    'Beyer Speed Figure — performance rating from Daily Racing Form. Higher is faster. ~100 is competitive Derby quality.',
  Brisnet:
    'Brisnet Speed Rating — same idea as Beyer but from a different shop. Higher is faster.',
  Equibase:
    'Equibase Speed Figure — third major speed rating. Higher is faster, similar scale to Beyer.',
  Style:
    'Running style. Pace setter = early lead. Presser/Stalker = just behind pace. Closer = rallies late from off the pace.',
  'Last race':
    'Most recent finish + race name.',
};

/**
 * "5-1" → 5.0,  "8-1" → 8.0,  "1/2" → 0.5,  null → +Infinity
 * Lower number = lower (better) odds = favorite.
 */
function oddsToNumber(odds: string | null): number {
  if (!odds) return Number.POSITIVE_INFINITY;
  const m = odds.match(/^(\d+)[-/](\d+)$/);
  if (!m) return Number.POSITIVE_INFINITY;
  const n = Number(m[1]);
  const d = Number(m[2]);
  return d === 0 ? Number.POSITIVE_INFINITY : n / d;
}

export function RacePage({
  kind,
  title,
  eyebrow,
}: {
  kind: RaceKind;
  title: string;
  eyebrow: string;
}) {
  const { picks, isLoading, year, eventId: picksEventId } = usePicks(kind);
  const { grantPicks } = useGrantPicks(kind);
  const { username } = useUsername();
  const { data: predictions } = usePredictions(kind, username);
  const { results } = useResults(year);
  const [sortKey, setSortKey] = useState<SortKey>('post');
  const [tab, setTab] = useState<SubTab>('overview');
  const isArchive = year !== CURRENT_YEAR;

  // ?tab=plays|rankings|talk deep-link.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    if (t === 'plays' || t === 'rankings' || t === 'overview' || t === 'talk') {
      setTab(t);
    }
  }, []);

  function pushTab(next: SubTab) {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === 'overview') url.searchParams.delete('tab');
    else url.searchParams.set('tab', next);
    window.history.replaceState(null, '', url.toString());
  }
  const mainRaceNumber = kind === 'derby' ? 12 : 11;
  const finishers =
    (results?.races ?? []).find((r) => r.day === kind && r.race_number === mainRaceNumber)
      ?.finishers ?? [];

  const flatPicks = useMemo(
    () => (picks?.races ?? []).flatMap((r) => r.picks),
    [picks]
  );

  // For archive years there's no DDB picks — fall back to Grant's static
  // historical horses if the JSON file ships them.
  const displayHorses = useMemo<DisplayHorse[]>(() => {
    if (flatPicks.length > 0) {
      return flatPicks.map((p) => ({
        id: p.id,
        horse_name: p.horse_name,
        post_position: p.post_position,
        odds_at_pick: p.odds_at_pick,
        jockey: p.jockey,
        trainer: p.trainer,
        record: p.record,
        beyer: p.beyer,
        brisnet: p.brisnet,
        equibase_rating: p.equibase_rating,
        last_race: p.last_race,
        style: p.style,
        final_take: p.final_take,
        writeup: p.writeup,
        scratched: p.scratched,
        odds_history: p.odds_history,
      }));
    }
    if (isArchive && grantPicks?.horses?.length) {
      return grantPicks.horses.map((h, i) => ({
        id: `archive-${i}-${(h.horse_name ?? '').toLowerCase().replace(/\s+/g, '-')}`,
        horse_name: h.horse_name,
        post_position: h.post_position ?? null,
        odds_at_pick: h.odds_at_pick ?? null,
        jockey: h.jockey ?? null,
        trainer: h.trainer ?? null,
        record: h.record ?? null,
        beyer: h.beyer ?? null,
        brisnet: h.brisnet ?? null,
        equibase_rating: h.equibase_rating ?? null,
        last_race: h.last_race ?? null,
        style: h.style ?? null,
        final_take: h.final_take ?? null,
        writeup: h.writeup ?? null,
        scratched: false,
      }));
    }
    return [];
  }, [flatPicks, isArchive, grantPicks]);

  const sortedPicks = useMemo(() => {
    const arr = [...displayHorses];
    switch (sortKey) {
      case 'name':
        return arr.sort((a, b) => a.horse_name.localeCompare(b.horse_name));
      case 'odds':
        return arr.sort((a, b) => oddsToNumber(a.odds_at_pick) - oddsToNumber(b.odds_at_pick));
      case 'beyer':
        return arr.sort((a, b) => statToNumber(b.beyer) - statToNumber(a.beyer));
      case 'brisnet':
        return arr.sort((a, b) => statToNumber(b.brisnet) - statToNumber(a.brisnet));
      case 'equibase':
        return arr.sort(
          (a, b) => statToNumber(b.equibase_rating) - statToNumber(a.equibase_rating)
        );
      case 'post':
      default:
        return arr.sort((a, b) => (a.post_position ?? 99) - (b.post_position ?? 99));
    }
  }, [displayHorses, sortKey]);

  const earliestLock = picks?.races.map((r) => r.lock_time).sort()[0];
  const mainPostTime = picks?.races
    .find((r) => r.race_number === mainRaceNumber)
    ?.race_post_time;

  // Pool % per-horse per-slot. Counts both my prediction and others.
  const pool = useMemo(() => {
    const all = [
      ...(predictions?.my ? [predictions.my] : []),
      ...(predictions?.others ?? []),
    ];
    const total = all.length;
    const byHorse = new Map<
      string,
      { win: number; place: number; show: number; long_shot: number }
    >();
    const norm = (s: string | null) => (s ? s.trim().toLowerCase() : '');
    const bump = (
      horse: string | null,
      slot: 'win' | 'place' | 'show' | 'long_shot'
    ) => {
      const k = norm(horse);
      if (!k) return;
      const cur = byHorse.get(k) ?? { win: 0, place: 0, show: 0, long_shot: 0 };
      cur[slot] += 1;
      byHorse.set(k, cur);
    };
    for (const p of all) {
      bump(p.win, 'win');
      bump(p.place, 'place');
      bump(p.show, 'show');
      bump(p.long_shot, 'long_shot');
    }
    return { byHorse, total };
  }, [predictions]);

  // After picks load, jump to the URL hash if present (e.g. ticker click into
  // /derby#horse-xyz lands before SWR returns; we re-scroll once it does).
  useEffect(() => {
    if (!picks) return;
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [picks]);

  const tocItems: SidePanelItem[] = useMemo(() => {
    const items: SidePanelItem[] = [];
    if (grantPicks?.analysis) items.push({ id: 'race-outlook', label: 'Race outlook' });
    items.push(
      ...sortedPicks.map((p) => ({
        id: `horse-${p.id}`,
        label: p.horse_name,
        meta: p.odds_at_pick ?? undefined,
      }))
    );
    return items;
  }, [sortedPicks, grantPicks]);

  const horsesEmpty = !isLoading && sortedPicks.length === 0;

  return (
    <div className="pt-8 lg:grid lg:grid-cols-[1fr_240px] lg:gap-6">
      <section className="space-y-6 min-w-0">
        <header>
          <p className="font-display italic text-mint-julep text-xs uppercase tracking-[0.3em]">
            {isArchive ? `${year} — Archive` : eyebrow}
          </p>
          <div className="mt-1 flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="font-display text-3xl text-rose-dark">
              {title}
              {isArchive && <span className="text-bourbon/50 text-xl ml-2">{year}</span>}
            </h1>
            {earliestLock && !isArchive && (
              <div className="inline-flex flex-col items-end gap-1">
                <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full border border-rose-red/20 bg-white">
                  <Countdown target={earliestLock} label="Lock" />
                </div>
                {mainPostTime && (
                  <PostTime iso={mainPostTime} className="text-xs" />
                )}
              </div>
            )}
          </div>
          {isArchive && (
            <div className="mt-3 rounded-md border-l-4 border-bourbon/40 bg-bourbon/5 px-3 py-2 text-xs text-bourbon/80">
              Viewing {year} archive — picks &amp; comments are read-only.
            </div>
          )}
        </header>

        <nav className="flex gap-1 border-b border-bourbon/20" aria-label="Section">
          {SUB_TABS.map((t) => {
            const active = tab === t.id;
            const enabled =
              t.id === 'overview' ||
              (t.id === 'plays' && !!grantPicks?.betting_plays) ||
              (t.id === 'rankings' && !!grantPicks?.power_rankings?.length) ||
              (t.id === 'talk' && !isArchive);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => enabled && pushTab(t.id)}
                disabled={!enabled}
                className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition ${
                  active
                    ? 'border-rose-red text-rose-dark'
                    : enabled
                    ? 'border-transparent text-bourbon/70 hover:text-rose-red'
                    : 'border-transparent text-bourbon/30 cursor-not-allowed'
                }`}
                aria-pressed={active}
              >
                {t.label}
              </button>
            );
          })}
        </nav>

        {tab === 'overview' && (
          <>
            {isArchive && grantPicks && (
              <GrantPinned
                picks={grantPicks}
                kind={kind}
                year={year}
                isArchive={isArchive}
                finishers={finishers}
              />
            )}

            {grantPicks?.analysis && (
              <div id="race-outlook" className="scroll-mt-24">
                <WriteupSection
                  title={`Grant's race outlook`}
                  body={grantPicks.analysis}
                  kind={kind}
                  horseNames={displayHorses.map((h) => h.horse_name)}
                />
              </div>
            )}

            {sortedPicks.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-xs uppercase tracking-wider text-bourbon/70 font-semibold">
                  Sort by
                </label>
                <div className="flex gap-1 flex-wrap">
                  {SORTS_BY_KIND[kind].map((s) => {
                    const active = sortKey === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSortKey(s.id)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition border ${
                          active
                            ? 'bg-rose-red/10 text-rose-dark border-rose-red/30'
                            : 'border-bourbon/20 text-bourbon hover:border-rose-red'
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs text-bourbon/60 ml-auto">
                  {sortedPicks.length} horses
                </span>
              </div>
            )}

            {isLoading && (
              <div className="text-center text-bourbon/70 py-12">Loading…</div>
            )}

            {horsesEmpty && (
              <div className="rounded-lg border border-bourbon/20 bg-white p-8 text-center text-bourbon/70">
                {isArchive
                  ? `No archived horse data for the ${year} ${kind === 'derby' ? 'Derby' : 'Oaks'} yet.`
                  : 'No horses posted yet for this race.'}
              </div>
            )}

            <div className="space-y-5">
              {sortedPicks.map((p) => (
                <HorseCard
                  key={p.id}
                  pick={p}
                  kind={kind}
                  poolTotal={pool.total}
                  poolForHorse={pool.byHorse.get(p.horse_name.trim().toLowerCase()) ?? null}
                  finishers={finishers}
                />
              ))}
            </div>
          </>
        )}

        {tab === 'plays' && (
          grantPicks?.betting_plays ? (
            <BettingPlays
              body={grantPicks.betting_plays}
              kind={kind}
              horseNames={displayHorses.map((h) => h.horse_name)}
            />
          ) : (
            <p className="text-bourbon/70 text-sm">No betting plays for this event.</p>
          )
        )}

        {tab === 'rankings' && (
          grantPicks?.power_rankings?.length ? (
            <PowerRankings tiers={grantPicks.power_rankings} kind={kind} />
          ) : (
            <p className="text-bourbon/70 text-sm">No power rankings for this event.</p>
          )
        )}

        {tab === 'talk' && !isArchive && (
          <RaceTalk kind={kind} eventId={picksEventId} />
        )}

      </section>

      {tab === 'overview' && <SidePanel title="Jump to" items={tocItems} />}
    </div>
  );
}

function statTip(label: string): string | undefined {
  return STAT_DESCRIPTIONS[label];
}

function RaceTalk({ kind, eventId }: { kind: RaceKind; eventId: string }) {
  const { username } = useUsername();
  const { comments, refresh } = useComments(kind, { horseId: null });
  if (!eventId) {
    return <p className="text-bourbon/70 text-sm">Loading…</p>;
  }
  const label = kind === 'derby' ? 'Derby' : 'Oaks';
  return (
    <CommentsBlock
      eventId={eventId}
      horseId={null}
      comments={comments}
      username={username}
      onPosted={refresh}
      onDeleted={refresh}
      title={`${label} Comments`}
      placeholder={`Drop a take on the ${label}…`}
    />
  );
}


function PoolChips({
  total,
  counts,
}: {
  total: number;
  counts: { win: number; place: number; show: number; long_shot: number };
}) {
  const slots: { key: keyof typeof counts; label: string }[] = [
    { key: 'win', label: 'Win' },
    { key: 'place', label: 'Place' },
    { key: 'show', label: 'Show' },
    { key: 'long_shot', label: 'LS' },
  ];
  const visible = slots.filter((s) => counts[s.key] > 0);
  if (visible.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {visible.map((s) => {
        const pct = Math.round((counts[s.key] / total) * 100);
        return (
          <span
            key={s.key}
            title={`${counts[s.key]} of ${total} ${total === 1 ? 'pool entry has' : 'pool entries have'} this horse in ${s.label}`}
            className="inline-flex items-center gap-1 rounded-full border border-mint-julep/30 bg-mint-julep/5 px-2 py-0.5 text-[10px] text-bourbon"
          >
            <span className="font-semibold text-mint-julep">{pct}%</span>
            <span className="uppercase tracking-wider text-bourbon/60">{s.label}</span>
          </span>
        );
      })}
    </div>
  );
}

function ScratchedStamp() {
  return (
    <span
      aria-label="Scratched"
      className="absolute top-3 right-3 -rotate-12 px-3 py-1 rounded border-2 border-rose-red bg-rose-red/10 text-rose-red font-bold tracking-[0.2em] text-xs uppercase shadow-sm select-none pointer-events-none"
    >
      Scratched
    </span>
  );
}

const POSITION_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
const POSITION_LABEL: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' };

function ordinal(n: number): string {
  if (POSITION_LABEL[n]) return POSITION_LABEL[n];
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function FinishStamp({ position }: { position: number }) {
  const medal = POSITION_MEDAL[position];
  const isMedal = position >= 1 && position <= 3;
  return (
    <span
      aria-label={`Finished ${ordinal(position)}`}
      className={`absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 shadow-sm select-none pointer-events-none font-bold uppercase tracking-wider text-xs ${
        isMedal
          ? 'border-rose-red bg-white text-rose-dark'
          : 'border-bourbon/40 bg-white text-bourbon'
      }`}
    >
      {medal && (
        <span className="text-base leading-none" aria-hidden>
          {medal}
        </span>
      )}
      <span>{ordinal(position)}</span>
    </span>
  );
}

function HorseCard({
  pick: p,
  kind,
  poolTotal,
  poolForHorse,
  finishers,
}: {
  pick: DisplayHorse;
  kind: RaceKind;
  poolTotal: number;
  poolForHorse: { win: number; place: number; show: number; long_shot: number } | null;
  finishers: RaceFinisher[];
}) {
  const norm = (s: string) => s.trim().toLowerCase().replace(/[’']/g, "'");
  const finish = finishers.find((f) => norm(f.horse_name) === norm(p.horse_name)) ?? null;
  // Per-kind stat tiles. Derby drops Equibase; Oaks drops Beyer + Brisnet —
  // Grant doesn't track those for those races, so they were always blank.
  const allStats: { label: string; value: string }[] = [
    { label: 'Odds', value: p.odds_at_pick ?? 'N/A' },
    { label: 'Record', value: p.record ?? 'N/A' },
    { label: 'Beyer', value: p.beyer ?? 'N/A' },
    { label: 'Brisnet', value: p.brisnet ?? 'N/A' },
    { label: 'Equibase', value: p.equibase_rating ?? 'N/A' },
    { label: 'Style', value: p.style ?? 'N/A' },
    { label: 'Last race', value: p.last_race ?? 'N/A' },
  ];
  const hidden = kind === 'derby'
    ? new Set(['Equibase'])
    : new Set(['Beyer', 'Brisnet']);
  const stats = allStats.filter((s) => !hidden.has(s.label));

  // Split writeup into bullets — Grant's lines exactly as he wrote them.
  const bullets = (p.writeup ?? '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const winnerHighlight =
    finish && finish.position >= 1 && finish.position <= 3
      ? finish.position === 1
        ? 'border-rose-red bg-rose-red/5'
        : 'border-mint-julep/60 bg-mint-julep/5'
      : '';
  return (
    <article
      id={`horse-${p.id}`}
      className={`relative scroll-mt-24 rounded-xl border bg-white p-5 shadow-sm ${
        p.scratched
          ? 'border-rose-red/40 opacity-70 line-through decoration-rose-red/60 decoration-2'
          : winnerHighlight || 'border-bourbon/15'
      }`}
    >
      {p.scratched && <ScratchedStamp />}
      {!p.scratched && finish && <FinishStamp position={finish.position} />}
      <header>
        <div className="text-[11px] uppercase tracking-wider text-bourbon/60">
          {p.post_position != null && <>Post {p.post_position}</>}
        </div>
        <h3 className="font-display text-2xl text-rose-dark leading-tight">
          {p.horse_name}
        </h3>
      </header>

      {(p.jockey || p.trainer) && (
        <div className="text-xs text-bourbon/70 mt-0.5">
          {p.jockey ?? 'Jockey TBD'}
          {p.trainer && ` · ${p.trainer}`}
        </div>
      )}

      {poolTotal > 0 && poolForHorse && (
        <PoolChips total={poolTotal} counts={poolForHorse} />
      )}

      {p.odds_history && p.odds_history.length > 0 && (
        <div className="mt-2">
          <OddsSparkline history={p.odds_history} current={p.odds_at_pick} />
        </div>
      )}

      <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {stats.map((s) => (
          <StatTile
            key={s.label}
            label={s.label}
            value={s.value}
            description={statTip(s.label)}
          />
        ))}
      </dl>

      {bullets.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-sm text-ink/85 leading-relaxed">
          {bullets.map((b, i) => (
            <li key={i} className="pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-rose-red">
              {b}
            </li>
          ))}
        </ul>
      )}

      {p.final_take && (
        <div className="mt-4 rounded-md border-l-4 border-rose-red bg-rose-red/5 px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-rose-red font-semibold mb-1">
            Final take
          </div>
          <div className="text-sm text-ink/90 leading-relaxed">{p.final_take}</div>
        </div>
      )}

    </article>
  );
}
