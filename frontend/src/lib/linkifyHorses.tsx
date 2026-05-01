import { Fragment, type ReactNode } from 'react';
import { HorseLink } from '@/components/HorseLink';
import type { RaceKind } from '@/lib/hooks';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Walk the text and wrap any horse-name occurrence in a HorseLink. Names
 * are matched case-insensitively against word boundaries. Longer names
 * win over shorter ones (e.g. "Corona De Oro" before "Corona").
 */
export function linkifyHorses(
  text: string,
  horseNames: string[],
  kind: RaceKind,
  className?: string
): ReactNode {
  if (horseNames.length === 0) return text;
  const sorted = [...horseNames].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(
    `\\b(${sorted.map(escapeRegex).join('|')})\\b`,
    'gi'
  );
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const matched = m[0];
    const canonical =
      sorted.find((n) => n.toLowerCase() === matched.toLowerCase()) ?? matched;
    out.push(
      <HorseLink
        key={`${m.index}-${matched}`}
        name={canonical}
        kind={kind}
        className={
          className ??
          'underline underline-offset-2 decoration-bourbon/30 hover:decoration-rose-red hover:text-rose-red transition-colors text-left font-semibold'
        }
      >
        {matched}
      </HorseLink>
    );
    last = m.index + matched.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.map((node, i) => <Fragment key={i}>{node}</Fragment>);
}
