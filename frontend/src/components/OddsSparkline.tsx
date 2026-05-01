'use client';

interface Entry {
  ts: string;
  odds: string;
}

interface Props {
  history: Entry[];
  current: string | null;
  width?: number;
  height?: number;
}

function oddsRatio(odds: string | null | undefined): number | null {
  if (!odds) return null;
  const m = odds.match(/^(\d+)\s*[-/]\s*(\d+)$/);
  if (!m) return null;
  const n = Number(m[1]);
  const d = Number(m[2]);
  return d > 0 ? n / d : null;
}

function shortTs(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function OddsSparkline({
  history,
  current,
  width = 140,
  height = 32,
}: Props) {
  // Combine history with current odds (so the line always extends to "now").
  const points = history
    .map((h) => ({ ts: h.ts, ratio: oddsRatio(h.odds), odds: h.odds }))
    .filter((p): p is { ts: string; ratio: number; odds: string } => p.ratio !== null);

  if (current) {
    const r = oddsRatio(current);
    if (r !== null) {
      const last = points[points.length - 1];
      if (!last || last.odds !== current) {
        points.push({ ts: new Date().toISOString(), ratio: r, odds: current });
      }
    }
  }

  if (points.length === 0) return null;
  if (points.length === 1) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[10px] tabular-nums text-bourbon/60"
        title={`Tracking from ${points[0].odds} (${shortTs(points[0].ts)}). Sparkline appears on next change.`}
      >
        <span className="inline-block w-2 h-2 rounded-full bg-bourbon/30" />
        Tracking from {points[0].odds}
      </span>
    );
  }

  const ratios = points.map((p) => p.ratio);
  const min = Math.min(...ratios);
  const max = Math.max(...ratios);
  const range = max - min || 1;

  const stepX = points.length > 1 ? width / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = height - ((p.ratio - min) / range) * height;
    return [x, y] as const;
  });

  const path = coords
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');

  const first = points[0];
  const last = points[points.length - 1];
  const trendDown = last.ratio < first.ratio; // shorter odds = better for that horse
  const trendUp = last.ratio > first.ratio;
  const stroke = trendDown
    ? 'stroke-mint-julep'
    : trendUp
    ? 'stroke-rose-red'
    : 'stroke-bourbon/60';

  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={`${first.odds} → ${last.odds} since ${shortTs(first.ts)}`}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className="overflow-visible"
        aria-hidden
      >
        <path d={path} fill="none" strokeWidth="1.5" className={stroke} />
        {coords.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i === coords.length - 1 ? 2 : 1}
            className={i === coords.length - 1 ? `fill-current ${stroke}` : 'fill-bourbon/40'}
          />
        ))}
      </svg>
      <span className="text-[10px] tabular-nums text-bourbon/70">
        {first.odds} → {last.odds}
      </span>
    </span>
  );
}
