/**
 * Mock-session helpers, shared by the proxy, the login/logout route
 * handlers, and server components that render differently for analysts.
 *
 * The session is a plain marker cookie. In production this would be a
 * signed, expiring session token from a real auth provider — see the
 * comments in proxy.ts and app/api/login/route.ts.
 */

import { cookies } from "next/headers";

export const ANALYST_COOKIE = "analyst_session";

/** Value stored in the cookie; a real app would store a session id/JWT. */
export const ANALYST_COOKIE_VALUE = "granted";

/**
 * Server-side check used by server components (second enforcement point
 * behind the proxy). cookies() is async-only in this Next version.
 */
export async function hasAnalystSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(ANALYST_COOKIE)?.value === ANALYST_COOKIE_VALUE;
}
