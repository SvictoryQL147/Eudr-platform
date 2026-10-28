"use client";

import { Crosshair, Eraser, LocateFixed, Undo2 } from "lucide-react";
import { useState } from "react";
import type { Ring } from "@/lib/types";
import FarmMap, { type MapShape } from "./Map";
import { Button, Textarea } from "./kit";

/** Parses pasted coordinates: a GeoJSON Polygon/Feature, or lines of "lat, lon". */
function parseCoordinates(text: string): Ring {
  const t = text.trim();
  if (!t) throw new Error("Paste something first");
  if (t.startsWith("{") || t.startsWith("[")) {
    const j = JSON.parse(t);
    const geom = j.type === "FeatureCollection" ? j.features?.[0]?.geometry : j.type === "Feature" ? j.geometry : j;
    let coords: number[][] | undefined;
    if (geom?.type === "Polygon") coords = geom.coordinates[0];
    else if (geom?.type === "MultiPolygon") coords = geom.coordinates[0][0];
    else if (Array.isArray(geom) && Array.isArray(geom[0])) coords = Array.isArray(geom[0][0]) ? geom[0] : geom;
    if (!coords) throw new Error("Couldn't find a polygon in that JSON");
    return coords.map(([lon, lat]) => [lon, lat] as [number, number]);
  }
  const ring = t
    .split(/\n|;/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [a, b] = line.split(/[\s,]+/).map(Number);
      if (!isFinite(a) || !isFinite(b)) throw new Error(`Couldn't read "${line}"`);
      return [b, a] as [number, number]; // input is lat, lon
    });
  return ring;
}

function closeRing(ring: Ring): Ring {
  if (ring.length > 3 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) {
    return ring.slice(0, -1);
  }
  return ring;
}

export default function BoundaryEditor({
  value,
  onChange,
  context = [],
}: {
  value: Ring;
  onChange: (ring: Ring) => void;
  context?: MapShape[];
}) {
  const [mode, setMode] = useState<"draw" | "paste">("draw");
  const [paste, setPaste] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [gps, setGps] = useState<[number, number] | null>(null);
  const [gpsMsg, setGpsMsg] = useState<string | null>(null);

  const addGpsPoint = () => {
    if (!navigator.geolocation) {
      setGpsMsg("This browser can't read GPS");
      return;
    }
    setGpsMsg("Getting your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p: [number, number] = [+pos.coords.longitude.toFixed(7), +pos.coords.latitude.toFixed(7)];
        setGps(p);
        onChange([...value, p]);
        setGpsMsg(`Added point ${value.length + 1} (accuracy ±${Math.round(pos.coords.accuracy)} m)`);
      },
      (err) => setGpsMsg(err.message || "Couldn't get location"),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-border p-0.5 text-sm">
          {(["draw", "paste"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1 ${mode === m ? "bg-foreground text-white" : "text-muted-foreground hover:bg-secondary"}`}
            >
              {m === "draw" ? "Draw on map" : "Paste coordinates"}
            </button>
          ))}
        </div>
        <span className="text-sm text-muted-foreground">{value.length} point{value.length === 1 ? "" : "s"}</span>
        <div className="ml-auto flex gap-1.5">
          <Button type="button" size="sm" variant="secondary" icon={<LocateFixed className="h-4 w-4" />} onClick={addGpsPoint}>
            Add my GPS point
          </Button>
          <Button type="button" size="sm" variant="ghost" icon={<Undo2 className="h-4 w-4" />} disabled={!value.length} onClick={() => onChange(value.slice(0, -1))}>
            Undo
          </Button>
          <Button type="button" size="sm" variant="ghost" icon={<Eraser className="h-4 w-4" />} disabled={!value.length} onClick={() => onChange([])}>
            Clear
          </Button>
        </div>
      </div>
      {gpsMsg && <p className="text-xs text-sky-700">{gpsMsg}</p>}

      {mode === "paste" && (
        <div className="space-y-2">
          <Textarea
            rows={4}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={"One point per line as  latitude, longitude  e.g.\n7.1121, 5.1102\n7.1121, 5.1125\n...or paste a GeoJSON polygon"}
            className="font-mono text-xs"
          />
          {pasteError && <p className="text-xs text-red-600">{pasteError}</p>}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              try {
                onChange(closeRing(parseCoordinates(paste)));
                setPasteError(null);
                setMode("draw");
              } catch (e) {
                setPasteError(e instanceof Error ? e.message : "Couldn't read those coordinates");
              }
            }}
          >
            Use these points
          </Button>
        </div>
      )}

      <div className="relative">
        <FarmMap shapes={context} editRing={value} onMapClick={(lon, lat) => onChange([...value, [lon, lat]])} height={380} satellite draftPoint={gps} />
        <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex items-center gap-1.5 rounded-md bg-white/95 px-2.5 py-1.5 text-xs text-foreground shadow">
          <Crosshair className="h-3.5 w-3.5" /> Click around the farm edge to place boundary points
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Walking the boundary with a phone? Open this page on the phone, stand at each corner and press <b>Add my GPS point</b>.
      </p>
    </div>
  );
}
