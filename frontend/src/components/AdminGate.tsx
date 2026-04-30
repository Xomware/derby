'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { setAdminToken } from '@/lib/admin';

export function AdminGate() {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.adminCheck(pw);
      setAdminToken(pw);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        // Wrong password — bounce to /results.
        router.replace('/results');
        return;
      }
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="pt-12 max-w-sm mx-auto">
      <h1 className="font-display text-2xl text-rose-dark mb-3">Admin only</h1>
      <p className="text-sm text-bourbon/80 mb-4">
        Enter the admin password to set race results.
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoFocus
          required
          placeholder="Password"
          className="w-full rounded border border-bourbon/30 bg-cream px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-red/50"
        />
        {error && <p className="text-xs text-rose-dark">{error}</p>}
        <button
          type="submit"
          disabled={busy || !pw}
          className="w-full rounded bg-rose-red px-3 py-2 text-sm font-semibold text-white hover:bg-rose-dark disabled:opacity-50 transition"
        >
          {busy ? 'Checking…' : 'Continue'}
        </button>
      </form>
    </section>
  );
}
