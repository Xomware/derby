'use client';

import type { Prediction } from '@/lib/api';
import { computeStamp, type Slot } from '@/lib/stamps';
import type { RaceFinisher } from '@/lib/types';
import { StampBadge } from './StampBadge';

const SLOTS: { key: Slot; col: 'win' | 'place' | 'show' | 'long_shot' }[] = [
  { key: 'win', col: 'win' },
  { key: 'place', col: 'place' },
  { key: 'show', col: 'show' },
  { key: 'long_shot', col: 'long_shot' },
];

function Cell({
  value,
  slot,
  finishers,
}: {
  value: string;
  slot: Slot;
  finishers: RaceFinisher[];
}) {
  const stamp = finishers.length > 0 ? computeStamp(value, slot, finishers) : null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{value}</span>
      {stamp && <StampBadge stamp={stamp} />}
    </span>
  );
}

export function OthersList({
  others,
  othersCount,
  locked,
  finishers,
}: {
  others: Prediction[];
  othersCount: number;
  locked: boolean;
  finishers: RaceFinisher[];
}) {
  return (
    <section className="rounded-xl border border-bourbon/15 bg-white p-4">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-xl text-bourbon">
          Everyone else&apos;s picks
        </h2>
        <span className="text-xs text-bourbon/60">
          {othersCount} entered
        </span>
      </header>

      {!locked && (
        <p className="text-sm text-bourbon/70">
          Hidden until the race is off. {othersCount} {othersCount === 1 ? 'person has' : 'people have'} locked in.
        </p>
      )}

      {locked && others.length === 0 && (
        <p className="text-sm text-bourbon/70">No other entries.</p>
      )}

      {locked && others.length > 0 && (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-bourbon/70 border-b border-bourbon/20">
                <th className="py-2 pr-2 sm:pl-0 pl-4">User</th>
                <th className="py-2 px-2">Win</th>
                <th className="py-2 px-2">Place</th>
                <th className="py-2 px-2">Show</th>
                <th className="py-2 pl-2 sm:pr-0 pr-4">Long shot</th>
              </tr>
            </thead>
            <tbody>
              {others.map((p) => (
                <tr key={p.username} className="border-b border-bourbon/10 align-top">
                  <td className="py-2 pr-2 sm:pl-0 pl-4 font-semibold">@{p.username}</td>
                  {SLOTS.map((s) => (
                    <td key={s.key} className="py-2 px-2">
                      <Cell value={p[s.col]} slot={s.key} finishers={finishers} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
