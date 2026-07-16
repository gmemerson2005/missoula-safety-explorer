"use client";
// Client Component — error boundaries must be. In this Next version the
// recovery prop is `unstable_retry`, which re-fetches server data and
// re-renders the segment (the older `reset` only clears state without
// re-fetching).

export default function AnalystError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-danger">
        Console fault
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">
        The analyst console failed to load
      </h1>
      <p className="mt-3 leading-7 text-muted">
        Something went wrong while rendering county data. This is usually a
        temporary problem with the upstream county API rather than your
        session.
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
