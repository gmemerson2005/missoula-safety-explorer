// Server Component (no directive) — presentation of numbers fetched on the
// server. Per the design system, each card wears its layer's signature color
// (left rule + label) and the value counts up on first view via the
// AnimatedNumber client island. `accent` is a CSS color pair from the layer
// palette; neutral cards (e.g. "data sources online") omit it.

import AnimatedNumber from "@components/motion/AnimatedNumber";

interface StatCardProps {
  label: string;
  /** Numeric value animates; pass `null` when the source is offline. */
  value: number | null;
  unit: string;
  meta: string;
  /** Layer signature color (mark + AA text variant), e.g. fire/flood/civic. */
  accent?: { mark: string; text: string };
}

export default function StatCard({ label, value, unit, meta, accent }: StatCardProps) {
  const ok = value !== null;
  return (
    <div
      className="border border-line bg-surface p-4"
      style={accent ? { borderLeft: `3px solid ${accent.mark}` } : undefined}
    >
      <div
        className="font-mono text-[11px] uppercase tracking-[0.2em]"
        style={{ color: accent && ok ? accent.text : "var(--muted)" }}
      >
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className={`font-display text-5xl font-bold tracking-tight ${
            ok ? "text-foreground" : "text-faint"
          }`}
        >
          {ok ? <AnimatedNumber value={value} /> : "—"}
        </span>
        <span className="font-mono text-xs uppercase tracking-widest text-faint">
          {unit}
        </span>
      </div>
      {/* Status is words, never color alone. */}
      <div
        className={`mt-3 border-t border-line pt-2 font-mono text-[10px] uppercase tracking-widest ${
          ok ? "text-faint" : "text-danger"
        }`}
      >
        {ok ? `● live · ${meta}` : `○ offline · ${meta}`}
      </div>
    </div>
  );
}
