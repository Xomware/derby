'use client';

import { useState } from 'react';
import { AdminGate } from '@/components/AdminGate';
import { AdminResultsForm } from '@/components/AdminResultsForm';
import { useAdminToken } from '@/lib/admin';
import type { RaceKind } from '@/lib/hooks';

const TABS: { id: RaceKind; label: string }[] = [
  { id: 'derby', label: 'Derby' },
  { id: 'oaks', label: 'Oaks' },
];

export default function AdminResultsPage() {
  const { token, loading } = useAdminToken();
  const [kind, setKind] = useState<RaceKind>('derby');

  if (loading) {
    return <p className="pt-8 text-bourbon/70">Loading…</p>;
  }

  if (!token) {
    return <AdminGate />;
  }

  return (
    <section className="pt-8 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-3xl text-rose-dark">Admin — Set results</h1>
        <p className="text-bourbon/80 text-sm mt-1">
          Enter race finishers manually. Saving publishes immediately and
          stamps user picks across the site.
        </p>
      </header>

      <nav className="flex gap-1 border-b border-bourbon/20" aria-label="Event">
        {TABS.map((t) => {
          const active = kind === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setKind(t.id)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition ${
                active
                  ? 'border-rose-red text-rose-dark'
                  : 'border-transparent text-bourbon/70 hover:text-rose-red'
              }`}
              aria-pressed={active}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      <AdminResultsForm kind={kind} adminToken={token} />
    </section>
  );
}
