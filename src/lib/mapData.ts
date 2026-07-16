/**
 * Server-only helper shared by the landing and analyst pages: fetch
 * geometry for a set of datasets and shape it into MapPanel props. A layer
 * whose endpoint is down is dropped from the map and reported in `offline`
 * so the page can say so — the map renders whatever survived, and the page
 * never crashes on a county outage.
 */

import { fetchLayerGeoJSON } from "./arcgis";
import type { DatasetConfig } from "./datasets";
import type { MapLayerData } from "@components/map/SafetyMap";

export interface MapLayersResult {
  layers: MapLayerData[];
  offline: { title: string; error: string }[];
}

export async function buildMapLayers(
  datasets: DatasetConfig[],
  role: "public" | "analyst"
): Promise<MapLayersResult> {
  // The role decides which attributes the county server is even ASKED for.
  // Public maps fetch the name field only, so the serialized page payload a
  // public visitor receives contains no other attributes to "unhide" —
  // popup rendering merely displays what the server already withheld.
  // Analysts get every published attribute (outFields=*).
  const results = await Promise.all(
    datasets.map((dataset) =>
      fetchLayerGeoJSON(dataset, role === "analyst" ? ["*"] : [dataset.nameField])
    )
  );

  const layers: MapLayerData[] = [];
  const offline: { title: string; error: string }[] = [];

  datasets.forEach((dataset, i) => {
    const result = results[i];
    if (result.ok) {
      layers.push({
        id: dataset.id,
        title: dataset.displayName,
        description: dataset.description,
        kind: dataset.geometryKind,
        nameField: dataset.nameField,
        fields: role === "analyst" ? dataset.tableFields : [],
        geojson: result.value,
      });
    } else {
      offline.push({ title: dataset.displayName, error: result.error });
    }
  });

  return { layers, offline };
}
