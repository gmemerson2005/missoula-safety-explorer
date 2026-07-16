// Server Component (no directive) — the "Recent access" panel for the
// analyst console. Reads the in-memory audit log at render time (server
// only; the log module never ships to the client).

import { recentEntries } from "@lib/auditLog";
import { TIER_COLOR } from "@lib/layerColors";

export default function AuditPanel() {
  const entries = recentEntries(10);
  return (
    <div
      className="border border-line bg-surface p-4"
      style={{ borderTop: `3px solid ${TIER_COLOR.mark}` }}
    >
      <h3
        className="font-mono text-[11px] uppercase tracking-[0.2em]"
        style={{ color: TIER_COLOR.text }}
      >
        Recent access
      </h3>
      {entries.length === 0 ? (
        <p className="mt-2 text-xs leading-5 text-faint">
          No analyst-tier reads recorded since the server started.
        </p>
      ) : (
        <table className="mt-2 w-full font-mono text-xs">
          <thead>
            <tr className="text-left uppercase tracking-wider text-faint">
              <th scope="col" className="py-1 pr-2 font-normal">
                When (UTC)
              </th>
              <th scope="col" className="py-1 pr-2 font-normal">
                Route
              </th>
              <th scope="col" className="py-1 font-normal">
                Session
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr key={i} className="border-t border-line/60">
                <td className="py-1 pr-2 tabular-nums">
                  {entry.timestamp.slice(0, 19).replace("T", " ")}
                </td>
                <td className="py-1 pr-2">{entry.route}</td>
                <td className="py-1 text-faint">{entry.sessionId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-3 border-t border-line pt-2 text-[11px] leading-4 text-faint">
        In-memory demo store — resets on redeploy; production would write an
        append-only database table from the same server call sites.
      </p>
    </div>
  );
}
