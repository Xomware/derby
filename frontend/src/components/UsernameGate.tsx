'use client';

import { useState } from 'react';
import { UsernameModal } from './UsernameModal';
import { useUsername } from '@/lib/identity';

/**
 * Wraps every page. If the visitor doesn't have a name in localStorage we pop
 * the username modal — they can't dismiss it. Once they pick a name the
 * modal closes and the page renders.
 */
export function UsernameGate({ children }: { children: React.ReactNode }) {
  const { username, loading } = useUsername();
  const [closed, setClosed] = useState(false);

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-bourbon/70 text-sm">
        Loading…
      </div>
    );
  }

  if (!username) {
    return (
      <>
        {/* Placeholder so the page has some structure behind the modal */}
        <div className="min-h-[60vh] grid place-items-center text-bourbon/40 text-sm">
          …
        </div>
        <UsernameModal
          open={!closed}
          onClose={() => setClosed(true)}
          mode="first-time"
        />
      </>
    );
  }

  return <>{children}</>;
}
