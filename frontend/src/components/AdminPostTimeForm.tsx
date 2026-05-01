'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { clearAdminToken } from '@/lib/admin';
import { usePicks, type RaceKind } from '@/lib/hooks';
import { CURRENT_YEAR } from '@/lib/year';

/**
 * Convert an ISO string with offset (e.g. 2026-05-02T18:57:00-04:00) to
 * the value format expected by `<input type="datetime-local">`, which is
 * the wall-clock time in *that ISO's* timezone, no offset suffix.
 */
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  // Strip seconds and offset for the input.
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return m ? `${m[1]}T${m[2]}` : '';
}

/**
 * Re-attach the original offset (we assume the same offset stays in effect
 * — Eastern Time during Derby week).
 */
function localInputToIso(local: string, originalIso: string | null): string {
  const offsetMatch = originalIso?.match(/([+-]\d{2}:\d{2}|Z)$/);
  const offset = offsetMatch ? offsetMatch[1] : '-04:00';
  return `${local}:00${offset}`;
}

export function AdminPostTimeForm({
  kind,
  adminToken,
}: {
  kind: RaceKind;
  adminToken: string;
}) {
  const { picks, refresh } = usePicks(kind, CURRENT_YEAR);
  const eventId = `${CURRENT_YEAR}-kentucky-${kind}`;
  const mainRaceNumber = kind === 'derby' ? 12 : 11;
  const currentIso =
    picks?.races.find((r) => r.race_number === mainRaceNumber)?.race_post_time ?? null;

  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setDraft(isoToLocalInput(currentIso));
  }, [currentIso]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const newIso = localInputToIso(draft, currentIso);
      if (newIso === currentIso) {
        setMsg('No change.');
        return;
      }
      const res = await api.adminUpdatePostTime({
        admin_token: adminToken,
        event_id: eventId,
        race_post_time: newIso,
      });
      setMsg(`Bumped ${res.updated}/${res.total} picks to ${newIso}.`);
      refresh();
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        clearAdminToken();
        setErr('Bad admin token — re-enter.');
      } else {
        setErr(e instanceof ApiError ? e.detail : 'Could not save.');
      }
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 6_000);
    }
  }

  if (!picks) {
    return <p className="text-bourbon/70 text-sm">Loading…</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-bourbon/15 bg-white p-4">
      <header>
        <h3 className="font-display text-lg text-bourbon">
          {kind === 'derby' ? 'Derby' : 'Oaks'} post time
        </h3>
        <p className="text-xs text-bourbon/70 mt-0.5">
          Use only for weather delays / official changes. Updates every pick row
          for this event. Lock time = post time − 5 min (auto).
        </p>
      </header>

      <div className="text-xs text-bourbon/70">
        Current: <span className="font-mono">{currentIso ?? '—'}</span>
      </div>

      <label className="block text-sm">
        <span className="text-[10px] uppercase tracking-wider text-bourbon/60 font-semibold">
          New post time (Eastern)
        </span>
        <input
          type="datetime-local"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="mt-0.5 w-full sm:w-auto rounded border border-bourbon/30 bg-cream px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-red/40 focus:border-rose-red"
        />
      </label>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving || !draft}
          className="rounded bg-rose-red px-4 py-1.5 text-sm font-semibold text-white hover:bg-rose-dark disabled:opacity-50 transition"
        >
          {saving ? 'Saving…' : 'Update post time'}
        </button>
        {msg && <span className="text-xs text-mint-julep">{msg}</span>}
        {err && <span className="text-xs text-rose-dark">{err}</span>}
      </div>
    </form>
  );
}
