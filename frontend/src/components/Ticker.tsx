'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useGrantPicks,
  usePicks,
  useResults,
  type GrantPicks,
  type RaceKind,
} from '@/lib/hooks';
import type { Pick, RaceFinisher } from '@/lib/types';
import { CURRENT_YEAR } from '@/lib/year';

const ROTATION_MS = 30_000;

const SLOT_BADGE: Record<'win' | 'place' | 'show' | 'long_shot', string> = {
  win: 'Grant: Win',
  place: 'Grant: Place',
  show: 'Grant: Show',
  long_shot: 'Grant: Long shot',
};

interface TickerItem {
  key: string;
  postLabel: string;
  name: string;
  odds: string | null;
  finishLabel: string | null;
  grantBadge: string | null;
}

function buildItems(
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
      key: h.id,
      postLabel: pos ? `#${pos}` : `Post ${h.post_position ?? '?'}`,
      name: h.horse_name,
      odds: h.odds_at_pick,
      finishLabel:
        pos === 1 ? 'Win' : pos === 2 ? 'Place' : pos === 3 ? 'Show' : null,
      grantBadge: grantSlot(h.horse_name),
    };
  });
}

export function Ticker() {
  const { picks: derby, year } = usePicks('derby');
  const { picks: oaks } = usePicks('oaks');
  const { grantPicks: derbyGrant } = useGrantPicks('derby');
  const { grantPicks: oaksGrant } = useGrantPicks('oaks');
  const { results } = useResults(year);
  const isCurrent = year === CURRENT_YEAR;

  const [activeKind, setActiveKind] = useState<RaceKind>('derby');
  const [paused, setPaused] = useState(false);

  // Cycle Derby → Oaks → Derby every ROTATION_MS
  useEffect(() => {
    const id = setInterval(() => {
      setActiveKind((k) => (k === 'derby' ? 'oaks' : 'derby'));
    }, ROTATION_MS);
    return () => clearInterval(id);
  }, []);

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

  const items = useMemo<TickerItem[]>(() => {
    if (activeKind === 'derby') {
      return buildItems(derbyHorses, finishersFor('derby'), derbyGrant);
    }
    return buildItems(oaksHorses, finishersFor('oaks'), oaksGrant);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKind, derbyHorses, oaksHorses, results, derbyGrant, oaksGrant]);

  if (!isCurrent || items.length === 0) return null;

  const eventLabel = activeKind === 'derby' ? 'Derby' : 'Oaks';
  const eventColor = activeKind === 'derby' ? 'bg-rose-red' : 'bg-mint-julep';

  // Duplicate for seamless infinite scroll.
  const doubled = [...items, ...items];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-20 flex items-center bg-cream/95 backdrop-blur border-t border-rose-red/15 h-12 sm:h-14 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className={`flex items-center gap-1 px-3 h-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-cream ${eventColor}`}
      >
        {eventLabel}
      </div>
      <div className="flex-1 overflow-hidden ticker-mask">
        <div
          className={`ticker-track ${paused ? 'paused' : ''}`}
          aria-label={`${eventLabel} ticker`}
        >
          {doubled.map((it, i) => (
            <span
              key={`${it.key}-${i}`}
              className="inline-flex items-center gap-2 px-3 py-1 mx-1 rounded-full border border-bourbon/15 bg-white text-xs whitespace-nowrap shrink-0"
            >
              <span className="font-mono text-bourbon/60">{it.postLabel}</span>
              <span className="font-semibold text-rose-dark">{it.name}</span>
              {it.odds && <span className="text-bourbon/70">{it.odds}</span>}
              {it.finishLabel && (
                <span className="px-1.5 rounded bg-rose-red/15 text-rose-dark font-bold text-[10px]">
                  {it.finishLabel}
                </span>
              )}
              {it.grantBadge && (
                <span className="px-1.5 rounded bg-mint-julep/15 text-mint-julep font-bold text-[10px]">
                  {it.grantBadge}
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
