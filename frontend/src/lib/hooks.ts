'use client';

import useSWR from 'swr';
import { api } from './api';
import type { Leaderboard, PicksGrouped, RaceResultsList } from './types';

export const EVENT_DERBY = '2026-kentucky-derby';
export const EVENT_OAKS = '2026-kentucky-oaks';

export function usePicks(eventId: string = EVENT_DERBY) {
  const { data, error, isLoading, mutate } = useSWR<PicksGrouped>(
    ['picks', eventId],
    () => api.picks(eventId),
    { refreshInterval: 30_000 }
  );
  return { picks: data, error, isLoading, refresh: mutate };
}

export function useLeaderboard() {
  const { data, error, isLoading, mutate } = useSWR<Leaderboard>(
    'leaderboard',
    () => api.leaderboard(),
    { refreshInterval: 30_000 }
  );
  return { leaderboard: data, error, isLoading, refresh: mutate };
}

export function useResults() {
  const { data, error, isLoading, mutate } = useSWR<RaceResultsList>(
    'results',
    () => api.results(),
    { refreshInterval: 60_000 }
  );
  return { results: data, error, isLoading, refresh: mutate };
}
