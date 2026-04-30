'use client';

import { useEffect, useState } from 'react';

const KEY = 'derby_username';

const RESERVED = new Set([
  'ADMIN',
  'ADMINISTRATOR',
  'ROOT',
  'SYSTEM',
  'MODERATOR',
]);

export function canonicalizeUsername(name: string): string {
  return name.trim().toUpperCase();
}

export function isValidUsername(name: string): { ok: boolean; error?: string } {
  const t = canonicalizeUsername(name);
  if (!t) return { ok: false, error: 'Pick a name' };
  if (t.length < 2) return { ok: false, error: 'At least 2 characters' };
  if (t.length > 30) return { ok: false, error: 'Keep it under 30 characters' };
  if (!/^[\p{L}\p{N}_\-\.\s]+$/u.test(t)) {
    return { ok: false, error: 'Letters, numbers, spaces, _ - . only' };
  }
  if (RESERVED.has(t)) {
    return { ok: false, error: 'That name is reserved — pick another' };
  }
  return { ok: true };
}

export function readUsername(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(KEY);
  return raw ? canonicalizeUsername(raw) : null;
}

export function setUsername(name: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, canonicalizeUsername(name));
  window.dispatchEvent(new Event('derby-username-changed'));
}

export function clearUsername(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event('derby-username-changed'));
}

export function useUsername(): { username: string | null; loading: boolean } {
  const [username, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setName(readUsername());
    setLoading(false);
    function onChange() {
      setName(readUsername());
    }
    window.addEventListener('derby-username-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('derby-username-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  return { username, loading };
}
