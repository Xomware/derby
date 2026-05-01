'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { clearAdminToken } from '@/lib/admin';
import { usePicks, type RaceKind } from '@/lib/hooks';
import { CURRENT_YEAR } from '@/lib/year';

type StatKey =
  | 'record'
  | 'beyer'
  | 'brisnet'
  | 'equibase_rating'
  | 'style'
  | 'last_race';

interface StatField {
  key: StatKey;
  label: string;
  placeholder: string;
  width: 'sm' | 'md' | 'lg';
  derbyOnly?: boolean;
  oaksOnly?: boolean;
}

const FIELDS: StatField[] = [
  { key: 'record', label: 'Record', placeholder: '5: 2-2-1', width: 'sm' },
  { key: 'beyer', label: 'Beyer', placeholder: '98', width: 'sm', derbyOnly: true },
  { key: 'brisnet', label: 'Brisnet', placeholder: '97', width: 'sm', derbyOnly: true },
  { key: 'equibase_rating', label: 'Equibase', placeholder: '110', width: 'sm', oaksOnly: true },
  { key: 'style', label: 'Style', placeholder: 'Stalker', width: 'md' },
  { key: 'last_race', label: 'Last race', placeholder: 'Won Arkansas Derby', width: 'lg' },
];

function widthClass(w: StatField['width']): string {
  return w === 'sm' ? 'w-20' : w === 'md' ? 'w-32' : 'flex-1 min-w-[12rem]';
}

type Draft = Record<string, Record<StatKey, string>>;

export function AdminPicksStatsForm({
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

  const visibleFields = useMemo(
    () =>
      FIELDS.filter((f) => {
        if (f.derbyOnly && kind !== 'derby') return false;
        if (f.oaksOnly && kind !== 'oaks') return false;
        return true;
      }),
    [kind]
  );

  const [draft, setDraft] = useState<Draft>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const next: Draft = {};
    for (const h of horses) {
      next[h.id] = {
        record: h.record ?? '',
        beyer: h.beyer ?? '',
        brisnet: h.brisnet ?? '',
        equibase_rating: h.equibase_rating ?? '',
        style: h.style ?? '',
        last_race: h.last_race ?? '',
      };
    }
    setDraft(next);
  }, [horses]);

  function set(pickId: string, key: StatKey, value: string) {
    setDraft((d) => ({
      ...d,
      [pickId]: { ...(d[pickId] ?? {} as Record<StatKey, string>), [key]: value },
    }));
  }

  function originalValue(h: (typeof horses)[number], key: StatKey): string {
    const map: Record<StatKey, string | null | undefined> = {
      record: h.record,
      beyer: h.beyer,
      brisnet: h.brisnet,
      equibase_rating: h.equibase_rating,
      style: h.style,
      last_race: h.last_race,
    };
    return map[key] ?? '';
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const payload = horses
        .map((h) => {
          const row = draft[h.id] ?? ({} as Record<StatKey, string>);
          const changes: Record<string, string | null> = {};
          for (const f of visibleFields) {
            const next = (row[f.key] ?? '').trim();
            const prev = originalValue(h, f.key);
            if (next === prev) continue;
            changes[f.key] = next === '' ? null : next;
          }
          return { pick_id: h.id, ...changes };
        })
        .filter((row) => Object.keys(row).length > 1);
      if (payload.length === 0) {
        setMsg('No changes to save.');
        return;
      }
      const res = await api.adminUpdatePickStats({
        admin_token: adminToken,
        picks: payload,
      });
      setMsg(`Updated ${res.updated} horse${res.updated === 1 ? '' : 's'}.`);
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
      setTimeout(() => setMsg(null), 4_000);
    }
  }

  if (!horses.length) {
    return <p className="text-bourbon/70 text-sm">No horses for this event yet.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-xs text-bourbon/70">
        Edit per-horse stats. Blank field clears the value (UI shows N/A).
      </p>

      <div className="space-y-3">
        {horses.map((h) => (
          <fieldset
            key={h.id}
            className={`rounded-lg border p-3 ${
              h.scratched
                ? 'border-rose-red/30 bg-rose-red/5 opacity-70'
                : 'border-bourbon/15 bg-white'
            }`}
          >
            <legend className="px-2 text-sm">
              <span className="font-mono text-bourbon/60">
                {h.post_position ?? '?'}
              </span>{' '}
              <span className="font-semibold text-bourbon">{h.horse_name}</span>
              {h.scratched && (
                <span className="ml-2 text-[10px] uppercase tracking-wider text-rose-red font-bold">
                  Scratched
                </span>
              )}
            </legend>
            <div className="flex flex-wrap gap-2">
              {visibleFields.map((f) => (
                <label key={f.key} className="block text-xs">
                  <span className="text-[10px] uppercase tracking-wider text-bourbon/60 font-semibold">
                    {f.label}
                  </span>
                  <input
                    type="text"
                    value={(draft[h.id] ?? ({} as Record<StatKey, string>))[f.key] ?? ''}
                    onChange={(e) => set(h.id, f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className={`mt-0.5 block ${widthClass(f.width)} rounded border border-bourbon/30 bg-cream px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-rose-red/40 focus:border-rose-red`}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="flex items-center gap-2 sticky bottom-0 bg-cream/95 py-2 -mx-4 px-4 border-t border-bourbon/15">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-rose-red px-4 py-1.5 text-sm font-semibold text-white hover:bg-rose-dark disabled:opacity-50 transition"
        >
          {saving ? 'Saving…' : 'Save stats'}
        </button>
        {msg && <span className="text-xs text-mint-julep">{msg}</span>}
        {err && <span className="text-xs text-rose-dark">{err}</span>}
      </div>
    </form>
  );
}
