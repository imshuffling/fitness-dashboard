type Bucket = { label: string; value: number; color: string };

export default function StressDonut({
  value,
  buckets,
}: {
  value: number | null;
  buckets?: Bucket[];
}) {
  const r = 56;
  const circ = 2 * Math.PI * r;
  const defaultBuckets: Bucket[] = [
    { label: "Rest", value: 60, color: "#3b82f6" },
    { label: "Low", value: 20, color: "#60a5fa" },
    { label: "Med", value: 12, color: "#fb923c" },
    { label: "High", value: 8, color: "#ef4444" },
  ];
  const segs = buckets ?? defaultBuckets;
  const total = segs.reduce((s, b) => s + b.value, 0) || 1;
  const arcs = segs.reduce<Array<{ color: string; len: number; offset: number }>>(
    (acc, b) => {
      const prev = acc[acc.length - 1];
      const startOffset = prev ? prev.offset + prev.len : 0;
      acc.push({ color: b.color, len: (b.value / total) * circ, offset: startOffset });
      return acc;
    },
    []
  );
  const hasData = value !== null;
  return (
    <div className="relative aspect-square w-full max-w-[200px] mx-auto">
      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
        <circle cx="70" cy="70" r={r} stroke="#262626" strokeWidth="10" fill="none" />
        {hasData &&
          arcs.map((a, i) => (
            <circle
              key={i}
              cx="70"
              cy="70"
              r={r}
              stroke={a.color}
              strokeWidth="10"
              fill="none"
              strokeDasharray={`${a.len} ${circ - a.len}`}
              strokeDashoffset={-a.offset}
              strokeLinecap="butt"
            />
          ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-4xl font-semibold text-neutral-100 tabular-nums">
          {value ?? "—"}
        </span>
      </div>
    </div>
  );
}
