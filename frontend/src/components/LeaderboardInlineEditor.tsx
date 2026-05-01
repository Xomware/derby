'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, ApiError, type Prediction } from '@/lib/api';

const LONG_SHOT_THRESHOLD = 8;

type Slot = 'win' | 'place' | 'show' | 'long_shot';

const FIELDS: { key: Slot; label: string }[] = [
  { key: 'win', label: 'Win' },
  { key: 'place', label: 'Place' },
  { key: 'show', label: 'Show' },
  { key: 'long_shot', label: 'Long shot' },
];

interface HorseOption {
  name: string;
  scratched: boolean;
  odds: string | null;
}

interface Props {
  eventId: string;
  username: string;
  existing: Prediction | null;
  horses: HorseOption[];
  onSaved: () => void;
  onCancel: () => void;
}

function oddsRatio(odds: string | null): number | null {
  if (!odds) return null;
  const m = odds.match(/^(\d+)[-/](\d+)$/);
  if (!m) return null;
  const n = Number(m[1]);
  const d = Number(m[2]);
  return d === 0 ? null : n / d;
}

export function LeaderboardInlineEditor({
  eventId,
  username,
  existing,
  horses,
  onSaved,
  onCancel,
}: Props) {
  const [win, setWin] = useState('');
  const [place, setPlace] = useState('');
  const [show, setShow] = useState('');
  const [longShot, setLongShot] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWin(existing?.win ?? '');
    setPlace(existing?.place ?? '');
    setShow(existing?.show ?? '');
    setLongShot(existing?.long_shot ?? '');
  }, [existing]);

  const oddsByName = useMemo(() => {
    const m = new Map<string, string | null>();
    horses.forEach((h) => m.set(h.name, h.odds));
    return m;
  }, [horses]);

  const longShotEligible = (name: string) => {
    const r = oddsRatio(oddsByName.get(name) ?? null);
    return r === null ? false : r >= LONG_SHOT_THRESHOLD;
  };

  const valuesBySlot: Record<Slot, string> = {
    win,
    place,
    show,
    long_shot: longShot,
  };

  function setSlot(slot: Slot, value: string) {
    if (slot === 'win') setWin(value);
    else if (slot === 'place') setPlace(value);
    else if (slot === 'show') setShow(value);
    else setLongShot(value);
  }

  function selectableFor(slot: Slot): HorseOption[] {
    return horses.filter((h) => {
      if (h.scratched) return false;
      if (slot === 'long_shot' && !longShotEligible(h.name)) return false;
      // Disallow same horse in two slots — except keep the currently
      // selected one in its own dropdown so the user can see it.
      const usedElsewhere = FIELDS.some(
        (f) => f.key !== slot && valuesBySlot[f.key] === h.name
      );
      return !usedElsewhere || valuesBySlot[slot] === h.name;
    });
  }

  function validate(): string | null {
    const slots = [win, place, show, longShot];
    if (slots.some((s) => !s)) return 'Pick all four slots.';
    const set = new Set(slots);
    if (set.size !== 4) return 'Each slot needs a different horse.';
    if (!longShotEligible(longShot)) {
      return 'Long shot must be 8-1 or longer.';
    }
    const scratchedSet = new Set(
      horses.filter((h) => h.scratched).map((h) => h.name)
    );
    if (slots.some((s) => scratchedSet.has(s))) {
      return 'One of your picks has been scratched. Swap it.';
    }
    return null;
  }

  async function save() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api.predictionsUpsert({
        event_id: eventId,
        username,
        win,
        place,
        show,
        long_shot: longShot,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 px-1 pb-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {FIELDS.map((f) => {
          const opts = selectableFor(f.key);
          const value = valuesBySlot[f.key];
          return (
            <label key={f.key} className="block">
              <span className="text-[10px] uppercase tracking-wider text-bourbon/70 font-semibold">
                {f.label}
              </span>
              <select
                value={value}
                onChange={(e) => setSlot(f.key, e.target.value)}
                className="mt-0.5 w-full rounded border border-bourbon/30 bg-white px-2 py-1.5 text-sm focus:border-rose-red focus:outline-none focus:ring-1 focus:ring-rose-red/40"
              >
                <option value="">— select —</option>
                {opts.map((h) => (
                  <option key={h.name} value={h.name}>
                    {h.name}
                    {h.odds ? ` · ${h.odds}` : ''}
                  </option>
                ))}
                {value && !opts.some((h) => h.name === value) && (
                  <option value={value}>{value} (unavailable)</option>
                )}
              </select>
            </label>
          );
        })}
      </div>

      {error && (
        <p className="text-xs text-rose-dark bg-rose-red/10 border border-rose-red/30 rounded px-2 py-1">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded bg-rose-red px-4 py-1.5 text-sm font-semibold text-white hover:bg-rose-dark disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {saving ? 'Saving…' : 'Save picks'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded border border-bourbon/30 px-3 py-1.5 text-sm text-bourbon hover:bg-bourbon/10 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
