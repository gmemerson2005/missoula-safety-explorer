"use client";
// Client Component — and it has to be: the active role is derived from the
// URL (pathname + ?view=), and layouts never receive searchParams on the
// server in this Next version. useSearchParams requires a client component
// wrapped in <Suspense> (see Header). This strip is DISPLAY ONLY: the actual
// access control happens in proxy.ts and in server components. Hiding or
// faking this strip in devtools grants nothing.

import { usePathname, useSearchParams } from "next/navigation";

export function resolveRole(pathname: string, view: string | null): "public" | "analyst" {
  if (pathname.startsWith("/analyst")) return "analyst";
  return view === "analyst" ? "analyst" : "public";
}

export default function RoleStrip() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const role = resolveRole(pathname, searchParams.get("view"));

  if (role === "analyst") {
    return (
      <div
        role="status"
        className="border-b border-accent bg-accent px-4 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.25em] text-background"
      >
        Analyst view — full record access
      </div>
    );
  }
  return (
    <div
      role="status"
      className="border-b border-line bg-surface px-4 py-1 font-mono text-[11px] uppercase tracking-[0.25em] text-muted"
    >
      Public view — summary data only
    </div>
  );
}
