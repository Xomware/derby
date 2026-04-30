'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { clearAdminToken } from '@/lib/admin';
import { usePicks, type RaceKind } from '@/lib/hooks';
import { CURRENT_YEAR } from '@/lib/year';

export function AdminOddsForm({
  kind,
  adminToken,
}: {
  kind: RaceKind;
  adminToken: string;
}) {
  const { picks, refresh } = usePicks(kind, CURRENT_YEAR);
  const horses = useMemo(
    () =>
      [...(picks?.races ?? []).flatMap((r) => r.picks)].sort(
        (a, b) => (a.post_position ?? 99) - (b.post_position ?? 99)
      ),
    [picks]
  );

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const h of horses) next[h.id] = h.odds_at_pick ?? '';
    setDraft(next);
  }, [horses]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const odds = horses
        .filter((h) => (draft[h.id] ?? '') !== (h.odds_at_pick ?? ''))
        .map((h) => ({ pick_id: h.id, odds_at_pick: (draft[h.id] ?? '').trim() }));
      if (odds.length === 0) {
        setMsg('No changes to save.');
        return;
      }
      const res = await api.adminUpdateOdds({ admin_token: adminToken, odds });
      setMsg(`Updated ${res.updated} horse${res.updated === 1 ? '' : 's'}.`);
      await refresh();
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

  if (horses.length === 0) {
    return (
      <p className="text-sm text-bourbon/70">No horses loaded for {kind}.</p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="rounded-xl border border-bourbon/15 bg-white p-4">
        <header className="mb-3 flex items-baseline justify-between">
          <h3 className="font-display text-lg text-bourbon">Update odds</h3>
          <span className="text-xs text-bourbon/60">
            {horses.length} {horses.length === 1 ? 'horse' : 'horses'}
          </span>
        </header>
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
          {horses.map((h) => (
            <li
              key={h.id}
              className="flex items-center gap-2 text-sm border-b border-bourbon/10 py-1.5"
            >
              <span className="font-mono text-bourbon/60 w-8 shrink-0">
                {h.post_position ?? '?'}
              </span>
              <span className="flex-1 truncate">{h.horse_name}</span>
              <input
                value={draft[h.id] ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [h.id]: e.target.value }))
                }
                placeholder="5-1"
                className="w-20 rounded border border-bourbon/30 bg-cream px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-red/50"
              />
            </li>
          ))}
        </ol>
      </div>

      {msg && <p className="text-sm text-mint-julep">{msg}</p>}
      {err && <p className="text-sm text-rose-dark">{err}</p>}

      <div>
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-rose-red px-4 py-1.5 text-sm font-semibold text-white hover:bg-rose-dark disabled:opacity-50 transition"
        >
          {saving ? 'Saving…' : 'Save odds'}
        </button>
      </div>
    </form>
  );
}
