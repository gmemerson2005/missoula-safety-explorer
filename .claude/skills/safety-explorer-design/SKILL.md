---
name: safety-explorer-design
description: The Missoula Public Safety Explorer design system — layer-color palette, type, and motion rules. Follow this for ANY UI work in this repo (new components, restyling, charts, map styling).
---

# Safety Explorer design system

The organizing idea: **the color palette IS the map legend.** Each data layer
owns one saturated signature color, used consistently everywhere that layer
appears — map fills, layer toggles, stat cards, chart bars, table accents,
popups, links to its detail pages. A reader who learns "ember = fire" on the
map can reuse that knowledge on every other surface. Nothing else on the page
competes with those three colors.

## Palette (all values validated)

Base ink (deep navy-charcoal, never pure black):

| Token          | Hex       | Use |
|----------------|-----------|-----|
| `--background` | `#0C1118` | page ink |
| `--surface`    | `#131A26` | cards, panels |
| `--surface-2`  | `#1A2333` | raised rows, inputs, table headers |
| `--line`       | `#263140` | hairline borders |

Text (warm light grays — every tier clears WCAG AA ≥ 4.5:1 on all three
surfaces above; do not invent darker grays):

| Token          | Hex       | Use |
|----------------|-----------|-----|
| `--foreground` | `#E9E4DA` | body text |
| `--muted`      | `#A9A29A` | secondary text |
| `--faint`      | `#948E86` | quietest legal tier (kickers, source lines) |

Layer signature colors (marks: map fills/strokes, chart bars, toggle
switches, swatches). Validated as a categorical set on `#0C1118` with the
dataviz six checks — all pass, deutan ΔE 11.8, tritan 17.4. Do not reorder,
substitute, or add a 4th mark color without re-running the validator:

| Layer                    | Token     | Hex       | Text variant (AA on dark)   |
|--------------------------|-----------|-----------|-----------------------------|
| Fire Response Zones      | `--fire`  | `#E8502A` | `--fire-text` `#FF8A63`     |
| Flood Hazard Zones       | `--flood` | `#1F9FE0` | `--flood-text` `#4FB8EF`    |
| Polling Locations        | `--civic` | `#8A4DE8` | `--civic-text` `#B49BFF`    |

Mark colors are for MARKS. Small colored text always uses the `-text`
variant (the mark values sit near 3–6:1, fine for fills, not for small text).
Text on a solid mark chip: ink `#0C1118` on fire/flood, white on violet.

Supporting semantics (never used as a 4th series color):

| Token      | Hex       | Use |
|------------|-----------|-----|
| `--tier`   | `#E5A32B` | analyst/restricted tier: badges, locks, redaction, sign-in accents. Text variant `--tier-text` `#F2BA50` |
| `--danger` | `#F26D5E` | hard failures only, always paired with an icon/prefix + words, never color alone |

## Typography

- **Display — Big Shoulders** (`next/font/google`, variable): headings,
  stat-card numbers, the hero. Condensed and characterful; set it tight
  (`tracking-tight`), use weight 600–800. Never for body copy.
- **Body — Public Sans** (variable): all prose and UI labels. Generous line
  height (`leading-7` for paragraphs). It is the USWDS face — on theme for a
  civic data tool.
- **Mono — IBM Plex Mono**: data values ONLY — coordinates, counts inside
  tables, code-ish identifiers, kickers. If it's a sentence, it's not mono.

## Motion (framer-motion)

Budget the boldness: the layer toggles are the signature moment; everything
else stays quiet.

- **Page transitions**: `app/template.tsx` — fade + 8px rise, 0.25s ease-out.
- **Layer toggles**: spring thumb (stiffness ~500, damping ~30), track fills
  with the layer's signature color when on. This is the one place motion is
  allowed to show off.
- **Map layers**: fade via CSS `transition: opacity 300ms` on the Leaflet
  pane — never pop in/out.
- **Stat cards**: numbers count up once on first scroll into view
  (`useInView({ once: true })`), ~0.8s ease-out.
- **Micro-interactions**: buttons/toggles get `whileTap` scale 0.97 and a
  150ms color transition. No hover lifts, no parallax, no looping animation.
- **Reduced motion is law**: every animation checks `useReducedMotion()` (or
  the CSS media query) and collapses to instant state changes. The global CSS
  kill-switch in `globals.css` stays.

## Voice of the chrome

Quiet and disciplined. Hairline borders, square corners (2px max radius on
popups), generous whitespace. Kickers are mono, uppercase, letter-spaced.
The three layer colors do the talking; the rest of the UI is ink, warm gray,
and restraint.
