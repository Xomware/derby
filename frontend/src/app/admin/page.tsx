'use client';

import { FormEvent, useState } from 'react';
import useSWR from 'swr';
import { api, ApiError, AdminPickInput, AdminRaceResultInput } from '@/lib/api';
import { useMe, usePicks } from '@/lib/hooks';
import type { Pick, RaceFinisher, ResultValue } from '@/lib/types';

const RESULTS: ResultValue[] = [
  'pending',
  'won',
  'placed',
  'showed',
  'finished',
  'scratched',
];

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(local: string) {
  return new Date(local).toISOString();
}

export default function AdminPage() {
  const { me, isLoading: meLoading } = useMe();
  const { picks, refresh } = usePicks();

  if (meLoading) return <p className="pt-12 text-center">Loading…</p>;
  if (!me) {
    return (
      <p className="pt-12 text-center">
        <a href="/login" className="text-rose-red underline">
          Sign in
        </a>{' '}
        as an admin.
      </p>
    );
  }
  if (!me.is_admin) {
    return <p className="pt-12 text-center">Admin only.</p>;
  }

  return (
    <section className="pt-8 space-y-10">
      <h1 className="font-display text-3xl text-rose-dark">Admin</h1>
      <PollPanel />
      <VisitsPanel />
      <UsersPanel />
      <PicksPanel onChanged={refresh} picks={picks?.races.flatMap((r) => r.picks) ?? []} />
      <RaceResultsPanel />
    </section>
  );
}

