'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';

const PAGE_SIZE = 100;

export function AdminVisits({ adminToken }: { adminToken: string }) {
  const [userFilter, setUserFilter] = useState<string>('');
  const [pageFilter, setPageFilter] = useState<string>('');
  const [limit, setLimit] = useState<number>(PAGE_SIZE);

  const { data, error, isLoading } = useSWR(
    ['admin-visits', adminToken, userFilter, pageFilter, limit],
    () =>
      api.adminVisits({
        admin_token: adminToken,
        days: 14,
        limit,
        filter_user: userFilter || null,
        filter_page: pageFilter || null,
      }),
    { refreshInterval: 60_000 }
  );

  const filterActive = !!(userFilter || pageFilter);

  return (
    <section className="space-y-4">
      <header>
        <h3 className="font-display text-lg text-bourbon">Page views — last 14 days</h3>
      </header>

      {isLoading && <p className="text-bourbon/70 text-sm">Loading…</p>}
      {error && <p className="text-rose-dark text-sm">Failed to load.</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat label="Total visits" value={data.total_visits.toLocaleString()} />
            <Stat label="Unique visitors" value={data.unique_visitors.toLocaleString()} />
            {filterActive && (
              <Stat
                label="Filtered hits"
                value={data.filtered_count.toLocaleString()}
              />
            )}
          </div>

          <section className="rounded-xl border border-bourbon/15 bg-white p-3 space-y-2">
            <h4 className="font-semibold text-bourbon text-sm">Filters</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
              <label className="text-xs">
                <span className="text-[10px] uppercase tracking-wider text-bourbon/60 font-semibold">
                  User
                </span>
                <select
                  value={userFilter}
                  onChange={(e) => {
                    setUserFilter(e.target.value);
                    setLimit(PAGE_SIZE);
                  }}
                  className="mt-1 w-full rounded border border-bourbon/30 bg-cream px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-red/50"
                >
                  <option value="">All users</option>
                  {data.top_users.map((u) => (
                    <option key={u.username} value={u.username}>
                      @{u.username} ({u.count})
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                <span className="text-[10px] uppercase tracking-wider text-bourbon/60 font-semibold">
                  Page
                </span>
                <select
                  value={pageFilter}
                  onChange={(e) => {
                    setPageFilter(e.target.value);
                    setLimit(PAGE_SIZE);
                  }}
                  className="mt-1 w-full rounded border border-bourbon/30 bg-cream px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-red/50"
                >
                  <option value="">All pages</option>
                  {data.top_pages.map((p) => (
                    <option key={p.page} value={p.page}>
                      {p.page} ({p.count})
                    </option>
                  ))}
                </select>
              </label>
              {filterActive && (
                <button
                  type="button"
                  onClick={() => {
                    setUserFilter('');
                    setPageFilter('');
                    setLimit(PAGE_SIZE);
                  }}
                  className="text-xs px-3 py-1.5 rounded border border-bourbon/30 text-bourbon hover:bg-bourbon/10"
                >
                  Clear filters
                </button>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-bourbon/15 bg-white p-4">
            <h4 className="font-semibold text-bourbon text-sm mb-2">By user — most recent first</h4>
            {data.user_breakdown.length === 0 ? (
              <p className="text-bourbon/60 text-xs">No visitors yet.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {[...data.user_breakdown]
                  .sort((a, b) => (b.last_seen ?? '').localeCompare(a.last_seen ?? ''))
                  .map((u) => (
                  <li
                    key={u.username}
                    className="flex items-baseline gap-2 border-b border-bourbon/10 pb-1.5 last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setUserFilter(u.username);
                        setLimit(PAGE_SIZE);
                      }}
                      className="font-semibold text-bourbon hover:text-rose-red"
                    >
                      @{u.username}
                    </button>
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
              {data.top_pages.slice(0, 25).map((p) => (
                <li key={p.page} className="flex items-baseline gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPageFilter(p.page);
                      setLimit(PAGE_SIZE);
                    }}
                    className="font-mono text-xs text-bourbon hover:text-rose-red"
                  >
                    {p.page}
                  </button>
                  <span className="ml-auto tabular-nums text-bourbon/70">{p.count}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-bourbon/15 bg-white p-4">
            <h4 className="font-semibold text-bourbon text-sm mb-2">
              Recent visits
              {filterActive && (
                <span className="ml-2 text-[11px] font-normal text-bourbon/60">
                  filtered ({data.filtered_count} match{data.filtered_count === 1 ? '' : 'es'})
                </span>
              )}
            </h4>

            {data.recent.length === 0 ? (
              <p className="text-bourbon/60 text-xs">No matches.</p>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left uppercase tracking-wider text-bourbon/60 border-b border-bourbon/15">
                      <th className="py-1 px-2">When</th>
                      <th className="py-1 px-2">User</th>
                      <th className="py-1 px-2">Page</th>
                      <th className="py-1 px-2">IP</th>
                      <th className="py-1 px-2">Device</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((v, i) => (
                      <tr key={i} className="border-b border-bourbon/10 align-top">
                        <td className="py-1 px-2 whitespace-nowrap text-bourbon/70 font-mono">
                          {formatTs(v.ts)}
                        </td>
                        <td className="py-1 px-2 font-semibold text-bourbon">
                          @{v.username ?? '?'}
                        </td>
                        <td className="py-1 px-2 font-mono text-bourbon/80 truncate max-w-[180px]">
                          {v.page}
                        </td>
                        <td className="py-1 px-2 font-mono text-bourbon/70 tabular-nums">
                          {v.ip ?? '—'}
                        </td>
                        <td
                          className="py-1 px-2 text-bourbon/70 truncate max-w-[260px]"
                          title={v.user_agent ?? undefined}
                        >
                          {summarizeUA(v.user_agent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {data.recent.length === limit && data.filtered_count > limit && (
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={() => setLimit((n) => n + PAGE_SIZE)}
                  className="text-xs px-3 py-1.5 rounded border border-bourbon/30 text-bourbon hover:bg-bourbon/10"
                >
                  Load more (showing {data.recent.length} of {data.filtered_count})
                </button>
              </div>
            )}
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

function summarizeUA(ua: string | null): string {
  if (!ua) return '—';
  // Pull the OS + browser hints out of the UA without dragging in a parser.
  const os = ua.match(/iPhone|iPad|Android|Mac OS X|Windows NT \d+|Linux|CrOS/);
  const browser = ua.match(/Chrome\/\d+|Firefox\/\d+|Safari\/\d+|Edge\/\d+/);
  const parts = [os?.[0], browser?.[0]].filter(Boolean);
  return parts.length ? parts.join(' · ') : ua.slice(0, 40);
}
