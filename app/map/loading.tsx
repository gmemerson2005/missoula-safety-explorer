// Server Component — instant skeleton for the landing page while server
// components fetch county counts and geometry. The shimmer animation is
// frozen by globals.css under prefers-reduced-motion.

export default function HomeLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8" aria-busy="true">
      <div className="skeleton h-3 w-48" />
      <div className="skeleton mt-3 h-9 w-80" />
      <div className="skeleton mt-4 h-4 w-full max-w-2xl" />
      <div className="skeleton mt-2 h-4 w-2/3 max-w-xl" />
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-28 border border-line" />
        ))}
      </div>
      <div className="skeleton mt-8 h-[420px] border border-line" />
      {/* role="status" so screen readers announce the wait (aria-busy alone
          is silent in most of them). */}
      <p role="status" className="sr-only">
        Loading county data…
      </p>
    </main>
  );
}
