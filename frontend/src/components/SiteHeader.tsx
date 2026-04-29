'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMe } from '@/lib/hooks';
import { ProfileMenu } from './ProfileMenu';

const NAV_ITEMS: { href: string; label: string; admin?: boolean }[] = [
  { href: '/', label: 'Picks' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/admin', label: 'Admin', admin: true },
];

export function SiteHeader() {
  const { me } = useMe();
  const pathname = usePathname() ?? '/';
  const isAuthScreen = pathname === '/login' || pathname.startsWith('/auth/');

  return (
    <header className="border-b border-rose-red/15 bg-cream/85 backdrop-blur sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href={me ? '/' : '/login'} className="flex items-center" aria-label="Sun God Derby — home">
          <Image
            src="/banner.png"
            alt="Sun God Derby"
            width={260}
            height={60}
            priority
            className="h-12 w-auto sm:h-14"
          />
        </Link>

        {!isAuthScreen && (
          <div className="flex items-center gap-1 sm:gap-3">
            {me && (
              <nav className="flex items-center gap-1 sm:gap-2 text-sm">
                {NAV_ITEMS.filter((item) => !item.admin || me.is_admin).map((item) => {
                  const active =
                    item.href === '/'
                      ? pathname === '/'
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-2.5 py-1.5 rounded text-sm transition ${
                        active
                          ? 'bg-rose-red/10 text-rose-dark font-semibold'
                          : 'text-bourbon hover:text-rose-red'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            )}
            {me ? (
              <ProfileMenu me={me} />
            ) : (
              <Link
                href="/login"
                className="text-sm px-3 py-1.5 rounded bg-rose-red text-cream hover:bg-rose-dark"
              >
                Sign in
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
