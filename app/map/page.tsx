// Server Component (async) — the map tool. Every byte of county data on
// this page is fetched HERE, on the server, through src/lib/arcgis.ts with a
// 1-hour revalidate window; the browser never talks to the county API. The
// active role comes from the ?view= search param, which pages receive as a
// Promise in this Next version. The public/analyst split is enforced
// server-side: the proxy redirects unauthenticated ?view=analyst requests to
// /login before this component ever runs, and the session is re-checked here
// so the analyst variant cannot render without a cookie even if the proxy
// matcher drifts.

import type { Metadata } from "next";
import Link from "next/link";
import { DATASETS } from "@lib/datasets";
import { LAYER_COLORS, TIER_COLOR } from "@lib/layerColors";
import { fetchLayerCount } from "@lib/arcgis";
import { hasAnalystSession } from "@lib/auth";
import { buildMapLayers } from "@lib/mapData";
import StatCard from "@components/StatCard";
import MapPanel from "@components/map/MapPanel";
import FeatureList from "@components/FeatureList";

export const metadata: Metadata = { title: "Map" };

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { view } = await searchParams;
  const isAuthenticated = await hasAnalystSession();
  const role = view === "analyst" && isAuthenticated ? "analyst" : "public";

  // The public map carries only the summary layers; the flood layer's 955
  // polygons join the map for analysts. Note the withholding happens HERE,
  // on the server — a public visitor's page payload simply never contains
  // analyst-level geometry or attributes.
  const mapDatasets = DATASETS.filter(
    (dataset) => dataset.includeInPublicMap || role === "analyst"
  );
  const [countResults, mapData] = await Promise.all([
    Promise.all(DATASETS.map((dataset) => fetchLayerCount(dataset))),
    buildMapLayers(mapDatasets, role),
  ]);
  const sourcesOnline = countResults.filter((r) => r.ok).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Role strip + view switch. The strip is a label, not the lock —
          gating happened in the proxy and in the fetches above. */}
      <div className="flex flex-wrap items-center gap-3">
        {role === "analyst" ? (
          <p
            role="status"
            className="border px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.25em]"
            style={{ borderColor: TIER_COLOR.mark, color: TIER_COLOR.text }}
          >
            ● Analyst view — full record access
          </p>
        ) : (
          <p
            role="status"
            className="border border-line px-3 py-1 font-mono text-[11px] uppercase tracking-[0.25em] text-muted"
          >
            ○ Public view — summary data only
          </p>
        )}
        <p className="font-mono text-[11px] uppercase tracking-widest text-faint">
          {role === "analyst" ? (
            <Link href="/map" className="underline underline-offset-2 hover:text-foreground">
              Switch to public view
            </Link>
          ) : (
            <Link
              href="/map?view=analyst"
              className="underline underline-offset-2 hover:text-foreground"
            >
              {isAuthenticated ? "Switch to analyst view" : "Analyst view (sign-in required)"}
            </Link>
          )}
        </p>
      </div>

      <h1 className="mt-4 font-display text-5xl font-bold tracking-tight">
        County map
      </h1>

      {/* Stat readouts */}
      <section aria-label="Layer summaries" className="mt-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DATASETS.map((dataset, i) => {
            const result = countResults[i];
            return (
              <StatCard
                key={dataset.id}
                label={dataset.displayName}
                value={result.ok ? result.value : null}
                unit={dataset.unit}
                meta={result.ok ? "Missoula County GIS" : "source unavailable"}
                accent={LAYER_COLORS[dataset.id]}
              />
            );
          })}
          <StatCard
            label="Data sources"
            value={sourcesOnline > 0 ? sourcesOnline : null}
            unit={`of ${DATASETS.length} online`}
            meta={
              sourcesOnline === DATASETS.length
                ? "all feeds nominal"
                : "degraded — some feeds down"
            }
          />
        </div>
      </section>

      {/* Map */}
      <section aria-label="County map" className="mt-8">
        {mapData.offline.map((entry) => (
          <p
            key={entry.title}
            className="mb-2 border border-danger/60 bg-surface px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-danger"
          >
            ○ {entry.title} layer offline — not shown on map
          </p>
        ))}
        {mapData.layers.length > 0 ? (
          <div className="h-[480px] border border-line sm:h-[560px]">
            <MapPanel layers={mapData.layers} role={role} />
          </div>
        ) : (
          <div className="flex h-[420px] items-center justify-center border border-line bg-surface">
            <p className="max-w-sm px-4 text-center font-mono text-xs uppercase tracking-[0.25em] text-faint">
              Map unavailable — all county layers are offline right now
            </p>
          </div>
        )}
        <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-faint">
          {role === "analyst"
            ? "Analyst map — popups expose full attributes; flood zones overlaid."
            : "Public map — popups show names only."}
        </p>
        <FeatureList layers={mapData.layers} />
      </section>

      {role === "analyst" ? (
        <p className="mt-8 font-mono text-xs uppercase tracking-widest">
          <Link
            href="/analyst"
            className="underline underline-offset-2 hover:text-foreground"
            style={{ color: TIER_COLOR.text }}
          >
            → Open the analyst console for full records
          </Link>
        </p>
      ) : (
        <p className="mt-8 font-mono text-xs uppercase tracking-widest text-faint">
          Record-level detail requires analyst access —{" "}
          <Link href="/login" className="underline underline-offset-2 hover:text-foreground">
            sign in
          </Link>
          .
        </p>
      )}
    </main>
  );
}
