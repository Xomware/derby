'use client';

import type { RaceFinisher } from './types';

export type Slot = 'win' | 'place' | 'show' | 'long_shot';

export const SLOT_TARGET: Record<Slot, number | null> = {
  win: 1,
  place: 2,
  show: 3,
  long_shot: null,
};

export interface Stamp {
  /** Hit the exact target (e.g., picked Win and finished 1st). */
  hit: boolean;
  /** Actual finishing position, if found. */
  actualPosition: number | null;
  /** Did the horse hit the board (1-3)? Only meaningful for long_shot. */
  onBoard: boolean;
  /** Display label, e.g. "1st", "5th", "DNF". */
  label: string;
  tone: 'green' | 'red' | 'amber' | 'gray';
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

/**
 * Compute a stamp for a single picked horse against the official finish order.
 * `slot` decides hit/miss tone — long_shot is "good" if it hit the board.
 */
export function computeStamp(
  horseName: string,
  slot: Slot,
  finishers: RaceFinisher[]
): Stamp | null {
  if (!horseName) return null;
  if (!finishers || finishers.length === 0) return null;

  const norm = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[’']/g, "'");
  const target = norm(horseName);
  const match = finishers.find((f) => norm(f.horse_name) === target);

  if (!match) {
    return {
      hit: false,
      actualPosition: null,
      onBoard: false,
      label: 'DNF',
      tone: 'red',
    };
  }

  const pos = match.position;
  const slotTarget = SLOT_TARGET[slot];
  const onBoard = pos <= 3;

  if (slot === 'long_shot') {
    return {
      hit: onBoard,
      actualPosition: pos,
      onBoard,
      label: ordinal(pos),
      tone: onBoard ? 'green' : 'amber',
    };
  }

  if (slotTarget === pos) {
    return {
      hit: true,
      actualPosition: pos,
      onBoard,
      label: ordinal(pos),
      tone: 'green',
    };
  }

  // Missed but still hit board → amber. Off the board → red.
  return {
    hit: false,
    actualPosition: pos,
    onBoard,
    label: ordinal(pos),
    tone: onBoard ? 'amber' : 'red',
  };
}
