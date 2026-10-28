"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window`, so it only ever renders in the browser.
const FarmMap = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => <div className="h-[420px] animate-pulse rounded-xl bg-secondary" />,
});

export default FarmMap;
export type { MapShape } from "./MapInner";
