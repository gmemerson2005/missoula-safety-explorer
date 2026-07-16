/**
 * Route Handler (server only) — sign out. Deletes the httpOnly session
 * cookie server-side (the client cannot; it never could read it) and sends
 * the visitor back to the public landing page.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ANALYST_COOKIE, isCrossOrigin } from "@lib/auth";

export async function POST(request: Request) {
  // CSRF guard: don't let a third-party page force-logout an analyst.
  if (isCrossOrigin(request)) {
    redirect("/");
  }
  const cookieStore = await cookies();
  cookieStore.delete(ANALYST_COOKIE);
  redirect("/");
}
