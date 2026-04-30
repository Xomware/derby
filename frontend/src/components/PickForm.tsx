'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, ApiError, type Prediction } from '@/lib/api';
import { computeStamp, type Slot } from '@/lib/stamps';
import type { Pick, RaceFinisher } from '@/lib/types';
import { StampBadge } from './StampBadge';

const FIELDS: { key: Slot; label: string; help: string }[] = [
  { key: 'win', label: 'Win (1st)', help: 'Your call to take it all.' },
  { key: 'place', label: 'Place (2nd)', help: 'Different horse than Win.' },
  { key: 'show', label: 'Show (3rd)', help: 'Different from Win + Place.' },
  { key: 'long_shot', label: 'Long shot / dark horse', help: 'Odds 8-1 or longer.' },
];

const LONG_SHOT_THRESHOLD = 8;

interface Props {
  horses: Pick[];
  eventId: string;
  locked: boolean;
  existing: Prediction | null;
  username: string | null;
  finishers: RaceFinisher[];
  onSaved: () => void;
}

function oddsRatio(odds: string | null): number | null {
  if (!odds) return null;
  const m = odds.match(/^(\d+)[-/](\d+)$/);
  if (!m) return null;
  const n = Number(m[1]);
  const d = Number(m[2]);
  return d === 0 ? null : n / d;
}

function isLongShotEligible(odds: string | null): boolean {
  const r = oddsRatio(odds);
  return r === null ? false : r >= LONG_SHOT_THRESHOLD;
}

export function PickForm({
  horses,
  eventId,
  locked,
  existing,
  username,
  finishers,
  onSaved,
}: Props) {
  const [win, setWin] = useState('');
  const [place, setPlace] = useState('');
  const [show, setShow] = useState('');
  const [longShot, setLongShot] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setWin(existing?.win ?? '');
    setPlace(existing?.place ?? '');
    setShow(existing?.show ?? '');
    setLongShot(existing?.long_shot ?? '');
  }, [existing]);

  const allHorses = useMemo(
    () =>
      [...horses]
        .sort((a, b) => a.horse_name.localeCompare(b.horse_name))
        .map((h) => ({ name: h.horse_name, odds: h.odds_at_pick })),
    [horses]
  );

  const longShotEligible = useMemo(
    () => allHorses.filter((h) => isLongShotEligible(h.odds)),
    [allHorses]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !eventId) return;
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
      setSavedAt(new Date().toLocaleTimeString());
      onSaved();
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : 'Failed to save';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (!username) return null;

  const all4 = [win, place, show, longShot].filter(Boolean);
  const dupAny = all4.length === 4 && new Set(all4.map((s) => s.toLowerCase())).size !== 4;
  const longShotInvalid =
    !!longShot &&
    !isLongShotEligible(allHorses.find((h) => h.name === longShot)?.odds ?? null);
  const showStamps = existing && finishers.length > 0;

  return (
    <section className="rounded-xl border border-bourbon/20 bg-white p-4" id="your-picks">
      <header className="mb-3">
        <h2 className="font-display text-xl text-bourbon">Your picks</h2>
        <p className="text-xs text-bourbon/70 mt-0.5">
          Submitting as <span className="font-semibold">@{username}</span>.
          {existing
            ? ' Saved — edit anytime until lock.'
            : ' Lock in your top 3 + a long shot. All 4 must be different.'}
        </p>
      </header>

      {showStamps && (
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {FIELDS.map((f) => {
            const value = (existing as Prediction)[f.key];
            const stamp = computeStamp(value, f.key, finishers);
            return (
              <div
                key={f.key}
                className="rounded-md border border-bourbon/15 bg-cream/40 px-3 py-2"
              >
                <dt className="text-[10px] uppercase tracking-wider text-bourbon/70 font-semibold flex items-center justify-between gap-1">
                  <span>{f.label.replace(/\s*\([^)]*\)/, '')}</span>
                  {stamp && <StampBadge stamp={stamp} />}
                </dt>
                <dd className="text-sm font-semibold text-bourbon mt-0.5">
                  {value}
                </dd>
              </div>
            );
          })}
        </dl>
      )}

      {locked ? (
        <div className="rounded-md border border-rose-red/30 bg-rose-red/5 px-3 py-2 text-sm text-rose-dark">
          Picks are locked — race is off. {existing ? 'Your final entry was saved.' : 'No entry recorded.'}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FIELDS.map((f) => {
            const [val, set] =
              f.key === 'win'
                ? ([win, setWin] as const)
                : f.key === 'place'
                ? ([place, setPlace] as const)
                : f.key === 'show'
                ? ([show, setShow] as const)
                : ([longShot, setLongShot] as const);
            const options = f.key === 'long_shot' ? longShotEligible : allHorses;
            return (
              <label key={f.key} className="block text-sm">
                <span className="text-[11px] uppercase tracking-wider text-bourbon/70 font-semibold">
                  {f.label}
                </span>
                <select
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  required
                  className="mt-1 w-full rounded border border-bourbon/30 bg-cream px-2 py-1.5 text-bourbon focus:outline-none focus:ring-2 focus:ring-rose-red/50"
                >
                  <option value="">— choose —</option>
                  {options.map((h) => (
                    <option key={h.name} value={h.name}>
                      {h.name}
                      {h.odds ? ` — ${h.odds}` : ''}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-bourbon/60">{f.help}</span>
              </label>
            );
          })}
          {dupAny && (
            <p className="sm:col-span-2 text-xs text-rose-dark">
              All 4 picks must be different horses.
            </p>
          )}
          {longShotInvalid && (
            <p className="sm:col-span-2 text-xs text-rose-dark">
              Long shot must be 8-1 or longer.
            </p>
          )}
          {error && (
            <p className="sm:col-span-2 text-sm text-rose-dark">{error}</p>
          )}
          <div className="sm:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={
                saving ||
                dupAny ||
                longShotInvalid ||
                !win ||
                !place ||
                !show ||
                !longShot
              }
              className="rounded bg-rose-red px-4 py-1.5 text-sm font-semibold text-white hover:bg-rose-dark disabled:opacity-50 transition"
            >
              {saving ? 'Saving…' : existing ? 'Update picks' : 'Submit picks'}
            </button>
            {savedAt && (
              <span className="text-xs text-mint-julep">Saved at {savedAt}</span>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
