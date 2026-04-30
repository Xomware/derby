'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Countdown } from '@/components/Countdown';
import { PickCard } from '@/components/PickCard';
import { GuestVoteGate } from '@/components/GuestVoteGate';
import { EventTabs } from '@/components/EventTabs';
import { SidePanel, SidePanelItem } from '@/components/SidePanel';
import { EVENT_DERBY, useMe, usePicks } from '@/lib/hooks';
import { useGuestName } from '@/lib/guest';

export default function PicksPage() {
  const [eventId, setEventId] = useState<string>(EVENT_DERBY);
  const { picks, isLoading, error } = usePicks(eventId);
  const { me } = useMe();
  const guestName = useGuestName();
  const router = useRouter();
  const [voteGateOpen, setVoteGateOpen] = useState(false);

  const earliest = picks?.races.map((r) => r.lock_time).sort()[0];

  const flatPicks = useMemo(
    () => (picks?.races ?? []).flatMap((r) => r.picks),
    [picks]
  );

  const tocItems: SidePanelItem[] = useMemo(
    () =>
      flatPicks.map((p) => ({
        id: `pick-${p.id}`,
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

  function handleRequireAuth() {
    if (guestName) {
      setVoteGateOpen(true);
    } else {
      router.push('/login');
    }
  }

  return (
    <>
      <div className="pt-8 lg:grid lg:grid-cols-[1fr_240px] lg:gap-6">
        <section className="space-y-6 min-w-0">
          <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl text-rose-dark">Picks</h1>
              <p className="text-bourbon/80 text-sm mt-1">
                Tail or fade Grant on each horse. Voting locks 5 minutes before post.
              </p>
            </div>
            {earliest && (
              <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full border border-rose-red/20 bg-white">
                <Countdown target={earliest} label="First lock" />
              </div>
            )}
          </header>

          <EventTabs active={eventId} onChange={setEventId} />

          {guestName && (
            <div className="rounded-lg border border-mint-julep/40 bg-mint-julep/10 px-4 py-2 text-sm text-bourbon">
              Browsing as <strong>{guestName}</strong> — picks aren&apos;t saved.{' '}
              <button
                onClick={() => router.push('/signup')}
                className="text-rose-red hover:underline"
              >
                Make an account
              </button>{' '}
              to vote.
            </div>
          )}

          {error && (
            <div className="rounded border border-rose-red/40 bg-rose-red/10 p-3 text-sm text-rose-dark">
              Could not load picks. Try again in a moment.
            </div>
          )}
          {isLoading && (
            <div className="text-center text-bourbon/70 py-12">Loading picks…</div>
          )}

          {picks && picks.races.length === 0 && !isLoading && (
            <div className="rounded-lg border border-bourbon/20 bg-white p-8 text-center text-bourbon/70">
              No picks posted yet for this race.
            </div>
          )}

          {picks &&
            picks.races.map((race) => (
              <section key={race.race_number}>
                <header className="flex items-baseline justify-between mb-3">
                  <h2 className="font-display text-2xl text-rose-dark">
                    {eventId === EVENT_DERBY ? 'Kentucky Derby' : 'Kentucky Oaks'}
                  </h2>
                  <Countdown target={race.lock_time} label="Lock" />
                </header>
                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                  {race.picks.map((p) => (
                    <PickCard
                      key={p.id}
                      pick={p}
                      isAuthed={!!me}
                      onRequireAuth={handleRequireAuth}
                      rationaleHref={`/rationale#horse-${p.id}`}
                    />
                  ))}
                </div>
              </section>
            ))}
        </section>

        <SidePanel title="Jump to" items={tocItems} />
      </div>

      <GuestVoteGate open={voteGateOpen} onClose={() => setVoteGateOpen(false)} />
    </>
  );
}
