'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { isValidGuestName, setGuestName } from '@/lib/guest';

export function GuestDialog({
  open,
  onClose,
  onContinue,
}: {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setError(null);
      // Tiny delay so the input is mounted before we focus.
      const id = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function submit(e: FormEvent) {
    e.preventDefault();
    const result = isValidGuestName(name);
    if (!result.ok) {
      setError(result.error ?? 'Try a different name');
      return;
    }
    setGuestName(name.trim());
    onContinue();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl bg-cream border border-bourbon/20 shadow-xl p-6 space-y-4"
      >
        <header>
          <h2
            id="guest-title"
            className="font-display text-2xl text-rose-dark"
          >
            Pop in as a guest
          </h2>
          <p className="text-sm text-bourbon/80 mt-1">
            Just a name so we know who&apos;s who. <strong>You won&apos;t be
            able to save picks</strong> — for that, sign up. You can switch
            anytime.
          </p>
        </header>

        <label className="block">
          <span className="text-xs uppercase tracking-wider font-semibold text-bourbon/70">
            Name
          </span>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            className="mt-1 w-full rounded-lg border border-bourbon/30 bg-white px-3 py-2 outline-none focus:border-rose-red transition"
            placeholder="Sun_God"
          />
          {error && <p className="text-xs text-rose-dark mt-1">{error}</p>}
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-bourbon/30 py-2 text-sm text-bourbon hover:bg-bourbon/10"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="flex-1 rounded-lg bg-rose-red text-cream font-semibold py-2 text-sm hover:bg-rose-dark disabled:opacity-60"
          >
            Continue as guest
          </button>
        </div>
      </form>
    </div>
  );
}
