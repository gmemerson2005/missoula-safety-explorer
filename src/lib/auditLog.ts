/**
 * Analyst access audit log.
 *
 * DEMO SCOPE: this is a module-level in-memory array, which means it RESETS
 * ON EVERY REDEPLOY / server restart and is per-instance (two serverless
 * instances would each keep their own log). In production this would be an
 * append-only database table (or a log pipeline) keyed by the real session
 * identity, written from the same server-side call sites used here — the
 * placement is the part that carries over: the log entry is appended where
 * the restricted data is served, never from the client.
 */

import { createHash } from "node:crypto";

export interface AuditEntry {
  /** ISO 8601, server clock. */
  timestamp: string;
  /** Route that served analyst-tier data, e.g. "/analyst". */
  route: string;
  /** Masked session identifier — never the raw cookie value. */
  sessionId: string;
}

const MAX_ENTRIES = 200;

const entries: AuditEntry[] = [];

/** Mask the session cookie: hash + truncate, so the log can correlate
 *  accesses without ever storing the credential itself. */
function maskSession(rawCookieValue: string): string {
  return createHash("sha256").update(rawCookieValue).digest("hex").slice(0, 10);
}

/** Append an access entry. Call ONLY from server code that is about to serve
 *  analyst-tier data (the analyst console, district drill-downs). */
export function recordAccess(route: string, rawCookieValue: string): void {
  entries.push({
    timestamp: new Date().toISOString(),
    route,
    sessionId: maskSession(rawCookieValue),
  });
  // Cap memory: keep the newest MAX_ENTRIES.
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
}

/** Newest first. */
export function recentEntries(limit = 10): AuditEntry[] {
  return entries.slice(-limit).reverse();
}
