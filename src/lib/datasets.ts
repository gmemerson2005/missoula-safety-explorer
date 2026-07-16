/**
 * Dataset registry for the Missoula County Open Data hub (an ArcGIS Hub instance).
 *
 * Catalog: https://missoula-county-open-data-mcgis.hub.arcgis.com
 * DCAT feed used for discovery:
 *   https://missoula-county-open-data-mcgis.hub.arcgis.com/api/feed/dcat-us/1.1.json
 *
 * Every endpoint below was verified live on 2026-07-15 with curl against the
 * FeatureServer query API (both `returnCountOnly=true` and a full `f=geojson`
 * request). Notes from that verification:
 *
 *  - The hub's DCAT descriptions are broken (literal "{{description}}" template
 *    strings), so the plain-English descriptions here are written by hand.
 *  - The county publishes NO dedicated public-safety point layer (no fire
 *    stations, hydrants, or law-enforcement points). Polling Locations is the
 *    only modest-size point layer on the hub and several of its points are in
 *    fact fire stations/halls, so it stands in as the point layer.
 *  - Raw Fire District boundaries are extremely detailed (~4.3 MB of GeoJSON
 *    for 10 polygons) and the full Floodplain download is ~18 MB. Both map
 *    queries therefore ask the server to generalize geometry
 *    (`maxAllowableOffset` + `geometryPrecision`), which brings each payload
 *    under ~400 KB — small enough for Next's data cache (2 MB/entry limit).
 */

export type DatasetId = "fireDistricts" | "pollingLocations" | "floodplain";

export interface TableField {
  /** Attribute name exactly as the FeatureServer exposes it (case-sensitive). */
  key: string;
  /** Human label for table headers. */
  label: string;
}

export interface DatasetConfig {
  id: DatasetId;
  title: string;
  /** Short plain-English description shown in the public view. */
  publicDescription: string;
  /** Hub landing page for attribution links. */
  sourcePage: string;
  /** ArcGIS FeatureServer layer endpoint (no trailing slash, no /query). */
  serviceUrl: string;
  geometryKind: "polygon" | "point";
  /** Attribute holding the human-readable feature name/label. */
  nameField: string;
  /**
   * Friendly labels for well-known attributes. Analyst surfaces fetch ALL
   * attributes (outFields=*) and fall back to raw field names for anything
   * not listed here; public map requests fetch only nameField.
   */
  tableFields: TableField[];
  /** Extra query params for geometry requests (server-side generalization). */
  geometryParams: Record<string, string>;
  /** Whether the public map renders this layer's geometry. */
  includeInPublicMap: boolean;
  /** Noun for stat cards, e.g. "10 DISTRICTS". */
  unit: string;
}

export const DATASETS: DatasetConfig[] = [
  {
    // Fire Districts — rural fire district boundaries (polygon layer).
    // Verified 2026-07-15: 10 features; count query returns {count: 10};
    // generalized geometry query returns ~384 KB of GeoJSON (raw is ~4.3 MB).
    // Layer index 23 looks odd but is correct — the "Fire" service exposes
    // exactly one layer, id 23.
    id: "fireDistricts",
    title: "Fire Districts",
    publicDescription:
      "Boundaries of the rural fire districts and fire service areas that " +
      "cover Missoula County. Each polygon is the territory a district is " +
      "responsible for protecting.",
    sourcePage:
      "https://missoula-county-open-data-mcgis.hub.arcgis.com/datasets/MCGIS::fire-districts",
    serviceUrl:
      "https://services1.arcgis.com/NQWYt9dWr9BlL9QE/arcgis/rest/services/Fire/FeatureServer/23",
    geometryKind: "polygon",
    nameField: "name",
    tableFields: [
      { key: "name", label: "District" },
      { key: "code", label: "Code" },
      { key: "description", label: "Description" },
      { key: "contact", label: "Contact" },
    ],
    geometryParams: { geometryPrecision: "5", maxAllowableOffset: "0.0003" },
    includeInPublicMap: true,
    unit: "districts",
  },
  {
    // Polling Locations — county polling place points (point layer).
    // Verified 2026-07-15: 24 features, ~6 KB of GeoJSON. The hub has no
    // dedicated safety point layer; this is the closest county-infrastructure
    // point set (three of the 24 points are fire stations/halls).
    id: "pollingLocations",
    title: "Polling Locations",
    publicDescription:
      "Point locations of Missoula County polling places — the public " +
      "buildings (schools, community centers, and several fire stations) " +
      "the county relies on for civic operations.",
    sourcePage:
      "https://missoula-county-open-data-mcgis.hub.arcgis.com/datasets/MCGIS::polling-locations",
    serviceUrl:
      "https://services1.arcgis.com/NQWYt9dWr9BlL9QE/arcgis/rest/services/PollingLocation/FeatureServer/25",
    geometryKind: "point",
    nameField: "name",
    tableFields: [
      { key: "name", label: "Location" },
      { key: "address", label: "Address" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "zipcode", label: "ZIP" },
    ],
    geometryParams: {},
    includeInPublicMap: true,
    unit: "locations",
  },
  {
    // DFIRM 2019 LOMC Floodplain — FEMA flood hazard polygons.
    // Verified 2026-07-15: 955 features. The full GeoJSON download is ~18 MB,
    // so this app never requests it: stat cards use returnCountOnly, the
    // analyst table uses returnGeometry=false (~99 KB), and the analyst map
    // uses generalized geometry (~339 KB). There is no name field; "femades"
    // holds the FEMA flood-zone designation (AE, X, etc.) and serves as the
    // label.
    id: "floodplain",
    title: "Flood Hazard Zones",
    publicDescription:
      "FEMA DFIRM 2019 floodplain polygons (with Letter of Map Change " +
      "updates) marking areas of Missoula County subject to flood hazard, " +
      "labeled by FEMA zone designation.",
    sourcePage:
      "https://missoula-county-open-data-mcgis.hub.arcgis.com/datasets/MCGIS::dfirm-2019-lomc-floodplain",
    serviceUrl:
      "https://services1.arcgis.com/NQWYt9dWr9BlL9QE/arcgis/rest/services/DFIRM_2019_LOMC/FeatureServer/6",
    geometryKind: "polygon",
    nameField: "femades",
    tableFields: [
      { key: "OBJECTID", label: "ID" },
      { key: "femades", label: "FEMA zone" },
      { key: "acres", label: "Acres" },
    ],
    geometryParams: { geometryPrecision: "4", maxAllowableOffset: "0.0005" },
    // 955 polygons is too much noise for the public summary map; the public
    // view reports its count and description, the analyst map renders it.
    includeInPublicMap: false,
    unit: "flood zones",
  },
];

export function getDataset(id: DatasetId): DatasetConfig {
  const found = DATASETS.find((d) => d.id === id);
  if (!found) throw new Error(`Unknown dataset: ${id}`);
  return found;
}
