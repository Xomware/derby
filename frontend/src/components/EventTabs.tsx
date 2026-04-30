'use client';

import { EVENT_DERBY, EVENT_OAKS } from '@/lib/hooks';

export const EVENT_TABS: { id: string; label: string }[] = [
  { id: EVENT_DERBY, label: 'Derby' },
  { id: EVENT_OAKS, label: 'Oaks' },
];

export function EventTabs({
  active,
  onChange,
}: {
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <nav
      className="flex gap-1 border-b border-bourbon/20"
      aria-label="Event"
    >
      {EVENT_TABS.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition ${
              isActive
                ? 'border-rose-red text-rose-dark'
                : 'border-transparent text-bourbon/70 hover:text-rose-red'
            }`}
            aria-pressed={isActive}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
