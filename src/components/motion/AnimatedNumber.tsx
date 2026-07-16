"use client";
// Client Component — the stat-card count-up. Animates 0 → value once, the
// first time the number scrolls into view. Under prefers-reduced-motion the
// real value renders immediately and nothing moves. The server-rendered
// fallback (and the noscript path) is the plain formatted value, so the
// number is never missing from the HTML payload.

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

export default function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(() => value.toLocaleString("en-US"));
  const [armed, setArmed] = useState(false);

  // Arm after hydration so SSR HTML always carries the real value.
  useEffect(() => {
    if (!reduceMotion) {
      setArmed(true);
      setDisplay("0");
    }
  }, [reduceMotion]);

  useEffect(() => {
    if (!armed || !inView) return;
    const controls = animate(0, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v).toLocaleString("en-US")),
    });
    return () => controls.stop();
  }, [armed, inView, value]);

  return <span ref={ref}>{display}</span>;
}
