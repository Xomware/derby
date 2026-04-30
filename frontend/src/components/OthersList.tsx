'use client';

import type { Prediction } from '@/lib/api';

export function OthersList({
  others,
  othersCount,
  locked,
}: {
  others: Prediction[];
  othersCount: number;
  locked: boolean;
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
                  <td className="py-2 px-2">{p.win}</td>
                  <td className="py-2 px-2">{p.place}</td>
                  <td className="py-2 px-2">{p.show}</td>
                  <td className="py-2 pl-2 sm:pr-0 pr-4">{p.long_shot}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
