"use client";
// Client Component — necessarily so: Leaflet drives the real DOM and only
// runs in the browser. This file is ONLY ever loaded through MapPanel's
// dynamic(..., { ssr: false }) import, so none of it executes on the server.
// It receives server-fetched GeoJSON as props and renders it; it fetches
// nothing itself. The role prop only chooses how much attribute detail the
// popups show — and the server already withheld analyst-only layers from
// the props when the visitor is public, so there is nothing hidden in this
// payload to "unhide".

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import type { Feature } from "geojson";
import type { LayerGeoJSON } from "@lib/arcgis";
import { INK, LAYER_COLORS } from "@lib/layerColors";

export interface MapLayerData {
  id: string;
  title: string;
  kind: "polygon" | "point";
  nameField: string;
  /** Attribute keys+labels shown in analyst popups. */
  fields: { key: string; label: string }[];
  geojson: LayerGeoJSON;
}

export interface SafetyMapProps {
  layers: MapLayerData[];
  role: "public" | "analyst";
}

// Missoula County, Montana.
const CENTER: [number, number] = [46.9, -113.9];

// One paint scheme per layer identity, from the shared signature palette
// (src/lib/layerColors.ts) — the same colors the toggles, stat cards, and
// charts wear.
const LAYER_PAINT: Record<string, { color: string; fillOpacity: number }> = {
  fireDistricts: { color: LAYER_COLORS.fireDistricts.mark, fillOpacity: 0.1 },
  floodplain: { color: LAYER_COLORS.floodplain.mark, fillOpacity: 0.25 },
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
  const head =
    `<div class="msx-popup-kicker">${escapeHtml(layer.title)}</div>` +
    `<div class="msx-popup-name">${name}</div>`;
  if (role === "public") return head;
  const labelFor = new Map(layer.fields.map((f) => [f.key, f.label]));
  const rows = Object.entries(props)
    .filter(([key]) => key !== layer.nameField)
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
  return `${head}<table class="msx-popup-table"><tbody>${rows}</tbody></table>`;
}

export default function SafetyMap({ layers, role }: SafetyMapProps) {
  // Leaflet's pan/zoom easing is JS-driven, so the CSS reduced-motion reset
  // in globals.css can't reach it — honor the OS setting via map options.
  // This file only runs in the browser (ssr:false), so matchMedia exists.
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    // `isolate` caps Leaflet's internal z-indexes (controls sit at 1000)
    // inside this box so they can never paint over the sticky site header.
    <div className="relative isolate h-full w-full">
      <MapContainer
        center={CENTER}
        zoom={9}
        scrollWheelZoom={false}
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
        {layers.map((layer) => {
          const paint = LAYER_PAINT[layer.id] ?? {
            color: LAYER_COLORS.fireDistricts.mark,
            fillOpacity: 0.1,
          };
          return (
            <GeoJSON
              // react-leaflet's GeoJSON never re-reads the data prop after
              // mount, so the key carries everything that changes what was
              // drawn: the role (public vs analyst attributes/popups) —
              // without it, toggling roles client-side would keep stale
              // popups bound.
              key={`${layer.id}-${role}`}
              data={layer.geojson}
              style={(feature) => {
                // "Styled by district": fire polygons get a deterministic
                // per-district fill density (same hue — the accent stays
                // the accent) so neighboring districts read as distinct.
                let fillOpacity = paint.fillOpacity;
                if (layer.id === "fireDistricts") {
                  const name = String(
                    feature?.properties?.[layer.nameField] ?? ""
                  );
                  fillOpacity = 0.06 + (hashString(name) % 8) * 0.035;
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
                L.circleMarker(latlng, {
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
              }}
            />
          );
        })}
      </MapContainer>

      {/* Legend — identity is never color alone; each swatch is labeled. */}
      <div className="absolute bottom-6 left-2 z-[500] border border-line bg-background/90 px-3 py-2">
        <ul className="space-y-1 font-mono text-[10px] uppercase tracking-widest text-muted">
          {layers.map((layer) => {
            const paint = LAYER_PAINT[layer.id];
            return (
              <li key={layer.id} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={
                    layer.kind === "point"
                      ? "inline-block h-2.5 w-2.5 rounded-full"
                      : "inline-block h-2.5 w-2.5 border"
                  }
                  style={
                    layer.kind === "point"
                      ? { background: LAYER_COLORS.pollingLocations.mark }
                      : {
                          borderColor: paint?.color ?? LAYER_COLORS.fireDistricts.mark,
                          background: `${paint?.color ?? LAYER_COLORS.fireDistricts.mark}33`,
                        }
                  }
                />
                {layer.title}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
