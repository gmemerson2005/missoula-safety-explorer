"use client";
// Client Component — the one interactive control in the chrome. It only
// *requests* a view by rewriting the URL with useRouter; it holds no state
// and grants no access. Server code (proxy.ts + the pages) reads ?view= and
// decides what actually renders. Selecting "analyst" without a session
// cookie simply lands you on /login, courtesy of the proxy.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { resolveRole } from "./RoleStrip";

export default function RoleToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const role = resolveRole(pathname, searchParams.get("view"));

  function onChange(value: string) {
    // /analyst and /login don't take a meaningful ?view=, so fall back to
    // the landing page when toggling from them.
    const base =
      pathname.startsWith("/analyst") || pathname.startsWith("/login")
        ? "/"
        : pathname;
    router.push(`${base}?view=${value === "analyst" ? "analyst" : "public"}`);
  }

  return (
    <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted">
      <span>Role</span>
      {/* WCAG 3.2.2: changing this select navigates immediately, so say so
          up front for assistive tech. */}
      <span id="role-toggle-hint" className="sr-only">
        Choosing a role immediately navigates to that view.
      </span>
      <select
        value={role}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby="role-toggle-hint"
        className="border border-line bg-surface-2 px-2 py-1 font-mono text-xs uppercase tracking-wider text-foreground hover:border-accent"
      >
        <option value="public">Public</option>
        <option value="analyst">Analyst</option>
      </select>
    </label>
  );
}
