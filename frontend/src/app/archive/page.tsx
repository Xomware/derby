'use client';

import { useState } from 'react';
import useSWR from 'swr';

const ARCHIVE_YEARS: { year: number; hasDocx: boolean }[] = [
  { year: 2026, hasDocx: true },
  { year: 2025, hasDocx: true },
  { year: 2024, hasDocx: true },
  { year: 2023, hasDocx: true },
  { year: 2021, hasDocx: true },
];

export default function ArchivePage() {
  const [openYear, setOpenYear] = useState<number | null>(null);

  return (
    <section className="pt-8 max-w-3xl mx-auto space-y-6">
      <header>
        <p className="font-display italic text-mint-julep text-xs uppercase tracking-[0.3em]">
          Data archive
        </p>
        <h1 className="font-display text-3xl text-rose-dark mt-1">
          Grant&apos;s original documents
        </h1>
        <p className="text-sm text-bourbon/70 mt-1">
          Each year&apos;s writeup covers both the Derby and the Oaks. Download
          the original Word doc, the plain-text version, or read it inline.
        </p>
      </header>

      <div className="rounded-xl border border-bourbon/15 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-bourbon/70 border-b border-bourbon/15 bg-bourbon/5">
              <th className="py-2 px-3 sm:px-4">Year</th>
              <th className="py-2 px-2">.docx</th>
              <th className="py-2 px-2">.txt</th>
              <th className="py-2 px-2 text-right pr-4">View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bourbon/10">
            {ARCHIVE_YEARS.map((row) => {
              const expanded = openYear === row.year;
              return (
                <ArchiveRow
                  key={row.year}
                  year={row.year}
                  hasDocx={row.hasDocx}
                  expanded={expanded}
                  onToggle={() => setOpenYear(expanded ? null : row.year)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ArchiveRow({
  year,
  hasDocx,
  expanded,
  onToggle,
}: {
  year: number;
  hasDocx: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr>
        <td className="py-2.5 px-3 sm:px-4 font-display text-lg text-rose-dark">{year}</td>
        <td className="py-2.5 px-2">
          {hasDocx ? (
            <a
              href={`/archive-docs/derby-${year}.docx`}
              download
              className="text-xs px-2.5 py-1 rounded border border-bourbon/30 text-bourbon hover:bg-bourbon/10 transition inline-block"
            >
              Download
            </a>
          ) : (
            <span className="text-xs text-bourbon/40">—</span>
          )}
        </td>
        <td className="py-2.5 px-2">
          <a
            href={`/archive-docs/derby-${year}.txt`}
            download
            className="text-xs px-2.5 py-1 rounded border border-bourbon/30 text-bourbon hover:bg-bourbon/10 transition inline-block"
          >
            Download
          </a>
        </td>
        <td className="py-2.5 px-2 text-right pr-4">
          <button
            type="button"
            onClick={onToggle}
            className="text-xs px-2.5 py-1 rounded bg-rose-red text-cream hover:bg-rose-dark transition"
          >
            {expanded ? 'Hide' : 'Read inline'}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={4} className="bg-cream/40">
            <InlineDoc year={year} />
          </td>
        </tr>
      )}
    </>
  );
}

function InlineDoc({ year }: { year: number }) {
  const { data: text, error, isLoading } = useSWR<string>(
    ['archive-doc', year],
    async () => {
      const res = await fetch(`/archive-docs/derby-${year}.txt`);
      if (!res.ok) throw new Error('Not found');
      return res.text();
    }
  );

  if (isLoading) {
    return <div className="px-4 py-3 text-bourbon/70 text-sm">Loading…</div>;
  }
  if (error || !text) {
    return (
      <div className="px-4 py-3 text-bourbon/70 text-sm">
        Couldn&apos;t load the {year} writeup.
      </div>
    );
  }

  return (
    <pre className="m-3 max-h-[32rem] overflow-y-auto rounded-md border border-bourbon/15 bg-white p-3 text-[12px] leading-snug text-ink/90 whitespace-pre-wrap font-body">
      {text}
    </pre>
  );
}
