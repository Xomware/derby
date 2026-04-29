'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useMe } from '@/lib/hooks';

function VerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { refresh } = useMe();
  const [status, setStatus] = useState<'verifying' | 'username' | 'error'>(
    'verifying'
  );
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setError('Missing token.');
      return;
    }
    // Drop the token from the URL so it stays out of browser history + share/copy.
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/auth/verify/');
    }
    (async () => {
      try {
        const res = await api.verify(token);
        if (res.needs_username) {
          setStatus('username');
        } else {
          await refresh();
          router.push('/');
        }
      } catch (e) {
        setStatus('error');
        if (e instanceof ApiError) setError(e.detail);
        else setError('Could not verify link.');
      }
    })();
  }, [params, refresh, router]);

  async function chooseUsername(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.completeSignup(username.trim());
      await refresh();
      router.push('/');
    } catch (e) {
      if (e instanceof ApiError) setError(e.detail);
      else setError('Could not save username.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="max-w-md mx-auto pt-12">
      {status === 'verifying' && (
        <p className="text-center text-bourbon/80">Verifying your link…</p>
      )}

      {status === 'error' && (
        <div className="rounded border border-rose-red/40 bg-rose-red/10 p-4 text-center text-rose-dark">
          {error}
          <div className="mt-2">
            <a href="/login" className="text-rose-red underline">
              Request a new link
            </a>
          </div>
        </div>
      )}

      {status === 'username' && (
        <form onSubmit={chooseUsername} className="space-y-4">
          <p className="text-center text-mint-julep text-xs uppercase tracking-[0.3em]">
            Welcome to Sun God Derby
          </p>
          <h1 className="font-display text-3xl text-rose-dark text-center">
            Pick a username
          </h1>
          <p className="text-center text-sm text-bourbon/80">
            Shown next to your votes and on the leaderboard. You can change it later.
          </p>
          <label className="block">
            <span className="text-sm font-semibold text-bourbon">Username</span>
            <input
              autoFocus
              required
              maxLength={20}
              minLength={2}
              pattern="[A-Za-z0-9_\-\.]+"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded border border-bourbon/30 px-3 py-2 bg-white"
              placeholder="e.g. bourbon_wins"
            />
            <span className="text-xs text-bourbon/60 block mt-1">
              Letters, numbers, _ - . — max 20 chars.
            </span>
          </label>
          {error && (
            <p className="text-sm text-rose-dark bg-rose-red/10 rounded px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || username.length < 2}
            className="w-full bg-rose-red text-cream font-semibold rounded py-2 hover:bg-rose-dark disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Continue'}
          </button>
        </form>
      )}
    </section>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<p className="text-center pt-12">Loading…</p>}>
      <VerifyInner />
    </Suspense>
  );
}
