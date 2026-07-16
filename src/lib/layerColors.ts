/**
 * The layer signature colors — the single source of truth consumed by every
 * surface that paints a layer: map panes, toggle switches, stat cards, chart
 * bars, table accents, popups. Values mirror the CSS custom properties in
 * app/globals.css and the design system in
 * .claude/skills/safety-explorer-design/SKILL.md (validated set — do not
 * tweak one side without the other).
 *
 * `mark` is for fills/strokes/large shapes; `text` is the AA-safe variant
 * for small colored text on the dark base.
 */

import type { DatasetId } from "./datasets";

export interface LayerColor {
  mark: string;
  text: string;
}

export const LAYER_COLORS: Record<DatasetId, LayerColor> = {
  fireDistricts: { mark: "#e8502a", text: "#ff8a63" },
  floodplain: { mark: "#1f9fe0", text: "#4fb8ef" },
  pollingLocations: { mark: "#8a4de8", text: "#b49bff" },
};

/** Analyst/restricted-tier accent (badges, locks, redaction) — never a series color. */
export const TIER_COLOR: LayerColor = { mark: "#e5a32b", text: "#f2ba50" };

/** Page ink, for text set on top of a solid fire/flood mark chip. */
export const INK = "#0c1118";
