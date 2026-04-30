'use client';

import { useState } from 'react';
import { EventTabs } from '@/components/EventTabs';
import { EVENT_DERBY, usePicks } from '@/lib/hooks';

export default function RationalePage() {
  const [eventId, setEventId] = useState<string>(EVENT_DERBY);
  const { picks, isLoading } = usePicks(eventId);

  return (
    <section className="pt-8 max-w-3xl mx-auto">
      <header className="mb-6">
        <p className="font-display italic text-mint-julep text-xs uppercase tracking-[0.3em]">
          Sun God has spoken
        </p>
        <h1 className="font-display text-3xl text-rose-dark mt-1">Rationale</h1>
        <p className="text-bourbon/80 text-sm mt-2">
          Grant&apos;s thinking on each horse — pace, post, jockey, training
          notes, final take. Read it, then go vote on the Picks page.
        </p>
      </header>

      <div className="mb-6">
        <EventTabs active={eventId} onChange={setEventId} />
      </div>

      {isLoading && (
        <div className="text-center text-bourbon/70 py-12">Loading…</div>
      )}

      {picks && picks.races.length === 0 && !isLoading && (
        <div className="rounded-lg border border-bourbon/20 bg-white p-8 text-center text-bourbon/70">
          No rationale yet for this race.
        </div>
      )}

      <div className="space-y-10">
        {picks?.races.map((race) => (
          <section key={race.race_number}>
            <h2 className="font-display text-2xl text-bourbon border-b border-bourbon/20 pb-2 mb-4">
              {eventId === EVENT_DERBY ? 'Kentucky Derby' : 'Kentucky Oaks'} ·{' '}
              <span className="text-bourbon/70 text-base font-normal">
                {race.picks.length} horses
              </span>
            </h2>
            <div className="space-y-8">
              {race.picks.map((p) => (
                <article key={p.id} className="rounded-lg border border-bourbon/15 bg-white p-5 shadow-sm">
                  <header className="flex items-baseline justify-between gap-3 flex-wrap">
                    <h3 className="font-display text-xl text-rose-dark">
                      {p.horse_name}
                    </h3>
                    <span className="text-xs text-bourbon/70">
                      {p.post_position != null && <>Post {p.post_position} · </>}
                      {p.odds_at_pick ?? '—'}
                      {' · '}
                      <span aria-hidden className="text-rose-red">
                        {'★'.repeat(p.confidence)}
                        <span className="text-rose-red/30">{'★'.repeat(5 - p.confidence)}</span>
                      </span>
                    </span>
                  </header>
                  {(p.jockey || p.trainer) && (
                    <div className="text-xs text-bourbon/70 mt-0.5">
                      {p.jockey ?? 'Jockey TBD'}
                      {p.trainer && ` · ${p.trainer}`}
                    </div>
                  )}
                  {p.writeup ? (
                    <div className="mt-3 text-ink/85 text-sm leading-relaxed whitespace-pre-line">
                      {p.writeup}
                    </div>
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
