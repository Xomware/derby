'use client';

import { Fragment, useMemo } from 'react';
import { HorseLink } from './HorseLink';
import type { RaceKind } from '@/lib/hooks';

interface Section {
  heading: string | null;
  lines: string[];
}

function parseSections(body: string): Section[] {
  const blocks = body.split(/\n\s*\n/);
  return blocks.map((block) => {
    const rawLines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (rawLines.length === 0) return { heading: null, lines: [] };
    const first = rawLines[0];
    if (first.endsWith(':')) {
      return { heading: first.replace(/:$/, ''), lines: rawLines.slice(1) };
    }
    return { heading: null, lines: rawLines };
  });
}

function StakeBadge({ count }: { count: number }) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-mint-julep/15 text-mint-julep ml-1.5"
      title={
        count >= 4
          ? 'Big stake'
          : count === 3
          ? 'Strong play'
          : count === 2
          ? 'Solid'
          : 'Sprinkle'
      }
    >
      {'$'.repeat(Math.min(count, 5))}
    </span>
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Walk the text and wrap any horse-name occurrence in a HorseLink. Names
 * are matched case-insensitively against word boundaries. Longer names
 * win over shorter ones (e.g., "Corona De Oro" before "Corona").
 */
function linkifyHorses(
  text: string,
  horseNames: string[],
  kind: RaceKind
): React.ReactNode {
  if (horseNames.length === 0) return text;
  const sorted = [...horseNames].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(
    `\\b(${sorted.map(escapeRegex).join('|')})\\b`,
    'gi'
  );
  const out: React.ReactNode[] = [];
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
        className="underline underline-offset-2 decoration-bourbon/30 hover:decoration-rose-red hover:text-rose-red transition-colors text-left font-semibold"
      >
        {matched}
      </HorseLink>
    );
    last = m.index + matched.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.map((node, i) => <Fragment key={i}>{node}</Fragment>);
}

function Line({
  text,
  horseNames,
  kind,
}: {
  text: string;
  horseNames: string[];
  kind: RaceKind;
}) {
  // Strip + count trailing $ markers (e.g., "Renegade to Win $$$").
  const m = text.match(/^(.*?)(\s*\$+)\s*$/);
  if (m) {
    const lead = m[1].trim();
    const count = m[2].trim().length;
    return (
      <span>
        <span>{linkifyHorses(lead, horseNames, kind)}</span>
        <StakeBadge count={count} />
      </span>
    );
  }
  return <span>{linkifyHorses(text, horseNames, kind)}</span>;
}

export function BettingPlays({
  body,
  horseNames = [],
  kind,
}: {
  body: string;
  horseNames?: string[];
  kind: RaceKind;
}) {
  const sections = useMemo(() => parseSections(body), [body]);

  return (
    <div className="space-y-5">
      {sections.map((section, idx) => {
        if (section.lines.length === 0 && !section.heading) return null;
        return (
          <section
            key={idx}
            className="rounded-lg border border-bourbon/15 bg-white px-4 py-3"
          >
            {section.heading && (
              <h3 className="text-[11px] uppercase tracking-wider font-semibold text-rose-dark mb-2">
                {section.heading}
              </h3>
            )}
            <ul className="space-y-1.5 text-sm text-ink/90 leading-relaxed">
              {section.lines.map((l, i) => (
                <li
                  key={i}
                  className="pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-rose-red"
                >
                  <Line text={l} horseNames={horseNames} kind={kind} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
