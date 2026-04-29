'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useMe, useTrackVisit } from '@/lib/hooks';

const PUBLIC_ROUTES = ['/login', '/auth/verify'];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const { me, isLoading } = useMe();
  useTrackVisit();

  useEffect(() => {
    if (isLoading) return;
    if (isPublic(pathname)) return;
    if (!me) router.replace('/login');
  }, [isLoading, me, pathname, router]);

  if (isPublic(pathname)) return <>{children}</>;
  if (isLoading) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-bourbon/70 text-sm">
        Loading…
      </div>
    );
  }
  if (!me) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-bourbon/70 text-sm">
        Redirecting to sign in…
      </div>
    );
  }
  return <>{children}</>;
}
