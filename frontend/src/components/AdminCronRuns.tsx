'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';

export function AdminCronRuns({ adminToken }: { adminToken: string }) {
  const { data, error, isLoading, mutate } = useSWR(
    ['admin-cron-runs', adminToken],
    () => api.adminCronRuns({ admin_token: adminToken, type: 'odds_cron', limit: 50 }),
    { refreshInterval: 60_000 }
  );

  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function runCron() {
    if (running) return;
    setRunning(true);
    setStatus('Triggering…');
    try {
      const resp = await api.adminRunCron({ admin_token: adminToken });
      if (resp.function_error) {
        setStatus(`Cron returned error: ${resp.function_error}`);
      } else {
        setStatus('Cron finished — refreshing history.');
      }
      await mutate();
    } catch (e) {
      setStatus(`Failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunning(false);
      setTimeout(() => setStatus(null), 6_000);
    }
  }

  return (
    <section className="rounded-xl border border-bourbon/15 bg-white p-4">
      <header className="mb-3 flex items-baseline justify-between gap-2 flex-wrap">
        <h3 className="font-display text-lg text-bourbon">Cron history — odds scraper</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-bourbon/60">
            last {data?.rows.length ?? 0} run(s)
          </span>
          <button
            type="button"
            onClick={runCron}
            disabled={running}
            className="text-xs px-2.5 py-1 rounded border border-rose-red/40 text-rose-dark bg-rose-red/5 hover:bg-rose-red/10 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {running ? 'Running…' : 'Run cron now'}
          </button>
        </div>
      </header>

      {status && (
        <p className="text-xs text-bourbon/80 mb-2" aria-live="polite">
          {status}
        </p>
      )}

      {isLoading && <p className="text-bourbon/70 text-sm">Loading…</p>}
      {error && <p className="text-rose-dark text-sm">Failed to load.</p>}

      {data && data.rows.length === 0 && (
        <p className="text-bourbon/70 text-sm">No runs yet.</p>
      )}

      {data && data.rows.length > 0 && (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left uppercase tracking-wider text-bourbon/60 border-b border-bourbon/15">
                <th className="py-2 px-2 sm:pl-0 pl-4">When</th>
                <th className="py-2 px-2">Derby</th>
                <th className="py-2 px-2">Oaks</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => {
                const derby = (r.summary.derby ?? {}) as CronStat;
                const oaks = (r.summary.oaks ?? {}) as CronStat;
                return (
                  <tr key={r.id} className="border-b border-bourbon/10 align-top">
                    <td className="py-2 px-2 sm:pl-0 pl-4 whitespace-nowrap font-mono text-[11px]">
                      {formatTs(r.ran_at)}
                    </td>
                    <td className="py-2 px-2">{describe(derby)}</td>
                    <td className="py-2 px-2">{describe(oaks)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

interface CronStat {
  field_size?: number;
  feed_size?: number;
  matched?: number;
  scratched_seen?: number;
  newly_added?: number;
  newly_scratched?: number;
  unscratched?: number;
  writeups_refreshed?: number;
  odds_updated?: number;
  meta_updated?: number;
  skipped?: string;
}

function describe(s: CronStat): string {
  if (s.skipped) return `skip: ${s.skipped}`;
  const parts: string[] = [];
  if (typeof s.matched === 'number') {
    parts.push(`${s.matched}/${s.field_size ?? 0} matched`);
  }
  if (s.odds_updated) parts.push(`${s.odds_updated} odds`);
  if (s.meta_updated) parts.push(`${s.meta_updated} meta`);
  if (s.newly_scratched) parts.push(`+${s.newly_scratched} scratched`);
  if (s.unscratched) parts.push(`-${s.unscratched} unscratched`);
  if (s.newly_added) parts.push(`+${s.newly_added} added`);
  if (s.writeups_refreshed) parts.push(`${s.writeups_refreshed} writeups`);
  return parts.length ? parts.join(' · ') : '—';
}

function formatTs(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
