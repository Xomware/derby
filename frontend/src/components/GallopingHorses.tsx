'use client';

import { useEffect, useState } from 'react';

const HORSE_COUNT_DESKTOP = 6;
const HORSE_COUNT_MOBILE = 4;

const COLORS = [
  '#C8102E', // rose-red
  '#8B0A1F', // rose-dark
  '#5D4037', // bourbon
  '#7BA77B', // mint-julep
  '#2B2018', // ink
];

interface Horse {
  id: number;
  color: string;
  scale: number;
  duration: number;
  delay: number;
  bottom: number;
  gallop: number;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildHorses(seed: number, count: number, isMobile: boolean): Horse[] {
  const r = mulberry32(seed);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: COLORS[Math.floor(r() * COLORS.length)],
    // Smaller scale floor on mobile so they don't dominate the screen.
    scale: Number(((isMobile ? 0.45 : 0.55) + r() * 0.5).toFixed(2)),
    duration: Number((11 + r() * 14).toFixed(2)),
    delay: Number((r() * 18).toFixed(2)),
    bottom: Math.floor(r() * 28),
    gallop: Number((0.55 + r() * 0.3).toFixed(2)),
  }));
}

export function GallopingHorses() {
  const [horses, setHorses] = useState<Horse[]>(() =>
    buildHorses(0, HORSE_COUNT_DESKTOP, false)
  );
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    const count = isMobile ? HORSE_COUNT_MOBILE : HORSE_COUNT_DESKTOP;
    setHorses(buildHorses(Date.now() & 0xffffffff, count, isMobile));

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(mq.matches);
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (reduce) return null;

  return (
    <div
      aria-hidden
      className="relative w-full h-28 sm:h-32 overflow-hidden pointer-events-none"
    >
      {horses.map((h) => (
        <span
          key={h.id}
          className="horse"
          style={
            {
              '--color': h.color,
              '--scale': String(h.scale),
              '--duration': `${h.duration}s`,
              '--delay': `${h.delay}s`,
              '--bottom': `${h.bottom}px`,
              '--gallop': `${h.gallop}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
