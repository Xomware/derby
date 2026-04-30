'use client';

import { useState } from 'react';
import { api, ApiError, type Comment } from '@/lib/api';

const MAX_LEN = 280;

export function CommentsBlock({
  eventId,
  comments,
  username,
  onPosted,
}: {
  eventId: string;
  comments: Comment[];
  username: string | null;
  onPosted: () => void;
}) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !eventId || !body.trim()) return;
    setPosting(true);
    setError(null);
    try {
      await api.commentsPost({ event_id: eventId, username, body: body.trim() });
      setBody('');
      onPosted();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Failed to post');
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="rounded-xl border border-bourbon/15 bg-white p-4">
      <header className="mb-3">
        <h2 className="font-display text-xl text-bourbon">Comments</h2>
        <p className="text-xs text-bourbon/70 mt-0.5">
          Talk smack. {comments.length} {comments.length === 1 ? 'comment' : 'comments'}.
        </p>
      </header>

      {username && (
        <form onSubmit={onSubmit} className="space-y-2 mb-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX_LEN))}
            placeholder="Post a comment…"
            rows={2}
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

      <ul className="space-y-3">
        {comments.length === 0 && (
          <li className="text-sm text-bourbon/60">No comments yet.</li>
        )}
        {comments.map((c) => (
          <li key={c.id} className="border-l-2 border-rose-red/30 pl-3">
            <div className="flex items-baseline gap-2 text-xs">
              <span className="font-semibold text-rose-dark">@{c.username}</span>
              <span className="text-bourbon/50">{relativeTime(c.created_at)}</span>
            </div>
            <p className="text-sm text-ink/90 mt-0.5 whitespace-pre-wrap">{c.body}</p>
          </li>
        ))}
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
