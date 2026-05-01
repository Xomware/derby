'use client';

import { HorseLink } from './HorseLink';
import type { PowerRankingTier, RaceKind } from '@/lib/hooks';

const TIER_TONE = [
  'border-rose-red/40 bg-rose-red/5',
  'border-mint-julep/40 bg-mint-julep/5',
  'border-bourbon/30 bg-bourbon/5',
  'border-bourbon/15 bg-cream/40',
  'border-bourbon/10 bg-cream/40',
];

export function PowerRankings({
  tiers,
  kind,
}: {
  tiers: PowerRankingTier[];
  kind: RaceKind;
}) {
  if (!tiers || tiers.length === 0) return null;
  return (
    <section className="rounded-xl border border-bourbon/15 bg-white p-4 space-y-3">
      <header>
        <h2 className="font-display text-xl text-bourbon">Power rankings</h2>
        <p className="text-xs text-bourbon/70 mt-0.5">Grant&apos;s tier list, top to bottom.</p>
      </header>
      <ul className="space-y-3">
        {tiers.map((t, i) => (
          <li key={t.tier} className={`rounded-md border-l-4 px-3 py-2 ${TIER_TONE[i] ?? TIER_TONE[TIER_TONE.length - 1]}`}>
            <div className="text-[11px] uppercase tracking-wider font-bold text-rose-dark mb-1.5">
              {t.tier}
            </div>
            <ul className="space-y-1 text-sm">
              {t.horses.map((h) => (
                <li key={h.name}>
                  <HorseLink
                    name={h.name}
                    kind={kind}
                    className="font-semibold text-bourbon underline underline-offset-2 decoration-bourbon/30 hover:decoration-rose-red hover:text-rose-red transition-colors"
                  />
                  {h.note && <span className="text-bourbon/70"> — {h.note}</span>}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
