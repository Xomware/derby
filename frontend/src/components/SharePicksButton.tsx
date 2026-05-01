'use client';

import { useState } from 'react';
import type { Prediction } from '@/lib/api';
import type { RaceKind } from '@/lib/hooks';

interface Props {
  prediction: Prediction | null | undefined;
  kind: RaceKind;
  year: number;
  className?: string;
}

function buildText(p: Prediction, kind: RaceKind, year: number): string {
  const eventLabel = kind === 'derby' ? 'Derby' : 'Oaks';
  const lines = [
    `@${p.username}'s ${year} ${eventLabel} picks 🏇`,
    '',
    `Win: ${p.win}`,
    `Place: ${p.place}`,
    `Show: ${p.show}`,
    `Long shot: ${p.long_shot}`,
    '',
    `https://derby.xomware.com/picks?event=${kind}`,
  ];
  return lines.join('\n');
}

export function SharePicksButton({ prediction, kind, year, className }: Props) {
  const [status, setStatus] = useState<string | null>(null);

  if (!prediction) return null;

  async function share() {
    if (!prediction) return;
    const text = buildText(prediction, kind, year);
    const eventLabel = kind === 'derby' ? 'Derby' : 'Oaks';
    const shareData: ShareData = {
      title: `My ${year} ${eventLabel} picks`,
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
        className={
          className ??
          'inline-flex items-center gap-1.5 rounded-full border border-rose-red/40 bg-white text-rose-dark px-3 py-1 text-xs font-semibold hover:bg-rose-red/10 transition'
        }
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
        Share
      </button>
      {status && (
        <span className="text-[11px] text-bourbon/70" aria-live="polite">
          {status}
        </span>
      )}
    </div>
  );
}
