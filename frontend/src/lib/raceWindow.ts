'use client';

import { useEffect, useState } from 'react';
import { CURRENT_YEAR } from './year';

const POST_TIMES_BY_YEAR: Record<number, { oaks: string; derby: string }> = {
  2026: {
    oaks: '2026-05-01T20:40:00-04:00',
    derby: '2026-05-02T18:57:00-04:00',
  },
};

const WINDOW_MS = 30 * 60 * 1000; // ±30 min around post time

/**
 * Live race-day mode kicks in when `now` is within ±30 minutes of either
 * Oaks or Derby post time for the current year. Used to crank SWR refresh
 * intervals from the lazy 30-60s default down to 5s while the action is
 * actually happening.
 */
export function isRaceWindowActive(now: number = Date.now()): boolean {
  const times = POST_TIMES_BY_YEAR[CURRENT_YEAR];
  if (!times) return false;
  for (const iso of Object.values(times)) {
    const t = new Date(iso).getTime();
    if (Math.abs(now - t) <= WINDOW_MS) return true;
  }
  return false;
}

/**
 * React hook that returns whether we're currently in the race window.
 * Re-evaluates every 30s so SWR intervals can flip mid-session without
 * a hard refresh.
 */
export function useIsRaceWindowActive(): boolean {
  const [active, setActive] = useState(() => isRaceWindowActive());
  useEffect(() => {
    const id = setInterval(() => setActive(isRaceWindowActive()), 30_000);
    return () => clearInterval(id);
  }, []);
  return active;
}
