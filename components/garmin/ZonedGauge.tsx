type Zone = { from: number; color: string };

export default function ZonedGauge({
  value,
  min = 0,
  max = 100,
  zones,
  unit,
  display,
}: {
  value: number | null;
  min?: number;
  max?: number;
  zones: Zone[];
  unit?: string;
  display?: string;
}) {
  const r = 56;
  const cx = 70;
  const cy = 70;
  const startAngle = -210;
  const endAngle = 30;
  const sweep = endAngle - startAngle;

  const polar = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const arcPath = (a0: number, a1: number) => {
    const p0 = polar(a0);
    const p1 = polar(a1);
    const large = a1 - a0 > 180 ? 1 : 0;
    return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y}`;
  };

  const sorted = [...zones].sort((a, b) => a.from - b.from);
  const arcs = sorted.map((z, i) => {
    const next = sorted[i + 1]?.from ?? max;
    const a0 = startAngle + ((z.from - min) / (max - min)) * sweep;
    const a1 = startAngle + ((next - min) / (max - min)) * sweep;
    return { d: arcPath(a0, a1), color: z.color };
  });

  const valueAngle =
    value === null
      ? null
      : startAngle + ((Math.max(min, Math.min(max, value)) - min) / (max - min)) * sweep;
  const dot = valueAngle !== null ? polar(valueAngle) : null;

  return (
    <div className="relative aspect-square w-full max-w-[200px] mx-auto">
      <svg viewBox="0 0 140 140" className="w-full h-full">
        {arcs.map((a, i) => (
          <path key={i} d={a.d} stroke={a.color} strokeWidth="10" fill="none" strokeLinecap="butt" />
        ))}
        {dot && (
          <circle cx={dot.x} cy={dot.y} r="6" fill="#fafafa" stroke="#0a0a0a" strokeWidth="2" />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-semibold text-neutral-100 tabular-nums">
          {display ?? (value !== null ? value : "—")}
        </span>
        {unit && <span className="text-xs text-neutral-500 mt-0.5">{unit}</span>}
      </div>
    </div>
  );
}
