"use client";
// Client Component — Recharts renders SVG in the browser. Data arrives as
// serializable props computed on the server from real county records; this
// component only draws. Single-series horizontal bars: identity is carried
// by the section title and the layer's signature color (no legend needed for
// one series); values surface in the hover tooltip; axis text wears the text
// tokens, never the series color.

import { useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface BarDatum {
  name: string;
  value: number;
  /** Optional drill-down target; clicking the bar navigates there. */
  href?: string;
}

interface DistrictBarChartProps {
  data: BarDatum[];
  /** Layer signature mark color. */
  color: string;
  /** Unit rendered in the tooltip, e.g. "sq mi (approx.)". */
  unitLabel: string;
  ariaLabel: string;
}

const ROW_HEIGHT = 34;

interface TooltipPayload {
  payload?: BarDatum;
}

function ChartTooltip({
  active,
  payload,
  unitLabel,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  unitLabel: string;
}) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) return null;
  return (
    <div className="border border-line bg-surface-2 px-3 py-2">
      <p className="text-xs font-semibold text-foreground">{datum.name}</p>
      <p className="mt-0.5 font-mono text-xs text-muted">
        {datum.value.toLocaleString("en-US")} {unitLabel}
      </p>
      {datum.href ? (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-faint">
          Click bar for details
        </p>
      ) : null}
    </div>
  );
}

export default function DistrictBarChart({
  data,
  color,
  unitLabel,
  ariaLabel,
}: DistrictBarChartProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const height = data.length * ROW_HEIGHT + 48;

  return (
    <div role="img" aria-label={ariaLabel} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
          barCategoryGap="28%"
        >
          <CartesianGrid
            horizontal={false}
            stroke="var(--line)"
            strokeDasharray="2 4"
          />
          <XAxis
            type="number"
            tick={{
              fill: "var(--muted)",
              fontSize: 11,
              fontFamily: "var(--font-plex-mono)",
            }}
            axisLine={{ stroke: "var(--line)" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={230}
            tick={{
              fill: "var(--foreground)",
              fontSize: 12,
              fontFamily: "var(--font-public-sans)",
            }}
            axisLine={{ stroke: "var(--line)" }}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(233, 228, 218, 0.06)" }}
            content={<ChartTooltip unitLabel={unitLabel} />}
          />
          <Bar
            dataKey="value"
            fill={color}
            // Rounded data-end anchored to the baseline (horizontal bars).
            radius={[0, 4, 4, 0]}
            isAnimationActive={!reduceMotion}
            animationDuration={700}
            animationEasing="ease-out"
            className={data.some((d) => d.href) ? "cursor-pointer" : undefined}
            onClick={(entry) => {
              // Recharts spreads the datum onto the bar props and also nests
              // it as payload, depending on version — accept either.
              const e = entry as unknown as { href?: string; payload?: BarDatum };
              const href = e.payload?.href ?? e.href;
              if (href) router.push(href);
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
