// Server Component (async) — per-district drill-down. Publicly reachable:
// district boundaries and names are public data. What is role-dependent is
// the attribute detail — restricted fields (the district contact) are
// STRIPPED server-side for public visitors via redactRows before anything
// is rendered or serialized, so the public payload never contains them.
// Analyst loads are recorded in the audit log.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import type { Feature, Geometry } from "geojson";
import { getDataset } from "@lib/datasets";
import {
  fetchLayerGeoJSON,
  type FeatureProperties,
  type LayerGeoJSON,
} from "@lib/arcgis";
import { ANALYST_COOKIE, hasAnalystSession } from "@lib/auth";
import { recordAccess } from "@lib/auditLog";
import { redactRows, RESTRICTED_SENTINEL } from "@lib/redact";
import { geometryAreaSqMi, pointInGeometry, slugify } from "@lib/geo";
import { LAYER_COLORS, TIER_COLOR } from "@lib/layerColors";
import MapPanel from "@components/map/MapPanel";
import RedactedValue from "@components/RedactedValue";
import type { MapLayerData } from "@components/map/SafetyMap";

type DistrictFeature = Feature<Geometry, FeatureProperties>;

/** Fetch + sort the district features once (Next's data cache dedupes the
 *  underlying county request across metadata and page rendering). */
