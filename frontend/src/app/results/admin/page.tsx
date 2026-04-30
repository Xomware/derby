'use client';

import { useEffect, useState } from 'react';
import { AdminGate } from '@/components/AdminGate';
import { AdminOddsForm } from '@/components/AdminOddsForm';
import { AdminResultsForm } from '@/components/AdminResultsForm';
import { useAdminToken } from '@/lib/admin';
import type { RaceKind } from '@/lib/hooks';

const TABS: { id: RaceKind; label: string }[] = [
  { id: 'derby', label: 'Derby' },
  { id: 'oaks', label: 'Oaks' },
];

type Section = 'results' | 'odds';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'results', label: 'Set results' },
  { id: 'odds', label: 'Update odds' },
];

export default function AdminResultsPage() {
  const { token, loading } = useAdminToken();
  const [kind, setKind] = useState<RaceKind>('derby');
  const [section, setSection] = useState<Section>('results');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get('event');
    if (e === 'oaks' || e === 'derby') setKind(e);
    const s = params.get('section');
    if (s === 'odds' || s === 'results') setSection(s);
  }, []);

  function pushUrl(nextKind: RaceKind, nextSection: Section) {
    const url = new URL(window.location.href);
    url.searchParams.set('event', nextKind);
    url.searchParams.set('section', nextSection);
    window.history.replaceState(null, '', url.toString());
  }

  if (loading) {
    return <p className="pt-8 text-bourbon/70">Loading…</p>;
  }

  if (!token) {
    return <AdminGate />;
  }

  return (
    <section className="pt-8 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-3xl text-rose-dark">Admin</h1>
        <p className="text-bourbon/80 text-sm mt-1">
          {section === 'results'
            ? 'Enter race finishers manually. Saving publishes immediately and stamps user picks across the site.'
            : 'Edit per-horse odds. Predictions saved earlier are scored against the odds at the time of the race.'}
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => {
          const active = section === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSection(s.id);
                pushUrl(kind, s.id);
              }}
              className={`px-3 py-1.5 rounded text-xs font-semibold border transition ${
                active
                  ? 'bg-rose-red text-cream border-rose-red'
                  : 'border-bourbon/30 text-bourbon hover:border-rose-red'
              }`}
              aria-pressed={active}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <nav className="flex gap-1 border-b border-bourbon/20" aria-label="Event">
        {TABS.map((t) => {
          const active = kind === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setKind(t.id);
                pushUrl(t.id, section);
              }}
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

      {section === 'results' && <AdminResultsForm kind={kind} adminToken={token} />}
      {section === 'odds' && <AdminOddsForm kind={kind} adminToken={token} />}
    </section>
  );
}
