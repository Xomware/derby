'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { HorseModal } from './HorseModal';
import type { RaceKind } from '@/lib/hooks';

interface HorseModalCtx {
  open: (horseName: string, kind: RaceKind) => void;
  close: () => void;
}

const Ctx = createContext<HorseModalCtx | null>(null);

export function useHorseModal(): HorseModalCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useHorseModal must be used inside HorseModalProvider');
  return v;
}

export function HorseModalProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<{ name: string; kind: RaceKind } | null>(null);

  const open = useCallback((horseName: string, kind: RaceKind) => {
    setTarget({ name: horseName, kind });
  }, []);
  const close = useCallback(() => setTarget(null), []);

  const value = useMemo(() => ({ open, close }), [open, close]);

  // Lock body scroll while open. Mobile bottom sheets feel awful
  // when the page underneath also scrolls.
  useEffect(() => {
    if (!target) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [target]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {target && (
        <HorseModal
          horseName={target.name}
          kind={target.kind}
          onClose={close}
        />
      )}
    </Ctx.Provider>
  );
}
