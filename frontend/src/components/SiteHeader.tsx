'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useMe } from '@/lib/hooks';

export function SiteHeader() {
  const { me, refresh } = useMe();
  const router = useRouter();
  const pathname = usePathname() ?? '/';

  async function logout() {
    await api.logout();
    await refresh();
    router.push('/login');
  }

  // Hide nav links on the auth screens — they'd 404-redirect anyway.
  const isAuthScreen = pathname === '/login' || pathname.startsWith('/auth/');

  return (
    <header className="border-b border-rose-red/15 bg-cream/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href={me ? '/' : '/login'} className="flex items-center gap-3">
          <Image
            src="/icon.png"
            alt="Sun God Derby"
            width={36}
            height={36}
            priority
            className="h-9 w-9"
          />
          <Image
            src="/banner.png"
            alt="Sun God Derby"
            width={210}
            height={48}
            priority
            className="hidden sm:block h-10 w-auto"
          />
          <span className="sm:hidden font-display text-bourbon text-lg">
            Sun God Derby
          </span>
        </Link>
        {!isAuthScreen && (
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
        )}
      </div>
    </header>
  );
}
