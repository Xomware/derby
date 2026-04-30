'use client';

import { CommentsBlock } from '@/components/CommentsBlock';
import { useComments, type RaceKind } from '@/lib/hooks';
import { useUsername } from '@/lib/identity';

export function HorseComments({
  kind,
  horseId,
}: {
  kind: RaceKind;
  horseId: string;
}) {
  const { username } = useUsername();
  const { comments, refresh, eventId } = useComments(kind, { horseId });

  return (
    <CommentsBlock
      eventId={eventId}
      horseId={horseId}
      comments={comments}
      username={username}
      onPosted={() => void refresh()}
      onDeleted={() => void refresh()}
      compact
      emptyText="No takes yet on this horse."
    />
  );
}
