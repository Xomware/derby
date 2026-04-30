'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useUsername } from '@/lib/identity';
import { UsernameModal } from './UsernameModal';
import { YearSelector } from './YearSelector';

const NAV_ITEMS: { href: string; label: string }[] = [
  { href: '/', label: 'Home' },
  { href: '/derby', label: 'Derby' },
  { href: '/oaks', label: 'Oaks' },
  { href: '/picks', label: 'Picks' },
  { href: '/results', label: 'Live Results' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/archive', label: 'Archive' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const { username } = useUsername();
  const pathname = usePathname() ?? '/';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [editName, setEditName] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onDown(e: MouseEvent) {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target as Node)
      ) {
        setMobileOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [mobileOpen]);

  const Brand = (
    <Link href="/" className="flex items-center shrink-0" aria-label="Sun God Derby">
      <Image
        src="/banner.png"
        alt="Sun God Derby"
        width={200}
        height={48}
        priority
        className="h-9 w-auto sm:h-10"
      />
    </Link>
  );

  return (
    <>
      <header className="border-b border-rose-red/15 bg-cream/85 backdrop-blur sticky top-0 z-30">
        <div
          className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 relative"
          ref={mobileMenuRef}
        >
          {Brand}

          {username && (
            <nav className="hidden md:flex flex-1 items-center justify-center gap-1 lg:gap-2">
              {NAV_ITEMS.map((item) => {
                const active = isActive(pathname, item.href);
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
          )}

          <div className="ml-auto flex items-center gap-2 shrink-0">
            {username && <YearSelector className="hidden sm:inline-flex" />}
            {username && ['DOM', 'GRANT', 'GTATICH'].includes(username.toUpperCase()) && (
              <Link
                href="/admin"
                className="hidden sm:inline-flex text-xs px-2.5 py-1 rounded-full border border-rose-red/40 text-rose-dark bg-rose-red/5 hover:bg-rose-red/10 font-semibold"
                title="Admin"
              >
                Admin
              </Link>
            )}
            {username && (
              <button
                onClick={() => setEditName(true)}
                className="hidden sm:inline-flex text-xs px-2.5 py-1 rounded-full border border-bourbon/30 text-bourbon hover:bg-bourbon/10"
                title="Change name"
              >
                @{username}
              </button>
            )}
            {username && (
              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle navigation"
                aria-expanded={mobileOpen}
                className="md:hidden h-9 w-9 rounded border border-bourbon/30 grid place-items-center hover:bg-bourbon/10 transition focus:outline-none focus:ring-2 focus:ring-rose-red/50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  {mobileOpen ? (
                    <path d="M6 6l12 12M6 18L18 6" />
                  ) : (
                    <>
                      <path d="M3 7h18" />
                      <path d="M3 12h18" />
                      <path d="M3 17h18" />
                    </>
                  )}
                </svg>
              </button>
            )}
          </div>

          {username && mobileOpen && (
            <nav
              className="md:hidden absolute left-0 right-0 top-full bg-cream border-b border-bourbon/20 shadow-lg"
              aria-label="Mobile navigation"
            >
              <ul className="max-w-6xl mx-auto px-4 py-2">
                {NAV_ITEMS.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`block px-2 py-2.5 rounded text-base transition ${
                          active
                            ? 'bg-rose-red/10 text-rose-dark font-semibold'
                            : 'text-bourbon hover:bg-bourbon/10'
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
                <li className="border-t border-bourbon/15 mt-2 pt-2 flex items-center justify-between gap-2 px-2 py-2">
                  <span className="text-bourbon/70 text-sm">Year</span>
                  <YearSelector />
                </li>
                <li>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      setEditName(true);
                    }}
                    className="w-full text-left px-2 py-2.5 text-bourbon/70 hover:text-rose-red text-sm"
                  >
                    Change name (@{username})
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </header>

      <UsernameModal
        open={editName}
        onClose={() => setEditName(false)}
        mode="change"
      />
    </>
  );
}
