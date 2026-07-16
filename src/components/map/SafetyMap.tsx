"use client";
// Client Component — necessarily so: Leaflet drives the real DOM and only
// runs in the browser. This file is ONLY ever loaded through MapPanel's
// dynamic(..., { ssr: false }) import, so none of it executes on the server.
// It receives server-fetched GeoJSON as props and renders it; it fetches
// nothing itself. The role prop only chooses how much attribute detail the
// popups show — and the server already withheld analyst-only layers from
// the props when the visitor is public, so there is nothing hidden in this
// payload to "unhide".

import { useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GeoJSON, MapContainer, Pane, TileLayer, useMap } from "react-leaflet";
import type { Feature } from "geojson";
import type { LayerGeoJSON } from "@lib/arcgis";
import { INK, LAYER_COLORS } from "@lib/layerColors";
import { slugify } from "@lib/geo";
import LayerToggle from "./LayerToggle";

export interface MapLayerData {
  id: string;
  title: string;
  kind: "polygon" | "point";
  nameField: string;
  /** One-sentence description, shown as toggle helper text. */
  description?: string;
  /** Attribute keys+labels shown in analyst popups (hidden ones skipped). */
  fields: { key: string; label: string; hidden?: boolean }[];
  geojson: LayerGeoJSON;
}

export interface SafetyMapProps {
  layers: MapLayerData[];
  role: "public" | "analyst";
  /** Zoom to the layers' combined bounds instead of the county default —
      used by the district drill-down mini map. */
  fitToLayers?: boolean;
  /** Hide the layer toggle panel (e.g. single-layer mini maps). */
  showControls?: boolean;
}

// Missoula County, Montana.
const CENTER: [number, number] = [46.9, -113.9];

/**
 * THE CLICK-THROUGH FIX. Each data layer renders into its own Leaflet pane
 * with an explicit z-index (Leaflet's default overlayPane is 400; popups sit
 * at 700). The DOM stacking order then decides which feature receives a
 * click on overlapping ground: flood sits above fire, points above both, so
 * a click always opens the popup of the topmost VISIBLE layer. Hiding a pane
 * adds .msx-pane-hidden (opacity 0 + pointer-events: none on the pane AND
 * its descendants — see globals.css), which both fades it out and lets
 * clicks fall through to the layers underneath.
 */
const PANE_Z: Record<string, number> = {
  fireDistricts: 401,
  floodplain: 402,
  pollingLocations: 403,
};

function paneName(layerId: string): string {
  return `msx-${layerId}`;
}

