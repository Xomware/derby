'use client';

import { useEffect, useState } from 'react';

const KEY = 'derby_year';

export const CURRENT_YEAR = 2026;
export const AVAILABLE_YEARS = [2026, 2025, 2024, 2023, 2021] as const;
export type DerbyYear = (typeof AVAILABLE_YEARS)[number];

export function isValidYear(y: number): y is DerbyYear {
  return (AVAILABLE_YEARS as readonly number[]).includes(y);
}

export function derbyEventId(year: number): string {
  return `${year}-kentucky-derby`;
}

export function oaksEventId(year: number): string {
  return `${year}-kentucky-oaks`;
}

export function readYear(): DerbyYear {
  if (typeof window === 'undefined') return CURRENT_YEAR;
  const raw = window.localStorage.getItem(KEY);
  const parsed = raw ? Number(raw) : CURRENT_YEAR;
  return isValidYear(parsed) ? parsed : CURRENT_YEAR;
}

export function setYear(y: DerbyYear): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, String(y));
  window.dispatchEvent(new Event('derby-year-changed'));
}

export function useYear(): { year: DerbyYear; setYear: (y: DerbyYear) => void } {
  const [year, setLocal] = useState<DerbyYear>(CURRENT_YEAR);

  useEffect(() => {
    setLocal(readYear());
    function onChange() {
      setLocal(readYear());
    }
    window.addEventListener('derby-year-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('derby-year-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  return { year, setYear };
}
