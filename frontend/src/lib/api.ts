import type {
  AdminUser,
  AdminVisitsStats,
  Leaderboard,
  Me,
  Pick,
  PicksGrouped,
  PollStatus,
  RaceResultsList,
  ResultValue,
  VoteValue,
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
    credentials: 'include',
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
  // auth
  signup: (body: { username: string; password: string }) =>
    request<Me>('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { username: string; password: string }) =>
    request<Me>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: () => request<Me>('/auth/me'),
  updateUsername: (username: string) =>
    request<Me>('/auth/update-username', { method: 'POST', body: JSON.stringify({ username }) }),
  trackVisit: (page: string) =>
    request<void>('/track/visit', { method: 'POST', body: JSON.stringify({ page }) }),

  // picks
  picks: () => request<PicksGrouped>('/picks/list'),
  pick: (id: string) => request<Pick>(`/picks/${encodeURIComponent(id)}`),

  // votes
  vote: (pick_id: string, vote: VoteValue) =>
    request('/votes/cast', { method: 'POST', body: JSON.stringify({ pick_id, vote }) }),
  myVotes: () => request<Array<{ pick_id: string; vote: VoteValue; updated_at: string }>>('/votes/mine'),

  // leaderboard
  leaderboard: () => request<Leaderboard>('/leaderboard/rank'),

  // race-level results
  results: () => request<RaceResultsList>('/results/list'),

  // admin
  adminCreatePick: (body: AdminPickInput) =>
    request<Pick>('/admin-picks/create', { method: 'POST', body: JSON.stringify(body) }),
  adminUpdatePick: (id: string, body: Partial<AdminPickInput>) =>
    request<Pick>('/admin-picks/update', { method: 'POST', body: JSON.stringify({ id, ...body }) }),
  adminDeletePick: (id: string) =>
    request<void>('/admin-picks/delete', { method: 'POST', body: JSON.stringify({ id }) }),
  adminSetResult: (id: string, result: ResultValue) =>
    request<Pick>('/admin-picks/set-result', { method: 'POST', body: JSON.stringify({ id, result }) }),
  adminUsers: () => request<AdminUser[]>('/admin-users/list'),
  adminPollStatus: () => request<PollStatus>('/admin-poll/status'),
  adminPollNow: () => request('/admin-poll/now', { method: 'POST' }),
  adminSetRaceResult: (body: AdminRaceResultInput) =>
    request('/admin-results/set', { method: 'POST', body: JSON.stringify(body) }),
  adminVisitsStats: (days = 7) =>
    request<AdminVisitsStats>(`/admin-visits/stats?days=${days}`),
};

export interface AdminRaceResultInput {
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
}

export interface AdminPickInput {
  race_number: number;
  race_post_time: string;
  horse_name: string;
  post_position?: number | null;
  jockey?: string | null;
  trainer?: string | null;
  odds_at_pick?: string | null;
  confidence?: number;
  writeup?: string | null;
  display_order?: number;
}

export { ApiError };
