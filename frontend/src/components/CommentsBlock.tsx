'use client';

import { useState } from 'react';
import { api, ApiError, type Comment } from '@/lib/api';

const MAX_LEN = 280;

export function CommentsBlock({
  eventId,
  horseId = null,
  comments,
  username,
  onPosted,
  onDeleted,
  compact = false,
  emptyText = 'No comments yet.',
}: {
  eventId: string;
  horseId?: string | null;
  comments: Comment[];
  username: string | null;
  onPosted: () => void;
  onDeleted: () => void;
  compact?: boolean;
  emptyText?: string;
}) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !eventId || !body.trim()) return;
    setPosting(true);
    setError(null);
    try {
      await api.commentsPost({
        event_id: eventId,
        username,
        body: body.trim(),
        horse_id: horseId,
      });
      setBody('');
      onPosted();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Failed to post');
    } finally {
      setPosting(false);
    }
  }

  async function onDelete(c: Comment) {
    if (!username || c.username !== username) return;
    if (!confirm('Delete this comment?')) return;
    setDeletingId(c.id);
    try {
      await api.commentsDelete({
        event_id: c.event_id,
        id: c.id,
        username,
      });
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section
      className={
        compact
          ? 'mt-3 pt-3 border-t border-bourbon/10'
          : 'rounded-xl border border-bourbon/15 bg-white p-4'
      }
    >
      {!compact && (
        <header className="mb-3">
          <h2 className="font-display text-xl text-bourbon">Talk yo shit</h2>
          <p className="text-xs text-bourbon/70 mt-0.5">
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}.
          </p>
        </header>
      )}
      {compact && (
        <div className="text-[11px] uppercase tracking-wider text-bourbon/60 font-semibold mb-2">
          Talk yo shit
        </div>
      )}

      {username && (
        <form onSubmit={onSubmit} className="space-y-2 mb-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX_LEN))}
            placeholder={compact ? 'Leave a take on this horse…' : 'Post a comment…'}
            rows={compact ? 1 : 2}
            className="w-full rounded border border-bourbon/30 bg-cream px-2 py-1.5 text-sm text-bourbon focus:outline-none focus:ring-2 focus:ring-rose-red/50 resize-y"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-bourbon/60">
              {body.length}/{MAX_LEN}
            </span>
            {error && <span className="text-xs text-rose-dark flex-1">{error}</span>}
            <button
              type="submit"
              disabled={posting || !body.trim()}
              className="rounded bg-rose-red px-3 py-1 text-xs font-semibold text-white hover:bg-rose-dark disabled:opacity-50 transition"
            >
              {posting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-2.5">
        {comments.length === 0 && (
          <li className="text-sm text-bourbon/60">{emptyText}</li>
        )}
        {comments.map((c) => {
          const mine = username && c.username === username;
          const dimmed = deletingId === c.id;
          return (
            <li
              key={c.id}
              className={`border-l-2 border-rose-red/30 pl-3 ${dimmed ? 'opacity-40' : ''}`}
            >
              <div className="flex items-baseline gap-2 text-xs">
                <span className="font-semibold text-rose-dark">@{c.username}</span>
                <span className="text-bourbon/50">{relativeTime(c.created_at)}</span>
                {mine && (
                  <button
                    type="button"
                    onClick={() => onDelete(c)}
                    disabled={dimmed}
                    className="ml-auto text-bourbon/50 hover:text-rose-red text-[11px]"
                    aria-label="Delete comment"
                  >
                    delete
                  </button>
                )}
              </div>
              <p className="text-sm text-ink/90 mt-0.5 whitespace-pre-wrap">{c.body}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function relativeTime(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
