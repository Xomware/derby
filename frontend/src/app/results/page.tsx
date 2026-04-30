'use client';

import { useMemo } from 'react';
import { useResults } from '@/lib/hooks';
import type { RaceResult } from '@/lib/types';

const POSITION_LABEL: Record<number, string> = {
  1: 'Win',
  2: 'Place',
  3: 'Show',
};

export default function ResultsPage() {
  const { results, isLoading, error } = useResults();

  const grouped = useMemo(() => {
    const races = results?.races ?? [];
    return {
      oaks: races.filter((r) => r.day === 'oaks'),
      derby: races.filter((r) => r.day === 'derby'),
    };
  }, [results]);

  return (
    <section className="pt-8 max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="font-display text-3xl text-rose-dark">Live Results</h1>
        <p className="text-bourbon/80 text-sm mt-1">
          Every race on the Oaks + Derby card. Win / Place / Show fills in as
          races go official. Auto-refreshes every minute.
        </p>
      </header>

      {error && (
        <div className="rounded border border-rose-red/40 bg-rose-red/10 p-3 text-sm text-rose-dark mb-4">
          Could not load results.
        </div>
      )}

      {isLoading && (
        <div className="text-center text-bourbon/70 py-12">Loading results…</div>
      )}

      <DaySection
        title="Friday — Oaks Day"
        date="May 1, 2026"
        races={grouped.oaks}
      />
      <DaySection
        title="Saturday — Derby Day"
        date="May 2, 2026"
        races={grouped.derby}
      />
    </section>
  );
}

function DaySection({
  title,
  date,
  races,
}: {
  title: string;
  date: string;
  races: RaceResult[];
}) {
  if (races.length === 0) return null;
  return (
    <section className="mb-10">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-2xl text-bourbon">{title}</h2>
        <span className="text-xs text-bourbon/70">{date}</span>
      </header>
      <div className="space-y-3">
        {races.map((r) => (
          <RaceRow key={`${r.day}-${r.race_number}`} race={r} />
        ))}
      </div>
    </section>
  );
}

function RaceRow({ race }: { race: RaceResult }) {
  const post = new Date(race.post_time);
  const isOfficial = race.finishers.length > 0;
  const isFeature = !!race.name;
  return (
    <article
      className={`rounded-xl border bg-white shadow-sm overflow-hidden ${
        isFeature ? 'border-rose-red/30' : 'border-bourbon/15'
      }`}
    >
      <header
        className={`px-4 py-2 flex items-baseline justify-between gap-2 ${
          isFeature ? 'bg-rose-red/10' : 'bg-cream/40'
        }`}
      >
        <div className="flex items-baseline gap-2">
          <span className="font-display text-lg text-rose-dark">
            Race {race.race_number}
          </span>
          {race.name && (
            <span className="text-xs uppercase tracking-wider font-semibold text-rose-dark">
              {race.name}
            </span>
          )}
        </div>
        <span className="text-xs text-bourbon/70 whitespace-nowrap">
          Post{' '}
          {post.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </span>
      </header>

      {isOfficial ? (
        <div className="divide-y divide-bourbon/10">
          {race.finishers.slice(0, 3).map((f) => (
            <div
              key={f.position}
              className="px-4 py-2 flex items-baseline gap-3"
            >
              <span className="text-[11px] uppercase tracking-wider text-bourbon/70 w-12 shrink-0">
                {POSITION_LABEL[f.position] ?? `${f.position}th`}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-bourbon font-semibold truncate">
                  {f.horse_name}
                </div>
                {f.jockey && (
                  <div className="text-[11px] text-bourbon/70">{f.jockey}</div>
                )}
              </div>
              {(f.win_payout || f.place_payout || f.show_payout) && (
                <div className="text-[11px] font-mono text-bourbon/80 text-right whitespace-nowrap">
                  {f.win_payout && <div>W ${f.win_payout}</div>}
                  {f.place_payout && <div>P ${f.place_payout}</div>}
                  {f.show_payout && <div>S ${f.show_payout}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-3 grid grid-cols-3 gap-2 text-xs">
          {[1, 2, 3].map((pos) => (
            <div
              key={pos}
              className="rounded border border-dashed border-bourbon/20 px-2 py-1.5 text-center text-bourbon/40"
            >
              <div className="text-[10px] uppercase tracking-wider">
                {POSITION_LABEL[pos]}
              </div>
              <div className="text-sm">—</div>
            </div>
          ))}
        </div>
      )}

      {race.notes && (
        <footer className="px-4 py-1.5 text-[11px] text-bourbon/70 bg-cream/40 border-t border-bourbon/10">
          {race.notes}
        </footer>
      )}
    </article>
  );
}
