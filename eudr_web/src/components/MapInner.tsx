"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, LayersControl, MapContainer, Polygon, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import type { Ring } from "@/lib/types";

export interface MapShape {
  id: string;
  ring: Ring; // [lon, lat]
  label?: string;
  href?: string;
  tone?: "ok" | "warn" | "bad" | "selected" | "none";
  lines?: string[];
}

const TONES: Record<string, { color: string; fillColor: string }> = {
  ok: { color: "#15803d", fillColor: "#22c55e" },
  warn: { color: "#b45309", fillColor: "#f59e0b" },
  bad: { color: "#b91c1c", fillColor: "#ef4444" },
  selected: { color: "#1d4ed8", fillColor: "#3b82f6" },
  none: { color: "#57534e", fillColor: "#a8a29e" },
};

const NIGERIA_CENTER: [number, number] = [7.3, 5.5];
const toLatLng = (ring: Ring) => ring.map(([lon, lat]) => [lat, lon] as [number, number]);

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) map.setView(points[0], 16);
    else map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 17 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

/** While drawing: re-fit when many points arrive at once (paste / opening an
 * existing boundary), but not on each single click, which would be jarring. */
function FitOnBulkEdit({ ring, gps }: { ring?: Ring | null; gps?: [number, number] | null }) {
  const map = useMap();
  const prev = useRef(0);
  useEffect(() => {
    const n = ring?.length || 0;
    if (ring && n > 0 && n - prev.current > 1) {
      map.fitBounds(L.latLngBounds(toLatLng(ring)), { padding: [40, 40], maxZoom: 18 });
    }
    prev.current = n;
  }, [ring, map]);
  useEffect(() => {
    if (gps) map.setView([gps[1], gps[0]], Math.max(map.getZoom(), 17));
  }, [gps, map]);
  return null;
}

function ClickCapture({ onClick }: { onClick: (lon: number, lat: number) => void }) {
  useMapEvents({ click: (e) => onClick(+e.latlng.lng.toFixed(7), +e.latlng.lat.toFixed(7)) });
  return null;
}

function BaseLayers({ satelliteFirst }: { satelliteFirst?: boolean }) {
  return (
    <LayersControl position="topright">
      <LayersControl.BaseLayer checked={!satelliteFirst} name="Map">
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer checked={!!satelliteFirst} name="Satellite">
        <TileLayer
          attribution="Imagery &copy; Esri, Maxar, Earthstar Geographics"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
      </LayersControl.BaseLayer>
    </LayersControl>
  );
}

export default function MapInner({
  shapes = [],
  editRing,
  onMapClick,
  height = 420,
  satellite,
  draftPoint,
}: {
  shapes?: MapShape[];
  editRing?: Ring | null;
  onMapClick?: (lon: number, lat: number) => void;
  height?: number | string;
  satellite?: boolean;
  draftPoint?: [number, number] | null; // [lon, lat], e.g. current GPS position
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const allPoints = useMemo(() => {
    const pts: [number, number][] = [];
    shapes.forEach((s) => pts.push(...toLatLng(s.ring)));
    if (editRing) pts.push(...toLatLng(editRing));
    return pts;
  }, [shapes, editRing]);
  // Only auto-fit on existing shapes, not on every vertex click while drawing.
  const fitPoints = useMemo(() => {
    const pts: [number, number][] = [];
    shapes.forEach((s) => pts.push(...toLatLng(s.ring)));
    if (pts.length === 0 && editRing && editRing.length > 0 && !onMapClick) pts.push(...toLatLng(editRing));
    return pts;
  }, [shapes, editRing, onMapClick]);

  if (!ready) return <div style={{ height }} className="rounded-xl bg-secondary" />;

  return (
    <div style={{ height }} className="overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={allPoints[0] || NIGERIA_CENTER}
        zoom={allPoints.length ? 15 : 6}
        style={{ height: "100%", width: "100%", cursor: onMapClick ? "crosshair" : undefined }}
        scrollWheelZoom
      >
        <BaseLayers satelliteFirst={satellite} />
        <FitBounds points={fitPoints} />
        {onMapClick && <ClickCapture onClick={onMapClick} />}
        {onMapClick && <FitOnBulkEdit ring={editRing} gps={draftPoint} />}
        {shapes.map((s) => (
          <Polygon key={s.id} positions={toLatLng(s.ring)} pathOptions={{ ...TONES[s.tone || "ok"], weight: 2, fillOpacity: 0.25 }}>
            {s.label && (
              <Tooltip sticky direction="top">
                {s.label}
              </Tooltip>
            )}
            {(s.lines || s.href) && (
              <Popup>
                <div className="space-y-0.5 text-sm">
                  {s.label && <p className="font-semibold">{s.label}</p>}
                  {s.lines?.map((l, i) => <p key={i}>{l}</p>)}
                  {s.href && (
                    <a href={s.href} className="font-medium text-primary underline">
                      Open farm
                    </a>
                  )}
                </div>
              </Popup>
            )}
          </Polygon>
        ))}
        {editRing && editRing.length >= 3 && (
          <Polygon positions={toLatLng(editRing)} pathOptions={{ ...TONES.selected, weight: 2, fillOpacity: 0.2, dashArray: "6 4" }} />
        )}
        {editRing && editRing.length === 2 && <Polyline positions={toLatLng(editRing)} pathOptions={{ color: "#1d4ed8", weight: 2 }} />}
        {editRing?.map(([lon, lat], i) => (
          <CircleMarker key={i} center={[lat, lon]} radius={5} pathOptions={{ color: "#1d4ed8", fillColor: "#fff", fillOpacity: 1, weight: 2 }}>
            <Tooltip direction="top">Point {i + 1}</Tooltip>
          </CircleMarker>
        ))}
        {draftPoint && (
          <CircleMarker center={[draftPoint[1], draftPoint[0]]} radius={7} pathOptions={{ color: "#0ea5e9", fillColor: "#0ea5e9", fillOpacity: 0.6 }}>
            <Tooltip direction="top">You are here</Tooltip>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
}
