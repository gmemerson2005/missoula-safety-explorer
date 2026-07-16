// Server Component — instant skeleton for the analyst console while the
// server fetches county tables. Uses the .skeleton shimmer, which globals.css
// freezes under prefers-reduced-motion.

export default function AnalystLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8" aria-busy="true">
      <div className="skeleton h-3 w-40" />
      <div className="skeleton mt-3 h-8 w-72" />
      <div className="skeleton mt-4 h-4 w-full max-w-2xl" />
      <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="skeleton h-44 border border-line" />
        <div className="skeleton h-44 border border-line" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="mt-10">
          <div className="skeleton h-4 w-56" />
          <div className="skeleton mt-3 h-64 border border-line" />
        </div>
      ))}
      {/* role="status" so screen readers announce the wait (aria-busy alone
          is silent in most of them). */}
      <p role="status" className="sr-only">
        Loading analyst data…
      </p>
    </main>
  );
}
