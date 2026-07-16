/**
 * Dataset registry for the Missoula County Open Data hub (an ArcGIS Hub instance).
 *
 * Catalog: https://missoula-county-open-data-mcgis.hub.arcgis.com
 * DCAT feed used for discovery:
 *   https://missoula-county-open-data-mcgis.hub.arcgis.com/api/feed/dcat-us/1.1.json
 *
 * Every endpoint below was verified live on 2026-07-15 with curl against the
 * FeatureServer query API (both `returnCountOnly=true` and a full `f=geojson`
 * request), and the field maps against each layer's `?f=json` metadata.
 * Notes from that verification:
 *
 *  - The hub's DCAT descriptions are broken (literal "{{description}}" template
 *    strings), so the plain-English names and descriptions here are written by
 *    hand.
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
  /** Human label for table headers, popups, and chart axes. */
  label: string;
  /**
   * Internal bookkeeping fields (OBJECTID, Shape__Area, edit-tracking
   * columns and similar) are hidden by default in every surface; the analyst
   * table can reveal them on demand.
   */
  hidden?: boolean;
}

export interface DatasetConfig {
  id: DatasetId;
  /** Plain-English layer name used EVERYWHERE the layer is shown. */
  displayName: string;
  /** One sentence: what the layer shows and why someone would care. */
  description: string;
  /** Hub landing page for attribution links. */
  sourceUrl: string;
  /** ArcGIS FeatureServer layer endpoint (no trailing slash, no /query). */
  serviceUrl: string;
  geometryKind: "polygon" | "point";
  /** Attribute holding the human-readable feature name/label. */
  nameField: string;
  /**
   * Per-layer field map: readable labels for every attribute the
   * FeatureServer publishes (verified against layer metadata). Analyst
   * surfaces fetch ALL attributes (outFields=*) and fall back to raw field
   * names for anything not listed here; public map requests fetch only
   * nameField.
   */
  tableFields: TableField[];
  /** Extra query params for geometry requests (server-side generalization). */
  geometryParams: Record<string, string>;
  /** Whether the public map renders this layer's geometry. */
  includeInPublicMap: boolean;
  /** Noun for stat cards, e.g. "10 DISTRICTS". */
  unit: string;
}

/** Edit-tracking columns ArcGIS Online appends to every layer — never useful. */
const ARCGIS_BOOKKEEPING: TableField[] = [
  { key: "created_user", label: "Created by", hidden: true },
  { key: "created_date", label: "Created date", hidden: true },
  { key: "last_edited_user", label: "Edited by", hidden: true },
  { key: "last_edited_date", label: "Edited date", hidden: true },
  { key: "CreationDate", label: "AGOL creation date", hidden: true },
  { key: "Creator", label: "AGOL creator", hidden: true },
  { key: "EditDate", label: "AGOL edit date", hidden: true },
  { key: "Editor", label: "AGOL editor", hidden: true },
];

export const DATASETS: DatasetConfig[] = [
  {
    // Fire Districts — rural fire district boundaries (polygon layer).
    // Verified 2026-07-15: 10 features; count query returns {count: 10};
    // generalized geometry query returns ~384 KB of GeoJSON (raw is ~4.3 MB).
    // Layer index 23 looks odd but is correct — the "Fire" service exposes
    // exactly one layer, id 23.
    id: "fireDistricts",
    displayName: "Fire Response Zones",
    description:
      "The territory each rural fire district protects — which crews answer " +
      "the call at a given address in Missoula County.",
    sourceUrl:
      "https://missoula-county-open-data-mcgis.hub.arcgis.com/datasets/MCGIS::fire-districts",
    serviceUrl:
      "https://services1.arcgis.com/NQWYt9dWr9BlL9QE/arcgis/rest/services/Fire/FeatureServer/23",
    geometryKind: "polygon",
    nameField: "name",
    tableFields: [
      { key: "name", label: "District" },
      { key: "code", label: "District code" },
      { key: "description", label: "Description" },
      { key: "contact", label: "Contact" },
      { key: "objectid", label: "Object ID", hidden: true },
      { key: "globalid", label: "Global ID", hidden: true },
      { key: "shape__Area", label: "Shape area", hidden: true },
      { key: "shape__Length", label: "Shape length", hidden: true },
      ...ARCGIS_BOOKKEEPING,
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
    displayName: "Polling Locations",
    description:
      "Where Missoula County votes — the schools, community centers, and " +
      "fire halls that double as everyday civic infrastructure.",
    sourceUrl:
      "https://missoula-county-open-data-mcgis.hub.arcgis.com/datasets/MCGIS::polling-locations",
    serviceUrl:
      "https://services1.arcgis.com/NQWYt9dWr9BlL9QE/arcgis/rest/services/PollingLocation/FeatureServer/25",
    geometryKind: "point",
    nameField: "name",
    tableFields: [
      { key: "name", label: "Location" },
      { key: "address", label: "Street address" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "zipcode", label: "ZIP code" },
      { key: "latitude", label: "Latitude" },
      { key: "longitude", label: "Longitude" },
      { key: "objectid", label: "Object ID", hidden: true },
      { key: "globalid", label: "Global ID", hidden: true },
      ...ARCGIS_BOOKKEEPING,
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
    displayName: "Flood Hazard Zones",
    description:
      "FEMA-designated flood hazard areas — the land where flooding is " +
      "likely enough to shape insurance, permits, and building decisions.",
    sourceUrl:
      "https://missoula-county-open-data-mcgis.hub.arcgis.com/datasets/MCGIS::dfirm-2019-lomc-floodplain",
    serviceUrl:
      "https://services1.arcgis.com/NQWYt9dWr9BlL9QE/arcgis/rest/services/DFIRM_2019_LOMC/FeatureServer/6",
    geometryKind: "polygon",
    nameField: "femades",
    tableFields: [
      { key: "femades", label: "FEMA zone" },
      { key: "acres", label: "Mapped acres" },
      { key: "OBJECTID", label: "Object ID", hidden: true },
      { key: "globalid", label: "Global ID", hidden: true },
      { key: "Shape__Area", label: "Shape area", hidden: true },
      { key: "Shape__Length", label: "Shape length", hidden: true },
      ...ARCGIS_BOOKKEEPING,
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
