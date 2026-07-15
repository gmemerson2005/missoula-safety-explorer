// Server Component (async) — the analyst console. Second enforcement point
// behind proxy.ts: even if a request somehow slipped past the proxy matcher,
// this component re-checks the session cookie ON THE SERVER and redirects
// before any record-level data is fetched or rendered. All county data is
// fetched here server-side (1-hour revalidate); the client-side pieces
// (search/sort in DataTable) only ever see rows this component chose to
// pass down as props.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DATASETS, getDataset } from "@lib/datasets";
import { fetchLayerTable, type FeatureProperties, type Result } from "@lib/arcgis";
import { hasAnalystSession } from "@lib/auth";
import { buildMapLayers } from "@lib/mapData";
import DataTable from "@components/DataTable";
import MapPanel from "@components/map/MapPanel";

export const metadata: Metadata = { title: "Analyst console" };

/** Group rows by an attribute, counting and summing numeric `sumKey`. */
function breakdown(
  rows: FeatureProperties[],
  groupKey: string,
  sumKey?: string
): { group: string; count: number; sum: number }[] {
  const groups = new Map<string, { count: number; sum: number }>();
  for (const row of rows) {
    const raw = row[groupKey];
    const group = raw === null || raw === undefined || raw === "" ? "—" : String(raw);
    const entry = groups.get(group) ?? { count: 0, sum: 0 };
    entry.count += 1;
    if (sumKey && typeof row[sumKey] === "number") {
      entry.sum += row[sumKey] as number;
    }
    groups.set(group, entry);
  }
  return [...groups.entries()]
    .map(([group, { count, sum }]) => ({ group, count, sum }))
    .sort((a, b) => b.count - a.count);
}

function OfflinePanel({ title, error }: { title: string; error: string }) {
  return (
    <div className="border border-danger/60 bg-surface p-4">
      <p className="font-mono text-xs uppercase tracking-widest text-danger">
        ○ {title} — layer offline
      </p>
      <p className="mt-2 font-mono text-xs text-muted">{error}</p>
      <p className="mt-1 text-xs text-faint">
        The county endpoint did not respond; the rest of the console remains
        available. Refresh to retry.
      </p>
    </div>
  );
}

function BreakdownTable({
  label,
  unitLabel,
  sumLabel,
  data,
}: {
  label: string;
  unitLabel: string;
  sumLabel?: string;
  data: { group: string; count: number; sum: number }[];
}) {
  return (
    <div className="border border-line bg-surface p-4">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
        {label}
      </h3>
      <table className="mt-2 w-full font-mono text-xs">
        <thead>
          <tr className="text-left uppercase tracking-wider text-faint">
            <th scope="col" className="py-1 pr-2 font-normal">
              Group
            </th>
            <th scope="col" className="py-1 pr-2 text-right font-normal">
              {unitLabel}
            </th>
            {sumLabel ? (
              <th scope="col" className="py-1 text-right font-normal">
                {sumLabel}
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {data.map((entry) => (
            <tr key={entry.group} className="border-t border-line/60">
              <td className="py-1 pr-2">{entry.group}</td>
              <td className="py-1 pr-2 text-right tabular-nums">
                {entry.count.toLocaleString("en-US")}
              </td>
              {sumLabel ? (
                <td className="py-1 text-right tabular-nums">
                  {entry.sum > 0
                    ? entry.sum.toLocaleString("en-US", { maximumFractionDigits: 0 })
                    : "—"}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AnalystPage() {
  if (!(await hasAnalystSession())) {
    redirect("/login?from=%2Fanalyst");
  }

  const [tableResults, mapData] = await Promise.all([
    Promise.all(DATASETS.map((dataset) => fetchLayerTable(dataset))),
    buildMapLayers(DATASETS, "analyst"),
  ]);
  const byId = new Map<string, Result<FeatureProperties[]>>(
    DATASETS.map((dataset, i) => [dataset.id, tableResults[i]])
  );

  const polling = byId.get("pollingLocations")!;
  const flood = byId.get("floodplain")!;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
        Analyst console
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Full record access
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-muted">
        Every record and attribute the county publishes for the three layers,
        with client-side search and column sorting. Data is fetched
        server-side and revalidated hourly.
      </p>

      {/* Detailed map — all layers, full-attribute popups */}
      <section aria-label="Detailed county map" className="mt-8">
        {mapData.offline.map((entry) => (
          <p
            key={entry.title}
            role="status"
            className="mb-2 border border-danger/60 bg-surface px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-danger"
          >
            ○ {entry.title} layer offline — not shown on map
          </p>
        ))}
        {mapData.layers.length > 0 ? (
          <div className="h-[480px] border border-line sm:h-[540px]">
            <MapPanel layers={mapData.layers} role="analyst" />
          </div>
        ) : (
          <div className="flex h-[420px] items-center justify-center border border-line bg-surface">
            <p className="max-w-sm px-4 text-center font-mono text-xs uppercase tracking-[0.25em] text-faint">
              Map unavailable — all county layers are offline right now
            </p>
          </div>
        )}
      </section>

      {/* Per-group breakdowns */}
      <section aria-label="Breakdowns" className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
        {flood.ok ? (
          <BreakdownTable
            label="Flood polygons by FEMA zone"
            unitLabel="Polygons"
            sumLabel="Mapped acres"
            data={breakdown(flood.value, "femades", "acres")}
          />
        ) : (
          <OfflinePanel title="Flood zone breakdown" error={flood.error} />
        )}
        {polling.ok ? (
          <BreakdownTable
            label="Polling locations by city"
            unitLabel="Locations"
            data={breakdown(polling.value, "city")}
          />
        ) : (
          <OfflinePanel title="Polling breakdown" error={polling.error} />
        )}
      </section>

      {/* Full data tables */}
      {DATASETS.map((dataset, i) => {
        const result = tableResults[i];
        return (
          <section key={dataset.id} aria-label={dataset.title} className="mt-10">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="font-mono text-sm font-semibold uppercase tracking-[0.2em]">
                {dataset.title}
              </h2>
              <span className="font-mono text-xs text-accent">
                {result.ok
                  ? `${result.value.length.toLocaleString("en-US")} ${dataset.unit}`
                  : "offline"}
              </span>
              <a
                href={getDataset(dataset.id).sourcePage}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto font-mono text-[11px] uppercase tracking-widest text-muted hover:text-accent-hover"
              >
                Source ↗
              </a>
            </div>
            <div className="mt-3">
              {result.ok ? (
                <DataTable
                  title={dataset.title}
                  columns={dataset.tableFields}
                  rows={result.value}
                />
              ) : (
                <OfflinePanel title={dataset.title} error={result.error} />
              )}
            </div>
          </section>
        );
      })}
    </main>
  );
}
