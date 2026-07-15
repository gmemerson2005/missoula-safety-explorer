// Server Component (async) — the landing page. Every byte of county data on
// this page is fetched HERE, on the server, through src/lib/arcgis.ts with a
// 1-hour revalidate window; the browser never talks to the county API. The
// active role comes from the ?view= search param, which pages receive as a
// Promise in this Next version. The public/analyst split is enforced
// server-side: the proxy redirects unauthenticated ?view=analyst requests to
// /login before this component ever runs, and the session is re-checked here
// so the analyst variant cannot render without a cookie even if the proxy
// matcher drifts.

import Link from "next/link";
import { DATASETS } from "@lib/datasets";
import { fetchLayerCount } from "@lib/arcgis";
import { hasAnalystSession } from "@lib/auth";
import StatCard from "@components/StatCard";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { view } = await searchParams;
  const role =
    view === "analyst" && (await hasAnalystSession()) ? "analyst" : "public";

  const countResults = await Promise.all(
    DATASETS.map((dataset) => fetchLayerCount(dataset))
  );
  const sourcesOnline = countResults.filter((r) => r.ok).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Pitch */}
      <section className="max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
          Missoula County · Montana
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Public Safety Explorer
        </h1>
        <p className="mt-3 leading-7 text-muted">
          One quiet console for Missoula County&apos;s public-safety geography:
          which fire district protects a given stretch of ground, where county
          civic infrastructure sits, and which land carries FEMA flood-hazard
          designations. Everyone sees verified summaries. Credentialed
          analysts see every record.
        </p>
      </section>

      {/* Stat readouts */}
      <section aria-label="Layer summaries" className="mt-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DATASETS.map((dataset, i) => {
            const result = countResults[i];
            return (
              <StatCard
                key={dataset.id}
                label={dataset.title}
                value={result.ok ? result.value.toLocaleString("en-US") : "—"}
                unit={dataset.unit}
                ok={result.ok}
                meta={result.ok ? "Missoula County GIS" : "source unavailable"}
              />
            );
          })}
          <StatCard
            label="Data sources"
            value={`${sourcesOnline}/${DATASETS.length}`}
            unit="online"
            ok={sourcesOnline > 0}
            meta={
              sourcesOnline === DATASETS.length
                ? "all feeds nominal"
                : "degraded — some feeds down"
            }
          />
        </div>
      </section>

      {/* Map (wired up in the map milestone) */}
      <section aria-label="County map" className="mt-8">
        <div className="flex h-[420px] items-center justify-center border border-line bg-surface">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-faint">
            Map module pending
          </p>
        </div>
      </section>

      {/* Layer descriptions */}
      <section aria-label="Data layers" className="mt-10">
        <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
          Data layers
        </h2>
        <div className="mt-3 divide-y divide-line border border-line bg-surface">
          {DATASETS.map((dataset, i) => {
            const result = countResults[i];
            return (
              <article key={dataset.id} className="p-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="font-mono text-sm font-semibold uppercase tracking-wider">
                    {dataset.title}
                  </h3>
                  <span className="font-mono text-xs text-accent">
                    {result.ok
                      ? `${result.value.toLocaleString("en-US")} ${dataset.unit}`
                      : "offline"}
                  </span>
                  <a
                    href={dataset.sourcePage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto font-mono text-[11px] uppercase tracking-widest text-muted hover:text-accent-hover"
                  >
                    Source ↗
                  </a>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  {dataset.publicDescription}
                </p>
              </article>
            );
          })}
        </div>
        {role === "analyst" ? (
          <p className="mt-4 font-mono text-xs uppercase tracking-widest">
            <Link
              href="/analyst"
              className="text-accent hover:text-accent-hover"
            >
              → Open the analyst console for full records
            </Link>
          </p>
        ) : (
          <p className="mt-4 font-mono text-xs uppercase tracking-widest text-faint">
            Record-level detail requires analyst access — switch role to
            analyst to sign in.
          </p>
        )}
      </section>
    </main>
  );
}
