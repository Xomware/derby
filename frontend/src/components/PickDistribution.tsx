'use client';

import { useState } from 'react';

const SLOTS: { key: 'win' | 'place' | 'show' | 'long_shot'; label: string }[] = [
  { key: 'win', label: 'Win' },
  { key: 'place', label: 'Place' },
  { key: 'show', label: 'Show' },
  { key: 'long_shot', label: 'Long shot' },
];

export interface SlotEntry {
  /** horse_name → list of usernames who picked them in this slot */
  voters: Record<string, string[]>;
  total: number;
}

export type DistributionData = Record<'win' | 'place' | 'show' | 'long_shot', SlotEntry>;

export function PickDistribution({ data }: { data: DistributionData }) {
  return (
    <section className="space-y-4">
      <header>
        <h2 className="font-display text-2xl text-bourbon">Pool distribution</h2>
        <p className="text-xs text-bourbon/70 mt-0.5">
          Share of pool entries per horse, by slot. Click a bar to see who
          picked it.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SLOTS.map((s) => (
          <SlotChart key={s.key} title={s.label} entry={data[s.key]} />
        ))}
      </div>
    </section>
  );
}

function SlotChart({ title, entry }: { title: string; entry: SlotEntry }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = Object.entries(entry.voters)
    .map(([name, voters]) => ({ name, count: voters.length, voters }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const total = entry.total || 1;

  return (
    <article className="rounded-xl border border-bourbon/15 bg-white p-3">
      <header className="flex items-baseline justify-between mb-2">
        <h3 className="text-[11px] uppercase tracking-wider text-rose-dark font-semibold">
          {title}
        </h3>
        <span className="text-[11px] text-bourbon/60">
          {entry.total} {entry.total === 1 ? 'pick' : 'picks'}
        </span>
      </header>

      {rows.length === 0 ? (
        <p className="text-xs text-bourbon/50">No picks yet.</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((r) => {
            const pct = (r.count / total) * 100;
            const isOpen = expanded === r.name;
            return (
              <li key={r.name}>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : r.name)}
                  className="w-full text-left group"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-baseline gap-2 text-xs mb-0.5">
                    <span className="font-semibold text-bourbon truncate">
                      {r.name}
                    </span>
                    <span className="ml-auto tabular-nums text-bourbon/70">
                      {r.count} · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="relative h-2 rounded bg-bourbon/10 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-rose-red/70 group-hover:bg-rose-red transition"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
                {isOpen && (
                  <ul className="mt-1.5 pl-3 text-[11px] text-bourbon/80 space-y-0.5">
                    {r.voters.map((v) => (
                      <li key={v} className="truncate">{v}</li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
