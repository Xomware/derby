'use client';

import useSWR from 'swr';
import { api, type CommentsListResponse, type PredictionsListResponse } from './api';
import { useIsRaceWindowActive } from './raceWindow';
import type { Leaderboard, PicksGrouped, RaceResultsList } from './types';
import { CURRENT_YEAR, derbyEventId, oaksEventId, useYear } from './year';

const FAST_REFRESH_MS = 5_000;

export type RaceKind = 'derby' | 'oaks';

export function eventIdFor(year: number, kind: RaceKind): string {
  return kind === 'derby' ? derbyEventId(year) : oaksEventId(year);
}

export function usePicks(kind: RaceKind, yearOverride?: number) {
  const { year } = useYear();
  const eventId = eventIdFor(yearOverride ?? year, kind);
  const live = useIsRaceWindowActive();
  const { data, error, isLoading, mutate } = useSWR<PicksGrouped>(
    ['picks', eventId],
    () => api.picks(eventId),
    { refreshInterval: live ? FAST_REFRESH_MS : 30_000 }
  );
  return { picks: data, error, isLoading, refresh: mutate, eventId, year: yearOverride ?? year };
}

export function useLeaderboard(
  yearOverride?: number,
  event: 'derby' | 'oaks' = 'derby'
) {
  const { year } = useYear();
  const effectiveYear = yearOverride ?? year;
  const live = useIsRaceWindowActive();
  const { data, error, isLoading, mutate } = useSWR<Leaderboard>(
    ['leaderboard', effectiveYear, event],
    () => api.leaderboard(effectiveYear, event),
    { refreshInterval: live ? FAST_REFRESH_MS : 30_000 }
  );
  return { leaderboard: data, error, isLoading, refresh: mutate, year: effectiveYear };
}

export function useResults(yearOverride?: number) {
  const { year } = useYear();
  const effectiveYear = yearOverride ?? year;
  const live = useIsRaceWindowActive();
  const { data, error, isLoading, mutate } = useSWR<RaceResultsList>(
    ['results', effectiveYear],
    () => api.results(effectiveYear),
    { refreshInterval: live ? FAST_REFRESH_MS : 60_000 }
  );
  return { results: data, error, isLoading, refresh: mutate, year: effectiveYear };
}

export function useGrantPicks(kind: RaceKind, yearOverride?: number) {
  const { year } = useYear();
  const effectiveYear = yearOverride ?? year;
  const { data, error, isLoading } = useSWR<GrantPicks>(
    ['grant-picks', effectiveYear, kind],
    async () => {
      const res = await fetch(`/grants-picks/${effectiveYear}/${kind}.json`);
      if (!res.ok) throw new Error(`No Grant picks for ${effectiveYear} ${kind}`);
      return (await res.json()) as GrantPicks;
    }
  );
  return { grantPicks: data, error, isLoading, year: effectiveYear, isCurrent: effectiveYear === CURRENT_YEAR };
}

export interface GrantPicks {
  year: number;
  event: RaceKind;
  win: string | null;
  place: string | null;
  show: string | null;
  long_shot: string | null;
  inferred?: boolean;
  notes?: string | null;
  analysis?: string | null;
  betting_plays?: string | null;
  power_rankings?: PowerRankingTier[];
  horses?: GrantArchiveHorse[];
}

export interface PowerRankingTier {
  tier: string;
  horses: { name: string; note: string | null }[];
}

export interface GrantArchiveHorse {
  horse_name: string;
  post_position?: number | null;
  odds_at_pick?: string | null;
  jockey?: string | null;
  trainer?: string | null;
  record?: string | null;
  beyer?: string | null;
  brisnet?: string | null;
  equibase_rating?: string | null;
  last_race?: string | null;
  style?: string | null;
  final_take?: string | null;
  writeup?: string | null;
}

export function useComments(
  kind: RaceKind,
  options: { horseId?: string | null; yearOverride?: number } = {}
) {
  const { year } = useYear();
  const effectiveYear = options.yearOverride ?? year;
  const eventId = eventIdFor(effectiveYear, kind);
  const isCurrent = effectiveYear === CURRENT_YEAR;
  const horseId = options.horseId ?? null;
  const { data, error, isLoading, mutate } = useSWR<CommentsListResponse>(
    isCurrent ? ['comments', eventId, horseId ?? ''] : null,
    () => api.commentsList(eventId, horseId),
    { refreshInterval: 60_000 }
  );
  return {
    comments: data?.comments ?? [],
    error,
    isLoading,
    refresh: mutate,
    eventId,
    isCurrent,
  };
}

export function usePredictions(kind: RaceKind, username: string | null, yearOverride?: number) {
  const { year } = useYear();
  const eventId = eventIdFor(yearOverride ?? year, kind);
  const isCurrent = (yearOverride ?? year) === CURRENT_YEAR;
  const { data, error, isLoading, mutate } = useSWR<PredictionsListResponse>(
    isCurrent ? ['predictions', eventId, username ?? ''] : null,
    () => api.predictionsList(eventId, username),
    { refreshInterval: 30_000 }
  );
  return { data, error, isLoading, refresh: mutate, eventId, year: yearOverride ?? year, isCurrent };
}
