'use client';

import { useEffect, useRef, useState } from 'react';

export function StatTile({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative rounded-md border border-bourbon/15 bg-cream/40 px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-bourbon/60 font-semibold flex items-center gap-1">
        <span>{label}</span>
        {description && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            aria-label={`What does ${label} mean?`}
            className="grid place-items-center w-3.5 h-3.5 rounded-full border border-bourbon/30 text-[9px] text-bourbon/60 leading-none hover:bg-bourbon/10"
          >
            ?
          </button>
        )}
      </dt>
      <dd className="text-sm text-bourbon font-semibold mt-0.5">{value}</dd>
      {description && open && (
        <div
          role="tooltip"
          className="absolute z-20 left-full top-0 ml-2 w-56 rounded-md border border-bourbon/20 bg-white px-3 py-2 text-[11px] text-ink shadow-lg max-w-[80vw]"
        >
          {description}
        </div>
      )}
    </div>
  );
}