function PollPanel() {
  const { data, mutate, isLoading } = useSWR(
    'poll-status',
    () => api.adminPollStatus(),
    { refreshInterval: 15_000 }
  );
  const [busy, setBusy] = useState(false);

  async function pollNow() {
    setBusy(true);
    try {
      await api.adminPollNow();
      await mutate();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-bourbon/20 bg-white p-4">
      <h2 className="font-display text-xl text-rose-dark mb-2">Polling</h2>
      {isLoading || !data ? (
        <p className="text-sm text-bourbon/70">Loading…</p>
      ) : (
        <dl className="text-sm grid sm:grid-cols-2 gap-x-6 gap-y-1">
          <dt>Enabled</dt>
          <dd>{data.poll_enabled ? 'yes' : 'no'}</dd>
          <dt>Last run</dt>
          <dd>{data.last_ran_at ?? '—'}</dd>
          <dt>Last source</dt>
          <dd>{data.last_source ?? '—'}</dd>
          <dt>Picks updated</dt>
          <dd>{data.last_picks_updated ?? 0}</dd>
          <dt>Errors</dt>
          <dd className="text-rose-dark">{data.last_errors ?? 'none'}</dd>
          <dt>Next run</dt>
          <dd>{data.next_run_at ?? '—'}</dd>
        </dl>
      )}
      <button
        onClick={pollNow}
        disabled={busy}
        className="mt-3 text-sm bg-bourbon text-cream rounded px-3 py-1.5 hover:opacity-90 disabled:opacity-60"
      >
        {busy ? 'Polling…' : 'Poll now'}
      </button>
    </section>
  );
}

function UsersPanel() {
  const { data } = useSWR('admin-users', () => api.adminUsers(), {
    refreshInterval: 30_000,
  });
  return (
    <section className="rounded-lg border border-bourbon/20 bg-white p-4">
      <h2 className="font-display text-xl text-rose-dark mb-2">
        Signups {data ? `(${data.length})` : ''}
      </h2>
      {!data ? (
        <p className="text-sm text-bourbon/70">Loading…</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-bourbon/70">No signups yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-bourbon/70 border-b border-bourbon/20">
              <th className="py-1.5 pr-2">Username</th>
              <th className="py-1.5 pr-2">Email</th>
              <th className="py-1.5 pr-2">Joined</th>
              <th className="py-1.5 pr-2 text-right">Votes</th>
              <th className="py-1.5 pl-2">Admin</th>
            </tr>
          </thead>
          <tbody>
            {data.map((u) => (
              <tr key={u.id} className="border-b border-bourbon/10">
                <td className="py-1.5 pr-2">@{u.username}</td>
                <td className="py-1.5 pr-2 text-bourbon/80">{u.email}</td>
                <td className="py-1.5 pr-2">
                  {new Date(u.created_at).toLocaleString()}
                </td>
                <td className="py-1.5 pr-2 text-right">{u.vote_count}</td>
                <td className="py-1.5 pl-2">{u.is_admin ? 'yes' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function emptyForm(): AdminPickInput {
  return {
    race_number: 1,
    race_post_time: '',
    horse_name: '',
    post_position: null,
    jockey: null,
    trainer: null,
    odds_at_pick: null,
    confidence: 3,
    writeup: null,
    display_order: 0,
  };
}

function PicksPanel({
  picks,
  onChanged,
}: {
  picks: Pick[];
  onChanged: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AdminPickInput>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function startNew() {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
  }

  function startEdit(p: Pick) {
    setEditingId(p.id);
    setForm({
      race_number: p.race_number,
      race_post_time: toLocalInput(p.race_post_time),
      horse_name: p.horse_name,
      post_position: p.post_position,
      jockey: p.jockey,
      trainer: p.trainer,
      odds_at_pick: p.odds_at_pick,
      confidence: p.confidence,
      writeup: p.writeup,
      display_order: p.display_order,
    });
    setError(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload: AdminPickInput = {
        ...form,
        race_post_time: form.race_post_time.includes('T')
          ? fromLocalInput(form.race_post_time)
          : form.race_post_time,
      };
      if (editingId) {
        await api.adminUpdatePick(editingId, payload);
      } else {
        await api.adminCreatePick(payload);
      }
      onChanged();
      startNew();
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError('Save failed.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this pick?')) return;
    await api.adminDeletePick(id);
    onChanged();
    if (editingId === id) startNew();
  }

  async function setResult(id: string, result: ResultValue) {
    await api.adminSetResult(id, result);
    onChanged();
  }

  return (
    <section className="rounded-lg border border-bourbon/20 bg-white p-4">
      <header className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl text-rose-dark">Picks</h2>
        <button
          onClick={startNew}
          className="text-xs bg-rose-red text-cream rounded px-3 py-1.5 hover:bg-rose-dark"
        >
          + New pick
        </button>
      </header>

      <form
        onSubmit={submit}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6"
      >
        <label className="block text-sm">
          Race #
          <input
            type="number"
            min={1}
            max={20}
            required
            value={form.race_number}
            onChange={(e) =>
              setForm({ ...form, race_number: Number(e.target.value) })
            }
            className="mt-1 w-full rounded border border-bourbon/30 px-2 py-1.5 bg-white"
          />
        </label>
        <label className="block text-sm">
          Race post time (your TZ){' '}
          {form.race_post_time && (
            <span className="text-xs text-bourbon/60">
              → locks at{' '}
              {new Date(
                form.race_post_time.includes('T') &&
                !form.race_post_time.endsWith('Z')
                  ? form.race_post_time
                  : form.race_post_time
              ).toLocaleString()}
            </span>
          )}
          <input
            type="datetime-local"
            required
            value={form.race_post_time}
            onChange={(e) =>
              setForm({ ...form, race_post_time: e.target.value })
            }
            className="mt-1 w-full rounded border border-bourbon/30 px-2 py-1.5 bg-white"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          Horse
          <input
            required
            value={form.horse_name}
            onChange={(e) => setForm({ ...form, horse_name: e.target.value })}
            className="mt-1 w-full rounded border border-bourbon/30 px-2 py-1.5 bg-white"
          />
        </label>
        <label className="block text-sm">
          Post position
          <input
            type="number"
            value={form.post_position ?? ''}
            onChange={(e) =>
              setForm({
                ...form,
                post_position: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="mt-1 w-full rounded border border-bourbon/30 px-2 py-1.5 bg-white"
          />
        </label>
        <label className="block text-sm">
          Odds at pick
          <input
            value={form.odds_at_pick ?? ''}
            onChange={(e) =>
              setForm({ ...form, odds_at_pick: e.target.value || null })
            }
            placeholder="5/2"
            className="mt-1 w-full rounded border border-bourbon/30 px-2 py-1.5 bg-white"
          />
        </label>
        <label className="block text-sm">
          Jockey
          <input
            value={form.jockey ?? ''}
            onChange={(e) =>
              setForm({ ...form, jockey: e.target.value || null })
            }
            className="mt-1 w-full rounded border border-bourbon/30 px-2 py-1.5 bg-white"
          />
        </label>
        <label className="block text-sm">
          Trainer
          <input
            value={form.trainer ?? ''}
            onChange={(e) =>
              setForm({ ...form, trainer: e.target.value || null })
            }
            className="mt-1 w-full rounded border border-bourbon/30 px-2 py-1.5 bg-white"
          />
        </label>
        <label className="block text-sm">
          Confidence (1–5)
          <input
            type="number"
            min={1}
            max={5}
            value={form.confidence ?? 3}
            onChange={(e) =>
              setForm({ ...form, confidence: Number(e.target.value) })
            }
            className="mt-1 w-full rounded border border-bourbon/30 px-2 py-1.5 bg-white"
          />
        </label>
        <label className="block text-sm">
          Display order
          <input
            type="number"
            value={form.display_order ?? 0}
            onChange={(e) =>
              setForm({ ...form, display_order: Number(e.target.value) })
            }
            className="mt-1 w-full rounded border border-bourbon/30 px-2 py-1.5 bg-white"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          Writeup
          <textarea
            rows={3}
            value={form.writeup ?? ''}
            onChange={(e) =>
              setForm({ ...form, writeup: e.target.value || null })
            }
            className="mt-1 w-full rounded border border-bourbon/30 px-2 py-1.5 bg-white"
          />
        </label>
        {error && (
          <p className="sm:col-span-2 text-sm text-rose-dark bg-rose-red/10 rounded px-3 py-2">
            {error}
          </p>
        )}
        <div className="sm:col-span-2 flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="bg-rose-red text-cream rounded px-4 py-1.5 text-sm hover:bg-rose-dark disabled:opacity-60"
          >
            {editingId ? 'Save changes' : 'Create pick'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={startNew}
              className="border border-bourbon/30 rounded px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-bourbon/70 border-b border-bourbon/20">
            <th className="py-1.5 pr-2">R#</th>
            <th className="py-1.5 pr-2">Horse</th>
            <th className="py-1.5 pr-2">Post time</th>
            <th className="py-1.5 pr-2">Result</th>
            <th className="py-1.5 pl-2"></th>
          </tr>
        </thead>
        <tbody>
          {picks.map((p) => (
            <tr key={p.id} className="border-b border-bourbon/10 align-top">
              <td className="py-1.5 pr-2">{p.race_number}</td>
              <td className="py-1.5 pr-2">{p.horse_name}</td>
              <td className="py-1.5 pr-2 text-bourbon/80">
                {new Date(p.race_post_time).toLocaleString()}
              </td>
              <td className="py-1.5 pr-2">
                <select
                  value={p.result}
                  onChange={(e) =>
                    setResult(p.id, e.target.value as ResultValue)
                  }
                  className="rounded border border-bourbon/30 px-1 py-0.5 bg-white"
                >
                  {RESULTS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-1.5 pl-2 text-right">
                <button
                  onClick={() => startEdit(p)}
                  className="text-rose-red hover:underline mr-3"
                >
                  edit
                </button>
                <button
                  onClick={() => remove(p.id)}
                  className="text-bourbon/70 hover:text-rose-dark"
                >
                  delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Visits dashboard
// ---------------------------------------------------------------------------

function VisitsPanel() {
  const [days, setDays] = useState(7);
  const { data, isLoading, mutate } = useSWR(
    ['admin-visits', days],
    () => api.adminVisitsStats(days),
    { refreshInterval: 30_000 }
  );

  return (
    <section className="rounded-lg border border-bourbon/20 bg-white p-4">
      <header className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl text-rose-dark">Visits</h2>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-bourbon/70 text-xs">Window</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded border border-bourbon/30 px-2 py-1 bg-white text-sm"
          >
            <option value={1}>Today</option>
            <option value={3}>Last 3 days</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <button
            onClick={() => mutate()}
            className="text-xs text-bourbon/70 hover:text-rose-red"
          >
            Refresh
          </button>
        </div>
      </header>

      {isLoading || !data ? (
        <p className="text-sm text-bourbon/70">Loading…</p>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-3 mb-5">
            <Stat label="Total visits" value={data.total_visits} />
            <Stat label="Unique visitors" value={data.unique_visitors} />
            <Stat label="Days tracked" value={data.by_day.length} />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <SimpleList
              title="Top pages"
              rows={data.top_pages.map((r) => ({ left: r.page, right: r.count }))}
            />
            <SimpleList
              title="Top users"
              rows={data.top_users.map((r) => ({ left: `@${r.username}`, right: r.count }))}
            />
            <SimpleList
              title="By day"
              rows={data.by_day.map((r) => ({ left: r.day, right: r.count }))}
            />
            <div>
              <h3 className="text-xs uppercase tracking-wider text-bourbon/70 mb-2">
                Recent
              </h3>
              {data.recent.length === 0 ? (
                <p className="text-sm text-bourbon/60">No visits yet.</p>
              ) : (
                <ul className="text-xs space-y-1 max-h-64 overflow-auto pr-1">
                  {data.recent.slice(0, 50).map((v, i) => (
                    <li key={i} className="flex justify-between gap-2 border-b border-bourbon/10 pb-1">
                      <span className="text-bourbon/80 truncate">
                        @{v.username} <span className="text-bourbon/60">{v.page}</span>
                      </span>
                      <time className="text-bourbon/50 whitespace-nowrap">
                        {new Date(v.ts).toLocaleString()}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-bourbon/15 bg-cream/50 px-3 py-2">
      <div className="text-xs uppercase tracking-wider text-bourbon/70">{label}</div>
      <div className="text-2xl font-semibold text-rose-dark">{value}</div>
    </div>
  );
}

function SimpleList({
  title,
  rows,
}: {
  title: string;
  rows: { left: string; right: number }[];
}) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wider text-bourbon/70 mb-2">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-bourbon/60">—</p>
      ) : (
        <ul className="text-sm space-y-1">
          {rows.map((r, i) => (
            <li key={i} className="flex justify-between border-b border-bourbon/10 pb-1">
              <span className="text-bourbon/80 truncate pr-2">{r.left}</span>
              <span className="font-mono text-bourbon">{r.right}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Race results manual entry
// ---------------------------------------------------------------------------

interface FinisherDraft {
  position: number;
  horse_name: string;
  jockey: string;
  win_payout: string;
  place_payout: string;
  show_payout: string;
}

function emptyFinishers(): FinisherDraft[] {
  return [1, 2, 3].map((pos) => ({
    position: pos,
    horse_name: '',
    jockey: '',
    win_payout: '',
    place_payout: '',
    show_payout: '',
  }));
}

function fromExisting(finishers: RaceFinisher[]): FinisherDraft[] {
  const drafts = emptyFinishers();
  finishers.forEach((f) => {
    const slot = drafts.find((d) => d.position === f.position);
    if (slot) {
      slot.horse_name = f.horse_name;
      slot.jockey = f.jockey ?? '';
      slot.win_payout = f.win_payout ?? '';
      slot.place_payout = f.place_payout ?? '';
      slot.show_payout = f.show_payout ?? '';
    }
  });
  return drafts;
}

function RaceResultsPanel() {
  const { data, isLoading, mutate } = useSWR('admin-results', () => api.results(), {
    refreshInterval: 30_000,
  });
  const [raceNumber, setRaceNumber] = useState(12);
  const [finishers, setFinishers] = useState<FinisherDraft[]>(emptyFinishers());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function loadRace(n: number) {
    setRaceNumber(n);
    const existing = data?.races.find((r) => r.race_number === n);
    setFinishers(existing ? fromExisting(existing.finishers) : emptyFinishers());
    setNotes(existing?.notes ?? '');
    setError(null);
  }

  function updateFinisher(idx: number, field: keyof FinisherDraft, value: string) {
    setFinishers((f) =>
      f.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const cleaned = finishers
      .filter((f) => f.horse_name.trim())
      .map((f) => ({
        position: f.position,
        horse_name: f.horse_name.trim(),
        jockey: f.jockey.trim() || null,
        win_payout: f.win_payout.trim() || null,
        place_payout: f.place_payout.trim() || null,
        show_payout: f.show_payout.trim() || null,
      }));

    if (!cleaned.length) {
      setError('At least one finisher (with horse name) is required.');
      return;
    }

    const payload: AdminRaceResultInput = {
      race_number: raceNumber,
      finishers: cleaned,
      notes: notes.trim() || null,
    };

    setBusy(true);
    try {
      await api.adminSetRaceResult(payload);
      await mutate();
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-bourbon/20 bg-white p-4">
      <header className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-display text-xl text-rose-dark">Race results</h2>
          <p className="text-xs text-bourbon/70 mt-0.5">
            Manual entry — overrides any cron-scraped data for this race.
          </p>
        </div>
      </header>

      <form onSubmit={submit} className="space-y-4 mb-6 border-b border-bourbon/15 pb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm text-bourbon">
            Race #
            <input
              type="number"
              min={1}
              max={20}
              required
              value={raceNumber}
              onChange={(e) => loadRace(Number(e.target.value))}
              className="ml-2 w-20 rounded border border-bourbon/30 px-2 py-1.5 bg-white"
            />
          </label>
          {data?.races.find((r) => r.race_number === raceNumber) && (
            <span className="text-xs text-mint-julep">
              Existing entry loaded — saving will overwrite.
            </span>
          )}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-bourbon/70 border-b border-bourbon/20">
              <th className="py-1.5 pr-2 w-12">Pos</th>
              <th className="py-1.5 pr-2">Horse</th>
              <th className="py-1.5 pr-2">Jockey</th>
              <th className="py-1.5 px-1 w-20">Win $</th>
              <th className="py-1.5 px-1 w-20">Place $</th>
              <th className="py-1.5 pl-1 w-20">Show $</th>
            </tr>
          </thead>
          <tbody>
            {finishers.map((row, idx) => (
              <tr key={row.position} className="border-b border-bourbon/10 align-top">
                <td className="py-1.5 pr-2 font-semibold text-bourbon">{row.position}</td>
                <td className="py-1.5 pr-2">
                  <input
                    value={row.horse_name}
                    onChange={(e) => updateFinisher(idx, 'horse_name', e.target.value)}
                    className="w-full rounded border border-bourbon/30 px-2 py-1 bg-white"
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    value={row.jockey}
                    onChange={(e) => updateFinisher(idx, 'jockey', e.target.value)}
                    className="w-full rounded border border-bourbon/30 px-2 py-1 bg-white"
                  />
                </td>
                <td className="py-1.5 px-1">
                  <input
                    inputMode="decimal"
                    value={row.win_payout}
                    onChange={(e) => updateFinisher(idx, 'win_payout', e.target.value)}
                    className="w-full rounded border border-bourbon/30 px-2 py-1 bg-white"
                  />
                </td>
                <td className="py-1.5 px-1">
                  <input
                    inputMode="decimal"
                    value={row.place_payout}
                    onChange={(e) => updateFinisher(idx, 'place_payout', e.target.value)}
                    className="w-full rounded border border-bourbon/30 px-2 py-1 bg-white"
                  />
                </td>
                <td className="py-1.5 pl-1">
                  <input
                    inputMode="decimal"
                    value={row.show_payout}
                    onChange={(e) => updateFinisher(idx, 'show_payout', e.target.value)}
                    className="w-full rounded border border-bourbon/30 px-2 py-1 bg-white"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <label className="block text-sm">
          Notes
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional — DQ, photo, scratch, etc."
            className="mt-1 w-full rounded border border-bourbon/30 px-2 py-1.5 bg-white"
          />
        </label>

        {error && (
          <p className="text-sm text-rose-dark bg-rose-red/10 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="bg-rose-red text-cream rounded px-4 py-1.5 text-sm hover:bg-rose-dark disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save race results'}
          </button>
          <button
            type="button"
            onClick={() => loadRace(raceNumber)}
            className="border border-bourbon/30 rounded px-3 py-1.5 text-sm"
          >
            Reset
          </button>
        </div>
      </form>

      <h3 className="text-xs uppercase tracking-wider text-bourbon/70 mb-2">
        Saved results
      </h3>
      {isLoading || !data ? (
        <p className="text-sm text-bourbon/60">Loading…</p>
      ) : data.races.length === 0 ? (
        <p className="text-sm text-bourbon/60">None yet.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {data.races.map((r) => (
            <li
              key={r.race_number}
              className="flex justify-between items-center border-b border-bourbon/10 py-1"
            >
              <span>
                <span className="font-semibold mr-2">Race {r.race_number}</span>
                <span className="text-bourbon/70">
                  {r.finishers.map((f) => f.horse_name).join(' / ') || '—'}
                </span>
              </span>
              <button
                onClick={() => loadRace(r.race_number)}
                className="text-xs text-rose-red hover:underline"
              >
                edit
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
