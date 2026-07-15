/**
 * Route Handler (server only) — the mock sign-in endpoint.
 *
 * The passphrase lives HERE, on the server, and is compared server-side;
 * it is never shipped to the browser in any bundle. On success we set an
 * httpOnly session cookie — the browser's JavaScript can never read it —
 * and redirect back to wherever the visitor was headed.
 *
 * In production this handler would be an auth provider's callback: verify
 * credentials against a real identity store, mint a signed and expiring
 * session (JWT or server-side session id), and rate-limit + audit-log every
 * attempt. The mock keeps exactly one property of that system honest: the
 * secret and the session decision stay on the server.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ANALYST_COOKIE, ANALYST_COOKIE_VALUE } from "@lib/auth";

const ANALYST_PASSPHRASE = "kestrel"; // mock credential, intentionally not a secret

/** Only ever redirect to a same-site path — never to an external URL. */
function safeInternalPath(raw: FormDataEntryValue | null): string {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/analyst";
  }
  return raw;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const passphrase = formData.get("passphrase");
  const from = safeInternalPath(formData.get("from"));

  if (typeof passphrase !== "string" || passphrase.trim() !== ANALYST_PASSPHRASE) {
    // redirect() throws NEXT_REDIRECT internally, so it must be called
    // outside try/catch — hence the early-return style of this handler.
    redirect(`/login?error=1&from=${encodeURIComponent(from)}`);
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: ANALYST_COOKIE,
    value: ANALYST_COOKIE_VALUE,
    httpOnly: true, // invisible to client-side JS
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // one 8-hour shift
  });

  redirect(from);
}
