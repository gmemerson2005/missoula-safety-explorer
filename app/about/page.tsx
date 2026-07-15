// Server Component (no directive) — static informational content, no data
// fetching and no interactivity, so there is nothing to ship to the client
// beyond markup.

import type { Metadata } from "next";
import { DATASETS } from "@lib/datasets";

export const metadata: Metadata = { title: "About" };

function DiagramBox({
  title,
  children,
  accent = false,
}: {
  title: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`border ${accent ? "border-accent" : "border-line"} bg-surface p-3`}
    >
      <p
        className={`font-mono text-[11px] uppercase tracking-[0.2em] ${accent ? "text-accent" : "text-muted"}`}
      >
        {title}
      </p>
      <div className="mt-1 text-xs leading-5 text-muted">{children}</div>
    </div>
  );
}

function DiagramArrow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-1 pl-4" aria-hidden="true">
      <span className="font-mono text-accent">↓</span>
      <span className="font-mono text-[10px] uppercase tracking-widest text-faint">
        {label}
      </span>
    </div>
  );
}

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
        System documentation
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">About</h1>

      <section className="mt-8">
        <h2 className="font-mono text-sm font-semibold uppercase tracking-[0.2em]">
          Data sources
        </h2>
        <p className="mt-2 leading-7 text-muted">
          Every number and shape in this app comes from the{" "}
          <a
            href="https://missoula-county-open-data-mcgis.hub.arcgis.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-hover"
          >
            Missoula County Open Data hub
          </a>
          , an ArcGIS Hub instance. Layers were discovered through the hub&apos;s{" "}
          <a
            href="https://missoula-county-open-data-mcgis.hub.arcgis.com/api/feed/dcat-us/1.1.json"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-hover"
          >
            DCAT-US catalog feed
          </a>{" "}
          and are queried at their ArcGIS FeatureServer endpoints, which allow
          server-side filtering, cheap count-only summaries, and geometry
          generalization so the app never moves more data than a view needs.
        </p>
        <ul className="mt-4 divide-y divide-line border border-line bg-surface">
          {DATASETS.map((dataset) => (
            <li key={dataset.id} className="p-3">
              <a
                href={dataset.sourcePage}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground hover:text-accent-hover"
              >
                {dataset.title} ↗
              </a>
              <p className="mt-1 text-xs leading-5 text-muted">
                {dataset.publicDescription}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-mono text-sm font-semibold uppercase tracking-[0.2em]">
          Architecture
        </h2>
        <p className="mt-2 leading-7 text-muted">
          All county data is fetched in React Server Components with a
          one-hour revalidation window — the browser never calls the county
          API. The only client-side JavaScript does client-side work: the
          Leaflet map, table search and sort, and the role dropdown that
          rewrites the URL.
        </p>
        <div className="mt-4" role="img" aria-label="Request flow diagram: browser to proxy gate to server components to county API">
          <DiagramBox title="Browser">
            Map island · table search/sort · role dropdown (?view=) — no county
            fetches, no secrets
          </DiagramBox>
          <DiagramArrow label="request" />
          <DiagramBox title="proxy.ts — server gate" accent>
            /analyst or ?view=analyst without a session cookie → redirect to
            /login before anything renders
          </DiagramBox>
          <DiagramArrow label="allowed" />
          <DiagramBox title="React Server Components">
            page.tsx fetches counts, tables, geometry · re-checks the session ·
            renders the role&apos;s variant server-side
          </DiagramBox>
          <DiagramArrow label="fetch · cached 1 hour" />
          <DiagramBox title="Missoula County ArcGIS FeatureServer">
            returnCountOnly summaries · attribute-only tables · generalized
            geometry
          </DiagramBox>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-mono text-sm font-semibold uppercase tracking-[0.2em]">
          Access control
        </h2>
        <p className="mt-2 leading-7 text-muted">
          The analyst tier is gated on the server, twice. The proxy redirects
          any analyst-tier request without a session cookie to the login page,
          and the server components that fetch record-level data re-check the
          same cookie before fetching or rendering anything. The session
          cookie is httpOnly, set by a server route handler after a
          passphrase check that also runs only on the server.
        </p>
        <p className="mt-3 leading-7 text-muted">
          What this deliberately is not: client-side hiding. A public
          visitor&apos;s page payload never contains analyst data, so there is
          nothing to reveal with devtools — the &quot;PUBLIC VIEW&quot; strip
          is a label, not the lock. The passphrase here is a mock stand-in for
          a real identity provider, but the placement of the checks is the
          part that carries to production.
        </p>
      </section>
    </main>
  );
}
