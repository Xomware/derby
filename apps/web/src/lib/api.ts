import type {
  AdminUser,
  Leaderboard,
  Me,
  Pick,
  PicksGrouped,
  PollStatus,
  ResultValue,
  VerifyResponse,
  VoteValue,
} from './types';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.detail ?? detail;
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
  requestLink: (email: string) =>
    request<void>('/auth/request-link', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  verify: (token: string) =>
    request<VerifyResponse>(
      `/auth/verify?token=${encodeURIComponent(token)}`
    ),
  completeSignup: (username: string) =>
    request<Me>('/auth/complete-signup', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: () => request<Me>('/auth/me'),

  // picks
  picks: () => request<PicksGrouped>('/picks'),

  // votes
  vote: (pick_id: string, vote: VoteValue) =>
    request('/votes', { method: 'POST', body: JSON.stringify({ pick_id, vote }) }),

  // leaderboard
  leaderboard: () => request<Leaderboard>('/leaderboard'),

  // admin
  adminCreatePick: (body: AdminPickInput) =>
    request<Pick>('/admin/picks', { method: 'POST', body: JSON.stringify(body) }),
  adminUpdatePick: (id: string, body: Partial<AdminPickInput>) =>
    request<Pick>(`/admin/picks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  adminDeletePick: (id: string) =>
    request<void>(`/admin/picks/${id}`, { method: 'DELETE' }),
  adminSetResult: (id: string, result: ResultValue) =>
    request<Pick>(`/admin/picks/${id}/result`, {
      method: 'PATCH',
      body: JSON.stringify({ result }),
    }),
  adminUsers: () => request<AdminUser[]>('/admin/users'),
  adminPollStatus: () => request<PollStatus>('/admin/poll-status'),
  adminPollNow: () => request('/admin/poll-now', { method: 'POST' }),
};

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
