'use client';

import { useResults } from '@/lib/hooks';
import type { RaceResult } from '@/lib/types';

const POSITION_LABEL: Record<number, string> = {
  1: 'Win',
  2: 'Place',
  3: 'Show',
};

export default function ResultsPage() {
  const { results, isLoading, error } = useResults();

  return (
    <section className="pt-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl text-rose-dark">Live Results</h1>
        <p className="text-bourbon/80 text-sm mt-1">
          Finishers + payouts as races go official. Auto-refreshes every minute.
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

      {results && results.races.length === 0 && !isLoading && (
        <div className="rounded-lg border border-bourbon/20 bg-white p-8 text-center text-bourbon/70">
          No race results yet. They&apos;ll show up here as the day unfolds.
        </div>
      )}

      <div className="space-y-6">
        {results?.races.map((race) => (
          <RaceCard key={race.race_number} race={race} />
        ))}
      </div>
    </section>
  );
}

function RaceCard({ race }: { race: RaceResult }) {
  return (
    <article className="rounded-xl border border-rose-red/15 bg-white shadow-sm overflow-hidden">
      <header className="px-5 py-3 bg-cream/60 border-b border-bourbon/15 flex items-baseline justify-between">
        <h2 className="font-display text-xl text-rose-dark">Race {race.race_number}</h2>
        {race.official_at && (
          <span className="text-xs text-bourbon/70">
            Official: {new Date(race.official_at).toLocaleString()}
          </span>
        )}
      </header>
      <div className="divide-y divide-bourbon/10">
        {race.finishers.map((f) => (
          <div key={f.position} className="px-5 py-3 flex items-baseline gap-4">
            <span className="text-xs uppercase tracking-wider text-bourbon/70 w-14">
              {POSITION_LABEL[f.position] ?? `${f.position}th`}
            </span>
            <div className="flex-1">
              <div className="font-display text-lg text-bourbon leading-tight">
                {f.horse_name}
              </div>
              {f.jockey && (
                <div className="text-xs text-bourbon/70">{f.jockey}</div>
              )}
            </div>
            {f.position <= 3 && (f.win_payout || f.place_payout || f.show_payout) && (
              <div className="text-right text-xs font-mono text-bourbon/80">
                {f.win_payout && <div>W ${f.win_payout}</div>}
                {f.place_payout && <div>P ${f.place_payout}</div>}
                {f.show_payout && <div>S ${f.show_payout}</div>}
              </div>
            )}
          </div>
        ))}
      </div>
      {race.notes && (
        <footer className="px-5 py-2 text-xs text-bourbon/70 bg-cream/40 border-t border-bourbon/10">
          {race.notes}
        </footer>
      )}
    </article>
  );
}
