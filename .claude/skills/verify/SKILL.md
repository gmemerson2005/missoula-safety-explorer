---
name: verify
description: Build, run, and drive the Missoula Public Safety Explorer to verify role gating and data rendering end-to-end.
---

# Verifying this app

Build + launch (port 3000 is often taken on this machine — use 3100):

```powershell
npm run build
npx next start -p 3100    # run in background; poll GET /login until 200
```

`next start` runs NODE_ENV=production, so the session cookie is `Secure` —
fine on localhost (browsers and curl treat localhost as a secure context).

## Flows worth driving (all with curl)

1. `GET /` → 200; body has "Public view", stat counts (>10<, >24<, >955<),
   fire district names — and must NOT contain `EASTMSLA`, `2625 BRIGGS ST`,
   or `femades` (public payload is names-only; that's the core guarantee).
2. `GET /analyst` and `GET /?view=analyst` without cookie → 307 to
   `/login?from=...`.
3. `POST /api/login -d "passphrase=kestrel&from=%2Fanalyst"` → 303,
   `set-cookie: analyst_session=granted; HttpOnly`. Save with `-c jar.txt`.
4. `GET /analyst -b jar.txt` → 200 with `EASTMSLA`, addresses, FEMA zone
   breakdown, "Sign out".
5. `POST /api/logout -b jar.txt` → 307 to `/`, cookie expired 1970; /analyst
   redirects again afterward.

## Probes that should hold

- `from=https://evil.com` or `from=//evil.com` on login → Location is
  `/analyst`, never external (open-redirect guard).
- Forged `Cookie: analyst_session=hacker` → still redirected to /login.
- Missing/empty passphrase field → 303 to `/login?error=1`, not a 500.
- `GET /api/login` → 405.

## Gotchas

- PowerShell 5.1: `$home` is read-only — don't use it as a variable name.
- `curl.exe -d ""` misparses; use `--data-raw "field="` for empty-field probes.
