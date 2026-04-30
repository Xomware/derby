'use client';

import { useEffect, useState } from 'react';

export interface SidePanelItem {
  id: string;
  label: string;
  /** Smaller secondary line, e.g. "5-1 · ★★★★★" */
  meta?: string;
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
                        : 'text-bourbon hover:bg-bourbon/10'
                    }`}
                  >
                    <div>{it.label}</div>
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

      {/* Desktop sticky sidebar */}
      <aside
        className={`hidden lg:block sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-bourbon/15 bg-white p-3 shadow-sm ${className}`}
        aria-label={title}
      >
        <h3 className="font-display text-sm text-rose-dark px-2 pb-2 mb-1 border-b border-bourbon/15">
          {title}
        </h3>
        <ul className="space-y-0.5">
          {items.map((it) => (
            <li key={it.id}>
              <button
                onClick={() => jumpTo(it.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-sm transition ${
                  activeId === it.id
                    ? 'bg-rose-red/10 text-rose-dark font-semibold'
                    : 'text-bourbon hover:bg-bourbon/10'
                }`}
              >
                <div className="truncate">{it.label}</div>
                {it.meta && (
                  <div className="text-[11px] text-bourbon/60 mt-0.5 truncate">
                    {it.meta}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}
