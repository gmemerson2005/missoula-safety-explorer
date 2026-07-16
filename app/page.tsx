// Server Component (async) — the landing page. A product-style explainer:
// hero + pitch, what each data layer is and why it matters, how public vs
// analyst access works, and data credits. Layer counts are fetched
// server-side (cached 1 hour) purely for credibility numbers; if the county
// API is down the page still renders with the counts marked offline.

import Link from "next/link";
import { DATASETS } from "@lib/datasets";
import { fetchLayerCount } from "@lib/arcgis";
import { hasAnalystSession } from "@lib/auth";
import { LAYER_COLORS, TIER_COLOR } from "@lib/layerColors";

export default async function LandingPage() {
  const [countResults, isAnalyst] = await Promise.all([
    Promise.all(DATASETS.map((dataset) => fetchLayerCount(dataset))),
    hasAnalystSession(),
  ]);

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:pt-24">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
          Missoula County · Montana
        </p>
        <h1 className="mt-3 max-w-4xl font-display text-6xl font-bold leading-[0.95] tracking-tight sm:text-8xl">
          Every fire district, flood zone, and polling place in Missoula County
          — on one map.
        </h1>
        {/* The tri-color rule: the palette introducing itself as the legend. */}
        <div className="mt-6 flex h-1.5 w-full max-w-md" aria-hidden="true">
          <span className="flex-1" style={{ background: LAYER_COLORS.fireDistricts.mark }} />
          <span className="flex-1" style={{ background: LAYER_COLORS.floodplain.mark }} />
          <span className="flex-1" style={{ background: LAYER_COLORS.pollingLocations.mark }} />
        </div>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
          The Public Safety Explorer draws live county GIS data onto a single
          interactive map. Everyone gets verified summaries; credentialed
          analysts get every record and attribute the county publishes.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/map"
            className="border border-foreground bg-foreground px-6 py-3 font-mono text-sm font-semibold uppercase tracking-[0.15em] text-background transition-transform duration-150 hover:bg-background hover:text-foreground active:scale-[0.98]"
          >
            Explore the map →
          </Link>
          <Link
            href={isAnalyst ? "/analyst" : "/login"}
            className="border border-line px-6 py-3 font-mono text-sm uppercase tracking-[0.15em] text-muted transition-colors duration-150 hover:border-foreground hover:text-foreground active:scale-[0.98]"
          >
            {isAnalyst ? "Open analyst console" : "Analyst sign in"}
          </Link>
        </div>
      </section>

      {/* Layer explainer — one card per layer, wearing its signature color. */}
      <section aria-label="The data layers" className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-4xl font-bold tracking-tight">
            Three layers. One color each. Everywhere.
          </h2>
          <p className="mt-3 max-w-2xl leading-7 text-muted">
            Each data layer wears one signature color across the whole site —
            on the map, the toggles, the stat cards, and the charts. Learn the
            color once and you can read every screen.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {DATASETS.map((dataset, i) => {
              const color = LAYER_COLORS[dataset.id];
              const result = countResults[i];
              return (
                <article
                  key={dataset.id}
                  className="border border-line bg-background p-5"
                  style={{ borderTop: `3px solid ${color.mark}` }}
                >
                  <h3
                    className="font-mono text-xs font-semibold uppercase tracking-[0.2em]"
                    style={{ color: color.text }}
                  >
                    {dataset.title}
                  </h3>
                  <p className="mt-1 font-display text-4xl font-bold">
                    {result.ok ? result.value.toLocaleString("en-US") : "—"}{" "}
                    <span className="text-lg font-semibold text-faint">
                      {dataset.unit}
                    </span>
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {dataset.publicDescription}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Public vs analyst access */}
      <section aria-label="Access tiers" className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-4xl font-bold tracking-tight">
            Two tiers, gated on the server.
          </h2>
          <p className="mt-3 max-w-2xl leading-7 text-muted">
            The public tier and the analyst tier see different data — and the
            difference is enforced before a page is rendered, not hidden with
            CSS. A public visitor&apos;s page payload simply never contains
            restricted records.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="border border-line bg-surface p-5">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                ○ Public
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
                <li>Full interactive map with all summary layers</li>
                <li>Feature names, counts, and layer descriptions</li>
                <li>No sign-in required</li>
              </ul>
            </div>
            <div
              className="border border-line bg-surface p-5"
              style={{ borderTop: `3px solid ${TIER_COLOR.mark}` }}
            >
              <p
                className="font-mono text-xs font-semibold uppercase tracking-[0.2em]"
                style={{ color: TIER_COLOR.text }}
              >
                ● Analyst
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
                <li>Every record and attribute the county publishes</li>
                <li>Searchable, sortable data tables and breakdowns</li>
                <li>Session cookie issued after server-side sign-in</li>
              </ul>
            </div>
          </div>
          {/* The gate, as a simple visual */}
          <div
            className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border border-line bg-surface px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-muted"
            role="group"
            aria-label="How the access gate works"
          >
            <span>Browser</span>
            <span aria-hidden="true" className="text-faint">→</span>
            <span style={{ color: TIER_COLOR.text }}>Server gate checks session</span>
            <span aria-hidden="true" className="text-faint">→</span>
            <span>Page renders only your tier&apos;s data</span>
          </div>
        </div>
      </section>

      {/* Data credits */}
      <section aria-label="Data sources" className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-4xl font-bold tracking-tight">
            Built on the county&apos;s own data.
          </h2>
          <p className="mt-3 max-w-2xl leading-7 text-muted">
            Everything here is fetched live from the{" "}
            <a
              href="https://missoula-county-open-data-mcgis.hub.arcgis.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-4 hover:text-muted"
            >
              Missoula County Open Data hub
            </a>{" "}
            and cached for an hour — the browser never talks to county servers
            directly, and a county outage degrades the page instead of
            crashing it.
          </p>
          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {DATASETS.map((dataset) => (
              <li key={dataset.id}>
                <a
                  href={dataset.sourcePage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border border-line bg-background p-4 font-mono text-xs uppercase tracking-wider text-muted transition-colors duration-150 hover:border-foreground hover:text-foreground"
                >
                  {dataset.title} ↗
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/map"
              className="border border-foreground bg-foreground px-6 py-3 font-mono text-sm font-semibold uppercase tracking-[0.15em] text-background transition-transform duration-150 hover:bg-background hover:text-foreground active:scale-[0.98]"
            >
              Explore the map →
            </Link>
            <Link
              href={isAnalyst ? "/analyst" : "/login"}
              className="border border-line px-6 py-3 font-mono text-sm uppercase tracking-[0.15em] text-muted transition-colors duration-150 hover:border-foreground hover:text-foreground active:scale-[0.98]"
            >
              {isAnalyst ? "Open analyst console" : "Analyst sign in"}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
