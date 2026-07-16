# Missoula Public Safety Explorer

Every fire district, flood zone, and polling place in Missoula County — on one map. Live county GIS data on a dark, layer-color-coded console: everyone gets verified summaries and a fully interactive map; credentialed analysts get every record, attribute, and a role-aware AI assistant. Built as a learning project for server-first Next.js App Router architecture with real access gating.

> **Screenshots**
>
> ![Landing page](docs/screenshots/landing.png) *(placeholder)*
> ![Map with layer toggles and chart](docs/screenshots/map-public.png) *(placeholder)*
> ![Analyst console with audit panel](docs/screenshots/analyst-console.png) *(placeholder)*
> ![District drill-down with redacted field](docs/screenshots/district-public.png) *(placeholder)*
> ![AI assistant drawer](docs/screenshots/chat.png) *(placeholder)*

## Site structure

| Route | What it is |
|---|---|
| `/` | Landing page: the pitch, what each layer is and why it matters, how public vs analyst access works, data credits |
| `/map` | The tool: interactive map with per-layer toggles, stat cards, per-district chart, and the `?view=analyst` variant |
| `/analyst` | Gated console: full data tables, breakdowns, audit panel (sign-in at `/login`) |
| `/district/[id]` | Per-district drill-down: mini map, stats, record detail, prev/next navigation |

Old URLs keep working: `/?view=analyst` redirects to `/map?view=analyst`, `/about` redirects to `/`.

## Features

- **Layer-color design system** — the palette IS the map legend: fire response zones wear ember (`#E8502A`), flood hazard zones cyan (`#1F9FE0`), polling locations violet (`#8A4DE8`) on every surface (map, toggles, stat cards, chart bars, links). Validated colorblind-safe; documented in [`.claude/skills/safety-explorer-design/SKILL.md`](.claude/skills/safety-explorer-design/SKILL.md).
- **Layer toggles + click-through-safe map** — each layer renders in its own Leaflet pane with explicit z-index; toggling fades the pane (300 ms) and cuts pointer events so hidden layers never swallow clicks; hover brings features to front. Wheel, pinch, and double-click zoom all enabled.
- **Audit log** — analyst-tier reads (detail tables, district pages) append `{timestamp, route, masked session id}` to a server-side store; the console shows the last 10. *In-memory demo store: resets on redeploy; production would use an append-only database table written from the same server call sites.*
- **Field-level redaction, enforced server-side** — district contacts, polling street addresses, and flood acreage are stripped to a sentinel before any non-analyst payload is built; the UI renders ▮▮▮▮ with a lock and "Analyst access required". Analysts see real values.
- **District drill-downs** — `/district/[id]` server components with a boundary-fitted mini map, approximate area, polling locations inside (point-in-polygon), redaction-aware record panel, and prev/next navigation. District names link here from popups, tables, lists, and chart bars.
- **Per-district chart** — Recharts horizontal bars of approximate coverage per fire district (computed from real boundary geometry), animated on mount, reduced-motion aware; analysts also get mapped flood acreage by FEMA zone.
- **Local AI chatbot** — see below.

## Data sources

