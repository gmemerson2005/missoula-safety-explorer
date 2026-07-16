/**
 * Builds the AI assistant's system prompt from the cached county data.
 *
 * ROLE-AWARE BY CONSTRUCTION: the caller passes the visitor's role, and
 * restricted fields (per the dataset field maps) are excluded from the
 * context BEFORE the prompt exists. Access is enforced at the data
 * boundary — the model is never trusted to self-censor, because a language
 * model cannot leak a value it never received. This mirrors how the pages
 * work: public payloads simply don't contain restricted data.
 *
 * SIZED FOR A 3B MODEL: everything is aggregated (counts, per-district
 * areas, per-zone rollups, a compact record sample) instead of dumping raw
 * GeoJSON. The whole prompt stays around 1–2k tokens. All underlying
 * fetches hit Next's data cache (1-hour revalidate), so building chat
 * context adds no county API traffic beyond what the pages already caused.
 */

import { DATASETS, getDataset } from "./datasets";
import {
  fetchLayerCount,
  fetchLayerGeoJSON,
  fetchLayerTable,
  type FeatureProperties,
} from "./arcgis";
import { geometryAreaSqMi } from "./geo";
import { redactRows, restrictedKeys, RESTRICTED_SENTINEL } from "./redact";

export type ChatRole = "public" | "analyst";

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** Value renderer that drops sentinels (public role) instead of printing them. */
function val(v: FeatureProperties[string]): string | null {
  if (v === null || v === undefined || v === "" || v === RESTRICTED_SENTINEL) {
    return null;
  }
  return String(v);
}

export async function buildChatSystemPrompt(role: ChatRole): Promise<string> {
  const fire = getDataset("fireDistricts");
  const polling = getDataset("pollingLocations");
  const flood = getDataset("floodplain");

  const [counts, fireGeo, pollingRows, floodRows] = await Promise.all([
    Promise.all(DATASETS.map((d) => fetchLayerCount(d))),
    fetchLayerGeoJSON(fire, ["*"]),
    fetchLayerTable(polling),
    fetchLayerTable(flood),
  ]);

  const lines: string[] = [];

  lines.push("LAYERS:");
  DATASETS.forEach((dataset, i) => {
    const count = counts[i];
    lines.push(
      `- ${dataset.displayName}: ${count.ok ? fmt(count.value) : "unknown"} ${dataset.unit}. ${dataset.description}`
    );
  });

  // Fire districts: every district with approximate area; contact only for
  // analysts (redactRows strips it otherwise, val() drops the sentinel).
  if (fireGeo.ok) {
    lines.push("");
    lines.push("FIRE RESPONSE ZONES (name | approx. square miles | details):");
    const safe = redactRows(
      fire,
      fireGeo.value.features.map((f) => f.properties ?? {}),
      role
    );
    fireGeo.value.features.forEach((feature, i) => {
      const props = safe[i];
      const name = val(props.name) ?? "(unnamed)";
      const area = fmt(geometryAreaSqMi(feature.geometry));
      const extras = [
        val(props.code) ? `code ${val(props.code)}` : null,
        val(props.description),
        val(props.contact) ? `contact: ${val(props.contact)}` : null,
      ]
        .filter(Boolean)
        .join("; ");
      lines.push(`- ${name} | ~${area} sq mi${extras ? ` | ${extras}` : ""}`);
    });
  }

  // Polling locations: compact sample of every record's public shape;
  // street addresses only for analysts.
  if (pollingRows.ok) {
    lines.push("");
    lines.push("POLLING LOCATIONS (name | city | address if available):");
    const safe = redactRows(polling, pollingRows.value, role);
    for (const row of safe.slice(0, 30)) {
      const parts = [
        val(row.name) ?? "(unnamed)",
        val(row.city),
        val(row.address),
      ].filter(Boolean);
      lines.push(`- ${parts.join(" | ")}`);
    }
  }

  // Flood zones: aggregate by FEMA designation. Acreage is a restricted
  // field — the public rollup is counts only, and the acreage numbers are
  // never computed into the public prompt.
  if (floodRows.ok) {
    lines.push("");
    const withAcres =
      role === "analyst" || !restrictedKeys(flood).includes("acres");
    lines.push(
      withAcres
        ? "FLOOD HAZARD ZONES by FEMA designation (zone | polygon count | total mapped acres):"
        : "FLOOD HAZARD ZONES by FEMA designation (zone | polygon count):"
    );
    const zones = new Map<string, { count: number; acres: number }>();
    for (const row of floodRows.value) {
      const zone = String(row.femades ?? "—");
      const entry = zones.get(zone) ?? { count: 0, acres: 0 };
      entry.count += 1;
      if (typeof row.acres === "number") entry.acres += row.acres;
      zones.set(zone, entry);
    }
    for (const [zone, agg] of [...zones.entries()].sort(
      (a, b) => b[1].count - a[1].count
    )) {
      lines.push(
        withAcres
          ? `- ${zone} | ${fmt(agg.count)} polygons | ${fmt(agg.acres)} acres`
          : `- ${zone} | ${fmt(agg.count)} polygons`
      );
    }
  }

  const tierNote =
    role === "analyst"
      ? "The visitor is a signed-in ANALYST: the data above includes " +
        "restricted fields (district contacts, polling street addresses, " +
        "flood acreage)."
      : "The visitor is PUBLIC. Restricted fields — fire district contact " +
        "info, polling place street addresses, and flood zone acreage — " +
        "were NOT provided to you and you do not know them. If asked, say " +
        "that data requires analyst sign-in on the site.";

  return [
    "You are the built-in assistant for the Missoula Public Safety " +
      "Explorer, a map of fire response zones, flood hazard zones, and " +
      "polling locations in Missoula County, Montana, built on Missoula " +
      "County Open Data.",
    "Answer questions using ONLY the data below. If the answer is not in " +
      "the data, say so plainly — never invent numbers, names, or " +
      "locations. Keep answers to a few sentences. Areas are approximate " +
      "(computed from generalized boundaries).",
    tierNote,
    "",
    "DATA:",
    ...lines,
  ].join("\n");
}
