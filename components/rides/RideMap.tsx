export default function RideMap({ coords }: { coords: [number, number][] }) {
  if (coords.length < 2) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-neutral-900/60 text-neutral-500 text-sm">
        No GPS track for this activity.
      </div>
    );
  }

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

  const pad = 0.05;
  const latSpan = Math.max(1e-6, maxLat - minLat);
  const lngSpan = Math.max(1e-6, maxLng - minLng);
  const W = 800;
  const H = 400;
  const sx = W / (lngSpan * (1 + pad * 2));
  const sy = H / (latSpan * (1 + pad * 2));
  const s = Math.min(sx, sy);

  const offsetX = (W - lngSpan * s) / 2;
  const offsetY = (H - latSpan * s) / 2;

  const path = coords
    .map(([la, lo], i) => {
      const x = offsetX + (lo - minLng) * s;
      const y = H - offsetY - (la - minLat) * s;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const [startX, startY] = (() => {
    const [la, lo] = coords[0];
    return [offsetX + (lo - minLng) * s, H - offsetY - (la - minLat) * s];
  })();
  const [endX, endY] = (() => {
    const [la, lo] = coords[coords.length - 1];
    return [offsetX + (lo - minLng) * s, H - offsetY - (la - minLat) * s];
  })();

  return (
    <div className="overflow-hidden rounded-lg bg-neutral-900/60">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
        <path d={path} fill="none" stroke="#f97316" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={startX} cy={startY} r={6} fill="#22c55e" stroke="#0a0a0a" strokeWidth={2} />
        <circle cx={endX} cy={endY} r={6} fill="#ef4444" stroke="#0a0a0a" strokeWidth={2} />
      </svg>
    </div>
  );
}
