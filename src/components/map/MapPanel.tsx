"use client";
// Client Component — exists for exactly one reason: in this Next version,
// `dynamic(..., { ssr: false })` is only allowed inside a client component
// (it is a build error in a server component). Leaflet touches `window` at
// import time, so the map must never be server-rendered. Server pages render
// <MapPanel> and pass server-fetched GeoJSON straight through as props.

import dynamic from "next/dynamic";
import type { SafetyMapProps } from "./SafetyMap";

const SafetyMap = dynamic(() => import("./SafetyMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-surface">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-faint">
        Initializing map…
      </p>
    </div>
  ),
});

export default function MapPanel(props: SafetyMapProps) {
  return <SafetyMap {...props} />;
}
