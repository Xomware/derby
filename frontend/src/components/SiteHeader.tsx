'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMe } from '@/lib/hooks';
import { ProfileMenu } from './ProfileMenu';

const NAV_ITEMS: { href: string; label: string }[] = [
  { href: '/', label: 'Home' },
  { href: '/picks', label: 'Picks' },
  { href: '/rationale', label: 'Rationale' },
  { href: '/results', label: 'Live Results' },
  { href: '/leaderboard', label: 'Leaderboard' },
];

export function SiteHeader() {
  const { me } = useMe();
  const pathname = usePathname() ?? '/';
  const isAuthScreen = pathname === '/login' || pathname.startsWith('/auth/');

  if (isAuthScreen) {
    return (
      <header className="border-b border-rose-red/15 bg-cream/85 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-center">
          <Link href="/" aria-label="Sun God Derby">
            <Image
              src="/banner.png"
              alt="Sun God Derby"
              width={240}
              height={56}
              priority
              className="h-10 w-auto"
            />
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-rose-red/15 bg-cream/85 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {me ? (
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-2.5 py-1.5 rounded text-sm whitespace-nowrap transition ${
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
        ) : (
          <Link href="/" aria-label="Sun God Derby">
            <Image
              src="/banner.png"
              alt="Sun God Derby"
              width={200}
              height={48}
              priority
              className="h-9 w-auto"
            />
          </Link>
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
    </header>
  );
}
