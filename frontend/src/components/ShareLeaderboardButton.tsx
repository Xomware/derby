'use client';

import { useState } from 'react';
import type { RaceKind } from '@/lib/hooks';
import type { LeaderboardRow } from '@/lib/types';

interface Props {
  rows: LeaderboardRow[];
  kind: RaceKind;
  year: number;
  finished: boolean;
  /** Limit how many rows go into the share text. */
  limit?: number;
}

function buildText(
  rows: LeaderboardRow[],
  kind: RaceKind,
  year: number,
  finished: boolean,
  limit: number
): string {
  const eventLabel = kind === 'derby' ? 'Derby' : 'Oaks';
  const top = rows.slice(0, limit);
  const status = finished ? 'Final' : 'Live';
  const lines: string[] = [
    `${year} ${eventLabel} — ${status} leaderboard`,
    '',
  ];
  for (const r of top) {
    const name = r.username === 'GRANT' ? 'Grant' : `@${r.username}`;
    lines.push(`#${r.rank}  ${name.padEnd(14)} ${r.score} pts`);
  }
  lines.push('');
  lines.push(`See it all → https://derby.xomware.com/leaderboard?event=${kind}`);
  return lines.join('\n');
}

export function ShareLeaderboardButton({
  rows,
  kind,
  year,
  finished,
  limit = 10,
}: Props) {
  const [status, setStatus] = useState<string | null>(null);

  if (!rows || rows.length === 0) return null;

  async function share() {
    const text = buildText(rows, kind, year, finished, limit);
    const eventLabel = kind === 'derby' ? 'Derby' : 'Oaks';
    // No `files` — let the platform unfurl the link via og:image so the
    // banner shows up as a rich link preview instead of a flat attachment.
    const shareData: ShareData = {
      title: `${year} ${eventLabel} leaderboard`,
      text,
    };
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or share failed; fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Copied to clipboard');
      setTimeout(() => setStatus(null), 2_500);
    } catch {
      setStatus('Could not copy');
      setTimeout(() => setStatus(null), 2_500);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={share}
        className="inline-flex items-center gap-1.5 rounded-full border border-bourbon/30 bg-white text-bourbon px-3 py-1 text-xs font-semibold hover:border-rose-red hover:text-rose-red transition"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        Share board
      </button>
      {status && (
        <span className="text-[11px] text-bourbon/70" aria-live="polite">
          {status}
        </span>
      )}
    </div>
  );
}
