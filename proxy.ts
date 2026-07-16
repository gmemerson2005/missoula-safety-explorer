/**
 * Server-side access gate for analyst-only surfaces.
 *
 * NOTE ON THE FILE NAME: in this Next.js version (16.x) the middleware
 * convention was renamed — `middleware.ts` is deprecated and this file,
 * `proxy.ts` exporting `proxy()`, is the replacement. It runs on the Node.js
 * runtime before matched requests and behaves exactly like the middleware
 * you may know from Next 13–15.
 *
 * WHAT THIS IS (and is not): a mock of session-based access control. The
 * "session" is a bare marker cookie set by app/api/login/route.ts after a
 * passphrase check. In production this would be a real session from an auth
 * provider — a signed/encrypted token (or server-side session id) that is
 * validated cryptographically here, with expiry and revocation.
 *
 * THE PRINCIPLE THAT DOES CARRY TO PRODUCTION: gating happens on the
 * server — in this proxy (requests are redirected before any analyst markup
 * is rendered) and again in the server components that fetch the detailed
 * data. Client-side hiding is NOT access control: anything a client
 * component merely hides was still shipped to the browser and is one
 * devtools tab away. Here, the analyst data never leaves the server for an
 * unauthenticated request.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ANALYST_COOKIE, ANALYST_COOKIE_VALUE } from "./src/lib/auth";

export function proxy(request: NextRequest) {
  const { pathname, searchParams, search } = request.nextUrl;

  // Legacy URLs: before the restructure the map tool lived at "/" and took
  // ?view=. The tool now lives at /map, so old bookmarks like /?view=analyst
  // redirect there (and then fall through the analyst gate below as /map).
  if (pathname === "/" && searchParams.has("view")) {
    const mapUrl = new URL(`/map${search}`, request.url);
    return NextResponse.redirect(mapUrl, 308);
  }

  // Analyst surfaces: the /analyst routes and any page asked to render its
  // analyst variant via ?view=analyst.
  const wantsAnalyst =
    pathname.startsWith("/analyst") || searchParams.get("view") === "analyst";
  if (!wantsAnalyst) {
    return NextResponse.next();
  }

  const hasSession =
    request.cookies.get(ANALYST_COOKIE)?.value === ANALYST_COOKIE_VALUE;
  if (hasSession) {
    return NextResponse.next();
  }

  // Send the visitor to the login form and remember where they were headed
  // so the login route handler can bounce them back after the passphrase.
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Skip static assets and the auth surfaces themselves (/login and the
  // /api/* handlers) — gating those would loop. The exclusions are anchored
  // to whole path segments ("api/", "login" then end-or-slash) so that
  // future routes like /apiary or /login-help don't silently slip past the
  // gate. NOTE: this still exempts all of /api/* — any future API route
  // serving analyst data must do its own session check.
  matcher: ["/((?!api/|_next/static|_next/image|favicon\\.ico|login(?:/|$)).*)"],
};
