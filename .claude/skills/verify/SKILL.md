---
name: verify
description: Build, run, and drive the Missoula Public Safety Explorer to verify role gating, redaction, and data rendering end-to-end.
---

# Verifying this app

Build + launch (port 3000 is often taken on this machine — use 3100):

```powershell
npm run build
npx next start -p 3100    # run in background; poll GET /login until 200
```

`next start` runs NODE_ENV=production, so the session cookie is `Secure` —
fine on localhost (browsers and curl treat localhost as a secure context).

Site structure (since the 2026-07 revision): `/` landing, `/map` tool
(takes `?view=analyst`), `/analyst` console, `/district/[id]` drill-downs.

## Flows worth driving (all with curl)

1. `GET /` → 200 landing; hero ("Every fire district"), CTAs
   ("Explore the map"). `GET /map` → 200 with "Public view", stat counts,
   the coverage chart — and must NOT contain `2625 BRIGGS`, `EASTMSLA`, or
   `globalid` (public payload is names-only; that's the core guarantee).
2. `GET /analyst` and `GET /map?view=analyst` without cookie → 307 to
   `/login?from=...`.
3. Legacy redirects: `GET /?view=analyst` → 308 `/map?view=analyst`;
   `GET /about` → 308 `/`.
4. `POST /api/login --data-raw "passphrase=kestrel&from=%2Fanalyst"` → 303,
   `set-cookie: analyst_session=granted; HttpOnly`. Save with `-c jar.txt`.
5. `GET /analyst -b jar.txt` → 200 with `EASTMSLA`, `2625 BRIGGS`, FEMA
   breakdown, "Recent access" audit panel, "Show internal fields", "Sign
   out". Loading it also appends an audit entry (visible on next load).
6. Redaction: `GET /district/missoula-rfd` (no cookie) → 200 with
   "Analyst access required" lock; with `-b jar.txt` the lock is absent.
   Unknown slug → the styled "No such district" 404.
7. `POST /api/logout -b jar.txt` → 307 to `/`, cookie expired 1970; /analyst
   redirects again afterward.

## Chatbot (needs local Ollama)

Ollama is installed on this machine (`ollama serve` if the daemon is down;
`llama3.2:3b` is already pulled). `GET /api/chat/health` → `{"ok":true,...}`.

PowerShell 5.1 mangles inline JSON quotes for curl — write the body to a
file and use `--data-binary "@file"`:

- Public (no cookie): ask "What is the street address of the Former Cold
  Springs School polling place?" → reply must NOT contain `2625` /
  `BRIGGS` (restricted fields never enter the public model context).
- Analyst (`-b jar.txt`): same question → reply contains the address.
- Restricted fields: fire `contact` (empty in county data!), polling
  `address`, flood `acres`.

## Probes that should hold

- `from=https://evil.com`, `from=//evil.com`, or `from=/\evil.com`
  (backslash) on login → Location is `/analyst`, never external.
- Forged `Cookie: analyst_session=hacker` → still redirected to /login.
- Missing/empty passphrase field → 303 to `/login?error=1`, not a 500.
- `GET /api/login` → 405.
- CSRF: `POST /api/logout` with `Origin: https://evil.com` → session cookie
  survives (verify /analyst is still 200 afterward); same-origin logout
  clears it.
- Matcher anchoring: `/apiary?view=analyst` and `/login-help?view=analyst`
  ARE gated (307 to /login); `/login?from=...` stays 200.
- Analyst payload includes all attributes (`globalid` appears); public
  payload never does.
- `/api/chat` with an invalid body → 400 `invalid_messages`; with Ollama
  stopped → 503 `ollama_unreachable` (UI shows the local-demo card).

## Gotchas

- PowerShell 5.1: `$home` is read-only — don't use it as a variable name.
- `curl.exe -d ""` misparses; use `--data-raw "field="` for empty-field
  probes, and a body FILE for JSON (inline quotes get stripped).
- The click-through fix is client-side (per-layer Leaflet panes + a
  pointer-events-cutting hidden class) — curl can't drive it; check
  `.msx-pane-hidden` CSS and PANE_Z in SafetyMap.tsx if regressing it.
