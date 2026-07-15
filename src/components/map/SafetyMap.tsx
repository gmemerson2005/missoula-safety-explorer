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

// One paint scheme per layer identity. Fire wears the app accent; flood is a
// desaturated water blue so the two polygon layers never read as one.
const LAYER_PAINT: Record<string, { color: string; fillOpacity: number }> = {
  fireDistricts: { color: "#f07d00", fillOpacity: 0.1 },
  floodplain: { color: "#5b8db8", fillOpacity: 0.25 },
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Popup markup is built as an escaped HTML string (Leaflet popups live
 * outside the React tree). Public role: name only. Analyst role: every
 * configured attribute. County data is third-party input, so everything is
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
  const rows = layer.fields
    .map((field) => {
      const value = props[field.key];
      const text =
        value === null || value === undefined || value === ""
          ? "—"
          : String(value);
      return (
        `<tr><th scope="row">${escapeHtml(field.label)}</th>` +
        `<td>${escapeHtml(text)}</td></tr>`
      );
    })
    .join("");
  return `${head}<table class="msx-popup-table"><tbody>${rows}</tbody></table>`;
}

export default function SafetyMap({ layers, role }: SafetyMapProps) {
  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={CENTER}
        zoom={9}
        scrollWheelZoom={false}
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
            color: "#f07d00",
            fillOpacity: 0.1,
          };
          return (
            <GeoJSON
              key={layer.id}
              data={layer.geojson}
              style={{
                color: paint.color,
                weight: 1.5,
                fillColor: paint.color,
                fillOpacity: paint.fillOpacity,
              }}
              pointToLayer={(_feature, latlng) =>
                // circleMarker instead of the default icon Marker: no image
                // assets to bundle, and it takes the theme colors directly.
                L.circleMarker(latlng, {
                  radius: 6,
                  color: "#080808",
                  weight: 2,
                  fillColor: "#ff9120",
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
                      ? { background: "#ff9120" }
                      : {
                          borderColor: paint?.color ?? "#f07d00",
                          background: `${paint?.color ?? "#f07d00"}33`,
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
