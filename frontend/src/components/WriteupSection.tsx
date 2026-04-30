'use client';

export function WriteupSection({
  title,
  body,
  tone = 'neutral',
}: {
  title: string;
  body: string;
  tone?: 'neutral' | 'rose' | 'mint';
}) {
  if (!body) return null;

  const toneClasses =
    tone === 'rose'
      ? 'border-rose-red/30 bg-rose-red/5'
      : tone === 'mint'
      ? 'border-mint-julep/30 bg-mint-julep/5'
      : 'border-bourbon/15 bg-white';

  return (
    <section className={`rounded-xl border p-4 ${toneClasses}`}>
      <header className="mb-2">
        <h2 className="font-display text-xl text-rose-dark">{title}</h2>
      </header>
      <div className="text-sm text-ink/90 leading-relaxed whitespace-pre-wrap">
        {body}
      </div>
    </section>
  );
}
