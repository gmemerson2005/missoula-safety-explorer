"use client";
// Client Component — framer-motion runs in the browser. A template (unlike
// a layout) remounts on every route navigation, which is exactly what a
// page-enter transition needs. Search-param changes (?view=) do NOT remount
// templates, so toggling roles won't replay the animation.

import { motion, useReducedMotion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
