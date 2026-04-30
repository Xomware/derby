'use client';

import useSWR from 'swr';
import { api } from '@/lib/api';

export function AdminVisits({ adminToken }: { adminToken: string }) {
  const { data, error, isLoading } = useSWR(
    ['admin-visits', adminToken],
    () => api.adminVisits({ admin_token: adminToken, days: 14, limit: 50 }),
    { refreshInterval: 60_000 }
  );

  return (
    <section className="space-y-4">
      <header>
        <h3 className="font-display text-lg text-bourbon">Page views — last 14 days</h3>
      </header>

      {isLoading && <p className="text-bourbon/70 text-sm">Loading…</p>}
      {error && <p className="text-rose-dark text-sm">Failed to load.</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Total visits" value={data.total_visits.toLocaleString()} />
            <Stat label="Unique visitors" value={data.unique_visitors.toLocaleString()} />
          </div>

          <section className="rounded-xl border border-bourbon/15 bg-white p-4">
            <h4 className="font-semibold text-bourbon text-sm mb-2">By user</h4>
            {data.user_breakdown.length === 0 ? (
              <p className="text-bourbon/60 text-xs">No visitors yet.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {data.user_breakdown.map((u) => (
                  <li
                    key={u.username}
                    className="flex items-baseline gap-2 border-b border-bourbon/10 pb-1.5 last:border-b-0"
                  >
                    <span className="font-semibold text-bourbon">@{u.username}</span>
                    <span className="text-bourbon/60 text-xs">
                      {u.last_seen ? `last seen ${formatTs(u.last_seen)}` : ''}
                    </span>
                    <span className="ml-auto tabular-nums font-bold text-rose-dark">
                      {u.total}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-bourbon/15 bg-white p-4">
            <h4 className="font-semibold text-bourbon text-sm mb-2">Top pages</h4>
            <ul className="space-y-1 text-sm">
              {data.top_pages.map((p) => (
                <li key={p.page} className="flex items-baseline gap-2">
                  <span className="font-mono text-xs text-bourbon">{p.page}</span>
                  <span className="ml-auto tabular-nums text-bourbon/70">{p.count}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-bourbon/15 bg-white p-4">
            <h4 className="font-semibold text-bourbon text-sm mb-2">Recent visits</h4>
            <ul className="space-y-1 text-xs">
              {data.recent.slice(0, 30).map((v, i) => (
                <li key={i} className="flex items-baseline gap-2 border-b border-bourbon/10 pb-1 last:border-b-0">
                  <span className="font-semibold text-bourbon">@{v.username ?? '?'}</span>
                  <span className="font-mono text-bourbon/70">{v.page}</span>
                  <span className="ml-auto text-bourbon/50 tabular-nums">{formatTs(v.ts)}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-bourbon/15 bg-white px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-bourbon/60 font-semibold">
        {label}
      </div>
      <div className="font-display text-2xl text-rose-dark mt-0.5 tabular-nums">{value}</div>
    </div>
  );
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
