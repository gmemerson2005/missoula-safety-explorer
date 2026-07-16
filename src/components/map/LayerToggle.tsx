"use client";
// Client Component — the layer toggle switch, the design system's one
// "signature moment": a spring-animated thumb on a track that fills with the
// layer's signature color when on. Semantics are a real switch
// (role="switch" + aria-checked), fully keyboard-operable.

import { motion, useReducedMotion } from "framer-motion";
import { INK } from "@lib/layerColors";

interface LayerToggleProps {
  label: string;
  /** Feature count shown next to the label (mono, data value). */
  count: number;
  color: { mark: string; text: string };
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Optional helper text under the label (layer description). */
  description?: string;
}

export default function LayerToggle({
  label,
  count,
  color,
  checked,
  onChange,
  description,
}: LayerToggleProps) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0">
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 shrink-0 border"
            style={{ borderColor: color.mark, background: `${color.mark}66` }}
          />
          <span
            className="font-mono text-[11px] font-medium uppercase tracking-[0.15em]"
            style={{ color: checked ? color.text : "var(--muted)" }}
          >
            {label}
          </span>
          <span className="font-mono text-[10px] text-faint">
            {count.toLocaleString("en-US")}
          </span>
        </span>
        {description ? (
          <span className="mt-0.5 block max-w-[210px] text-[11px] leading-4 text-faint">
            {description}
          </span>
        ) : null}
      </div>
      <motion.button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`${label} layer`}
        onClick={() => onChange(!checked)}
        whileTap={reduceMotion ? undefined : { scale: 0.94 }}
        className="flex h-5 w-9 shrink-0 items-center border px-[2px] transition-colors duration-150"
        style={{
          background: checked ? color.mark : "var(--surface-2)",
          borderColor: checked ? color.mark : "var(--line)",
          justifyContent: checked ? "flex-end" : "flex-start",
        }}
      >
        <motion.span
          aria-hidden="true"
          layout
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 500, damping: 30 }
          }
          className="block h-3.5 w-3.5"
          style={{ background: checked ? INK : "var(--muted)" }}
        />
      </motion.button>
    </div>
  );
}
