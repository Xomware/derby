'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Countdown } from '@/components/Countdown';
import { LeaderboardTable } from '@/components/LeaderboardTable';
import { PickCard } from '@/components/PickCard';
import { useLeaderboard, useMe, usePicks } from '@/lib/hooks';

export default function Home() {
  const { picks, isLoading, error } = usePicks();
  const { leaderboard } = useLeaderboard();
  const { me } = useMe();
  const router = useRouter();

  const earliest = picks?.races.map((r) => r.race_post_time).sort()[0];

  return (
    <>
      <section className="pt-8 pb-6 flex flex-col items-center text-center">
        <Image
          src="/banner.png"
          alt="Sun God Derby"
          width={520}
          height={120}
          priority
          className="w-full max-w-lg h-auto"
        />
        <p className="mt-3 text-bourbon/80 max-w-xl">
          Tail Grant, fade Grant, or pass. Picks lock at post time. Leaderboard
          updates as the results roll in.
        </p>
        {earliest && (
          <div className="mt-5 inline-flex items-center gap-3 px-3 py-1.5 rounded-full border border-rose-red/20 bg-white">
            <Countdown target={earliest} label="First lock" />
          </div>
        )}
      </section>

      {error && (
        <div className="rounded border border-rose-red/40 bg-rose-red/10 p-3 text-sm text-rose-dark">
          Could not load picks. Try again in a moment.
        </div>
      )}
      {isLoading && (
        <div className="text-center text-bourbon/70 py-12">Loading picks…</div>
      )}

      {picks && picks.races.length === 0 && !isLoading && (
        <div className="text-center text-bourbon/70 py-12">
          No picks posted yet — Grant&apos;s working on them. Check back soon.
        </div>
      )}

      {picks && picks.races.length > 0 && (
        <div className="space-y-8">
          {picks.races.map((race) => (
            <section key={race.race_number}>
              <header className="flex items-baseline justify-between mb-3">
                <h2 className="font-display text-2xl text-rose-dark">
                  Race {race.race_number}
                </h2>
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
        </div>
      )}

      <section className="mt-12">
        <header className="flex items-baseline justify-between mb-3">
          <h2 className="font-display text-2xl text-rose-dark">Leaderboard</h2>
          <Link href="/leaderboard" className="text-xs text-rose-red hover:underline">
            View full
          </Link>
        </header>
        {leaderboard && (
          <LeaderboardTable
            rows={leaderboard.rows}
            highlightUsername={me?.username ?? null}
            limit={5}
          />
        )}
      </section>
    </>
  );
}
