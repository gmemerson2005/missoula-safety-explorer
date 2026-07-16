/**
 * Approximate spherical area for GeoJSON polygons (WGS84 coordinates).
 * Standard ring-summation formula (the same approach as the geojson-area
 * package), good to well under a percent at county scale — plenty for the
 * "approximate square miles" readout, especially since the input boundaries
 * are already server-generalized.
 */

import type { Geometry, Position } from "geojson";

const EARTH_RADIUS_M = 6378137;
const SQ_M_PER_SQ_MI = 2_589_988.110336;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function ringArea(ring: Position[]): number {
  let total = 0;
  for (let i = 0; i < ring.length; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[(i + 1) % ring.length];
    total += toRad(lon2 - lon1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }
  return (total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2;
}

/** Outer ring minus holes; orientation-independent. */
function polygonAreaSqM(rings: Position[][]): number {
  if (rings.length === 0) return 0;
  let area = Math.abs(ringArea(rings[0]));
  for (let i = 1; i < rings.length; i++) {
    area -= Math.abs(ringArea(rings[i]));
  }
  return Math.max(area, 0);
}

export function geometryAreaSqMi(geometry: Geometry | null | undefined): number {
  if (!geometry) return 0;
  let sqM = 0;
  if (geometry.type === "Polygon") {
    sqM = polygonAreaSqM(geometry.coordinates);
  } else if (geometry.type === "MultiPolygon") {
    sqM = geometry.coordinates.reduce((sum, poly) => sum + polygonAreaSqM(poly), 0);
  }
  return sqM / SQ_M_PER_SQ_MI;
}

/** URL-safe slug for district routes: "East Missoula RFD" → "east-missoula-rfd". */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Standard ray-casting point-in-ring test ([lon, lat] order, like GeoJSON). */
function pointInRing(point: Position, ring: Position[]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(point: Position, rings: Position[][]): boolean {
  if (rings.length === 0 || !pointInRing(point, rings[0])) return false;
  // Inside the outer ring; a hit in any hole cancels it.
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(point, rings[i])) return false;
  }
  return true;
}

/**
 * Whether a [lon, lat] point falls inside a (Multi)Polygon. Used to count
 * polling locations per fire district. Boundaries are server-generalized,
 * so points within a few hundred meters of an edge may misclassify — fine
 * for an "approximately N locations" readout, and flagged as approximate in
 * the UI.
 */
export function pointInGeometry(
  point: Position,
  geometry: Geometry | null | undefined
): boolean {
  if (!geometry) return false;
  if (geometry.type === "Polygon") {
    return pointInPolygon(point, geometry.coordinates);
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((poly) => pointInPolygon(point, poly));
  }
  return false;
}
