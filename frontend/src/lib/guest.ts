'use client';

import { useEffect, useState } from 'react';

const GUEST_NAME_KEY = 'derby_guest_name';

const RESERVED_GUEST = new Set([
  'admin',
  'administrator',
  'root',
  'system',
  'moderator',
  'grant',
  'derby',
]);

export function isValidGuestName(name: string): { ok: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'Pick a name to use' };
  if (trimmed.length < 2) return { ok: false, error: 'Name must be at least 2 characters' };
  if (trimmed.length > 30) return { ok: false, error: 'Keep it under 30 characters' };
  if (!/^[\p{L}\p{N}_\-\.\s]+$/u.test(trimmed)) {
    return { ok: false, error: 'Letters, numbers, spaces, _ - . only' };
  }
  if (RESERVED_GUEST.has(trimmed.toLowerCase())) {
    return { ok: false, error: 'That name is reserved — pick another' };
  }
  return { ok: true };
}

export function setGuestName(name: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(GUEST_NAME_KEY, name.trim());
  window.dispatchEvent(new Event('derby-guest-changed'));
}

export function clearGuestName(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(GUEST_NAME_KEY);
  window.dispatchEvent(new Event('derby-guest-changed'));
}

export function readGuestName(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(GUEST_NAME_KEY);
}

/** Reactive read of the guest-name. Updates when set/clear/setName fire,
 *  including from other tabs (storage event). */
export function useGuestName(): string | null {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    setName(readGuestName());
    function onChange() {
      setName(readGuestName());
    }
    window.addEventListener('derby-guest-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('derby-guest-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  return name;
}
