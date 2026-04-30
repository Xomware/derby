'use client';

import { useMemo, useState } from 'react';
import { EventTabs } from '@/components/EventTabs';
import { SidePanel, SidePanelItem } from '@/components/SidePanel';
import { EVENT_DERBY, usePicks } from '@/lib/hooks';
import type { Pick } from '@/lib/types';

export default function RationalePage() {
  const [eventId, setEventId] = useState<string>(EVENT_DERBY);
  const { picks, isLoading } = usePicks(eventId);

  const flatPicks = useMemo(
    () => (picks?.races ?? []).flatMap((r) => r.picks),
    [picks]
  );

  const tocItems: SidePanelItem[] = useMemo(
    () =>
      flatPicks.map((p) => ({
        id: `horse-${p.id}`,
        label: p.horse_name,
        meta: [
          p.post_position != null ? `Post ${p.post_position}` : null,
          p.odds_at_pick,
          '★'.repeat(p.confidence) + '☆'.repeat(5 - p.confidence),
        ]
          .filter(Boolean)
          .join(' · '),
      })),
    [flatPicks]
  );

  return (
    <div className="pt-8 lg:grid lg:grid-cols-[1fr_240px] lg:gap-6">
      <section className="space-y-6 min-w-0 max-w-3xl">
        <header>
          <p className="font-display italic text-mint-julep text-xs uppercase tracking-[0.3em]">
            Sun God has spoken
          </p>
          <h1 className="font-display text-3xl text-rose-dark mt-1">Rationale</h1>
          <p className="text-bourbon/80 text-sm mt-2">
            Grant&apos;s thinking on each horse — pace, post, jockey, training,
            final take. Read it, then go vote on Picks.
          </p>
        </header>

        <EventTabs active={eventId} onChange={setEventId} />

        {isLoading && (
          <div className="text-center text-bourbon/70 py-12">Loading…</div>
        )}

        {picks && picks.races.length === 0 && !isLoading && (
          <div className="rounded-lg border border-bourbon/20 bg-white p-8 text-center text-bourbon/70">
            No rationale yet for this race.
          </div>
        )}

        <div className="space-y-6">
          {flatPicks.map((p) => (
            <RationaleCard key={p.id} pick={p} />
          ))}
        </div>
      </section>

      <SidePanel title="Jump to" items={tocItems} />
    </div>
  );
}

function RationaleCard({ pick: p }: { pick: Pick }) {
  const stats: { label: string; value: string }[] = [];
  if (p.record) stats.push({ label: 'Record', value: p.record });
  if (p.beyer) stats.push({ label: 'Beyer', value: p.beyer });
  if (p.brisnet) stats.push({ label: 'Brisnet', value: p.brisnet });
  if (p.equibase_rating) stats.push({ label: 'Equibase', value: p.equibase_rating });
  if (p.style) stats.push({ label: 'Style', value: p.style });
  if (p.last_race) stats.push({ label: 'Last race', value: p.last_race });

  return (
    <article
      id={`horse-${p.id}`}
      className="scroll-mt-24 rounded-xl border border-bourbon/15 bg-white p-5 shadow-sm"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-2xl text-rose-dark">{p.horse_name}</h3>
        <div className="text-xs text-bourbon/70">
          {p.post_position != null && <>Post {p.post_position} · </>}
          {p.odds_at_pick ?? '—'}
          {' · '}
          <span aria-hidden className="text-rose-red">
            {'★'.repeat(p.confidence)}
            <span className="text-rose-red/30">{'★'.repeat(5 - p.confidence)}</span>
          </span>
        </div>
      </header>
      {(p.jockey || p.trainer) && (
        <div className="text-xs text-bourbon/70 mt-0.5">
          {p.jockey ?? 'Jockey TBD'}
          {p.trainer && ` · ${p.trainer}`}
        </div>
      )}

      {stats.length > 0 && (
        <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-md border border-bourbon/15 bg-cream/40 px-3 py-2"
            >
              <dt className="text-[10px] uppercase tracking-wider text-bourbon/60 font-semibold">
                {s.label}
              </dt>
              <dd className="text-sm text-bourbon font-semibold mt-0.5">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {p.writeup && (
        <div className="mt-4 text-sm text-ink/85 leading-relaxed whitespace-pre-line">
          {p.writeup}
        </div>
      )}

      {p.final_take && (
        <div className="mt-4 rounded-md border-l-4 border-rose-red bg-rose-red/5 px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-rose-red font-semibold mb-1">
            Final take
          </div>
          <div className="text-sm text-ink/90 leading-relaxed">{p.final_take}</div>
        </div>
      )}
    </article>
  );
}
