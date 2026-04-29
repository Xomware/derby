'use client';

import Link from 'next/link';
import { useMe } from '@/lib/hooks';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export function SiteHeader() {
  const { me, refresh } = useMe();
  const router = useRouter();

  async function logout() {
    await api.logout();
    await refresh();
    router.push('/');
  }

  return (
    <header className="border-b border-rose-red/15 bg-cream/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block w-8 h-8 rounded-full bg-rose-red text-cream font-display font-bold grid place-items-center"
          >
            S
          </span>
          <span className="font-display text-xl text-rose-dark">Sun Oracle</span>
          <span className="hidden sm:inline text-xs text-bourbon/70">
            Grant&apos;s Derby Picks
          </span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/leaderboard" className="hover:text-rose-red">
            Leaderboard
          </Link>
          {me?.is_admin && (
            <Link href="/admin" className="hover:text-rose-red">
              Admin
            </Link>
          )}
          {me ? (
            <div className="flex items-center gap-2">
              <span className="text-bourbon/80">@{me.username}</span>
              <button
                onClick={logout}
                className="text-xs px-2 py-1 rounded border border-bourbon/30 hover:bg-bourbon/10"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs px-3 py-1.5 rounded bg-rose-red text-cream hover:bg-rose-dark"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