// One paint scheme per layer identity, from the shared signature palette —
// the same colors the toggles, stat cards, and charts wear. Fills are
// semi-transparent (0.35–0.5) so overlapping zones stay readable.
const LAYER_PAINT: Record<string, { color: string; fillOpacity: number }> = {
  fireDistricts: { color: LAYER_COLORS.fireDistricts.mark, fillOpacity: 0.4 },
  floodplain: { color: LAYER_COLORS.floodplain.mark, fillOpacity: 0.4 },
  pollingLocations: { color: LAYER_COLORS.pollingLocations.mark, fillOpacity: 1 },
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Deterministic small hash so each district keeps its style across loads. */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Popup markup is built as an escaped HTML string (Leaflet popups live
 * outside the React tree). Public role: name only. Analyst role: every
 * attribute present on the feature (the server already decided what those
 * are, per role). County data is third-party input, so everything is
 * escaped.
 */
function popupHtml(layer: MapLayerData, feature: Feature, role: "public" | "analyst"): string {
  const props = (feature.properties ?? {}) as Record<string, unknown>;
  const rawName = props[layer.nameField];
  const name = escapeHtml(
    rawName === null || rawName === undefined || rawName === ""
      ? "(unnamed)"
      : String(rawName)
  );
  const color = LAYER_COLORS[layer.id as keyof typeof LAYER_COLORS];
  // Fire district popups deep-link to the district drill-down page for both
  // roles (the page itself redacts per role). slugify output is [a-z0-9-]
  // only, so it is safe inside the href attribute.
  const districtLink =
    layer.id === "fireDistricts" && rawName
      ? `<div style="margin-top:6px"><a class="msx-popup-link" ` +
        `href="/district/${slugify(String(rawName))}">District details →</a></div>`
      : "";
  const head =
    `<div class="msx-popup-kicker" style="color:${color?.text ?? "var(--muted)"}">` +
    `${escapeHtml(layer.title)}</div>` +
    `<div class="msx-popup-name">${name}</div>`;
  if (role === "public") return head + districtLink;
  const labelFor = new Map(layer.fields.map((f) => [f.key, f.label]));
  // Internal bookkeeping fields (OBJECTID, Shape__Area, edit tracking…) are
  // flagged hidden in the per-layer field map — popups skip them.
  const hiddenKeys = new Set(
    layer.fields.filter((f) => f.hidden).map((f) => f.key)
  );
  const rows = Object.entries(props)
    .filter(([key]) => key !== layer.nameField && !hiddenKeys.has(key))
    .map(([key, value]) => {
      const text =
        value === null || value === undefined || value === ""
          ? "—"
          : String(value);
      return (
        `<tr><th scope="row">${escapeHtml(labelFor.get(key) ?? key)}</th>` +
        `<td>${escapeHtml(text)}</td></tr>`
      );
    })
    .join("");
  return `${head}<table class="msx-popup-table"><tbody>${rows}</tbody></table>${districtLink}`;
}

/** Fits the view to the combined bounds of all layers, once, on mount. */
function FitToLayers({ layers }: { layers: MapLayerData[] }) {
  const map = useMap();
  useEffect(() => {
    let bounds: L.LatLngBounds | null = null;
    for (const layer of layers) {
      const layerBounds = L.geoJSON(layer.geojson).getBounds();
      if (!layerBounds.isValid()) continue;
      bounds = bounds ? bounds.extend(layerBounds) : layerBounds;
    }
    if (bounds) map.fitBounds(bounds, { padding: [24, 24], animate: false });
    // Mount-only: the layers prop is server-fetched and never changes in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

/**
 * Applies toggle state to the pane elements. Panes stay mounted (no
 * re-fetch, no re-draw); visibility is a CSS class so the 300ms opacity
 * transition in globals.css makes layers fade instead of pop.
 */
function PaneVisibility({ visible }: { visible: Record<string, boolean> }) {
  const map = useMap();
  useEffect(() => {
    for (const [id, on] of Object.entries(visible)) {
      map.getPane(paneName(id))?.classList.toggle("msx-pane-hidden", !on);
    }
  }, [map, visible]);
  return null;
}

export default function SafetyMap({
  layers,
  role,
  fitToLayers = false,
  showControls = true,
}: SafetyMapProps) {
  // Leaflet's pan/zoom easing is JS-driven, so the CSS reduced-motion reset
  // in globals.css can't reach it — honor the OS setting via map options.
  // This file only runs in the browser (ssr:false), so matchMedia exists.
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Layer visibility — all on by default.
  const [visible, setVisible] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(layers.map((layer) => [layer.id, true]))
  );

  return (
    // `isolate` caps Leaflet's internal z-indexes (controls sit at 1000)
    // inside this box so they can never paint over the sticky site header.
    <div className="relative isolate h-full w-full">
      <MapContainer
        center={CENTER}
        zoom={9}
        // Full zoom surface: wheel, trackpad pinch (touchZoom), double-click,
        // plus the default +/- control buttons as fallback.
        scrollWheelZoom
        touchZoom
        doubleClickZoom
        zoomAnimation={!reduceMotion}
        fadeAnimation={!reduceMotion}
        markerZoomAnimation={!reduceMotion}
        inertia={!reduceMotion}
        className="h-full w-full bg-background"
      >
        <TileLayer
          // Standard OSM raster tiles (no API key); the .map-tiles CSS class
          // in globals.css inverts them into the dark theme.
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          className="map-tiles"
        />
        <PaneVisibility visible={visible} />
        {fitToLayers ? <FitToLayers layers={layers} /> : null}
        {layers.map((layer) => {
          const paint = LAYER_PAINT[layer.id] ?? {
            color: LAYER_COLORS.fireDistricts.mark,
            fillOpacity: 0.4,
          };
          return (
            <Pane
              key={layer.id}
              name={paneName(layer.id)}
              className="msx-layer-pane"
              style={{ zIndex: PANE_Z[layer.id] ?? 405 }}
            >
              <GeoJSON
                // react-leaflet's GeoJSON never re-reads the data prop after
                // mount, so the key carries everything that changes what was
                // drawn: the role (public vs analyst attributes/popups) —
                // without it, toggling roles client-side would keep stale
                // popups bound.
                key={`${layer.id}-${role}`}
                data={layer.geojson}
                style={(feature) => {
                  // Fire districts get a deterministic per-district fill
                  // density within the readable 0.35–0.5 window so
                  // neighboring districts stay distinguishable.
                  let fillOpacity = paint.fillOpacity;
                  if (layer.id === "fireDistricts") {
                    const name = String(
                      feature?.properties?.[layer.nameField] ?? ""
                    );
                    fillOpacity = 0.35 + (hashString(name) % 4) * 0.05;
                  }
                  return {
                    color: paint.color,
                    weight: 1.5,
                    fillColor: paint.color,
                    fillOpacity,
                  };
                }}
                pointToLayer={(_feature, latlng) =>
                  // circleMarker instead of the default icon Marker: no image
                  // assets to bundle, and it takes the theme colors directly.
                  // The pane must be passed explicitly — Leaflet hands a
                  // custom pointToLayer result none of the parent's options.
                  L.circleMarker(latlng, {
                    pane: paneName(layer.id),
                    radius: 6,
                    color: INK,
                    weight: 2,
                    fillColor: LAYER_COLORS.pollingLocations.mark,
                    fillOpacity: 1,
                  })
                }
                onEachFeature={(feature, leafletLayer) => {
                  leafletLayer.bindPopup(popupHtml(layer, feature, role), {
                    maxWidth: 320,
                  });
                  // Hover: lift the feature above its pane siblings and
                  // thicken its outline so overlapping shapes read clearly.
                  leafletLayer.on("mouseover", (e) => {
                    const target = e.target as L.Path;
                    target.bringToFront?.();
                    target.setStyle?.({ weight: 3 });
                  });
                  leafletLayer.on("mouseout", (e) => {
                    const target = e.target as L.Path;
                    target.setStyle?.({
                      weight: layer.kind === "point" ? 2 : 1.5,
                    });
                  });
                }}
              />
            </Pane>
          );
        })}
      </MapContainer>

      {/* Layer control panel — doubles as the legend: each row is labeled
          and wears its layer's signature color, so identity is never color
          alone. Toggles fade panes via PaneVisibility above. */}
      {showControls ? (
      <div className="absolute right-2 top-2 z-[500] w-64 border border-line bg-background/95 px-3 py-2 backdrop-blur">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-faint">
          Layers
        </p>
        <div className="divide-y divide-line/60">
          {layers.map((layer) => (
            <LayerToggle
              key={layer.id}
              label={layer.title}
              count={layer.geojson.features.length}
              color={
                LAYER_COLORS[layer.id as keyof typeof LAYER_COLORS] ?? {
                  mark: "#948e86",
                  text: "#a9a29a",
                }
              }
              checked={visible[layer.id] ?? true}
              onChange={(next) =>
                setVisible((prev) => ({ ...prev, [layer.id]: next }))
              }
              description={layer.description}
            />
          ))}
        </div>
      </div>
      ) : null}
    </div>
  );
}
