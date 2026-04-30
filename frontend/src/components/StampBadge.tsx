'use client';

import type { Stamp } from '@/lib/stamps';

const TONE_CLASSES: Record<Stamp['tone'], string> = {
  green: 'bg-mint-julep/20 text-mint-julep border-mint-julep/40',
  red: 'bg-rose-red/15 text-rose-dark border-rose-red/40',
  amber: 'bg-amber-500/15 text-amber-700 border-amber-500/40',
  gray: 'bg-bourbon/10 text-bourbon/70 border-bourbon/30',
};

export function StampBadge({ stamp }: { stamp: Stamp }) {
  const icon = stamp.hit ? '✓' : stamp.actualPosition === null ? '×' : '×';
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${TONE_CLASSES[stamp.tone]}`}
      title={
        stamp.actualPosition === null
          ? 'Did not finish'
          : `Finished ${stamp.label}`
      }
    >
      <span className="leading-none">{icon}</span>
      <span>{stamp.label}</span>
    </span>
  );
}
