'use client';

import { useRouter } from 'next/navigation';
import { Countdown } from '@/components/Countdown';
import { PickCard } from '@/components/PickCard';
import { useMe, usePicks } from '@/lib/hooks';

export default function PicksPage() {
  const { picks, isLoading, error } = usePicks();
  const { me } = useMe();
  const router = useRouter();

  const earliest = picks?.races.map((r) => r.race_post_time).sort()[0];

  return (
    <section className="pt-8 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-rose-dark">Picks</h1>
          <p className="text-bourbon/80 text-sm mt-1">
            Tail Grant, fade Grant, or pass. Picks lock at race post time.
          </p>
        </div>
        {earliest && (
          <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full border border-rose-red/20 bg-white">
            <Countdown target={earliest} label="First lock" />
          </div>
        )}
      </header>

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
          No picks posted yet — Grant&apos;s working on them. Check back soon.
        </div>
      )}

      {picks &&
        picks.races.map((race) => (
          <section key={race.race_number}>
            <header className="flex items-baseline justify-between mb-3">
              <h2 className="font-display text-2xl text-rose-dark">Race {race.race_number}</h2>
              <Countdown target={race.race_post_time} label="Lock" />
            </header>
            <div className="grid sm:grid-cols-2 gap-4">
              {race.picks.map((p) => (
                <PickCard
                  key={p.id}
                  pick={p}
                  isAuthed={!!me}
                  onRequireAuth={() => router.push('/login')}
                />
              ))}
            </div>
          </section>
        ))}
    </section>
  );
}
