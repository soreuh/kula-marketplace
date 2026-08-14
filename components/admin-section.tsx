/**
 * Collapsible admin section — native <details>, zero client JS, so it
 * works inside server components and stays keyboard-accessible for free.
 * Collapsed by default (pass defaultOpen for exceptions — e.g. listings
 * when a suspension is pending, so moderation is never hidden in a drawer).
 */
export default function AdminSection({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-2xl border border-ink/5 bg-white p-6 shadow-sm"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <span className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-display text-xl font-bold lowercase">{title}</h2>
            {badge}
          </span>
          {subtitle && <p className="mt-1 text-sm text-fog">{subtitle}</p>}
        </div>
        <span
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mist text-fog transition-transform group-open:rotate-180"
          aria-hidden
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </summary>
      <div className="mt-5">{children}</div>
    </details>
  );
}
