# Missoula Public Safety Explorer

A dark, operations-styled console for Missoula County's public-safety geography: fire district boundaries, county civic infrastructure points, and FEMA flood-hazard zones. Everyone gets verified summaries; credentialed analysts get every record. Built as a learning project for server-first Next.js App Router architecture with real access gating.

> **Screenshots**
>
> ![Public landing view](docs/screenshots/public-landing.png) *(placeholder)*
> ![Analyst console with full tables](docs/screenshots/analyst-console.png) *(placeholder)*
> ![Login gate](docs/screenshots/login.png) *(placeholder)*

## Data sources

All data comes from the [Missoula County Open Data hub](https://missoula-county-open-data-mcgis.hub.arcgis.com) (an ArcGIS Hub instance), discovered via its [DCAT-US catalog feed](https://missoula-county-open-data-mcgis.hub.arcgis.com/api/feed/dcat-us/1.1.json) and queried at ArcGIS FeatureServer endpoints (server-side filtering, `returnCountOnly` summaries, geometry generalization):

- [Fire Districts](https://missoula-county-open-data-mcgis.hub.arcgis.com/datasets/MCGIS::fire-districts) — 10 rural fire district / fire service area polygons
- [Polling Locations](https://missoula-county-open-data-mcgis.hub.arcgis.com/datasets/MCGIS::polling-locations) — 24 county civic-infrastructure points (the hub publishes no dedicated safety point layer; several of these points are fire stations)
- [DFIRM 2019 LOMC Floodplain](https://missoula-county-open-data-mcgis.hub.arcgis.com/datasets/MCGIS::dfirm-2019-lomc-floodplain) — 955 FEMA flood-hazard polygons

Endpoints are configured and documented in [`src/lib/datasets.ts`](src/lib/datasets.ts); all fetching goes through [`src/lib/arcgis.ts`](src/lib/arcgis.ts) in React Server Components with `{ next: { revalidate: 3600 } }` — the browser never calls the county API, and a county outage degrades the UI instead of crashing it.

Basemap: OpenStreetMap raster tiles (no API key), CSS-inverted into the dark theme.

## How the role gating works

The app has two tiers driven by a URL search param (`?view=public` / `?view=analyst`) plus the `/analyst` console. The gate lives on the server, in two places. `proxy.ts` (this Next version's rename of `middleware.ts`) intercepts every request for `/analyst` or `?view=analyst` and, if the `analyst_session` cookie is missing, redirects to `/login` before anything renders. The login form POSTs to a route handler that compares the passphrase server-side (it never ships in any bundle) and sets an httpOnly session cookie, invisible to client JavaScript.

The server components enforce the same boundary a second time: pages re-check the cookie and simply never fetch or render analyst-level data for public visitors. That is the load-bearing principle — a public visitor's page payload does not *contain* the full records, so nothing can be "unhidden" with devtools. Client-side hiding is not access control; the orange/gray status strip under the header is a label, not the lock.

**Demo passphrase:** `kestrel` — switch the role dropdown to *Analyst* (or visit `/analyst`), sign in, and the strip flips to orange `ANALYST VIEW`. Sign out from the header.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Production check: `npm run build && npm run start`.

## If this were production

- **Real authentication** — an identity provider (OIDC/SAML) issuing signed, expiring sessions with revocation, replacing the shared passphrase and marker cookie; role claims checked in the proxy and in every server component that touches restricted data.
- **Rate limiting** — on the login handler (credential guessing) and on the data routes (the app is a caching proxy for county infrastructure; it shouldn't be usable to hammer it).
- **Audit logging** — append-only log of sign-ins, failed attempts, and every analyst-tier data access, with the session identity attached.
- **Field-level redaction** — the analyst/public split is currently per-layer; production would redact per-attribute on the server (e.g. contact names on fire districts) so each role's payload contains exactly what that role may see.

## Notes

- Layer choice: the county hub publishes no fire-stations/hydrants/law-enforcement point layer; Polling Locations is the only modest-size point dataset (three of its points are fire halls), so it stands in as the point layer alongside the two safety polygon layers.
- Raw Fire Districts GeoJSON is ~4.3 MB for 10 polygons and the floodplain download is ~18 MB; the app requests server-generalized geometry (~384 KB / ~339 KB) and attribute-only tables instead.
