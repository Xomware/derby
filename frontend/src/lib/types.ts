export type ResultValue =
  | 'pending'
  | 'won'
  | 'placed'
  | 'showed'
  | 'finished'
  | 'scratched';

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
  final_take: string | null;
  record: string | null;
  beyer: string | null;
  brisnet: string | null;
  equibase_rating: string | null;
  last_race: string | null;
  style: string | null;
  result: ResultValue;
  display_order: number;
  locked: boolean;
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
  picks_made: number;
}

export interface Leaderboard {
  year: number;
  rows: LeaderboardRow[];
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
  day: 'oaks' | 'derby';
  post_time: string;
  name: string | null;
  finishers: RaceFinisher[];
  official_at: string | null;
  notes: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  source: string | null;
}

export interface RaceResultsList {
  races: RaceResult[];
}
