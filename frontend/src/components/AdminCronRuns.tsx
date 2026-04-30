'use client';

import useSWR from 'swr';
import { api } from '@/lib/api';

export function AdminCronRuns({ adminToken }: { adminToken: string }) {
  const { data, error, isLoading } = useSWR(
    ['admin-cron-runs', adminToken],
    () => api.adminCronRuns({ admin_token: adminToken, type: 'odds_cron', limit: 50 }),
    { refreshInterval: 60_000 }
  );

  return (
    <section className="rounded-xl border border-bourbon/15 bg-white p-4">
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="font-display text-lg text-bourbon">Cron history — odds scraper</h3>
        <span className="text-xs text-bourbon/60">
          last {data?.rows.length ?? 0} run(s)
        </span>
      </header>

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
                const derby = r.summary.derby ?? {};
                const oaks = r.summary.oaks ?? {};
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

function describe(s: { field_size?: number; matched?: number; updated?: number; skipped?: string }): string {
  if (s.skipped) return `skip: ${s.skipped}`;
  if (typeof s.matched === 'number' || typeof s.updated === 'number') {
    return `${s.matched ?? 0}/${s.field_size ?? 0} matched · ${s.updated ?? 0} updated`;
  }
  return '—';
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
