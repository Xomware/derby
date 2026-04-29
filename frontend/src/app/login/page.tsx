'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useMe } from '@/lib/hooks';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { refresh } = useMe();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.login({ identifier: identifier.trim(), password });
      await refresh();
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="max-w-md mx-auto pt-12 px-2">
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-bourbon/15 bg-white p-6 sm:p-8 shadow-sm space-y-5"
      >
        <header className="text-center">
          <p className="font-display italic text-mint-julep text-xs uppercase tracking-[0.3em]">
            Sun God Derby
          </p>
          <h1 className="font-display text-3xl text-rose-dark mt-1">Sign in</h1>
        </header>

        <label className="block">
          <span className="text-xs uppercase tracking-wider font-semibold text-bourbon/70">
            Email or username
          </span>
          <input
            autoFocus
            required
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="mt-1 w-full rounded-lg border border-bourbon/30 bg-cream/40 focus:border-rose-red focus:bg-white px-3 py-2 outline-none transition"
            placeholder="you@example.com"
          />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wider font-semibold text-bourbon/70">
            Password
          </span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-bourbon/30 bg-cream/40 focus:border-rose-red focus:bg-white px-3 py-2 outline-none transition"
          />
        </label>

        {error && (
          <p className="text-sm text-rose-dark bg-rose-red/10 rounded px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy || !identifier || password.length < 8}
          className="w-full bg-rose-red text-cream font-semibold rounded-lg py-2.5 hover:bg-rose-dark disabled:opacity-60 transition"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-center text-sm text-bourbon/80">
          New here?{' '}
          <Link href="/signup" className="text-rose-red hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </section>
  );
}