async function loadDistricts(): Promise<DistrictFeature[] | null> {
  const fire = getDataset("fireDistricts");
  const result = await fetchLayerGeoJSON(fire, ["*"]);
  if (!result.ok) return null;
  return [...result.value.features].sort((a, b) =>
    String(a.properties?.name ?? "").localeCompare(
      String(b.properties?.name ?? ""),
      "en"
    )
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const districts = await loadDistricts();
  const match = districts?.find(
    (f) => slugify(String(f.properties?.name ?? "")) === id
  );
  return {
    title: match ? String(match.properties?.name) : "District",
  };
}

export default async function DistrictPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fire = getDataset("fireDistricts");
  const polling = getDataset("pollingLocations");

  const isAnalyst = await hasAnalystSession();
  const role = isAnalyst ? "analyst" : "public";

  const [districts, pollingResult] = await Promise.all([
    loadDistricts(),
    fetchLayerGeoJSON(polling, [polling.nameField]),
  ]);

  if (districts === null) {
    // County outage: degrade instead of 404ing a district that exists.
    return (
      <main className="mx-auto max-w-4xl px-4 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-danger">
          ○ Feed offline
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">
          District data unavailable
        </h1>
        <p className="mt-3 leading-7 text-muted">
          The county fire-district feed did not respond. Refresh to retry, or
          head back to the <Link href="/map" className="underline">map</Link>.
        </p>
      </main>
    );
  }

  const index = districts.findIndex(
    (f) => slugify(String(f.properties?.name ?? "")) === id
  );
  if (index === -1) notFound();
  const feature = districts[index];
  const name = String(feature.properties?.name ?? "(unnamed)");

  // Audit: an analyst session just loaded a district drill-down.
  if (isAnalyst) {
    const cookieStore = await cookies();
    recordAccess(
      `/district/${id}`,
      cookieStore.get(ANALYST_COOKIE)?.value ?? ""
    );
  }

  // Field-level redaction at the data boundary: everything below this line —
  // the attribute panel AND the mini-map's serialized GeoJSON — sees only
  // the redacted copy for public visitors.
  const [safeProps] = redactRows(fire, [feature.properties ?? {}], role);

  const areaSqMi = geometryAreaSqMi(feature.geometry);
  const pollingInside =
    pollingResult.ok && feature.geometry
      ? pollingResult.value.features.filter(
          (p) =>
            p.geometry?.type === "Point" &&
            pointInGeometry(p.geometry.coordinates, feature.geometry)
        )
      : null;

  const districtGeoJSON: LayerGeoJSON = {
    type: "FeatureCollection",
    features: [{ ...feature, properties: safeProps }],
  };
  const mapLayers: MapLayerData[] = [
    {
      id: "fireDistricts",
      title: fire.displayName,
      description: fire.description,
      kind: "polygon",
      nameField: fire.nameField,
      fields: role === "analyst" ? fire.tableFields : [],
      geojson: districtGeoJSON,
    },
  ];
  if (pollingInside && pollingInside.length > 0) {
    mapLayers.push({
      id: "pollingLocations",
      title: polling.displayName,
      description: polling.description,
      kind: "point",
      nameField: polling.nameField,
      fields: [],
      geojson: { type: "FeatureCollection", features: pollingInside },
    });
  }

  const previous = index > 0 ? districts[index - 1] : null;
  const next = index < districts.length - 1 ? districts[index + 1] : null;

  const detailFields = fire.tableFields.filter(
    (f) => !f.hidden && f.key !== fire.nameField
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <p className="font-mono text-xs uppercase tracking-[0.3em]">
        <Link
          href="/map"
          className="text-muted hover:text-foreground"
        >
          Map
        </Link>{" "}
        <span className="text-faint">/</span>{" "}
        <span style={{ color: LAYER_COLORS.fireDistricts.text }}>
          Fire response zone
        </span>
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-5xl font-bold tracking-tight">
          {name}
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-faint">
          District {index + 1} of {districts.length}
        </p>
      </div>

      {/* Stats */}
      <section
        aria-label="District stats"
        className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        <div
          className="border border-line bg-surface p-4"
          style={{ borderLeft: `3px solid ${LAYER_COLORS.fireDistricts.mark}` }}
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Coverage area
          </p>
          <p className="mt-1 font-display text-4xl font-bold">
            {Math.round(areaSqMi).toLocaleString("en-US")}{" "}
            <span className="text-lg text-faint">≈ sq mi</span>
          </p>
        </div>
        <div
          className="border border-line bg-surface p-4"
          style={{
            borderLeft: `3px solid ${LAYER_COLORS.pollingLocations.mark}`,
          }}
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Polling locations inside
          </p>
          <p className="mt-1 font-display text-4xl font-bold">
            {pollingInside ? pollingInside.length : "—"}
          </p>
        </div>
        <div className="border border-line bg-surface p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            District code
          </p>
          <p className="mt-1 font-display text-4xl font-bold">
            {String(safeProps.code ?? "—")}
          </p>
        </div>
      </section>

      {/* Mini map + attributes */}
      <section
        aria-label="District map and details"
        className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5"
      >
        <div className="h-[380px] border border-line lg:col-span-3 lg:h-auto lg:min-h-[420px]">
          <MapPanel
            layers={mapLayers}
            role={role}
            fitToLayers
            showControls={false}
          />
        </div>
        <div className="lg:col-span-2">
          <div className="border border-line bg-surface p-4">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
              District record
            </h2>
            <dl className="mt-3 space-y-3">
              {detailFields.map((field) => {
                const value = safeProps[field.key];
                return (
                  <div key={field.key}>
                    <dt className="font-mono text-[10px] uppercase tracking-widest text-faint">
                      {field.label}
                    </dt>
                    <dd className="mt-0.5 text-sm text-foreground/90">
                      {value === RESTRICTED_SENTINEL ? (
                        <RedactedValue />
                      ) : value === null || value === undefined || value === "" ? (
                        "—"
                      ) : (
                        String(value)
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
            {role === "public" ? (
              <p
                className="mt-4 border-t border-line pt-3 font-mono text-[10px] uppercase tracking-widest"
                style={{ color: TIER_COLOR.text }}
              >
                Locked fields require analyst access —{" "}
                <Link href="/login" className="underline underline-offset-2">
                  sign in
                </Link>
              </p>
            ) : null}
          </div>

          {pollingInside && pollingInside.length > 0 ? (
            <div className="mt-4 border border-line bg-surface p-4">
              <h2
                className="font-mono text-[11px] uppercase tracking-[0.2em]"
                style={{ color: LAYER_COLORS.pollingLocations.text }}
              >
                Polling locations in this district
              </h2>
              <ul className="mt-2 space-y-1 text-sm text-foreground/90">
                {pollingInside.map((p, i) => (
                  <li key={i}>{String(p.properties?.name ?? "(unnamed)")}</li>
                ))}
              </ul>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-faint">
                Point-in-boundary test on generalized geometry — approximate.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {/* Prev / next */}
      <nav
        aria-label="District navigation"
        className="mt-8 flex flex-wrap justify-between gap-3 border-t border-line pt-4"
      >
        {previous ? (
          <Link
            href={`/district/${slugify(String(previous.properties?.name ?? ""))}`}
            className="font-mono text-xs uppercase tracking-widest text-muted hover:text-foreground"
          >
            ← {String(previous.properties?.name)}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/district/${slugify(String(next.properties?.name ?? ""))}`}
            className="ml-auto font-mono text-xs uppercase tracking-widest text-muted hover:text-foreground"
          >
            {String(next.properties?.name)} →
          </Link>
        ) : null}
      </nav>
    </main>
  );
}
