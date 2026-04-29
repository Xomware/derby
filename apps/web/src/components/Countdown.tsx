'use client';

import { useEffect, useState } from 'react';

interface CountdownProps {
  target: string;
  label?: string;
}

function diff(target: Date) {
  const ms = Math.max(0, target.getTime() - Date.now());
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    expired: ms === 0,
  };
}

export function Countdown({ target, label = 'Post time' }: CountdownProps) {
  const date = new Date(target);
  const [t, setT] = useState(() => diff(date));

  useEffect(() => {
    const id = setInterval(() => setT(diff(date)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (t.expired) {
    return (
      <div className="text-sm font-display text-rose-dark">
        And they&apos;re off.
      </div>
    );
  }

  return (
    <div className="text-sm">
      <span className="text-bourbon/70 mr-2">{label}:</span>
      <span className="font-mono font-semibold text-rose-dark tabular-nums">
        {t.days}d {String(t.hours).padStart(2, '0')}h{' '}
        {String(t.minutes).padStart(2, '0')}m{' '}
        {String(t.seconds).padStart(2, '0')}s
      </span>
    </div>
  );
}
