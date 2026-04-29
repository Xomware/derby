'use client';

import { useEffect, useState } from 'react';

const HORSE_COUNT = 5;

interface Horse {
  id: number;
  bottom: number;
  duration: number;
  delay: number;
  scale: number;
  opacity: number;
  flip: boolean;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildHorses(seed: number): Horse[] {
  const rand = mulberry32(seed);
  return Array.from({ length: HORSE_COUNT }, (_, i) => ({
    id: i,
    bottom: Math.floor(rand() * 80),
    duration: Number((16 + rand() * 14).toFixed(2)),
    delay: Number((rand() * 12).toFixed(2)),
    scale: Number((0.55 + rand() * 0.65).toFixed(2)),
    opacity: Number((0.18 + rand() * 0.22).toFixed(2)),
    flip: rand() > 0.5,
  }));
}

export function GallopingHorses() {
  const [horses, setHorses] = useState<Horse[]>(() => buildHorses(0));
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    setHorses(buildHorses(Date.now() & 0xffffffff));
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
      className="pointer-events-none fixed inset-x-0 bottom-0 top-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {horses.map((h) => (
        <span
          key={h.id}
          className="horse"
          style={{
            bottom: `${h.bottom}px`,
            animationDuration: `${h.duration}s`,
            animationDelay: `${h.delay}s`,
            opacity: h.opacity,
            transform: `scale(${h.scale}) ${h.flip ? 'scaleX(-1)' : ''}`,
          }}
        >
          <Horse />
        </span>
      ))}
    </div>
  );
}

/** A simple galloping-horse silhouette in bourbon brown.
 *  ~120 × 80 viewbox. Stylised so legs read at small sizes. */
function Horse() {
  return (
    <svg
      width="120"
      height="80"
      viewBox="0 0 120 80"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#5D4037"
        d="
          M11 60
          C 8 60, 7 55, 12 53
          L 22 47
          C 24 38, 32 32, 42 30
          L 50 22
          C 52 18, 56 16, 60 16
          L 70 8
          C 74 4, 80 6, 82 12
          L 86 18
          L 94 18
          C 98 18, 100 22, 98 26
          L 92 28
          C 94 32, 96 36, 96 40
          L 105 38
          C 108 38, 110 41, 108 44
          L 100 48
          C 96 54, 88 58, 80 58
          L 78 70
          C 78 74, 73 76, 70 72
          L 66 60
          L 50 60
          L 48 72
          C 48 76, 43 78, 40 74
          L 36 60
          L 30 60
          L 22 70
          C 18 74, 12 72, 11 66
          L 11 60
          Z
        "
      />
      <circle cx="80" cy="14" r="1.4" fill="#FAF6E8" />
    </svg>
  );
}
