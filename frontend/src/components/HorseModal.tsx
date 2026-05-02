'use client';

import { useEffect } from 'react';
import { StatTile } from '@/components/StatTile';
import { usePicks, type RaceKind } from '@/lib/hooks';
import type { Pick } from '@/lib/types';

interface Props {
  horseName: string;
  kind: RaceKind;
  onClose: () => void;
}

function statsForPick(p: Pick, kind: RaceKind) {
  const all = [
    { label: 'Odds', value: p.odds_at_pick ?? 'N/A' },
    { label: 'Record', value: p.record ?? 'N/A' },
    { label: 'Beyer', value: p.beyer ?? 'N/A' },
    { label: 'Brisnet', value: p.brisnet ?? 'N/A' },
    { label: 'Equibase', value: p.equibase_rating ?? 'N/A' },
    { label: 'Style', value: p.style ?? 'N/A' },
    { label: 'Last race', value: p.last_race ?? 'N/A' },
  ];
  const hidden =
    kind === 'derby' ? new Set(['Equibase']) : new Set(['Beyer', 'Brisnet']);
  return all.filter((s) => !hidden.has(s.label));
}

function findHorse(picks: Pick[] | undefined, name: string): Pick | null {
  if (!picks) return null;
  const norm = name.trim().toLowerCase();
  return picks.find((p) => p.horse_name.trim().toLowerCase() === norm) ?? null;
}

export function HorseModal({ horseName, kind, onClose }: Props) {
  const { picks, isLoading } = usePicks(kind);
  const flat = picks?.races.flatMap((r) => r.picks) ?? [];
  const horse = findHorse(flat, horseName);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const bullets = (horse?.writeup ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${horseName} details`}
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-bourbon/60 backdrop-blur-sm"
      />
      <div className="relative w-full sm:w-auto sm:max-w-2xl sm:max-h-[85vh] max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden bg-cream">
        {/* Mobile drag handle */}
        <div className="sm:hidden pt-2 pb-1 flex justify-center shrink-0">
          <div className="h-1.5 w-10 rounded-full bg-bourbon/30" />
        </div>

        {horse?.scratched && (
          <div className="shrink-0 bg-rose-red text-cream px-5 py-1.5 text-[11px] uppercase tracking-[0.2em] font-bold flex items-center gap-2">
            <span aria-hidden>⚠</span>
            <span>Scratched — won&apos;t score</span>
          </div>
        )}

        <header className="shrink-0 flex items-start justify-between gap-3 px-5 pt-3 sm:pt-5 pb-3 border-b border-bourbon/15">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wider text-bourbon/60">
              {horse?.scratched
                ? 'Scratched'
                : horse?.post_position != null
                ? `Post ${horse.post_position}`
                : 'Late add'}
            </div>
            <h2
              className={`font-display text-2xl text-rose-dark leading-tight truncate ${
                horse?.scratched
                  ? 'line-through decoration-rose-red/60 decoration-2'
                  : ''
              }`}
            >
              {horse?.horse_name ?? horseName}
            </h2>
            {(horse?.jockey || horse?.trainer) && (
              <p className="text-xs text-bourbon/70 mt-0.5">
                {horse?.jockey ?? 'Jockey TBD'}
                {horse?.trainer && ` · ${horse.trainer}`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 h-9 w-9 rounded-full grid place-items-center text-bourbon hover:bg-bourbon/10 active:bg-bourbon/15 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {isLoading && !horse && (
            <p className="text-bourbon/70 text-sm">Loading…</p>
          )}

          {!isLoading && !horse && (
            <p className="text-bourbon/70 text-sm">
              We don&apos;t have a card for <strong>{horseName}</strong> yet.
            </p>
          )}

          {horse && (
            <>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {statsForPick(horse, kind).map((s) => (
                  <StatTile key={s.label} label={s.label} value={s.value} />
                ))}
              </dl>

              {bullets.length > 0 && (
                <section className="rounded-lg border border-bourbon/15 bg-white p-3">
                  <h3 className="text-[11px] uppercase tracking-wider font-semibold text-rose-dark mb-2">
                    Grant&apos;s notes
                  </h3>
                  <ul className="space-y-1.5 text-sm text-ink/90 leading-relaxed">
                    {bullets.map((b, i) => (
                      <li
                        key={i}
                        className="pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-rose-red"
                      >
                        {b}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {horse.final_take && (
                <section className="rounded-lg border-l-4 border-rose-red bg-rose-red/5 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-rose-dark mb-0.5">
                    Final take
                  </div>
                  <p className="text-sm text-ink/90">{horse.final_take}</p>
                </section>
              )}

              <a
                href={`/${kind}#horse-${horse.id}`}
                onClick={onClose}
                className="block text-center text-sm font-semibold text-rose-dark hover:text-rose-red underline underline-offset-4"
              >
                Open full card →
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
