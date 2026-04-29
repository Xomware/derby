'use client';

import useSWR from 'swr';
import { api, ApiError } from './api';
import type { Leaderboard, Me, PicksGrouped } from './types';

const swallow401 = async <T>(fn: () => Promise<T>): Promise<T | null> => {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
};

export function useMe() {
  const { data, error, isLoading, mutate } = useSWR<Me | null>(
    'me',
    () => swallow401(() => api.me()),
    { revalidateOnFocus: false }
  );
  return { me: data ?? null, error, isLoading, refresh: mutate };
}

export function usePicks() {
  const { data, error, isLoading, mutate } = useSWR<PicksGrouped>(
    'picks',
    () => api.picks(),
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
