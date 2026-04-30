'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { API_URL } from '@/lib/api';
import { useUsername } from '@/lib/identity';

/**
 * Mounted in the root layout. Pings /track/visit on every route change.
 * Skips admin routes so admin browsing doesn't pollute analytics.
 */
export function VisitTracker() {
  const pathname = usePathname();
  const params = useSearchParams();
  const { username } = useUsername();
  const lastFiredFor = useRef<string | null>(null);

  useEffect(() => {
    if (!username || !pathname) return;
    if (pathname.startsWith('/results/admin') || pathname.startsWith('/admin')) return;

    const pageKey = `${pathname}${params?.toString() ? `?${params}` : ''}`;
    const fingerprint = `${username}::${pageKey}`;
    if (lastFiredFor.current === fingerprint) return;
    lastFiredFor.current = fingerprint;

    fetch(`${API_URL}/track/visit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username,
        page: pathname,
        referrer: typeof document !== 'undefined' ? document.referrer || null : null,
      }),
      keepalive: true,
    }).catch(() => {
      // best effort; never block the UI
    });
  }, [pathname, params, username]);

  return null;
}
