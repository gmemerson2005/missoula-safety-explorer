// Server Component (no directive) — the lock treatment for a restricted
// value. IMPORTANT: this renders a sentinel the server substituted for the
// real value (src/lib/redact.ts); it is presentation for data that was
// already withheld, never a mask over data that shipped.

import { TIER_COLOR } from "@lib/layerColors";

export default function RedactedValue() {
  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono"
      style={{ color: TIER_COLOR.text }}
      title="Analyst access required"
      aria-label="Value redacted — analyst access required"
    >
      <svg
        aria-hidden="true"
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <rect x="4" y="10" width="16" height="11" rx="1" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
      ▮▮▮▮
    </span>
  );
}
