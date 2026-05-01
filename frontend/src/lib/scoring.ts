'use client';

import type { GrantPicks } from './hooks';
import type { LeaderboardRow, RaceFinisher } from './types';

const SLOT_RANGES: Record<'win' | 'place' | 'show' | 'long_shot', [number, number]> = {
  win: [1, 1],
  place: [1, 2],
  show: [1, 3],
  long_shot: [1, 4],
};

const SLOT_DIVISOR: Record<'win' | 'place' | 'show' | 'long_shot', number> = {
  win: 1,
  place: 2,
  show: 3,
  long_shot: 4,
};

function normalizeName(s: string | null | undefined): string {
  if (!s) return '';
  return s.trim().toLowerCase().replace(/[’']/g, "'");
}

function oddsToRatio(odds: string | null | undefined): number | null {
  if (!odds) return null;
  const m = odds.replace(/\//g, '-').match(/^(\d+)-(\d+)$/);
  if (!m) return null;
  const n = Number(m[1]);
  const d = Number(m[2]);
  if (d <= 0 || !Number.isFinite(n)) return null;
  return n / d;
}

function roundTenth(x: number): number {
  // Match backend: 1-decimal precision so 5/3 = 1.7 not 1.6666….
  return Math.max(0, Math.round((x + 1e-9) * 10) / 10);
}

function positionOf(name: string | null, finishers: RaceFinisher[]): number | null {
  const target = normalizeName(name);
  if (!target) return null;
  const m = finishers.find((f) => normalizeName(f.horse_name) === target);
  return m ? m.position : null;
}

export function scoreSlot(
  slot: 'win' | 'place' | 'show' | 'long_shot',
  horseName: string | null,
  finishers: RaceFinisher[],
  oddsByHorse: Map<string, string>
): number {
  if (!horseName || finishers.length === 0) return 0;
  const pos = positionOf(horseName, finishers);
  if (pos === null) return 0;
  const [lo, hi] = SLOT_RANGES[slot];
  if (pos < lo || pos > hi) return 0;

  const ratio = oddsToRatio(oddsByHorse.get(normalizeName(horseName)));
  if (ratio === null) return 0;
  return roundTenth(ratio / SLOT_DIVISOR[slot]);
}

/**
 * Display helper: render a float score without trailing zeros.
 * 5 → '5', 2.5 → '2.5', 1.7 → '1.7', 0 → '0'.
 */
export function formatScore(n: number): string {
  if (!n) return '0';
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? r.toString() : r.toFixed(1);
}

export function scoreGrantRow(
  grant: GrantPicks,
  finishers: RaceFinisher[],
  oddsByHorse: Map<string, string>
): LeaderboardRow {
  const slots = (['win', 'place', 'show', 'long_shot'] as const).map((s) => ({
    slot: s,
    pick: grant[s] ?? null,
    score: scoreSlot(s, grant[s] ?? null, finishers, oddsByHorse),
  }));

  return {
    rank: 0,
    username: 'GRANT',
    win_pick: grant.win,
    place_pick: grant.place,
    show_pick: grant.show,
    long_shot_pick: grant.long_shot,
    win_score: slots[0].score,
    place_score: slots[1].score,
    show_score: slots[2].score,
    long_shot_score: slots[3].score,
    score: roundTenth(slots.reduce((acc, s) => acc + s.score, 0)),
  };
}
