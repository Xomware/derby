'use client';

import { useEffect, useState } from 'react';

const PETAL_COUNT = 18;

interface Petal {
  id: number;
  left: number;
  delay: number;
  duration: number;
  scale: number;
  rotate: number;
  drift: number;
  swayDelay: number;
}

function buildPetals(seed: number): Petal[] {
  const rand = mulberry32(seed);
  return Array.from({ length: PETAL_COUNT }, (_, i) => ({
    id: i,
    left: Math.floor(rand() * 100),
    delay: Number((rand() * 14).toFixed(2)),
    duration: Number((10 + rand() * 10).toFixed(2)),
    scale: Number((0.55 + rand() * 0.7).toFixed(2)),
    rotate: Math.floor(rand() * 360),
    drift: Math.floor(rand() * 60 - 30),
    swayDelay: Number((rand() * 5).toFixed(2)),
  }));
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function RosePetals() {
  const [petals, setPetals] = useState<Petal[]>(() => buildPetals(0));
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    setPetals(buildPetals(Date.now() & 0xffffffff));
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
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {petals.map((p) => (
        <span
          key={p.id}
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s, ${p.swayDelay}s`,
            animationDuration: `${p.duration}s, ${(p.duration / 3).toFixed(2)}s`,
            transform: `scale(${p.scale}) rotate(${p.rotate}deg)`,
            // The CSS uses --drift to offset the horizontal sway target.
            ['--drift' as any]: `${p.drift}px`,
          }}
          className="petal"
        >
          <Petal />
        </span>
      ))}
    </div>
  );
}

function Petal() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2c2 5 5 7 9 8-3 2-5 6-5 11-2-5-5-8-9-8 3-2 5-6 5-11z"
        fill="#C8102E"
        opacity="0.85"
      />
      <path
        d="M12 5c1.6 3.5 3.4 5 6 6-2 1.5-3.4 4.2-3.4 7.5C13 15.5 10.6 13.6 7 13c2-1.4 3.4-4 5-8z"
        fill="#8B0A1F"
        opacity="0.5"
      />
    </svg>
  );
}
