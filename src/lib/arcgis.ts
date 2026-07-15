/**
 * Server-side data access for ArcGIS FeatureServer endpoints.
 *
 * This module is only ever imported by React Server Components and route
 * handlers — the county API is never called from the browser. Every fetch
 * uses Next's data cache with a one-hour revalidation window
 * (`{ next: { revalidate: 3600 } }`), so a page render is served from cache
 * and the county endpoint sees at most one request per query per hour.
 *
 * Every function returns a `Result` instead of throwing: a county outage
 * should degrade the UI (a card shows "unavailable"), never crash the page.
 * ArcGIS has a quirk worth knowing: failures are often reported as an
 * `{"error": {...}}` body inside an HTTP 200 response, so we check for that
 * explicitly after parsing.
 */

import type { FeatureCollection, Geometry } from "geojson";
import type { DatasetConfig } from "./datasets";

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export type AttributeValue = string | number | boolean | null;
export type FeatureProperties = Record<string, AttributeValue>;
export type LayerGeoJSON = FeatureCollection<Geometry, FeatureProperties>;

const REVALIDATE_SECONDS = 3600;

function buildQueryUrl(
  dataset: DatasetConfig,
  params: Record<string, string>
): string {
  const search = new URLSearchParams({ where: "1=1", ...params });
  return `${dataset.serviceUrl}/query?${search.toString()}`;
}

async function arcgisFetch(url: string): Promise<Result<unknown>> {
  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) {
      return { ok: false, error: `County API responded with HTTP ${res.status}` };
    }
    const body: unknown = await res.json();
    if (
      body !== null &&
      typeof body === "object" &&
      "error" in body
    ) {
      const err = (body as { error: { message?: string; code?: number } }).error;
      return {
        ok: false,
        error: `ArcGIS error ${err.code ?? ""}: ${err.message ?? "unknown"}`.trim(),
      };
    }
    return { ok: true, value: body };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, error: `Could not reach county API: ${message}` };
  }
}

/**
 * Cheap summary count via `returnCountOnly=true` — the server counts, we
 * transfer ~20 bytes. Used for the public stat cards.
 */
export async function fetchLayerCount(
  dataset: DatasetConfig
): Promise<Result<number>> {
  const url = buildQueryUrl(dataset, { returnCountOnly: "true", f: "json" });
  const result = await arcgisFetch(url);
  if (!result.ok) return result;
  const count = (result.value as { count?: unknown }).count;
  if (typeof count !== "number") {
    return { ok: false, error: "County API returned no count" };
  }
  return { ok: true, value: count };
}

/**
 * Geometry + display attributes for the map, in WGS84. Polygon layers carry
 * server-side generalization params from the dataset config to keep payloads
 * small (raw Fire Districts is ~4.3 MB; generalized is ~384 KB).
 *
 * `outFields` narrows which attributes the county server returns. This is
 * part of the access gating: the public map is fetched with the name field
 * only, so a public visitor's page payload never even contains the other
 * attributes — withholding beats hiding.
 */
export async function fetchLayerGeoJSON(
  dataset: DatasetConfig,
  outFields?: string[]
): Promise<Result<LayerGeoJSON>> {
  const url = buildQueryUrl(dataset, {
    outFields: (outFields ?? dataset.tableFields.map((f) => f.key)).join(","),
    outSR: "4326",
    f: "geojson",
    ...dataset.geometryParams,
  });
  const result = await arcgisFetch(url);
  if (!result.ok) return result;
  const collection = result.value as LayerGeoJSON;
  if (collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
    return { ok: false, error: "County API returned unexpected GeoJSON" };
  }
  return { ok: true, value: collection };
}

/**
 * Attribute rows only (`returnGeometry=false`) for the analyst data table —
 * the 955-row floodplain table is ~99 KB this way versus ~18 MB with
 * geometry.
 */
export async function fetchLayerTable(
  dataset: DatasetConfig
): Promise<Result<FeatureProperties[]>> {
  const url = buildQueryUrl(dataset, {
    outFields: dataset.tableFields.map((f) => f.key).join(","),
    returnGeometry: "false",
    f: "geojson",
  });
  const result = await arcgisFetch(url);
  if (!result.ok) return result;
  const collection = result.value as LayerGeoJSON;
  if (collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
    return { ok: false, error: "County API returned unexpected GeoJSON" };
  }
  return {
    ok: true,
    value: collection.features.map((f) => f.properties ?? {}),
  };
}
