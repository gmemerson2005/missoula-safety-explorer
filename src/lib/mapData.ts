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
  datasets: DatasetConfig[]
): Promise<MapLayersResult> {
  const results = await Promise.all(
    datasets.map((dataset) => fetchLayerGeoJSON(dataset))
  );

  const layers: MapLayerData[] = [];
  const offline: { title: string; error: string }[] = [];

  datasets.forEach((dataset, i) => {
    const result = results[i];
    if (result.ok) {
      layers.push({
        id: dataset.id,
        title: dataset.title,
        kind: dataset.geometryKind,
        nameField: dataset.nameField,
        fields: dataset.tableFields,
        geojson: result.value,
      });
    } else {
      offline.push({ title: dataset.title, error: result.error });
    }
  });

  return { layers, offline };
}
