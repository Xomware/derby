'use client';

import Link from 'next/link';
import { Fragment, useState } from 'react';
import { HorseLink } from './HorseLink';
import { LeaderboardInlineEditor } from './LeaderboardInlineEditor';
import { SharePicksButton } from './SharePicksButton';
import type { RaceKind } from '@/lib/hooks';
import type { LeaderboardRow } from '@/lib/types';
import type { Prediction } from '@/lib/api';
import { formatScore } from '@/lib/scoring';

interface EditConfig {
  eventId: string;
  existing: Prediction | null;
  horses: { name: string; scratched: boolean; odds: string | null }[];
  onSaved: () => void;
  /** When false, the Edit button is hidden (race locked or already finished). */
  canEdit: boolean;
}

interface Props {
  rows: LeaderboardRow[];
  /** Required to open the horse modal when a pick name is tapped. */
  kind: RaceKind;
  highlightUsername?: string | null;
  /** Show '?' instead of horse names when picks are still hidden. */
  hidePicks: boolean;
  /** Show per-slot score columns once race is official. */
  showScores: boolean;
  /** horse_name (lowercase) → odds string. */
  oddsByHorse?: Map<string, string>;
  /** Set of normalized horse_names that have been scratched. */
  scratchedHorses?: Set<string>;
  /** Threshold (n/d) below which a long-shot pick is too short. */
  longShotThreshold?: number;
  /** When set, render an inline "no picks yet" CTA row only the user sees. */
  missingPick?: { username: string; href: string } | null;
  /** When set + user has a row, render an inline Edit affordance pre-lock. */
  editConfig?: EditConfig | null;
  /** Replace the Edit button on the user's row with a 🔒 Locked chip. */
  showLockedChip?: boolean;
  /** When set + user has a row, render an inline Share button on it. */
  shareConfig?: { prediction: Prediction; year: number } | null;
}

function LockedChip() {
  return (
    <span
      title="Picks locked — race is off"
      className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-dark border border-rose-red/30 bg-rose-red/5 rounded px-2 py-0.5"
    >
      <span aria-hidden>🔒</span> Locked
    </span>
  );
}

function isScratched(name: string | null, scratched?: Set<string>): boolean {
  if (!name || !scratched) return false;
  return scratched.has(name.trim().toLowerCase());
}

