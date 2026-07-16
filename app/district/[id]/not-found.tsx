// Server Component — 404 for unknown district slugs.

import Link from "next/link";

export default function DistrictNotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
        404
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">
        No such district
      </h1>
      <p className="mt-3 leading-7 text-muted">
        That district slug doesn&apos;t match any fire response zone in the
        county data. Browse the boundaries on the{" "}
        <Link href="/map" className="text-foreground underline underline-offset-4">
          map
        </Link>{" "}
        and click a district for its detail page.
      </p>
    </main>
  );
}
