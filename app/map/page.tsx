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
import { geometryAreaSqMi, slugify } from "@lib/geo";
import { buildMapLayers } from "@lib/mapData";
import StatCard from "@components/StatCard";
import MapPanel from "@components/map/MapPanel";
import FeatureList from "@components/FeatureList";
import DistrictBarChart, { type BarDatum } from "@components/charts/DistrictBarChart";
import ChatPanel from "@components/chat/ChatPanel";

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

  // Chart data — computed server-side from the geometry that already loaded
  // for the map (no extra county requests). District areas come from the
  // generalized boundaries, so they are approximate by design.
  const fireLayer = mapData.layers.find((l) => l.id === "fireDistricts");
  const fireChartData: BarDatum[] = fireLayer
    ? fireLayer.geojson.features
        .map((feature) => {
          const name = String(feature.properties?.name ?? "(unnamed)");
          return {
            name,
            value: Math.round(geometryAreaSqMi(feature.geometry)),
            href:
              name === "(unnamed)" ? undefined : `/district/${slugify(name)}`,
          };
        })
        .sort((a, b) => b.value - a.value)
    : [];

  // Analyst variant: flood acreage by FEMA zone (acres is a restricted
  // field, so this aggregation only exists when the analyst geometry —
  // which carries full attributes — was fetched).
  const floodLayer = mapData.layers.find((l) => l.id === "floodplain");
  const floodChartData: BarDatum[] =
    role === "analyst" && floodLayer
      ? [...floodLayer.geojson.features
          .reduce((zones, feature) => {
            const zone = String(feature.properties?.femades ?? "—");
            const acres =
              typeof feature.properties?.acres === "number"
                ? feature.properties.acres
                : 0;
            zones.set(zone, (zones.get(zone) ?? 0) + acres);
            return zones;
          }, new Map<string, number>())
          .entries()]
          .map(([name, acres]) => ({ name, value: Math.round(acres) }))
          .sort((a, b) => b.value - a.value)
      : [];

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

      {/* Per-district chart(s) */}
      {fireChartData.length > 0 ? (
        <section aria-label="District coverage chart" className="mt-10">
          <h2
            className="font-mono text-xs font-semibold uppercase tracking-[0.25em]"
            style={{ color: LAYER_COLORS.fireDistricts.text }}
          >
            Fire response zone coverage
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Approximate square miles each district protects, from the county
            boundary geometry. Click a bar to open that district.
          </p>
          <div className="mt-4 border border-line bg-surface p-4">
            <DistrictBarChart
              data={fireChartData}
              color={LAYER_COLORS.fireDistricts.mark}
              unitLabel="≈ sq mi"
              ariaLabel="Bar chart of approximate square miles covered by each fire district"
            />
          </div>
        </section>
      ) : null}
      {floodChartData.length > 0 ? (
        <section aria-label="Flood acreage chart" className="mt-10">
          <h2
            className="font-mono text-xs font-semibold uppercase tracking-[0.25em]"
            style={{ color: LAYER_COLORS.floodplain.text }}
          >
            Mapped flood acreage by FEMA zone
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Analyst variant — total mapped acres per FEMA designation across
            all {floodChartData.length} zones present in the county layer.
          </p>
          <div className="mt-4 border border-line bg-surface p-4">
            <DistrictBarChart
              data={floodChartData}
              color={LAYER_COLORS.floodplain.mark}
              unitLabel="mapped acres"
              ariaLabel="Bar chart of mapped flood acres by FEMA zone designation"
            />
          </div>
        </section>
      ) : null}

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

      {/* Local AI assistant — the route handler re-derives the role from the
          session cookie; this prop only labels the UI. */}
      <ChatPanel role={role} />
    </main>
  );
}