All data comes from the [Missoula County Open Data hub](https://missoula-county-open-data-mcgis.hub.arcgis.com) (an ArcGIS Hub instance), discovered via its [DCAT-US catalog feed](https://missoula-county-open-data-mcgis.hub.arcgis.com/api/feed/dcat-us/1.1.json) and queried at ArcGIS FeatureServer endpoints (server-side filtering, `returnCountOnly` summaries, geometry generalization):

- [Fire Districts](https://missoula-county-open-data-mcgis.hub.arcgis.com/datasets/MCGIS::fire-districts) — 10 rural fire district / fire service area polygons, shown as "Fire Response Zones"
- [Polling Locations](https://missoula-county-open-data-mcgis.hub.arcgis.com/datasets/MCGIS::polling-locations) — 24 county civic-infrastructure points (the hub publishes no dedicated safety point layer; several of these points are fire stations)
- [DFIRM 2019 LOMC Floodplain](https://missoula-county-open-data-mcgis.hub.arcgis.com/datasets/MCGIS::dfirm-2019-lomc-floodplain) — 955 FEMA flood-hazard polygons, shown as "Flood Hazard Zones"

Endpoints, display names, one-sentence descriptions, and per-layer field maps (readable labels, hidden internal fields, restricted flags) live in [`src/lib/datasets.ts`](src/lib/datasets.ts); all fetching goes through [`src/lib/arcgis.ts`](src/lib/arcgis.ts) in React Server Components with `{ next: { revalidate: 3600 } }` — the browser never calls the county API, and a county outage degrades the UI instead of crashing it.

Basemap: OpenStreetMap raster tiles (no API key), CSS-filtered into the dark theme.

## How the role gating works

The gate lives on the server, in two places. `proxy.ts` (this Next version's rename of `middleware.ts`) intercepts every request for `/analyst` or `?view=analyst` and, if the `analyst_session` cookie is missing, redirects to `/login` before anything renders. The login form POSTs to a route handler that compares the passphrase server-side (it never ships in any bundle) and sets an httpOnly session cookie, invisible to client JavaScript.

Server components enforce the same boundary a second time: pages re-check the cookie and simply never fetch or render analyst-level data for public visitors. That is the load-bearing principle — a public visitor's page payload does not *contain* the full records or restricted field values, so nothing can be "unhidden" with devtools. Client-side hiding is not access control; the badge in the header is a label, not the lock.

**Demo passphrase:** `kestrel` — sign in from the header (or visit `/analyst`), and the amber `ANALYST SESSION` badge appears. Sign out from the header.

## AI assistant (local Ollama)

The map and analyst pages include an **"Ask the data"** chat drawer powered by a model running entirely on your machine through [Ollama](https://ollama.com). No API keys, no cloud calls — the Next.js route handler at [`app/api/chat/route.ts`](app/api/chat/route.ts) streams from `http://localhost:11434`.

**Two-command setup** (after installing the app itself):

```bash
# 1. install Ollama (https://ollama.com/download), then:
ollama pull llama3.2:3b
# 2. Ollama serves automatically; just run the app and open the chat drawer
```

Set `OLLAMA_MODEL` to use a different model (defaults to `llama3.2:3b`); `OLLAMA_URL` overrides the daemon address.

**Why the model isn't in git:** model weights are multi-gigabyte binaries that don't belong in a source repository — they're versioned, distributed, and deduplicated by Ollama's own registry. Anyone cloning the repo pulls the exact model with one command instead of bloating every clone forever.

**Role-aware context (the interesting part):** `/api/chat` reads the `analyst_session` cookie *server-side* and builds the model's system prompt from cached dataset summaries accordingly ([`src/lib/chatContext.ts`](src/lib/chatContext.ts)). For public visitors, restricted fields (district contacts, polling street addresses, flood acreage) are excluded from the context entirely and the prompt says that data requires analyst sign-in — the model **cannot leak values it never received**. Access is enforced at the data boundary; the model is never trusted to self-censor. Context is aggregated (counts, per-district areas, per-zone rollups) rather than raw GeoJSON, so it stays small enough for a 3B model.

**Graceful degradation:** the chat UI probes `/api/chat/health` (1.5 s timeout). If Ollama isn't reachable — like on the deployed site — the drawer shows a friendly "runs in the local demo" card instead of hanging.

**Verify the role boundary yourself** (server on port 3100):

```bash
# public: must NOT know the address
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is the street address of the Former Cold Springs School polling place?"}]}' \
  http://localhost:3100/api/chat

# analyst: sign in, then the same question returns "2625 Briggs St"
curl -s -c jar.txt --data-raw "passphrase=kestrel&from=%2Fanalyst" http://localhost:3100/api/login
curl -s -b jar.txt -X POST -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is the street address of the Former Cold Springs School polling place?"}]}' \
  http://localhost:3100/api/chat
```

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 (use `-p 3100` if 3000 is taken). Production check: `npm run build && npm run start`.

## If this were production

- **Real authentication** — an identity provider (OIDC/SAML) issuing signed, expiring sessions with revocation, replacing the shared passphrase and marker cookie; role claims checked in the proxy and in every server component that touches restricted data.
- **Rate limiting** — on the login handler (credential guessing), the data routes, and `/api/chat` (a local model is still compute).
- **Durable audit log** — the in-memory array becomes an append-only database table keyed to real session identities.
- **Per-field policy** — the `restricted` flags in the field maps would come from a policy store instead of code.

## Notes

- Layer choice: the county hub publishes no fire-stations/hydrants/law-enforcement point layer; Polling Locations is the only modest-size point dataset (three of its points are fire halls), so it stands in as the point layer alongside the two safety polygon layers.
- Raw Fire Districts GeoJSON is ~4.3 MB for 10 polygons and the floodplain download is ~18 MB; the app requests server-generalized geometry (~384 KB / ~339 KB) and attribute-only tables instead. District areas and point-in-district counts are computed from those generalized boundaries and are labeled approximate.
- The county's `contact` attribute on fire districts is empty for every district, so the redaction demo on that field shows the lock but there is no value behind it; polling addresses and flood acreage are the restricted fields with real values.
