'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const KEY = 'derby_sungod_seen';

export function SunGodDisclaimer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(KEY) !== 'true') setOpen(true);
  }, []);

  function dismiss() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(KEY, 'true');
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-ink/40 backdrop-blur-sm px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div className="max-w-md w-full rounded-2xl border-2 border-rose-red/30 bg-cream shadow-2xl p-6 text-center">
        <Image
          src="/icon.png"
          alt="Sun God Derby"
          width={72}
          height={72}
          className="mx-auto mb-3"
          priority
        />
        <h2 className="font-display text-2xl text-rose-dark mb-2">Disclaimer</h2>
        <p className="text-bourbon leading-relaxed">
          All content on this site was created and analyzed by{' '}
          <span className="font-display italic text-rose-dark">Grant — The Sun God</span>.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="mt-5 rounded-full bg-rose-red text-cream px-5 py-2 text-sm font-semibold hover:bg-rose-dark transition"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
