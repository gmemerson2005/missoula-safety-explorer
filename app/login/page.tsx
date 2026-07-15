// Server Component (async) — the login form. It renders entirely on the
// server (searchParams arrive as a Promise in this Next version) and POSTs
// as a plain HTML form to the /api/login route handler, so the whole auth
// flow works with zero client JavaScript. The passphrase check and cookie
// issuance happen exclusively server-side.

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Analyst sign-in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const failed = params.error === "1";
  const from = typeof params.from === "string" ? params.from : "/analyst";

  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
        Restricted tier
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Analyst sign-in
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        The analyst view exposes every record and attribute in the county
        layers. Enter the analyst passphrase to open a session.
      </p>

      {failed ? (
        <p
          role="alert"
          className="mt-6 border border-danger bg-surface px-3 py-2 font-mono text-xs uppercase tracking-widest text-danger"
        >
          Access denied — invalid passphrase
        </p>
      ) : null}

      <form
        method="POST"
        action="/api/login"
        className="mt-6 border border-line bg-surface p-4"
      >
        <label
          htmlFor="passphrase"
          className="block font-mono text-[11px] uppercase tracking-[0.2em] text-muted"
        >
          Passphrase
        </label>
        <input
          id="passphrase"
          name="passphrase"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          className="mt-2 w-full border border-line bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-faint"
          placeholder="••••••••"
        />
        <input type="hidden" name="from" value={from} />
        <button
          type="submit"
          className="mt-4 w-full border border-accent bg-accent px-3 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-background hover:border-accent-hover hover:bg-accent-hover"
        >
          Open session
        </button>
      </form>

      <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-faint">
        Demo system — sessions are mock credentials, not real county access.
      </p>
    </main>
  );
}
