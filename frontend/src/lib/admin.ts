'use client';

import { useEffect, useState } from 'react';

const KEY = 'derby_admin_token';

export function readAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(KEY);
}

export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, token);
  window.dispatchEvent(new Event('derby-admin-token-changed'));
}

export function clearAdminToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event('derby-admin-token-changed'));
}

export function useAdminToken(): { token: string | null; loading: boolean } {
  const [token, setT] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setT(readAdminToken());
    setLoading(false);
    function onChange() {
      setT(readAdminToken());
    }
    window.addEventListener('derby-admin-token-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('derby-admin-token-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);
  return { token, loading };
}
