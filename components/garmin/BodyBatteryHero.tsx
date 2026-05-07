type Point = { ts: number; value: number };

export default function BodyBatteryHero({
  current,
  charged,
  drained,
  intraday,
  highest,
}: {
  current: number | null;
  charged: number | null;
  drained: number | null;
  intraday: Point[];
  highest: number | null;
}) {
  if (intraday.length === 0) {
    return <p className="text-sm text-neutral-500">No body battery data.</p>;
  }
  const xs = intraday.map((p) => p.ts);
  const minTs = Math.min(...xs);
  const maxTs = Math.max(...xs);
  const span = maxTs - minTs || 1;

  const w = 600;
  const h = 180;

  const path = intraday
    .map((p, i) => {
      const x = ((p.ts - minTs) / span) * w;
      const y = h - (Math.max(0, Math.min(100, p.value)) / 100) * h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const areaPath = `${path} L ${w} ${h} L 0 ${h} Z`;

  const peakIdx = intraday.reduce(
    (best, p, i) => (p.value > intraday[best].value ? i : best),
    0
  );
  const peak = intraday[peakIdx];
  const peakX = ((peak.ts - minTs) / span) * w;
  const peakY = h - (peak.value / 100) * h;

  const lastX = ((intraday[intraday.length - 1].ts - minTs) / span) * w;
  const lastY = h - (intraday[intraday.length - 1].value / 100) * h;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <p className="text-5xl font-semibold tabular-nums">{current ?? "—"}</p>
        </div>
        <div className="flex gap-6 text-right">
          {charged !== null && (
            <div>
              <p className="text-2xl font-semibold tabular-nums text-neutral-100">
                +{charged}
              </p>
              <p className="text-[11px] text-neutral-500">Charged</p>
            </div>
          )}
          {drained !== null && (
            <div>
              <p className="text-2xl font-semibold tabular-nums text-neutral-100">
                -{drained}
              </p>
              <p className="text-[11px] text-neutral-500">Drained</p>
            </div>
          )}
        </div>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40" preserveAspectRatio="none">
          <defs>
            <linearGradient id="bbGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#bbGrad)" />
          <path d={path} stroke="#fafafa" strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" />
          <circle cx={lastX} cy={lastY} r="5" fill="#fafafa" vectorEffect="non-scaling-stroke" />
        </svg>
        {highest !== null && (
          <span
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full text-sm font-semibold tabular-nums text-neutral-50"
            style={{
              left: `${(peakX / w) * 100}%`,
              top: `${(peakY / h) * 100}%`,
              marginTop: -6,
            }}
          >
            {highest}
          </span>
        )}
      </div>
    </div>
  );
}
