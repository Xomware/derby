'use client';

import { useMemo, useState } from 'react';
import type { Pick } from '@/lib/types';

interface Props {
  picks: Pick[];
}

interface Point {
  ts: number; // ms
  ratio: number;
  odds: string;
}

interface Series {
  id: string;
  name: string;
  scratched: boolean;
  postPosition: number | null;
  points: Point[];
  latest: Point | null;
  color: string;
}

function oddsRatio(odds: string | null | undefined): number | null {
  if (!odds) return null;
  const m = odds.replace(/\//g, '-').match(/^(\d+)-(\d+)$/);
  if (!m) return null;
  const n = Number(m[1]);
  const d = Number(m[2]);
  return d > 0 ? n / d : null;
}

function colorFor(i: number, total: number): string {
  // Spread hues across the wheel, skip the green centered around 100°
  // (mint-julep) so it doesn't clash with brand accents.
  const hue = Math.round((i * 360) / Math.max(total, 1));
  return `hsl(${hue} 65% 42%)`;
}

function buildSeries(picks: Pick[]): Series[] {
  const sorted = [...picks].sort(
    (a, b) => (a.post_position ?? 99) - (b.post_position ?? 99)
  );
  return sorted.map((p, i, arr) => {
    const history = (p.odds_history ?? []).map((h) => {
      const r = oddsRatio(h.odds);
      return r !== null ? { ts: Date.parse(h.ts), ratio: r, odds: h.odds } : null;
    });
    const points = history.filter((x): x is Point => !!x && Number.isFinite(x.ts));
    // Always extend to the current odds so the line reaches "now".
    const cur = oddsRatio(p.odds_at_pick);
    if (cur !== null) {
      const last = points[points.length - 1];
      if (!last || last.odds !== p.odds_at_pick) {
        points.push({ ts: Date.now(), ratio: cur, odds: p.odds_at_pick ?? '' });
      }
    }
    points.sort((a, b) => a.ts - b.ts);
    return {
      id: p.id,
      name: p.horse_name,
      scratched: p.scratched,
      postPosition: p.post_position ?? null,
      points,
      latest: points[points.length - 1] ?? null,
      color: colorFor(i, arr.length),
    };
  });
}

const WIDTH = 720;
const HEIGHT = 220;
const PAD_LEFT = 38;
const PAD_RIGHT = 64; // room for horse-name end labels without clipping
const PAD_TOP = 12;
const PAD_BOTTOM = 26;

export function OddsHistoryChart({ picks }: Props) {
  const allSeries = useMemo(() => buildSeries(picks), [picks]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [scratchedShown, setScratchedShown] = useState(false);

  const filtered = useMemo(
    () =>
      allSeries.filter((s) => {
        if (!scratchedShown && s.scratched) return false;
        return !hidden.has(s.id);
      }),
    [allSeries, hidden, scratchedShown]
  );

  const haveAnyData = allSeries.some((s) => s.points.length > 0);

  const { tMin, tMax, rMin, rMax } = useMemo(() => {
    if (filtered.length === 0)
      return { tMin: 0, tMax: 1, rMin: 1, rMax: 10 };
    const ts: number[] = [];
    const rs: number[] = [];
    for (const s of filtered) {
      for (const p of s.points) {
        ts.push(p.ts);
        rs.push(p.ratio);
      }
    }
    if (ts.length === 0) return { tMin: 0, tMax: 1, rMin: 1, rMax: 10 };
    return {
      tMin: Math.min(...ts),
      tMax: Math.max(...ts),
      rMin: Math.max(0.5, Math.min(...rs)),
      rMax: Math.max(...rs),
    };
  }, [filtered]);

  // Log-scaled Y so 4-1 and 75-1 both show clearly.
  const logMin = Math.log10(rMin);
  const logMax = Math.log10(rMax);
  const logRange = Math.max(logMax - logMin, 0.0001);
  const tRange = Math.max(tMax - tMin, 1);

  function x(t: number): number {
    return PAD_LEFT + ((t - tMin) / tRange) * (WIDTH - PAD_LEFT - PAD_RIGHT);
  }
  function y(r: number): number {
    const lr = Math.log10(r);
    return (
      HEIGHT -
      PAD_BOTTOM -
      ((lr - logMin) / logRange) * (HEIGHT - PAD_TOP - PAD_BOTTOM)
    );
  }

  function pathFor(s: Series): string {
    if (s.points.length === 0) return '';
    return s.points
      .map(
        (p, i) =>
          `${i === 0 ? 'M' : 'L'}${x(p.ts).toFixed(1)},${y(p.ratio).toFixed(1)}`
      )
      .join(' ');
  }

  // Span > 24h → include short date so the labels aren't ambiguous.
  const multiDay = tMax - tMin > 24 * 60 * 60 * 1000;
  function fmtTime(ms: number): string {
    const d = new Date(ms);
    const time = d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
    if (!multiDay) return time;
    const date = d.toLocaleDateString(undefined, {
      month: 'numeric',
      day: 'numeric',
    });
    return `${date} ${time}`;
  }

  function fmtRatio(r: number): string {
    if (r >= 1) return `${Math.round(r)}-1`;
    const inv = Math.round(1 / r);
    return `1-${inv}`;
  }

  function toggle(id: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function showOnly(id: string) {
    setHidden(new Set(allSeries.filter((s) => s.id !== id).map((s) => s.id)));
  }

  function showAll() {
    setHidden(new Set());
  }

  function hideAll() {
    setHidden(new Set(allSeries.map((s) => s.id)));
  }

  if (!haveAnyData) {
    return (
      <p className="text-sm text-bourbon/70">
        No odds history yet. The chart fills in as cron logs odds movement
        (every 15 min while the race is open).
      </p>
    );
  }

  // Y-axis ticks: 4 evenly-spaced log marks.
  const yTicks = (() => {
    const out: { r: number; y: number; label: string }[] = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const lr = logMin + (i / steps) * logRange;
      const r = Math.pow(10, lr);
      out.push({ r, y: y(r), label: fmtRatio(r) });
    }
    return out;
  })();

  // X-axis ticks: 4 evenly-spaced.
  const xTicks = (() => {
    const out: { t: number; x: number; label: string }[] = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const t = tMin + (i / steps) * tRange;
      out.push({ t, x: x(t), label: fmtTime(t) });
    }
    return out;
  })();

  const visibleCount = filtered.length;

  return (
    <section className="space-y-3">
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="font-display text-xl text-bourbon">Odds movement</h2>
        <span className="text-xs text-bourbon/60">
          {visibleCount}/{allSeries.length} horses · log scale
        </span>
      </header>

      <div className="rounded-xl border border-bourbon/15 bg-white p-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width="100%"
          className="min-w-[640px] max-w-3xl mx-auto block"
          preserveAspectRatio="xMidYMid meet"
          aria-label="Odds movement chart"
        >
          {/* Y-axis grid + labels */}
          {yTicks.map((t, i) => (
            <g key={`y-${i}`}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={t.y}
                y2={t.y}
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-bourbon/15"
              />
              <text
                x={PAD_LEFT - 4}
                y={t.y + 3}
                textAnchor="end"
                className="text-[9px] fill-current text-bourbon/60 font-mono"
              >
                {t.label}
              </text>
            </g>
          ))}
          {/* X-axis labels */}
          {xTicks.map((t, i) => (
            <text
              key={`x-${i}`}
              x={t.x}
              y={HEIGHT - 8}
              textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
              className="text-[9px] fill-current text-bourbon/60 font-mono"
            >
              {t.label}
            </text>
          ))}
          {/* Lines */}
          {filtered.map((s) => (
            <g key={s.id}>
              <path
                d={pathFor(s)}
                fill="none"
                stroke={s.color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {s.latest && (
                <>
                  <circle
                    cx={x(s.latest.ts)}
                    cy={y(s.latest.ratio)}
                    r={2.5}
                    fill={s.color}
                  />
                  <text
                    x={x(s.latest.ts) + 4}
                    y={y(s.latest.ratio) + 3}
                    className="text-[8px] font-semibold"
                    style={{ fill: s.color }}
                  >
                    {s.name.length > 10 ? `${s.name.slice(0, 9)}…` : s.name}
                  </text>
                </>
              )}
            </g>
          ))}
        </svg>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={showAll}
          className="text-[11px] font-semibold text-bourbon border border-bourbon/30 bg-white rounded-full px-2.5 py-0.5 hover:border-rose-red hover:text-rose-red transition"
        >
          Show all
        </button>
        <button
          type="button"
          onClick={hideAll}
          className="text-[11px] font-semibold text-bourbon border border-bourbon/30 bg-white rounded-full px-2.5 py-0.5 hover:border-rose-red hover:text-rose-red transition"
        >
          Hide all
        </button>
        <label className="text-[11px] text-bourbon/70 inline-flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={scratchedShown}
            onChange={(e) => setScratchedShown(e.target.checked)}
            className="accent-rose-red"
          />
          Show scratched
        </label>
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1">
        {allSeries.map((s) => {
          const isHidden = hidden.has(s.id) || (s.scratched && !scratchedShown);
          const latest = s.latest;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => toggle(s.id)}
                onDoubleClick={() => showOnly(s.id)}
                className={`w-full text-left flex items-center gap-1.5 rounded px-2 py-1 text-xs border transition ${
                  isHidden
                    ? 'border-bourbon/15 bg-cream/40 opacity-50'
                    : 'border-bourbon/20 bg-white hover:border-rose-red'
                }`}
                title={`${s.name} — tap to toggle, double-tap to isolate`}
              >
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="font-mono text-[10px] text-bourbon/50 w-5 shrink-0">
                  {s.postPosition ?? '?'}
                </span>
                <span
                  className={`flex-1 truncate ${
                    s.scratched ? 'line-through text-bourbon/50' : 'text-bourbon'
                  }`}
                >
                  {s.name}
                </span>
                {latest && (
                  <span className="text-[10px] tabular-nums text-bourbon/60 shrink-0">
                    {latest.odds}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
