"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

const VIEW_W = 1600;
const VIEW_H = 900;
const TARGET_ASPECT = VIEW_W / VIEW_H;
const PAD = 0.08;

type Platform = "zwift" | "mywhoosh" | "other";

const PLATFORM_LABEL: Record<Platform, string> = {
  zwift: "Zwift",
  mywhoosh: "MyWhoosh",
  other: "Virtual",
};

function isObviousVirtualCoords(coords: [number, number][]) {
  if (coords.length === 0) return false;
  const [la, lo] = coords[0];
  return Math.abs(la) < 1 && Math.abs(lo) < 1;
}

function VirtualRoute({
  coords,
  platform,
}: {
  coords: [number, number][];
  platform: Platform | null;
}) {
  let minLat = coords[0][0];
  let maxLat = coords[0][0];
  let minLng = coords[0][1];
  let maxLng = coords[0][1];
  for (const [la, lo] of coords) {
    if (la < minLat) minLat = la;
    if (la > maxLat) maxLat = la;
    if (lo < minLng) minLng = lo;
    if (lo > maxLng) maxLng = lo;
  }
  const latSpan = Math.max(1e-6, maxLat - minLat);
  const lngSpan = Math.max(1e-6, maxLng - minLng);
  const aspect = lngSpan / latSpan;
  let routeW: number;
  let routeH: number;
  if (aspect > TARGET_ASPECT) {
    routeW = lngSpan;
    routeH = lngSpan / TARGET_ASPECT;
  } else {
    routeH = latSpan;
    routeW = latSpan * TARGET_ASPECT;
  }
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const padW = (routeW / 2) * (1 + PAD);
  const padH = (routeH / 2) * (1 + PAD);
  const vMinLng = centerLng - padW;
  const vMaxLat = centerLat + padH;
  const lngToX = (lng: number) => ((lng - vMinLng) / (padW * 2)) * VIEW_W;
  const latToY = (lat: number) => ((vMaxLat - lat) / (padH * 2)) * VIEW_H;
  const path = coords
    .map(([la, lo], i) => `${i === 0 ? "M" : "L"}${lngToX(lo).toFixed(1)} ${latToY(la).toFixed(1)}`)
    .join(" ");
  const [s0, s1] = coords[0];
  const [e0, e1] = coords[coords.length - 1];
  return (
    <div className="relative overflow-hidden rounded-lg bg-neutral-900/60">
      {platform && (
        <div className="pointer-events-none absolute top-2 left-2 z-10 rounded-full bg-neutral-950/70 px-2.5 py-1 text-[10px] uppercase tracking-wider text-neutral-300 ring-1 ring-neutral-800">
          {PLATFORM_LABEL[platform]}
        </div>
      )}
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-auto block">
        <path
          d={path}
          fill="none"
          stroke="#f97316"
          strokeWidth={5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={lngToX(s1)} cy={latToY(s0)} r={9} fill="#22c55e" stroke="#0a0a0a" strokeWidth={3} />
        <circle cx={lngToX(e1)} cy={latToY(e0)} r={9} fill="#ef4444" stroke="#0a0a0a" strokeWidth={3} />
      </svg>
    </div>
  );
}

export default function RideMap({
  coords,
  type,
  platform,
}: {
  coords: [number, number][];
  type?: string;
  platform?: Platform | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const enoughCoords = coords.length >= 2;
  const typeIsVirtual = !!type && type.startsWith("Virtual");
  const virtual =
    !!platform || (typeIsVirtual && isObviousVirtualCoords(coords));
  const useGeoMap = enoughCoords && !virtual;

  useEffect(() => {
    if (!useGeoMap || !containerRef.current) return;
    if (mapRef.current) return;

    const lnglat = coords.map(([la, lo]) => [lo, la] as [number, number]);
    let minLng = lnglat[0][0];
    let maxLng = lnglat[0][0];
    let minLat = lnglat[0][1];
    let maxLat = lnglat[0][1];
    for (const [lo, la] of lnglat) {
      if (lo < minLng) minLng = lo;
      if (lo > maxLng) maxLng = lo;
      if (la < minLat) minLat = la;
      if (la > maxLat) maxLat = la;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      bounds: [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      fitBoundsOptions: { padding: 40, duration: 0 },
      attributionControl: false,
      cooperativeGestures: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;

    const onLoad = () => {
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: lnglat },
        },
      });
      map.addLayer({
        id: "route-line-casing",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#0a0a0a", "line-width": 7, "line-opacity": 0.6 },
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#f97316", "line-width": 4 },
      });

      const mkDot = (color: string) => {
        const el = document.createElement("div");
        el.style.cssText = `width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid #0a0a0a;box-shadow:0 0 0 1px rgba(0,0,0,0.5);`;
        return el;
      };
      new maplibregl.Marker({ element: mkDot("#22c55e") }).setLngLat(lnglat[0]).addTo(map);
      new maplibregl.Marker({ element: mkDot("#ef4444") })
        .setLngLat(lnglat[lnglat.length - 1])
        .addTo(map);
    };

    map.on("load", onLoad);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [coords, useGeoMap]);

  if (!enoughCoords) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-neutral-900/60 text-neutral-500 text-sm">
        No GPS track for this activity.
      </div>
    );
  }

  if (virtual) {
    return <VirtualRoute coords={coords} platform={platform ?? null} />;
  }

  return (
    <div
      ref={containerRef}
      className="rounded-lg overflow-hidden bg-neutral-800 w-full"
      style={{ aspectRatio: "16 / 9", minHeight: 320 }}
    />
  );
}
