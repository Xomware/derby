'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useMe } from '@/lib/hooks';
import type { Me } from '@/lib/types';

export function ProfileMenu({ me }: { me: Me }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const { refresh } = useMe();

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  async function logout() {
    await api.logout();
    // Clear the SWR cache immediately so AuthGate flips before any nav.
    await refresh(null, { revalidate: false });
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
          <ul className="py-1 text-sm">
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
        </div>
      )}
    </div>
  );
}
