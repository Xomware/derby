'use client';

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

function Line({ text }: { text: string }) {
  // Strip + count trailing $ markers (e.g., "Renegade to Win $$$").
  const m = text.match(/^(.*?)(\s*\$+)\s*$/);
  if (m) {
    const lead = m[1].trim();
    const count = m[2].trim().length;
    return (
      <span>
        <span>{lead}</span>
        <StakeBadge count={count} />
      </span>
    );
  }
  return <span>{text}</span>;
}

export function BettingPlays({ body }: { body: string }) {
  const sections = parseSections(body);

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
                  <Line text={l} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
