'use client';

import { FormEvent, useState } from 'react';
import { api, ApiError } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.requestLink(email.trim());
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError('Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="max-w-md mx-auto pt-12">
      <h1 className="font-display text-3xl text-rose-dark text-center">
        Sign in
      </h1>
      <p className="text-center text-sm text-bourbon/80 mt-2">
        Enter your email. We&apos;ll send you a one-tap sign-in link.
      </p>

      {sent ? (
        <div className="mt-8 rounded-lg border border-mint-julep/40 bg-mint-julep/10 p-4 text-center">
          <p className="text-sm">
            Link sent. Check <span className="font-semibold">{email}</span>.
          </p>
          <p className="text-xs text-bourbon/70 mt-2">
            Didn&apos;t get it? Look in spam or try again in 15 minutes.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-bourbon">Email</span>
            <input
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-bourbon/30 px-3 py-2 bg-white"
              placeholder="you@example.com"
            />
          </label>
          {error && (
            <p className="text-sm text-rose-dark bg-rose-red/10 rounded px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || !email}
            className="w-full bg-rose-red text-cream font-semibold rounded py-2 hover:bg-rose-dark disabled:opacity-60"
          >
            {submitting ? 'Sending…' : 'Send sign-in link'}
          </button>
        </form>
      )}
    </section>
  );
}
