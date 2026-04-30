'use client';

import { RacePage } from '@/components/RacePage';
import { EVENT_OAKS } from '@/lib/hooks';

export default function KentuckyOaksPage() {
  return (
    <RacePage
      eventId={EVENT_OAKS}
      title="Kentucky Oaks"
      eyebrow="Friday, May 1, 2026"
    />
  );
}
