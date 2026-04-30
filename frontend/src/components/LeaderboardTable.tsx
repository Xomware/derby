'use client';

import type { LeaderboardRow } from '@/lib/types';

interface Props {
  rows: LeaderboardRow[];
  highlightUsername?: string | null;
  /** Show '?' instead of horse names when picks are still hidden. */
  hidePicks: boolean;
  /** Show per-slot score columns once race is official. */
  showScores: boolean;
  /** horse_name (lowercase) → odds string. */
  oddsByHorse?: Map<string, string>;
  /** Set of normalized horse_names that have been scratched. */
  scratchedHorses?: Set<string>;
}

function isScratched(name: string | null, scratched?: Set<string>): boolean {
  if (!name || !scratched) return false;
  return scratched.has(name.trim().toLowerCase());
}

function ScratchedTag() {
  return (
    <span
      title="Scratched — pick won't score"
      className="ml-1 inline-flex items-center px-1 rounded bg-rose-red/15 text-rose-red text-[9px] uppercase tracking-wider font-bold align-middle"
    >
      ⚠ scratched
    </span>
  );
}

const SLOTS: { key: 'win' | 'place' | 'show' | 'long_shot'; label: string; short: string }[] = [
  { key: 'win', label: 'Win', short: 'W' },
  { key: 'place', label: 'Place', short: 'P' },
  { key: 'show', label: 'Show', short: 'S' },
  { key: 'long_shot', label: 'Long shot', short: 'LS' },
];

function pickKey(s: 'win' | 'place' | 'show' | 'long_shot'): keyof LeaderboardRow {
  return `${s}_pick` as keyof LeaderboardRow;
}

function scoreKey(s: 'win' | 'place' | 'show' | 'long_shot'): keyof LeaderboardRow {
  return `${s}_score` as keyof LeaderboardRow;
}

function lookupOdds(name: string | null, odds?: Map<string, string>): string | null {
  if (!name || !odds) return null;
  return odds.get(name.trim().toLowerCase()) ?? null;
}

function pickDisplay(
  pick: string | null,
  visible: boolean
): { primary: string; visible: boolean } {
  if (!visible) return { primary: pick ? '?' : '—', visible: false };
  return { primary: pick ?? '—', visible: !!pick };
}

export function LeaderboardTable({
  rows,
  highlightUsername,
  hidePicks,
  showScores,
  oddsByHorse,
  scratchedHorses,
}: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-bourbon/70">
        Nobody&apos;s entered yet. Head to /picks to get on the board.
      </p>
    );
  }

  return (
    <>
      {/* Mobile: card list. Desktop: table. */}
      <ul className="sm:hidden space-y-2">
        {rows.map((r) => {
          const me = highlightUsername && r.username === highlightUsername;
          const isGrant = r.username === 'GRANT';
          return (
            <li
              key={`${r.rank}-${r.username}`}
              className={`rounded-xl border p-3 ${
                me
                  ? 'border-mint-julep/40 bg-mint-julep/10'
                  : isGrant
                  ? 'border-rose-red/30 bg-rose-red/5'
                  : 'border-bourbon/15 bg-white'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="font-mono text-bourbon/60 text-sm">#{r.rank}</span>
                  <span className="font-semibold truncate">
                    {isGrant ? (
                      <span className="text-rose-dark">Grant</span>
                    ) : (
                      <>@{r.username}</>
                    )}
                  </span>
                  {me && <span className="text-[10px] text-mint-julep">(you)</span>}
                </div>
                <span className="font-display text-xl text-rose-dark tabular-nums">
                  {r.score}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-1.5 text-xs">
                {SLOTS.map((s) => {
                  const pick = r[pickKey(s.key)] as string | null;
                  const score = (r[scoreKey(s.key)] as number | null) ?? 0;
                  const odds = lookupOdds(pick, oddsByHorse);
                  const visible = me || isGrant || !hidePicks;
                  const d = pickDisplay(pick, visible);
                  const scr = visible && isScratched(pick, scratchedHorses);
                  return (
                    <div
                      key={s.key}
                      className={`rounded-md px-2 py-1.5 border ${
                        scr ? 'border-rose-red/30 bg-rose-red/5' : 'border-bourbon/10 bg-cream/50'
                      }`}
                    >
                      <dt className="text-[9px] uppercase tracking-wider text-bourbon/60 font-semibold">
                        {s.label}
                      </dt>
                      <dd
                        className={`font-medium truncate ${
                          scr ? 'text-rose-dark line-through decoration-rose-red/70' : 'text-bourbon'
                        }`}
                      >
                        {d.primary}
                        {scr && <ScratchedTag />}
                      </dd>
                      <div className="flex items-center justify-between text-[10px] mt-0.5">
                        {odds && d.visible ? (
                          <span className="text-bourbon/60 tabular-nums">{odds}</span>
                        ) : (
                          <span />
                        )}
                        {showScores && score > 0 && (
                          <span className="text-mint-julep font-bold">+{score}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </dl>
            </li>
          );
        })}
      </ul>

      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm text-center">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-bourbon/70 border-b border-bourbon/20">
              <th className="py-2 px-2 w-10">#</th>
              <th className="py-2 px-2">User</th>
              <th className="py-2 px-2">Score</th>
              {SLOTS.map((s) => (
                <th key={s.key} className="py-2 px-2">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const me = highlightUsername && r.username === highlightUsername;
              const isGrant = r.username === 'GRANT';
              return (
                <tr
                  key={`${r.rank}-${r.username}`}
                  className={`border-b border-bourbon/10 align-top ${
                    me ? 'bg-mint-julep/15' : isGrant ? 'bg-rose-red/5' : ''
                  }`}
                >
                  <td className="py-2 px-2 font-mono">{r.rank}</td>
                  <td className="py-2 px-2 whitespace-nowrap">
                    {isGrant ? (
                      <span className="font-semibold text-rose-dark">Grant</span>
                    ) : (
                      <>@{r.username}</>
                    )}
                    {me && <span className="ml-1 text-xs text-mint-julep">(you)</span>}
                  </td>
                  <td className="py-2 px-2 font-semibold">{r.score}</td>
                  {SLOTS.map((s) => {
                    const pick = r[pickKey(s.key)] as string | null;
                    const score = (r[scoreKey(s.key)] as number | null) ?? 0;
                    const odds = lookupOdds(pick, oddsByHorse);
                    const visible = me || isGrant || !hidePicks;
                    const scr = visible && isScratched(pick, scratchedHorses);
                    return (
                      <td
                        key={s.key}
                        className={`py-2 px-2 whitespace-nowrap ${scr ? 'bg-rose-red/5' : ''}`}
                      >
                        {visible ? (
                          <>
                            <div
                              className={
                                scr
                                  ? 'text-rose-dark line-through decoration-rose-red/70'
                                  : 'text-bourbon'
                              }
                            >
                              {pick ?? '—'}
                              {scr && <ScratchedTag />}
                            </div>
                            {odds && (
                              <div className="text-[10px] text-bourbon/60 tabular-nums">{odds}</div>
                            )}
                          </>
                        ) : (
                          <div className="text-bourbon/40">{pick ? '?' : '—'}</div>
                        )}
                        {showScores && score > 0 && (
                          <div className="text-[10px] text-mint-julep font-bold">+{score}</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
