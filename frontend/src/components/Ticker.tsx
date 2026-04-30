'use client';

import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
import {
  useGrantPicks,
  usePicks,
  useResults,
  type GrantPicks,
  type RaceKind,
} from '@/lib/hooks';
import type { Pick, RaceFinisher } from '@/lib/types';
import { CURRENT_YEAR } from '@/lib/year';

const SLOT_BADGE: Record<'win' | 'place' | 'show' | 'long_shot', string> = {
  win: 'WIN',
  place: 'PLC',
  show: 'SHO',
  long_shot: 'LS',
};

interface TickerItem {
  key: string;
  kind: RaceKind;
  horseId: string;
  postLabel: string;
  name: string;
  odds: string | null;
  finishLabel: string | null;
  grantBadge: string | null;
}

function buildItems(
  kind: RaceKind,
  horses: Pick[],
  finishers: RaceFinisher[],
  grant: GrantPicks | undefined
): TickerItem[] {
  const norm = (s: string) => s.trim().toLowerCase().replace(/[’']/g, "'");
  const positions = new Map<string, number>();
  finishers.forEach((f) => positions.set(norm(f.horse_name), f.position));

  const grantSlot = (name: string): string | null => {
    if (!grant) return null;
    const n = norm(name);
    if (grant.win && norm(grant.win) === n) return SLOT_BADGE.win;
    if (grant.place && norm(grant.place) === n) return SLOT_BADGE.place;
    if (grant.show && norm(grant.show) === n) return SLOT_BADGE.show;
    if (grant.long_shot && norm(grant.long_shot) === n) return SLOT_BADGE.long_shot;
    return null;
  };

  const sorted = [...horses].sort((a, b) => {
    if (finishers.length > 0) {
      const pa = positions.get(norm(a.horse_name)) ?? 99;
      const pb = positions.get(norm(b.horse_name)) ?? 99;
      if (pa !== pb) return pa - pb;
    }
    return (a.post_position ?? 99) - (b.post_position ?? 99);
  });

  return sorted.map((h) => {
    const pos = positions.get(norm(h.horse_name)) ?? null;
    return {
      key: `${kind}-${h.id}`,
      kind,
      horseId: h.id,
      postLabel: pos ? `#${pos}` : `${h.post_position ?? '?'}`,
      name: h.horse_name,
      odds: h.odds_at_pick,
      finishLabel:
        pos === 1 ? '1st' : pos === 2 ? '2nd' : pos === 3 ? '3rd' : null,
      grantBadge: grantSlot(h.horse_name),
    };
  });
}

function Divider({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-4 mx-2 shrink-0 border-l border-r border-amber-500/40 text-amber-400 font-mono text-xs uppercase tracking-widest">
      <span className="text-amber-400">●</span>
      <span>{label}</span>
      <span className="text-amber-400">●</span>
    </div>
  );
}

function TickerItemCard({ it }: { it: TickerItem }) {
  return (
    <Link
      href={`/${it.kind}/?event=${it.kind}#horse-${it.horseId}`}
      className="inline-flex items-center gap-2 px-3 mx-1 h-9 rounded shrink-0 bg-slate-800/70 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/50 transition font-mono text-[11px] text-slate-100"
    >
      <span
        className={`px-1 py-0.5 rounded text-[9px] font-bold tracking-widest ${
          it.kind === 'derby' ? 'bg-rose-red/80 text-cream' : 'bg-mint-julep/80 text-cream'
        }`}
      >
        {it.kind === 'derby' ? 'DRBY' : 'OAKS'}
      </span>
      <span className="text-slate-400">{it.postLabel}</span>
      <span className="text-amber-300 font-semibold tracking-tight">{it.name}</span>
      {it.odds && (
        <span className="text-slate-300 tabular-nums">{it.odds}</span>
      )}
      {it.finishLabel && (
        <span className="px-1 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
          {it.finishLabel}
        </span>
      )}
      {it.grantBadge && (
        <span className="px-1 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
          G:{it.grantBadge}
        </span>
      )}
    </Link>
  );
}

export function Ticker() {
  const { picks: derby, year } = usePicks('derby');
  const { picks: oaks } = usePicks('oaks');
  const { grantPicks: derbyGrant } = useGrantPicks('derby');
  const { grantPicks: oaksGrant } = useGrantPicks('oaks');
  const { results } = useResults(year);
  const isCurrent = year === CURRENT_YEAR;
  const [paused, setPaused] = useState(false);

  const derbyHorses = useMemo<Pick[]>(
    () => (derby?.races ?? []).flatMap((r) => r.picks),
    [derby]
  );
  const oaksHorses = useMemo<Pick[]>(
    () => (oaks?.races ?? []).flatMap((r) => r.picks),
    [oaks]
  );

  const finishersFor = (kind: RaceKind): RaceFinisher[] => {
    const main = kind === 'derby' ? 12 : 11;
    return (
      (results?.races ?? []).find((r) => r.day === kind && r.race_number === main)
        ?.finishers ?? []
    );
  };

  const derbyItems = useMemo(
    () => buildItems('derby', derbyHorses, finishersFor('derby'), derbyGrant),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [derbyHorses, results, derbyGrant]
  );
  const oaksItems = useMemo(
    () => buildItems('oaks', oaksHorses, finishersFor('oaks'), oaksGrant),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [oaksHorses, results, oaksGrant]
  );

  if (!isCurrent || (derbyItems.length === 0 && oaksItems.length === 0)) {
    return null;
  }

  const renderTrack = (keySuffix: string) => (
    <Fragment key={keySuffix}>
      <Divider label="Kentucky Derby" />
      {derbyItems.map((it) => (
        <TickerItemCard key={`${it.key}-${keySuffix}`} it={it} />
      ))}
      <Divider label="Kentucky Oaks" />
      {oaksItems.map((it) => (
        <TickerItemCard key={`${it.key}-${keySuffix}`} it={it} />
      ))}
    </Fragment>
  );

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-20 flex items-center bg-slate-950 border-t border-amber-500/30 h-12 sm:h-12 overflow-hidden shadow-[0_-2px_8px_rgba(0,0,0,0.3)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex-1 overflow-hidden ticker-mask">
        <div className={`ticker-track ${paused ? 'paused' : ''}`} aria-label="Derby + Oaks ticker">
          {renderTrack('a')}
          {renderTrack('b')}
        </div>
      </div>
    </div>
  );
}
