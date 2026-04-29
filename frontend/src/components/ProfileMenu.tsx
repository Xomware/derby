'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useMe } from '@/lib/hooks';
import type { Me } from '@/lib/types';

export function ProfileMenu({ me }: { me: Me }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const { refresh } = useMe();

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setEditing(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  async function logout() {
    await api.logout();
    await refresh();
    router.push('/login');
  }

  const initial = me.username?.[0]?.toUpperCase() ?? '?';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className="h-9 w-9 rounded-full bg-rose-red text-cream font-semibold grid place-items-center hover:bg-rose-dark transition focus:outline-none focus:ring-2 focus:ring-rose-red/50"
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-64 rounded-lg border border-bourbon/20 bg-cream shadow-lg overflow-hidden z-20">
          <div className="px-4 py-3 border-b border-bourbon/15">
            <div className="text-sm font-semibold text-bourbon truncate">@{me.username}</div>
            <div className="text-xs text-bourbon/70 truncate">{me.email}</div>
            {me.is_admin && (
              <span className="mt-1 inline-block text-[10px] uppercase tracking-wide font-semibold text-mint-julep">
                Admin
              </span>
            )}
          </div>
          {editing ? (
            <UsernameForm
              current={me.username}
              onCancel={() => setEditing(false)}
              onSaved={async () => {
                await refresh();
                setEditing(false);
                setOpen(false);
              }}
            />
          ) : (
            <ul className="py-1 text-sm">
              <li>
                <button
                  onClick={() => setEditing(true)}
                  className="w-full text-left px-4 py-2 hover:bg-bourbon/10"
                >
                  Change username
                </button>
              </li>
              {me.is_admin && (
                <li>
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2 hover:bg-bourbon/10 text-mint-julep"
                  >
                    Admin portal
                  </Link>
                </li>
              )}
              <li>
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2 hover:bg-bourbon/10 text-rose-dark"
                >
                  Sign out
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function UsernameForm({
  current,
  onSaved,
  onCancel,
}: {
  current: string;
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.updateUsername(value.trim());
      await onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : 'Could not save username');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="px-4 py-3 space-y-2">
      <label className="block text-xs text-bourbon/70 font-semibold">New username</label>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        minLength={2}
        maxLength={20}
        pattern="[A-Za-z0-9_\-\.]+"
        className="w-full rounded border border-bourbon/30 px-2 py-1.5 text-sm bg-white"
      />
      {error && <p className="text-xs text-rose-dark">{error}</p>}
      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className="text-xs px-2 py-1 text-bourbon/70 hover:text-bourbon">
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy || value.length < 2 || value === current}
          className="text-xs px-3 py-1 rounded bg-rose-red text-cream disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
