'use client';

import { AVAILABLE_YEARS, CURRENT_YEAR, useYear, type DerbyYear } from '@/lib/year';

export function YearSelector({ className = '' }: { className?: string }) {
  const { year, setYear } = useYear();
  return (
    <label className={`relative inline-flex items-center text-xs ${className}`}>
      <span className="sr-only">Year</span>
      <select
        value={year}
        onChange={(e) => setYear(Number(e.target.value) as DerbyYear)}
        className="appearance-none pr-6 pl-2.5 py-1 rounded-full border border-bourbon/30 text-bourbon hover:bg-bourbon/10 bg-cream cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-red/50"
        aria-label="Derby year"
        title="Switch year"
      >
        {AVAILABLE_YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
            {y === CURRENT_YEAR ? '' : ' (archive)'}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        width="12"
        height="12"
        aria-hidden
        className="absolute right-2 pointer-events-none"
      >
        <path
          d="M6 9l6 6 6-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </label>
  );
}
