'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
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
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return;
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setError('Sign-in link is incomplete. Request a new one.');
      return;
    }
    ranOnce.current = true;

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
      } finally {
        // Drop the token from the URL after we're done with it.
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', '/auth/verify/');
        }
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
    <section className="max-w-md mx-auto pt-12 px-2">
      {status === 'verifying' && (
        <div className="rounded-2xl border border-bourbon/15 bg-white p-8 shadow-sm text-center">
          <div className="inline-block h-8 w-8 rounded-full border-2 border-rose-red/30 border-t-rose-red animate-spin" />
          <p className="mt-3 text-sm text-bourbon/80">Verifying your link…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-2xl border border-rose-red/40 bg-rose-red/5 p-6 text-center text-rose-dark">
          <h2 className="font-display text-2xl mb-2">Couldn&apos;t sign you in</h2>
          <p className="text-sm">{error}</p>
          <a
            href="/login"
            className="inline-block mt-4 text-sm px-4 py-2 rounded-full bg-rose-red text-cream hover:bg-rose-dark"
          >
            Request a new link
          </a>
        </div>
      )}

      {status === 'username' && (
        <form
          onSubmit={chooseUsername}
          className="rounded-2xl border border-bourbon/15 bg-white p-6 sm:p-8 shadow-sm space-y-5"
        >
          <header className="text-center">
            <p className="font-display italic text-mint-julep text-xs uppercase tracking-[0.3em]">
              Welcome to Sun God Derby
            </p>
            <h1 className="font-display text-3xl text-rose-dark mt-1">
              Pick a username
            </h1>
            <p className="text-sm text-bourbon/80 mt-2">
              Shown next to your votes and on the leaderboard. You can change it later.
            </p>
          </header>

          <label className="block">
            <span className="text-xs uppercase tracking-wider font-semibold text-bourbon/70">
              Username
            </span>
            <div className="mt-1 flex items-center rounded-lg border border-bourbon/30 bg-cream/40 focus-within:border-rose-red focus-within:bg-white transition">
              <span className="pl-3 pr-1 text-bourbon/60">@</span>
              <input
                autoFocus
                required
                maxLength={20}
                minLength={2}
                pattern="[A-Za-z0-9_\-\.]+"
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

          {error && (
            <p className="text-sm text-rose-dark bg-rose-red/10 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || username.length < 2}
            className="w-full bg-rose-red text-cream font-semibold rounded-lg py-2.5 hover:bg-rose-dark disabled:opacity-60 transition"
          >
            {submitting ? 'Saving…' : 'Continue →'}
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
