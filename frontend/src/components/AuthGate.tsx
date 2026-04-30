'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useMe, useTrackVisit } from '@/lib/hooks';
import { useGuestName } from '@/lib/guest';

const PUBLIC_ROUTES = ['/login', '/signup'];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const { me, isLoading } = useMe();
  const guestName = useGuestName();
  useTrackVisit();

  const allowed = !!me || !!guestName;

  useEffect(() => {
    if (isLoading) return;
    if (isPublic(pathname)) return;
    if (!allowed) router.replace('/login');
  }, [isLoading, allowed, pathname, router]);

  if (isPublic(pathname)) return <>{children}</>;
  if (isLoading) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-bourbon/70 text-sm">
        Loading…
      </div>
    );
  }
  if (!allowed) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-bourbon/70 text-sm">
        Redirecting to sign in…
      </div>
    );
  }
  return <>{children}</>;
}
