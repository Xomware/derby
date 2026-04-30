import type {
  Leaderboard,
  Pick,
  PicksGrouped,
  RaceResultsList,
  ResultValue,
} from './types';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://api.derby.xomware.com';

class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.error?.message ?? body?.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  picks: (eventId: string) =>
    request<PicksGrouped>(`/picks/list?event_id=${encodeURIComponent(eventId)}`),
  pick: (id: string) => request<Pick>(`/picks/${encodeURIComponent(id)}`),

  leaderboard: (year: number, event: 'derby' | 'oaks' = 'derby') =>
    request<Leaderboard>(`/leaderboard/rank?year=${year}&event=${event}`),

  results: (year: number) =>
    request<RaceResultsList>(`/results/list?year=${year}`),

  predictionsList: (eventId: string, username?: string | null) => {
    const u = username
      ? `&username=${encodeURIComponent(username)}`
      : '';
    return request<PredictionsListResponse>(
      `/predictions/list?event_id=${encodeURIComponent(eventId)}${u}`
    );
  },
  predictionsUpsert: (body: PredictionUpsertInput) =>
    request<Prediction>('/predictions/upsert', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  commentsList: (eventId: string, horseId?: string | null) => {
    const h = horseId ? `&horse_id=${encodeURIComponent(horseId)}` : '';
    return request<CommentsListResponse>(
      `/comments/list?event_id=${encodeURIComponent(eventId)}${h}`
    );
  },
  commentsPost: (body: CommentPostInput) =>
    request<Comment>('/comments/post', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  commentsDelete: (body: { event_id: string; id: string; username: string }) =>
    request<void>('/comments/delete', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  adminCheck: (admin_token: string) =>
    request<{ ok: true }>('/admin-results/check', {
      method: 'POST',
      body: JSON.stringify({ admin_token }),
    }),
  adminSetRaceResult: (body: AdminRaceResultInput) =>
    request('/admin-results/set', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  adminUpdateOdds: (body: { admin_token: string; odds: { pick_id: string; odds_at_pick: string }[] }) =>
    request<{ updated: number }>('/admin-results/odds', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  adminCronRuns: (body: { admin_token: string; type?: string; limit?: number }) =>
    request<AdminCronRunsResponse>('/admin-results/cron-runs', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  adminVisits: (body: {
    admin_token: string;
    days?: number;
    limit?: number;
    filter_user?: string | null;
    filter_page?: string | null;
  }) =>
    request<AdminVisitsResponse>('/admin-visits/stats', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

export interface AdminCronRun {
  id: string;
  ran_at: string;
  type: string;
  summary: Record<string, { field_size?: number; matched?: number; updated?: number; skipped?: string }>;
}

export interface AdminCronRunsResponse {
  type: string;
  rows: AdminCronRun[];
}

export interface AdminVisitsResponse {
  total_visits: number;
  unique_visitors: number;
  filtered_count: number;
  by_day: { day: string; count: number }[];
  top_pages: { page: string; count: number }[];
  top_users: { username: string; count: number }[];
  user_breakdown: {
    username: string;
    total: number;
    last_seen: string | null;
    pages: { page: string; count: number }[];
  }[];
  recent: {
    username: string | null;
    page: string;
    ts: string;
    referrer: string | null;
    ip: string | null;
    user_agent: string | null;
  }[];
  filter_user: string | null;
  filter_page: string | null;
}

export interface Prediction {
  event_id: string;
  username: string;
  win: string;
  place: string;
  show: string;
  long_shot: string;
  created_at: string;
  updated_at: string;
}

export interface PredictionsListResponse {
  event_id: string;
  post_time: string | null;
  locked: boolean;
  my: Prediction | null;
  others: Prediction[];
  others_count: number;
}

export interface PredictionUpsertInput {
  event_id: string;
  username: string;
  win: string;
  place: string;
  show: string;
  long_shot: string;
}

export interface Comment {
  id: string;
  event_id: string;
  username: string;
  body: string;
  created_at: string;
  horse_id: string | null;
}

export interface CommentsListResponse {
  event_id: string;
  horse_id: string | null;
  comments: Comment[];
}

export interface CommentPostInput {
  event_id: string;
  username: string;
  body: string;
  horse_id?: string | null;
}

export interface AdminRaceResultInput {
  event_id: string;
  race_number: number;
  finishers: {
    position: number;
    horse_name: string;
    jockey?: string | null;
    win_payout?: string | null;
    place_payout?: string | null;
    show_payout?: string | null;
  }[];
  official_at?: string | null;
  notes?: string | null;
  admin_token: string;
}

export type AdminPickResultUpdate = {
  pick_id: string;
  result: ResultValue;
};

export { ApiError };
