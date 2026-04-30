'use client';

import { useEffect, useMemo, useState } from 'react';
import { GrantPinned } from '@/components/GrantPinned';
import { PowerRankings } from '@/components/PowerRankings';
import { WriteupSection } from '@/components/WriteupSection';
import { useGrantPicks, useResults, type GrantArchiveHorse, type RaceKind } from '@/lib/hooks';
import { AVAILABLE_YEARS, type DerbyYear } from '@/lib/year';

const EVENTS: { id: RaceKind; label: string }[] = [
  { id: 'derby', label: 'Derby' },
  { id: 'oaks', label: 'Oaks' },
];

export default function ArchivePage() {
  const [year, setYear] = useState<DerbyYear>(AVAILABLE_YEARS[0]);
  const [kind, setKind] = useState<RaceKind>('derby');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const y = Number(params.get('year'));
    if ((AVAILABLE_YEARS as readonly number[]).includes(y)) setYear(y as DerbyYear);
    const e = params.get('event');
    if (e === 'oaks' || e === 'derby') setKind(e);
  }, []);

  function pushUrl(nextYear: DerbyYear, nextKind: RaceKind) {
    const url = new URL(window.location.href);
    url.searchParams.set('year', String(nextYear));
    url.searchParams.set('event', nextKind);
    window.history.replaceState(null, '', url.toString());
  }

  const { grantPicks } = useGrantPicks(kind, year);
  const { results } = useResults(year);

  const main = kind === 'derby' ? 12 : 11;
  const finishers =
    (results?.races ?? []).find((r) => r.day === kind && r.race_number === main)
      ?.finishers ?? [];

  const horses = useMemo<GrantArchiveHorse[]>(
    () => grantPicks?.horses ?? [],
    [grantPicks]
  );

  return (
    <section className="pt-8 max-w-3xl mx-auto space-y-6">
      <header className="border-b border-bourbon/15 pb-4">
        <p className="font-display italic text-mint-julep text-xs uppercase tracking-[0.3em]">
          Data archive
        </p>
        <h1 className="font-display text-3xl text-rose-dark mt-1">
          Grant&apos;s {year} {kind === 'derby' ? 'Derby' : 'Oaks'} writeup
        </h1>
        <p className="text-sm text-bourbon/70 mt-1">
          Long-form view of his original document. Toggle year + event below.
        </p>
      </header>

      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-xs uppercase tracking-wider text-bourbon/60 font-semibold">
          Year
        </label>
        <select
          value={year}
          onChange={(e) => {
            const y = Number(e.target.value) as DerbyYear;
            setYear(y);
            pushUrl(y, kind);
          }}
          className="rounded border border-bourbon/30 bg-cream px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rose-red/50"
        >
          {AVAILABLE_YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <nav className="flex gap-1 ml-auto" aria-label="Event">
          {EVENTS.map((t) => {
            const active = kind === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setKind(t.id);
                  pushUrl(year, t.id);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded border transition ${
                  active
                    ? 'bg-rose-red text-cream border-rose-red'
                    : 'border-bourbon/30 text-bourbon hover:border-rose-red'
                }`}
                aria-pressed={active}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {!grantPicks && (
        <p className="text-bourbon/70 text-sm">No archived writeup for this event.</p>
      )}

      {grantPicks && (
        <article className="space-y-6">
          <GrantPinned
            picks={grantPicks}
            kind={kind}
            year={year}
            isArchive
            finishers={finishers}
          />

          {grantPicks.analysis && (
            <WriteupSection title="Race outlook" body={grantPicks.analysis} />
          )}

          {grantPicks.horses && grantPicks.horses.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-display text-2xl text-rose-dark">The field</h2>
              <ol className="space-y-4">
                {horses.map((h, i) => (
                  <ArchiveHorseEntry key={`${i}-${h.horse_name}`} horse={h} />
                ))}
              </ol>
            </section>
          )}

          {grantPicks.power_rankings && grantPicks.power_rankings.length > 0 && (
            <PowerRankings tiers={grantPicks.power_rankings} />
          )}

          {grantPicks.betting_plays && (
            <WriteupSection
              title="Betting plays"
              body={grantPicks.betting_plays}
              tone="rose"
            />
          )}
        </article>
      )}
    </section>
  );
}

function ArchiveHorseEntry({ horse: h }: { horse: GrantArchiveHorse }) {
  const stats: { label: string; value: string }[] = [];
  if (h.odds_at_pick) stats.push({ label: 'Odds', value: h.odds_at_pick });
  if (h.record) stats.push({ label: 'Record', value: h.record });
  if (h.beyer) stats.push({ label: 'Beyer', value: h.beyer });
  if (h.brisnet) stats.push({ label: 'Brisnet', value: h.brisnet });
  if (h.equibase_rating) stats.push({ label: 'Equibase', value: h.equibase_rating });
  if (h.style) stats.push({ label: 'Style', value: h.style });
  if (h.last_race) stats.push({ label: 'Last race', value: h.last_race });

  const bullets = (h.writeup ?? '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <li className="rounded-xl border border-bourbon/15 bg-white p-4">
      <header>
        <div className="text-[11px] uppercase tracking-wider text-bourbon/60">
          {h.post_position != null && <>Post {h.post_position}</>}
        </div>
        <h3 className="font-display text-xl text-rose-dark leading-tight">
          {h.horse_name}
        </h3>
      </header>

      {stats.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-md border border-bourbon/15 bg-cream/40 px-2 py-1.5"
            >
              <dt className="text-[10px] uppercase tracking-wider text-bourbon/60 font-semibold">
                {s.label}
              </dt>
              <dd className="text-sm text-bourbon font-semibold mt-0.5">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {bullets.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-ink/85 leading-relaxed">
          {bullets.map((b, i) => (
            <li
              key={i}
              className="pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-rose-red"
            >
              {b}
            </li>
          ))}
        </ul>
      )}

      {h.final_take && (
        <div className="mt-3 rounded-md border-l-4 border-rose-red bg-rose-red/5 px-3 py-2 text-sm">
          <span className="text-[10px] uppercase tracking-wider text-rose-red font-semibold mr-2">
            Final take
          </span>
          {h.final_take}
        </div>
      )}
    </li>
  );
}
