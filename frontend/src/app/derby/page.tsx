'use client';

import { RacePage } from '@/components/RacePage';
import { EVENT_DERBY } from '@/lib/hooks';

export default function KentuckyDerbyPage() {
  return (
    <RacePage
      eventId={EVENT_DERBY}
      title="Kentucky Derby"
      eyebrow="Saturday, May 2, 2026"
    />
  );
}
