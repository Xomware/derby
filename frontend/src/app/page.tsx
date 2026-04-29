'use client';

import Link from 'next/link';
import { Countdown } from '@/components/Countdown';
import { usePicks } from '@/lib/hooks';

const SECTIONS: { href: string; title: string; copy: string }[] = [
  {
    href: '/picks',
    title: 'Picks',
    copy: 'See Grant’s picks for every race. Tail him, fade him, or pass.',
  },
  {
    href: '/rationale',
    title: 'Rationale',
    copy: 'The thinking. Pace, post position, jockey, training notes — race by race.',
  },
  {
    href: '/results',
    title: 'Live Results',
    copy: 'Finishers + payouts updated as the day unfolds.',
  },
  {
    href: '/leaderboard',
    title: 'Leaderboard',
    copy: 'Who’s outsmarting Grant. +1 for every correct tail or fade.',
  },
];

export default function Home() {
  const { picks } = usePicks();
  const earliest = picks?.races.map((r) => r.race_post_time).sort()[0];

  return (
    <section className="pt-8 pb-12 flex flex-col items-center text-center">
      <video
        src="/sungod.mp4"
        poster="/sungod-poster.jpg"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden
        className="w-full max-w-xs sm:max-w-sm rounded-xl border border-rose-red/15 shadow-sm bg-cream"
      />
      <p className="mt-6 text-bourbon/80 max-w-xl">
        Grant&apos;s annual Derby pool. Pick a side on every horse he likes,
        then watch the leaderboard sort itself out as the races run.
      </p>
      {earliest && (
        <div className="mt-5 inline-flex items-center gap-3 px-3 py-1.5 rounded-full border border-rose-red/20 bg-white">
          <Countdown target={earliest} label="First lock" />
        </div>
      )}

      <div className="mt-12 grid gap-4 sm:grid-cols-2 w-full max-w-3xl text-left">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-xl border border-rose-red/15 bg-white p-5 hover:border-rose-red transition shadow-sm"
          >
            <h2 className="font-display text-xl text-rose-dark">{s.title}</h2>
            <p className="text-sm text-bourbon/80 mt-1.5 leading-relaxed">{s.copy}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
