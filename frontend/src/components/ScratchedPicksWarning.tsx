'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Prediction } from '@/lib/api';
import type { RaceKind } from '@/lib/hooks';

interface Props {
  prediction: Prediction | null | undefined;
  scratchedHorses: Set<string>;
  kind: RaceKind;
  year: number;
  /** When the user has the inline editor available, clicking the CTA should
   *  open it instead of routing them away. */
  onEdit?: () => void;
  /** Race already locked — show the warning but no edit CTA. */
  locked: boolean;
}

interface ScratchedSlot {
  slot: 'win' | 'place' | 'show' | 'long_shot';
  label: string;
  horse: string;
}

const SLOT_LABEL: Record<ScratchedSlot['slot'], string> = {
  win: 'Win',
  place: 'Place',
  show: 'Show',
  long_shot: 'Long shot',
};

function findScratched(
  prediction: Prediction,
  scratched: Set<string>
): ScratchedSlot[] {
  const norm = (s: string) => s.trim().toLowerCase();
  const out: ScratchedSlot[] = [];
  (['win', 'place', 'show', 'long_shot'] as const).forEach((slot) => {
    const horse = prediction[slot];
    if (horse && scratched.has(norm(horse))) {
      out.push({ slot, label: SLOT_LABEL[slot], horse });
    }
  });
  return out;
}

function dismissKey(kind: RaceKind, year: number, scratchedSlots: ScratchedSlot[]): string {
  // Key includes the affected horses so a NEW scratch re-pops the warning.
  const sig = scratchedSlots.map((s) => `${s.slot}:${s.horse.toLowerCase()}`).sort().join('|');
  return `derby:scratched-warning:${kind}:${year}:${sig}`;
}

export function ScratchedPicksWarning({
  prediction,
  scratchedHorses,
  kind,
  year,
  onEdit,
  locked,
}: Props) {
  const slots = useMemo(
    () => (prediction ? findScratched(prediction, scratchedHorses) : []),
    [prediction, scratchedHorses]
  );

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (slots.length === 0) return;
    if (typeof window === 'undefined') return;
    const key = dismissKey(kind, year, slots);
    if (window.localStorage.getItem(key)) return;
    setOpen(true);
  }, [slots, kind, year]);

  function dismiss() {
    if (slots.length > 0) {
      try {
        window.localStorage.setItem(dismissKey(kind, year, slots), '1');
      } catch {
        /* private mode */
      }
    }
    setOpen(false);
  }

  function update() {
    dismiss();
    onEdit?.();
  }

  if (!open || slots.length === 0) return null;

  const eventLabel = kind === 'derby' ? 'Derby' : 'Oaks';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scratched picks"
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={dismiss}
        className="absolute inset-0 bg-bourbon/60 backdrop-blur-sm"
      />
      <div className="relative w-full sm:w-auto sm:max-w-md bg-cream rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="sm:hidden pt-2 pb-1 flex justify-center">
          <div className="h-1.5 w-10 rounded-full bg-bourbon/30" />
        </div>
        <header className="px-5 pt-3 sm:pt-5 pb-3 border-b border-rose-red/20 bg-rose-red/5">
          <p className="text-[11px] uppercase tracking-wider text-rose-red font-bold">
            Scratched · {year} {eventLabel}
          </p>
          <h2 className="font-display text-2xl text-rose-dark">
            {locked
              ? 'Some of your picks were scratched'
              : 'Heads up — update your picks'}
          </h2>
        </header>

        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-bourbon/80">
            {locked
              ? "Picks are locked, so this is just a heads up — these horses won't score."
              : 'These picks won’t score unless you swap them before lock.'}
          </p>

          <ul className="space-y-1.5 text-sm">
            {slots.map((s) => (
              <li
                key={s.slot}
                className="flex items-baseline gap-2 rounded px-2 py-1 bg-rose-red/10 border border-rose-red/20"
              >
                <span className="text-[10px] uppercase tracking-wider text-bourbon/60 font-semibold w-20 shrink-0">
                  {s.label}
                </span>
                <span className="flex-1 text-bourbon line-through decoration-rose-red/70">
                  {s.horse}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-rose-red font-bold">
                  scratched
                </span>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            {!locked && onEdit && (
              <button
                type="button"
                onClick={update}
                className="flex-1 rounded bg-rose-red px-4 py-2 text-sm font-semibold text-white hover:bg-rose-dark transition"
              >
                Update picks
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="rounded border border-bourbon/30 px-3 py-2 text-sm text-bourbon hover:bg-bourbon/10 transition"
            >
              {locked || !onEdit ? 'Got it' : 'Later'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
