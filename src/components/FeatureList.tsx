// Server Component (no directive) — a text alternative to the map. Leaflet
// vector features are never keyboard-focusable, so this renders the same
// feature names (per layer, deduplicated with counts) as plain HTML for
// keyboard and screen-reader users. It receives the same server-fetched
// layers the map got — no extra request, no extra exposure.

import type { MapLayerData } from "@components/map/SafetyMap";

const MAX_ENTRIES_PER_LAYER = 60;

function namesFor(layer: MapLayerData): string[] {
  const counts = new Map<string, number>();
  for (const feature of layer.geojson.features) {
    const raw = feature.properties?.[layer.nameField];
    const name =
      raw === null || raw === undefined || raw === "" ? "(unnamed)" : String(raw);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const entries = [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "en"))
    .map(([name, count]) => (count > 1 ? `${name} (×${count})` : name));
  if (entries.length > MAX_ENTRIES_PER_LAYER) {
    const extra = entries.length - MAX_ENTRIES_PER_LAYER;
    return [...entries.slice(0, MAX_ENTRIES_PER_LAYER), `…and ${extra} more`];
  }
  return entries;
}

export default function FeatureList({ layers }: { layers: MapLayerData[] }) {
  if (layers.length === 0) return null;
  return (
    <details className="mt-2 border border-line bg-surface">
      <summary className="cursor-pointer px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-muted hover:text-accent-hover">
        Map features as text (keyboard-accessible alternative)
      </summary>
      <div className="grid grid-cols-1 gap-4 px-3 pb-3 sm:grid-cols-2 lg:grid-cols-3">
        {layers.map((layer) => (
          <div key={layer.id}>
            <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
              {layer.title}
            </h3>
            <ul className="mt-1 space-y-0.5 font-mono text-xs text-foreground/90">
              {namesFor(layer).map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