function oddsRatio(odds: string | null | undefined): number | null {
  if (!odds) return null;
  const m = odds.replace(/\//g, '-').match(/^(\d+)-(\d+)$/);
  if (!m) return null;
  const n = Number(m[1]);
  const d = Number(m[2]);
  return d > 0 ? n / d : null;
}

function isLongShotTooShort(
  name: string | null,
  odds?: Map<string, string>,
  threshold?: number
): boolean {
  if (!name || !odds || !threshold) return false;
  const r = oddsRatio(odds.get(name.trim().toLowerCase()));
  return r !== null && r < threshold;
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

function LongShotShortTag({ odds }: { odds: string | null }) {
  return (
    <span
      title="Long shot has firmed below the 8-1 rule — update before lock"
      className="ml-1 inline-flex items-center px-1 rounded bg-amber-100 text-amber-800 text-[9px] uppercase tracking-wider font-bold align-middle"
    >
      ⚠ now {odds ?? '—'}
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
  kind,
  highlightUsername,
  hidePicks,
  showScores,
  oddsByHorse,
  scratchedHorses,
  longShotThreshold,
  missingPick,
  editConfig,
  showLockedChip,
  shareConfig,
}: Props) {
  const [editing, setEditing] = useState(false);
  if (rows.length === 0 && !missingPick) {
    return (
      <p className="text-sm text-bourbon/70">
        Nobody&apos;s entered yet. Head to /picks to get on the board.
      </p>
    );
  }
  const slotColCount = SLOTS.length;
  const totalCols = 3 + slotColCount; // # · user · score · slots
  const canShowEdit = !!editConfig?.canEdit && !!highlightUsername;
  const handleSaved = () => {
    editConfig?.onSaved();
    setEditing(false);
  };

  return (
    <>
      {/* Mobile: card list. Desktop: table. */}
      <ul className="sm:hidden space-y-2">
        {missingPick && (
          <li className="rounded-xl border-2 border-dashed border-rose-red/40 bg-rose-red/5 p-3">
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="font-mono text-bourbon/60 text-sm">#?</span>
                <span className="font-semibold truncate">@{missingPick.username}</span>
                <span className="text-[10px] text-mint-julep">(you)</span>
              </div>
              <Link
                href={missingPick.href}
                className="rounded bg-rose-red px-3 py-1 text-xs font-semibold text-white hover:bg-rose-dark transition"
              >
                Enter picks →
              </Link>
            </div>
            <p className="text-xs text-bourbon/70">
              You&apos;re not on the board yet — get your picks in.
            </p>
          </li>
        )}
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
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {me && canShowEdit && !editing && (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="text-[11px] font-semibold text-rose-dark border border-rose-red/40 bg-white rounded px-2 py-0.5 hover:bg-rose-red/10 transition"
                    >
                      Edit picks
                    </button>
                  )}
                  {me && showLockedChip && <LockedChip />}
                  {me && shareConfig && !editing && (
                    <SharePicksButton
                      prediction={shareConfig.prediction}
                      kind={kind}
                      year={shareConfig.year}
                    />
                  )}
                  <span className="font-display text-xl text-rose-dark tabular-nums">
                    {formatScore(r.score)}
                  </span>
                </div>
              </div>
              {me && editing && editConfig ? (
                <LeaderboardInlineEditor
                  eventId={editConfig.eventId}
                  username={r.username}
                  existing={editConfig.existing}
                  horses={editConfig.horses}
                  onSaved={handleSaved}
                  onCancel={() => setEditing(false)}
                />
              ) : (
              <dl className="grid grid-cols-2 gap-1.5 text-xs">
                {SLOTS.map((s) => {
                  const pick = r[pickKey(s.key)] as string | null;
                  const score = (r[scoreKey(s.key)] as number | null) ?? 0;
                  const odds = lookupOdds(pick, oddsByHorse);
                  const visible = me || isGrant || !hidePicks;
                  const d = pickDisplay(pick, visible);
                  const scr = visible && isScratched(pick, scratchedHorses);
                  const ls =
                    visible &&
                    s.key === 'long_shot' &&
                    !scr &&
                    isLongShotTooShort(pick, oddsByHorse, longShotThreshold);
                  return (
                    <div
                      key={s.key}
                      className={`rounded-md px-2 py-1.5 border ${
                        scr
                          ? 'border-rose-red/30 bg-rose-red/5'
                          : ls
                          ? 'border-amber-500/40 bg-amber-50'
                          : 'border-bourbon/10 bg-cream/50'
                      }`}
                    >
                      <dt className="text-[9px] uppercase tracking-wider text-bourbon/60 font-semibold">
                        {s.label}
                      </dt>
                      <dd
                        className={`font-medium ${
                          scr
                            ? 'text-rose-dark'
                            : 'text-bourbon truncate'
                        }`}
                      >
                        <span
                          className={`${
                            scr
                              ? 'block truncate line-through decoration-rose-red/70'
                              : ''
                          }`}
                        >
                          {visible && pick ? (
                            <HorseLink
                              name={pick}
                              kind={kind}
                              className={`underline underline-offset-2 decoration-bourbon/20 hover:decoration-rose-red hover:text-rose-red transition-colors text-left ${
                                scr ? 'text-rose-dark' : ''
                              }`}
                            >
                              {d.primary}
                            </HorseLink>
                          ) : (
                            d.primary
                          )}
                        </span>
                        {scr && (
                          <span className="block mt-0.5">
                            <ScratchedTag />
                          </span>
                        )}
                        {ls && <LongShotShortTag odds={odds} />}
                      </dd>
                      <div className="flex items-center justify-between text-[10px] mt-0.5">
                        {odds && d.visible ? (
                          <span className="text-bourbon/60 tabular-nums">{odds}</span>
                        ) : (
                          <span />
                        )}
                        {showScores && score > 0 && (
                          <span className="text-mint-julep font-bold">+{formatScore(score)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </dl>
              )}
            </li>
          );
        })}
      </ul>

      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm text-center">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-bourbon/70 border-b border-bourbon/20">
              <th className="py-2 px-2 w-10">#</th>
              <th className="py-2 px-2 text-left">User</th>
              <th className="py-2 px-2">Score</th>
              {SLOTS.map((s) => (
                <th key={s.key} className="py-2 px-2">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {missingPick && (
              <tr className="border-b border-bourbon/10 bg-rose-red/5">
                <td className="py-3 px-2 font-mono text-bourbon/60 text-center">?</td>
                <td className="py-3 px-2 whitespace-nowrap text-left">
                  <span className="font-semibold">@{missingPick.username}</span>
                  <span className="ml-1 text-xs text-mint-julep">(you)</span>
                </td>
                <td className="py-3 px-2 text-bourbon/60">—</td>
                <td colSpan={slotColCount} className="py-3 px-2">
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-bourbon/70 text-xs">No picks in yet</span>
                    <Link
                      href={missingPick.href}
                      className="rounded bg-rose-red px-3 py-1 text-xs font-semibold text-white hover:bg-rose-dark transition"
                    >
                      Enter picks →
                    </Link>
                  </div>
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const me = highlightUsername && r.username === highlightUsername;
              const isGrant = r.username === 'GRANT';
              const showEditBtn = me && canShowEdit && !editing;
              return (
                <Fragment key={`${r.rank}-${r.username}`}>
                <tr
                  className={`border-b border-bourbon/10 align-top ${
                    me ? 'bg-mint-julep/15' : isGrant ? 'bg-rose-red/5' : ''
                  }`}
                >
                  <td className="py-2 px-2 font-mono">{r.rank}</td>
                  <td className="py-2 px-2 whitespace-nowrap text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isGrant ? (
                        <span className="font-semibold text-rose-dark">Grant</span>
                      ) : (
                        <span>@{r.username}</span>
                      )}
                      {me && <span className="text-xs text-mint-julep">(you)</span>}
                      {showEditBtn && (
                        <button
                          type="button"
                          onClick={() => setEditing(true)}
                          className="text-[11px] font-semibold text-rose-dark border border-rose-red/40 bg-white rounded px-2 py-0.5 hover:bg-rose-red/10 transition"
                        >
                          Edit
                        </button>
                      )}
                      {me && showLockedChip && <LockedChip />}
                      {me && shareConfig && !editing && (
                        <SharePicksButton
                          prediction={shareConfig.prediction}
                          kind={kind}
                          year={shareConfig.year}
                          compact
                        />
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2 font-semibold">{formatScore(r.score)}</td>
                  {SLOTS.map((s) => {
                    const pick = r[pickKey(s.key)] as string | null;
                    const score = (r[scoreKey(s.key)] as number | null) ?? 0;
                    const odds = lookupOdds(pick, oddsByHorse);
                    const visible = me || isGrant || !hidePicks;
                    const scr = visible && isScratched(pick, scratchedHorses);
                    const ls =
                      visible &&
                      s.key === 'long_shot' &&
                      !scr &&
                      isLongShotTooShort(pick, oddsByHorse, longShotThreshold);
                    return (
                      <td
                        key={s.key}
                        className={`py-2 px-2 whitespace-nowrap ${
                          scr ? 'bg-rose-red/5' : ls ? 'bg-amber-50' : ''
                        }`}
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
                              {pick ? (
                                <HorseLink
                                  name={pick}
                                  kind={kind}
                                  className={`underline underline-offset-2 decoration-bourbon/20 hover:decoration-rose-red hover:text-rose-red transition-colors ${
                                    scr ? 'text-rose-dark' : ''
                                  }`}
                                />
                              ) : (
                                '—'
                              )}
                              {scr && <ScratchedTag />}
                              {ls && <LongShotShortTag odds={odds} />}
                            </div>
                            {odds && (
                              <div className="text-[10px] text-bourbon/60 tabular-nums">{odds}</div>
                            )}
                          </>
                        ) : (
                          <div className="text-bourbon/40">{pick ? '?' : '—'}</div>
                        )}
                        {showScores && score > 0 && (
                          <div className="text-[10px] text-mint-julep font-bold">+{formatScore(score)}</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
                {me && editing && editConfig && (
                  <tr className="bg-mint-julep/10 border-b border-bourbon/10">
                    <td colSpan={totalCols} className="py-3 px-3">
                      <LeaderboardInlineEditor
                        eventId={editConfig.eventId}
                        username={r.username}
                        existing={editConfig.existing}
                        horses={editConfig.horses}
                        onSaved={handleSaved}
                        onCancel={() => setEditing(false)}
                      />
                    </td>
                  </tr>
                )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
