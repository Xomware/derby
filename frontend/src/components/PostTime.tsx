'use client';

interface PostTimeProps {
  iso: string;
  /** Compact mode drops the weekday/date, shows just the clock time. */
  compact?: boolean;
  className?: string;
}

const TIME_FMT: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/New_York',
  timeZoneName: 'short',
};

const DATE_FMT: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'America/New_York',
};

export function PostTime({ iso, compact, className }: PostTimeProps) {
  const d = new Date(iso);
  const time = new Intl.DateTimeFormat('en-US', TIME_FMT).format(d);
  if (compact) {
    return (
      <span className={className}>
        <span className="text-bourbon/70 mr-1">Post:</span>
        <span className="font-semibold text-rose-dark">{time}</span>
      </span>
    );
  }
  const date = new Intl.DateTimeFormat('en-US', DATE_FMT).format(d);
  return (
    <span className={className}>
      <span className="text-bourbon/70 mr-1">Post:</span>
      <span className="font-semibold text-rose-dark">
        {date} · {time}
      </span>
    </span>
  );
}
