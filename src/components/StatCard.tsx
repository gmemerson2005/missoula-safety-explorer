// Server Component (no directive) — pure presentation of numbers that were
// fetched on the server. Styled as an operations readout: mono label, mono
// value, source line with an explicit text status (never color alone).

interface StatCardProps {
  label: string;
  value: string;
  unit: string;
  /** null means the source failed; the card degrades instead of crashing. */
  ok: boolean;
  meta: string;
}

export default function StatCard({ label, value, unit, ok, meta }: StatCardProps) {
  return (
    <div className="border border-line bg-surface p-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span
          className={`font-mono text-4xl font-semibold ${ok ? "text-foreground" : "text-faint"}`}
        >
          {value}
        </span>
        <span className="font-mono text-xs uppercase tracking-widest text-faint">
          {unit}
        </span>
      </div>
      <div
        role="status"
        className={`mt-3 border-t border-line pt-2 font-mono text-[10px] uppercase tracking-widest ${
          ok ? "text-faint" : "text-danger"
        }`}
      >
        {ok ? `● live · ${meta}` : `○ offline · ${meta}`}
      </div>
    </div>
  );
}
