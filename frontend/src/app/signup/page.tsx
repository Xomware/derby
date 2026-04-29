'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useMe } from '@/lib/hooks';
import { RosePetals } from '@/components/RosePetals';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
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
      await api.signup({
        email: email.trim().toLowerCase(),
        username: username.trim(),
        password,
      });
      await refresh();
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Could not create account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="max-w-md mx-auto pt-12 px-2 relative">
      <RosePetals />
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-bourbon/15 bg-white p-6 sm:p-8 shadow-sm space-y-5"
      >
        <header className="text-center">
          <p className="font-display italic text-mint-julep text-xs uppercase tracking-[0.3em]">
            Welcome to Sun God Derby
          </p>
          <h1 className="font-display text-3xl text-rose-dark mt-1">Create account</h1>
        </header>

        <label className="block">
          <span className="text-xs uppercase tracking-wider font-semibold text-bourbon/70">
            Email
          </span>
          <input
            type="email"
            autoFocus
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-bourbon/30 bg-cream/40 focus:border-rose-red focus:bg-white px-3 py-2 outline-none transition"
            placeholder="you@example.com"
          />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wider font-semibold text-bourbon/70">
            Username
          </span>
          <div className="mt-1 flex items-center rounded-lg border border-bourbon/30 bg-cream/40 focus-within:border-rose-red focus-within:bg-white transition">
            <span className="pl-3 pr-1 text-bourbon/60">@</span>
            <input
              required
              minLength={2}
              maxLength={20}
              pattern="[A-Za-z0-9_\-\.]+"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1 bg-transparent px-1 py-2 outline-none"
              placeholder="bourbon_wins"
            />
          </div>
          <span className="text-xs text-bourbon/60 block mt-1.5">
            Letters, numbers, <code>_ - .</code> — 2 to 20 characters.
          </span>
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wider font-semibold text-bourbon/70">
            Password
          </span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-bourbon/30 bg-cream/40 focus:border-rose-red focus:bg-white px-3 py-2 outline-none transition"
          />
          <span className="text-xs text-bourbon/60 block mt-1.5">
            At least 8 characters.
          </span>
        </label>

        {error && (
          <p className="text-sm text-rose-dark bg-rose-red/10 rounded px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy || !email || username.length < 2 || password.length < 8}
          className="w-full bg-rose-red text-cream font-semibold rounded-lg py-2.5 hover:bg-rose-dark disabled:opacity-60 transition"
        >
          {busy ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-center text-sm text-bourbon/80">
          Already have one?{' '}
          <Link href="/login" className="text-rose-red hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </section>
  );
}
