// Server Component (no directive) — static chrome rendered once on the
// server. The two interactive/URL-aware pieces (RoleToggle, RoleStrip) are
// small client islands; both call useSearchParams, so each sits behind a
// <Suspense> boundary with a same-size fallback to avoid layout shift.

import Link from "next/link";
import { Suspense } from "react";
import RoleStrip from "./RoleStrip";
import RoleToggle from "./RoleToggle";

function StripFallback() {
  return (
    <div className="border-b border-line bg-surface px-4 py-1 font-mono text-[11px] uppercase tracking-[0.25em] text-faint">
      Resolving view…
    </div>
  );
}

export default function Header({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <header className="sticky top-0 z-[1000]">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line bg-background/95 px-4 py-3 backdrop-blur">
        <Link
          href="/"
          className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-foreground hover:text-accent-hover"
        >
          <span className="text-accent">▲</span> Missoula Public Safety Explorer
        </Link>
        <nav
          aria-label="Primary"
          className="flex items-center gap-4 font-mono text-xs uppercase tracking-widest"
        >
          <Link href="/" className="text-muted hover:text-accent-hover">
            Map
          </Link>
          <Link href="/analyst" className="text-muted hover:text-accent-hover">
            Analyst
          </Link>
          <Link href="/about" className="text-muted hover:text-accent-hover">
            About
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <Suspense fallback={null}>
            <RoleToggle />
          </Suspense>
          {isAuthenticated ? (
            // Plain form POST — sign-out works without client JS. The route
            // handler deletes the httpOnly session cookie server-side.
            <form action="/api/logout" method="POST">
              <button
                type="submit"
                className="border border-line px-3 py-1 font-mono text-xs uppercase tracking-widest text-muted hover:border-accent hover:text-accent-hover"
              >
                Sign out
              </button>
            </form>
          ) : null}
        </div>
      </div>
      <Suspense fallback={<StripFallback />}>
        <RoleStrip />
      </Suspense>
    </header>
  );
}
