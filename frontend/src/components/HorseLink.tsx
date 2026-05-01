'use client';

import { useHorseModal } from './HorseModalProvider';
import type { RaceKind } from '@/lib/hooks';
import type { ReactNode } from 'react';

interface Props {
  name: string;
  kind: RaceKind;
  className?: string;
  children?: ReactNode;
}

/**
 * Click-to-open wrapper for a horse name. Renders an inline button styled
 * like a link, opens the global HorseModal. Children override the visible
 * label (useful when name is already part of a larger string).
 */
export function HorseLink({ name, kind, className, children }: Props) {
  const { open } = useHorseModal();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        open(name, kind);
      }}
      className={
        className ??
        'underline underline-offset-2 decoration-bourbon/30 hover:decoration-rose-red hover:text-rose-red transition-colors text-left'
      }
    >
      {children ?? name}
    </button>
  );
}
