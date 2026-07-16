"use client";
// Client Component — error boundaries must be. Uses this Next version's
// `unstable_retry` recovery prop, which re-fetches server data and
// re-renders the segment (unlike the older `reset`).

export default function HomeError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-danger">
        Feed fault
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">
        This page failed to load
      </h1>
      <p className="mt-3 leading-7 text-muted">
        Something went wrong while rendering county data. The county&apos;s
        open-data service may be briefly unavailable — retrying usually
        clears it.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-faint">ref: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="mt-6 border border-tier px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-tier-text hover:border-foreground hover:text-foreground"
      >
        Retry
      </button>
    </main>
  );
}
