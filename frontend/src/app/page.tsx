'use client';

import Link from 'next/link';
import { Countdown } from '@/components/Countdown';
import { SunGodDisclaimer } from '@/components/SunGodDisclaimer';
import { usePicks } from '@/lib/hooks';
import { CURRENT_YEAR } from '@/lib/year';

const SECTIONS: { href: string; title: string; copy: string }[] = [
  {
    href: '/derby',
    title: 'Kentucky Derby',
    copy: "Grant's full breakdown on every Derby horse — stats, style, and his take.",
  },
  {
    href: '/oaks',
    title: 'Kentucky Oaks',
    copy: 'Same treatment for the Oaks field.',
  },
  {
    href: '/picks',
    title: 'Make your picks',
    copy: 'Lock in Win / Place / Show + a long shot for both races.',
  },
  {
    href: '/results',
    title: 'Live Results',
    copy: 'Win / Place / Show as each race goes official.',
  },
  {
    href: '/leaderboard',
    title: 'Leaderboard',
    copy: 'Pool standings — finish-order picks scored after the race.',
  },
];

export default function Home() {
  const { picks, year } = usePicks('derby');
  const earliest = picks?.races.map((r) => r.lock_time).sort()[0];
  const isArchive = year !== CURRENT_YEAR;

  return (
    <section className="pt-8 pb-12 flex flex-col items-center text-center">
      <SunGodDisclaimer />
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
        Grant&apos;s annual Derby pool. Read his full take on every horse,
        pick your finish order, and see how you rank.
      </p>
      {earliest && !isArchive && (
        <div className="mt-5 inline-flex items-center gap-3 px-3 py-1.5 rounded-full border border-rose-red/20 bg-white">
          <Countdown target={earliest} label="Derby lock" />
        </div>
      )}
      {isArchive && (
        <div className="mt-5 inline-flex items-center px-3 py-1.5 rounded-full border border-bourbon/30 bg-cream text-bourbon text-xs uppercase tracking-wider">
          Viewing {year} archive
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
