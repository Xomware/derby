export type VoteValue = 'tail' | 'fade' | 'pass';
export type ResultValue =
  | 'pending'
  | 'won'
  | 'placed'
  | 'showed'
  | 'finished'
  | 'scratched';

export interface Me {
  id: string;
  email: string;
  username: string;
  is_admin: boolean;
}

export interface VoteCounts {
  tail: number;
  fade: number;
  pass: number;
}

export interface Voter {
  username: string;
}

export interface Pick {
  id: string;
  event_id: string;
  race_number: number;
  race_post_time: string;
  lock_time: string;
  horse_name: string;
  post_position: number | null;
  jockey: string | null;
  trainer: string | null;
  odds_at_pick: string | null;
  confidence: number;
  writeup: string | null;
  result: ResultValue;
  display_order: number;
  locked: boolean;
  counts: VoteCounts;
  voters: { tail: Voter[]; fade: Voter[]; pass: Voter[] };
  my_vote: VoteValue | null;
}

export interface RaceGroup {
  race_number: number;
  race_post_time: string;
  lock_time: string;
  locked: boolean;
  picks: Pick[];
}

export interface PicksGrouped {
  event: { id: string; name: string; event_date: string; is_active: boolean };
  races: RaceGroup[];
}

export interface LeaderboardRow {
  rank: number;
  username: string;
  score: number;
  correct_tails: number;
  correct_fades: number;
  picks_voted: number;
}

export interface Leaderboard {
  rows: LeaderboardRow[];
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  is_admin: boolean;
  created_at: string;
  last_login_at: string | null;
  vote_count: number;
}

export interface PollStatus {
  last_ran_at: string | null;
  last_source: string | null;
  last_picks_updated: number | null;
  last_errors: string | null;
  poll_enabled: boolean;
  next_run_at?: string | null;
  window_start_utc?: string | null;
  window_end_utc?: string | null;
}

export interface RaceFinisher {
  position: number;
  horse_name: string;
  jockey: string | null;
  win_payout: string | null;
  place_payout: string | null;
  show_payout: string | null;
}

export interface RaceResult {
  race_number: number;
  finishers: RaceFinisher[];
  official_at: string | null;
  notes: string | null;
  updated_at: string | null;
  updated_by: string | null;
  source: string | null;
}

export interface RaceResultsList {
  races: RaceResult[];
}

export interface AdminVisitsStats {
  total_visits: number;
  unique_visitors: number;
  by_day: { day: string; count: number }[];
  top_pages: { page: string; count: number }[];
  top_users: { username: string; count: number }[];
  recent: { username: string; page: string; ts: string; referrer: string | null }[];
}
