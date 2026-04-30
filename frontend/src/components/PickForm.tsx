'use client';

import { useEffect, useState } from 'react';
import { api, ApiError, type Prediction } from '@/lib/api';
import type { Pick } from '@/lib/types';

const FIELDS: { key: 'win' | 'place' | 'show' | 'long_shot'; label: string; help: string }[] = [
  { key: 'win', label: 'Win (1st)', help: 'Your call to take it all.' },
  { key: 'place', label: 'Place (2nd)', help: 'Different horse than Win.' },
  { key: 'show', label: 'Show (3rd)', help: 'Different from Win + Place.' },
  { key: 'long_shot', label: 'Long shot / dark horse', help: 'A flier — can repeat one of the above.' },
];

interface Props {
  horses: Pick[];
  eventId: string;
  locked: boolean;
  existing: Prediction | null;
  username: string | null;
  onSaved: () => void;
}

export function PickForm({ horses, eventId, locked, existing, username, onSaved }: Props) {
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

  const horseNames = horses
    .map((h) => h.horse_name)
    .filter(Boolean)
    .sort();

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

  const top3 = [win, place, show].filter(Boolean);
  const dupTop3 = top3.length === 3 && new Set(top3).size !== 3;

  return (
    <section className="rounded-xl border border-bourbon/20 bg-white p-4">
      <header className="mb-3">
        <h2 className="font-display text-xl text-bourbon">Your picks</h2>
        <p className="text-xs text-bourbon/70 mt-0.5">
          Submitting as <span className="font-semibold">@{username}</span>.
          {existing ? ' Saved — edit anytime until lock.' : ' Lock in your top 3 + a long shot.'}
        </p>
      </header>

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
                  {horseNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-bourbon/60">{f.help}</span>
              </label>
            );
          })}
          {dupTop3 && (
            <p className="sm:col-span-2 text-xs text-rose-dark">
              Win / Place / Show must be three different horses.
            </p>
          )}
          {error && (
            <p className="sm:col-span-2 text-sm text-rose-dark">{error}</p>
          )}
          <div className="sm:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || dupTop3 || !win || !place || !show || !longShot}
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
