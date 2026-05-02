'use client';

import { useEffect, useState } from 'react';

export interface SidePanelItem {
  id: string;
  label: string;
  /** Smaller secondary line, e.g. "5-1 · ★★★★★" */
  meta?: string;
  /** Render with strikethrough + dim — picked up scratches. */
  scratched?: boolean;
  /** Finish position once results post — adds 🥇/🥈/🥉/4th badge. */
  finishPosition?: number | null;
}

const POSITION_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function ordinal(n: number): string {
  if (POSITION_MEDAL[n]) {
    return n === 1 ? '1st' : n === 2 ? '2nd' : '3rd';
  }
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function FinishBadge({ position, compact }: { position: number; compact?: boolean }) {
  const medal = POSITION_MEDAL[position];
  return (
    <span
      className={`shrink-0 inline-flex items-center gap-0.5 ${
        compact ? 'text-[10px]' : 'text-[11px]'
      }`}
      title={ordinal(position)}
    >
      {medal ? (
        <span aria-hidden className="text-sm leading-none">
          {medal}
        </span>
      ) : (
        <span className="font-semibold text-bourbon/70">{ordinal(position)}</span>
      )}
    </span>
  );
}

/**
 * Sticky list of jump-to anchors. Sticky on >= sm, slides in as a drawer on
 * mobile via a floating "Jump to" button.
 */
export function SidePanel({
  title,
  items,
  className = '',
}: {
  title: string;
  items: SidePanelItem[];
  className?: string;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Highlight the currently visible anchor.
  useEffect(() => {
    if (typeof window === 'undefined' || items.length === 0) return;
    const targets: HTMLElement[] = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => !!el);

    if (!targets.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) {
          // Pick the topmost visible
          const top = visible
            .map((e) => ({
              id: e.target.id,
              top: e.boundingClientRect.top,
            }))
            .sort((a, b) => a.top - b.top)[0];
          setActiveId(top.id);
        }
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: 0 }
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [items]);

  function jumpTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Mirror to URL hash so refresh / share lands at the same anchor.
    const url = new URL(window.location.href);
    url.hash = id;
    window.history.replaceState(null, '', url.toString());
    setDrawerOpen(false);
  }

  if (items.length === 0) return null;

  return (
    <>
      {/* Mobile drawer trigger */}
      <button
        type="button"
        onClick={() => setDrawerOpen((v) => !v)}
        aria-label="Jump to a horse"
        aria-expanded={drawerOpen}
        className="lg:hidden fixed bottom-16 sm:bottom-20 right-4 z-30 rounded-full bg-rose-red text-cream shadow-lg px-4 py-2 text-sm font-semibold hover:bg-rose-dark transition"
      >
        {drawerOpen ? 'Close' : 'Jump to →'}
      </button>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-ink/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDrawerOpen(false);
          }}
        >
          <aside className="absolute right-0 top-0 bottom-0 w-72 max-w-[85%] bg-cream border-l border-bourbon/20 shadow-xl overflow-y-auto">
            <div className="px-4 py-3 border-b border-bourbon/15">
              <h3 className="font-display text-lg text-rose-dark">{title}</h3>
            </div>
            <ul className="p-2">
              {items.map((it) => (
                <li key={it.id}>
                  <button
                    onClick={() => jumpTo(it.id)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                      activeId === it.id
                        ? 'bg-rose-red/10 text-rose-dark font-semibold'
                        : it.scratched
                        ? 'text-bourbon/40 hover:bg-bourbon/10'
                        : 'text-bourbon hover:bg-bourbon/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex-1 ${
                          it.scratched ? 'line-through decoration-rose-red/60' : ''
                        }`}
                      >
                        {it.label}
                      </span>
                      {it.finishPosition != null && !it.scratched && (
                        <FinishBadge position={it.finishPosition} />
                      )}
                    </div>
                    {it.meta && (
                      <div className="text-xs text-bourbon/60 mt-0.5">{it.meta}</div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}

      {/* Desktop sticky sidebar — compact so a 20+ horse list fits without
          inner-scroll on a typical screen. */}
      <aside
        className={`hidden lg:block sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-bourbon/15 bg-white py-2 shadow-sm text-xs ${className}`}
        aria-label={title}
      >
        <h3 className="font-display text-xs uppercase tracking-wider text-rose-dark px-2.5 pb-1.5 mb-0.5 border-b border-bourbon/15">
          {title}
        </h3>
        <ul>
          {items.map((it) => (
            <li key={it.id}>
              <button
                onClick={() => jumpTo(it.id)}
                className={`w-full text-left px-2.5 py-1 rounded text-[12px] leading-tight transition flex items-center gap-2 ${
                  activeId === it.id
                    ? 'bg-rose-red/10 text-rose-dark font-semibold'
                    : it.scratched
                    ? 'text-bourbon/40 hover:bg-bourbon/10'
                    : 'text-bourbon hover:bg-bourbon/10'
                }`}
              >
                <span
                  className={`truncate flex-1 ${
                    it.scratched ? 'line-through decoration-rose-red/60' : ''
                  }`}
                >
                  {it.label}
                </span>
                {it.finishPosition != null && !it.scratched && (
                  <FinishBadge position={it.finishPosition} compact />
                )}
                {it.meta && (
                  <span className="text-[10px] text-bourbon/60 tabular-nums shrink-0">
                    {it.meta}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}
