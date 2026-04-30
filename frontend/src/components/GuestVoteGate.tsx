'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export function GuestVoteGate({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-vote-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-cream border border-bourbon/20 shadow-xl p-6 space-y-4 text-center">
        <h2
          id="guest-vote-title"
          className="font-display text-2xl text-rose-dark"
        >
          Sign in to save picks
        </h2>
        <p className="text-sm text-bourbon/80">
          You&apos;re browsing as a guest — picks aren&apos;t saved or counted
          on the leaderboard. Make an account (it&apos;s 30 seconds) and
          you&apos;re in.
        </p>
        <div className="flex flex-col gap-2 pt-1">
          <Link
            href="/signup"
            className="rounded-lg bg-rose-red text-cream font-semibold py-2 text-sm hover:bg-rose-dark"
            onClick={onClose}
          >
            Create an account
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-bourbon/30 py-2 text-sm text-bourbon hover:bg-bourbon/10"
            onClick={onClose}
          >
            Sign in
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-bourbon/70 hover:text-rose-red mt-1"
          >
            Keep browsing
          </button>
        </div>
      </div>
    </div>
  );
}
