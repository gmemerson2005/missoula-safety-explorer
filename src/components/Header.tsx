// Server Component (no directive) — the persistent top nav. Renders on the
// server with the session state; the one URL-aware piece (active link
// highlighting) is the small NavLinks client island. The analyst badge is a
// label, not the lock — gating happens in proxy.ts and server components.

import Link from "next/link";
import NavLinks from "./NavLinks";
import { TIER_COLOR } from "@lib/layerColors";

export default function Header({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <header className="sticky top-0 z-[1000]">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line bg-background/95 px-4 py-3 backdrop-blur">
        <Link
          href="/"
          className="font-display text-lg font-bold uppercase tracking-wide text-foreground hover:text-muted"
        >
          Missoula Public Safety Explorer
        </Link>
        <NavLinks />
        <div className="ml-auto flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <span
                className="border px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.2em]"
                style={{ borderColor: TIER_COLOR.mark, color: TIER_COLOR.text }}
              >
                ● Analyst session
              </span>
              {/* Plain form POST — sign-out works without client JS. The route
                  handler deletes the httpOnly session cookie server-side. */}
              <form action="/api/logout" method="POST">
                <button
                  type="submit"
                  className="border border-line px-3 py-1 font-mono text-xs uppercase tracking-widest text-muted transition-colors duration-150 hover:border-foreground hover:text-foreground active:scale-[0.98]"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="border border-line px-3 py-1 font-mono text-xs uppercase tracking-widest text-muted transition-colors duration-150 hover:border-foreground hover:text-foreground"
            >
              Analyst sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
