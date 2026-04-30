'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { clearAdminToken } from '@/lib/admin';
import { useGrantPicks, usePicks, useResults, type RaceKind } from '@/lib/hooks';
import { CURRENT_YEAR } from '@/lib/year';

interface Slot {
  position: number;
  horse_name: string;
  jockey: string;
}

const DEFAULT_SLOTS: Slot[] = Array.from({ length: 5 }, (_, i) => ({
  position: i + 1,
  horse_name: '',
  jockey: '',
}));

export function AdminResultsForm({
  kind,
  adminToken,
}: {
  kind: RaceKind;
  adminToken: string;
}) {
  const { picks } = usePicks(kind, CURRENT_YEAR);
  const { results, refresh: refreshResults } = useResults(CURRENT_YEAR);
  const { grantPicks: _grant } = useGrantPicks(kind, CURRENT_YEAR);
  const [slots, setSlots] = useState<Slot[]>(DEFAULT_SLOTS);
  const [officialAt, setOfficialAt] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const eventId = `${CURRENT_YEAR}-kentucky-${kind}`;
  const mainRaceNumber = kind === 'derby' ? 12 : 11;

  // Pre-fill from existing saved results for this event/race.
  const existing = useMemo(
    () =>
      (results?.races ?? []).find(
        (r) => r.day === kind && r.race_number === mainRaceNumber
      ),
    [results, kind, mainRaceNumber]
  );

  useEffect(() => {
    if (existing && existing.finishers.length > 0) {
      const padded = [...existing.finishers]
        .sort((a, b) => a.position - b.position)
        .map((f) => ({
          position: f.position,
          horse_name: f.horse_name ?? '',
          jockey: f.jockey ?? '',
        }));
      while (padded.length < 4) {
        padded.push({ position: padded.length + 1, horse_name: '', jockey: '' });
      }
      setSlots(padded);
      setOfficialAt(existing.official_at ?? '');
      setNotes(existing.notes ?? '');
    }
  }, [existing]);

  const horseNames = useMemo(() => {
    const list = (picks?.races ?? []).flatMap((r) => r.picks).map((p) => p.horse_name);
    return Array.from(new Set(list)).sort();
  }, [picks]);

  function updateSlot(idx: number, patch: Partial<Slot>) {
    setSlots((s) => s.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  }

  function addSlot() {
    setSlots((s) => [...s, { position: s.length + 1, horse_name: '', jockey: '' }]);
  }

  function removeSlot(idx: number) {
    setSlots((s) => s.filter((_, i) => i !== idx).map((x, i) => ({ ...x, position: i + 1 })));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const finishers = slots
        .filter((s) => s.horse_name.trim())
        .map((s) => ({
          position: s.position,
          horse_name: s.horse_name.trim(),
          jockey: s.jockey.trim() || null,
        }));
      if (finishers.length === 0) {
        setErr('Add at least one finisher');
        return;
      }
      await api.adminSetRaceResult({
        event_id: eventId,
        race_number: mainRaceNumber,
        finishers,
        official_at: officialAt || null,
        notes: notes || null,
        admin_token: adminToken,
      });
      setMsg('Saved. Stamps will appear across the site.');
      await refreshResults();
    } catch (e2) {
      if (e2 instanceof ApiError && e2.status === 403) {
        clearAdminToken();
        setErr('Password rejected. You have been signed out.');
      } else {
        setErr(e2 instanceof Error ? e2.message : 'Save failed');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-xl border border-bourbon/15 bg-white p-4 space-y-3">
        <h2 className="font-display text-xl text-bourbon">
          {kind === 'derby' ? 'Kentucky Derby' : 'Kentucky Oaks'} — race {mainRaceNumber}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-bourbon/70 font-semibold">
              Official at (ISO)
            </span>
            <input
              type="text"
              value={officialAt}
              onChange={(e) => setOfficialAt(e.target.value)}
              placeholder="2026-05-02T19:08:00-04:00"
              className="mt-1 w-full rounded border border-bourbon/30 bg-cream px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-red/50"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-bourbon/70 font-semibold">
              Notes
            </span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              className="mt-1 w-full rounded border border-bourbon/30 bg-cream px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-red/50"
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-bourbon/15 bg-white p-4">
        <header className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-bourbon">Finishers</h3>
          <button
            type="button"
            onClick={addSlot}
            className="text-xs px-2 py-1 rounded border border-bourbon/30 hover:bg-bourbon/10 transition"
          >
            + add slot
          </button>
        </header>

        <ol className="space-y-2">
          {slots.map((s, i) => (
            <li key={i} className="grid grid-cols-[40px_1fr_auto] items-center gap-2 sm:grid-cols-[40px_2fr_1fr_auto]">
              <span className="font-mono font-semibold text-rose-dark">#{s.position}</span>
              <input
                list="derby-horse-list"
                value={s.horse_name}
                onChange={(e) => updateSlot(i, { horse_name: e.target.value })}
                placeholder="Horse name"
                className="rounded border border-bourbon/30 bg-cream px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-red/50"
              />
              <input
                value={s.jockey}
                onChange={(e) => updateSlot(i, { jockey: e.target.value })}
                placeholder="Jockey (optional)"
                className="hidden sm:block rounded border border-bourbon/30 bg-cream px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-red/50"
              />
              <button
                type="button"
                onClick={() => removeSlot(i)}
                aria-label={`Remove slot ${s.position}`}
                className="text-bourbon/60 hover:text-rose-red px-2"
              >
                ×
              </button>
            </li>
          ))}
        </ol>

        <datalist id="derby-horse-list">
          {horseNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>

      {msg && <p className="text-sm text-mint-julep">{msg}</p>}
      {err && <p className="text-sm text-rose-dark">{err}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-rose-red px-4 py-1.5 text-sm font-semibold text-white hover:bg-rose-dark disabled:opacity-50 transition"
        >
          {saving ? 'Saving…' : 'Publish results'}
        </button>
        <button
          type="button"
          onClick={() => clearAdminToken()}
          className="text-xs text-bourbon/60 hover:text-rose-red"
        >
          Sign out admin
        </button>
      </div>
    </form>
  );
}
