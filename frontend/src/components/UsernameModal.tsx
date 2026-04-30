'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { isValidUsername, readUsername, setUsername } from '@/lib/identity';

/**
 * First-visit username prompt. Renders a modal that pops up whenever the
 * page mounts and there's no name in localStorage. Title + first-time text
 * change if the user is editing their existing name (returning visitor).
 */
export function UsernameModal({
  open,
  onClose,
  mode = 'first-time',
}: {
  open: boolean;
  onClose: () => void;
  mode?: 'first-time' | 'change';
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setName(mode === 'change' ? readUsername() ?? '' : '');
      setError(null);
      const id = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(id);
    }
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && mode === 'change') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, mode, onClose]);

  if (!open) return null;

  function submit(e: FormEvent) {
    e.preventDefault();
    const result = isValidUsername(name);
    if (!result.ok) {
      setError(result.error ?? 'Try a different name');
      return;
    }
    setUsername(name.trim());
    onClose();
  }

  const isFirstTime = mode === 'first-time';

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="username-title"
      onClick={(e) => {
        if (mode === 'change' && e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl bg-cream border border-bourbon/20 shadow-xl p-6 space-y-4"
      >
        <header>
          <p className="font-display italic text-mint-julep text-xs uppercase tracking-[0.3em]">
            Sun God Derby
          </p>
          <h2
            id="username-title"
            className="font-display text-2xl text-rose-dark mt-1"
          >
            {isFirstTime ? 'What should we call you?' : 'Change your name'}
          </h2>
          <p className="text-sm text-bourbon/80 mt-2">
            Just a name to track your picks. If you come back later, use the
            same name and your picks should still be here.
          </p>
        </header>

        <label className="block">
          <span className="text-xs uppercase tracking-wider font-semibold text-bourbon/70">
            Your name
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
          {!isFirstTime && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-bourbon/30 py-2 text-sm text-bourbon hover:bg-bourbon/10"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!name.trim()}
            className="flex-1 rounded-lg bg-rose-red text-cream font-semibold py-2 text-sm hover:bg-rose-dark disabled:opacity-60"
          >
            {isFirstTime ? "Let's go" : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
