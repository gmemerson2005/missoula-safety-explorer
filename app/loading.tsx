// Server Component — instant skeleton for the landing page while the layer
// counts are fetched. The shimmer animation is frozen by globals.css under
// prefers-reduced-motion.

export default function LandingLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 pt-16 sm:pt-24" aria-busy="true">
      <div className="skeleton h-3 w-48" />
      <div className="skeleton mt-4 h-16 w-full max-w-3xl" />
      <div className="skeleton mt-2 h-16 w-2/3 max-w-2xl" />
      <div className="skeleton mt-6 h-1.5 w-full max-w-md" />
      <div className="skeleton mt-6 h-5 w-full max-w-2xl" />
      <div className="mt-8 flex gap-3">
        <div className="skeleton h-12 w-48" />
        <div className="skeleton h-12 w-48" />
      </div>
      {/* role="status" so screen readers announce the wait (aria-busy alone
          is silent in most of them). */}
      <p role="status" className="sr-only">
        Loading…
      </p>
    </main>
  );
}
