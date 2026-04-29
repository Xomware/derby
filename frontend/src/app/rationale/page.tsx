'use client';

import { usePicks } from '@/lib/hooks';

export default function RationalePage() {
  const { picks, isLoading } = usePicks();

  return (
    <section className="pt-8 max-w-3xl mx-auto">
      <header className="mb-8">
        <p className="font-display italic text-mint-julep text-xs uppercase tracking-[0.3em]">
          Sun God has spoken
        </p>
        <h1 className="font-display text-3xl text-rose-dark mt-1">Rationale</h1>
        <p className="text-bourbon/80 text-sm mt-2">
          Grant&apos;s thinking on each race — pace, post position, jockey,
          training notes. Read it, then go vote on the Picks page.
        </p>
      </header>

      {isLoading && (
        <div className="text-center text-bourbon/70 py-12">Loading…</div>
      )}

      {picks && picks.races.length === 0 && !isLoading && (
        <div className="rounded-lg border border-bourbon/20 bg-white p-8 text-center text-bourbon/70">
          No rationale yet. Grant hasn&apos;t posted picks for this Derby.
        </div>
      )}

      <div className="space-y-10">
        {picks?.races.map((race) => (
          <section key={race.race_number}>
            <h2 className="font-display text-2xl text-bourbon border-b border-bourbon/20 pb-2 mb-4">
              Race {race.race_number}
            </h2>
            <div className="space-y-6">
              {race.picks.map((p) => (
                <article key={p.id}>
                  <header className="flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-xl text-rose-dark">
                      {p.horse_name}
                    </h3>
                    <span className="text-xs text-bourbon/70">
                      {p.post_position != null && <>Post {p.post_position} · </>}
                      {p.odds_at_pick ?? '—'}
                    </span>
                  </header>
                  <div className="text-xs text-bourbon/70 mt-0.5">
                    {p.jockey ?? 'Jockey TBD'}
                    {p.trainer && ` · ${p.trainer}`}
                  </div>
                  {p.writeup ? (
                    <p className="mt-3 text-ink/85 leading-relaxed whitespace-pre-line">
                      {p.writeup}
                    </p>
                  ) : (
                    <p className="mt-3 text-bourbon/60 italic text-sm">
                      No writeup yet.
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
