export default function Gauge({
  value,
  min = 0,
  max = 100,
  label,
  color = "#22c55e",
}: {
  value: number | null;
  min?: number;
  max?: number;
  label?: string;
  color?: string;
}) {
  if (value === null) {
    return <p className="text-xs text-neutral-500">No data</p>;
  }
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const circ = 2 * Math.PI * 36;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex items-center gap-3">
      <svg width="84" height="84" viewBox="0 0 84 84">
        <circle
          cx="42"
          cy="42"
          r="36"
          stroke="#262626"
          strokeWidth="6"
          fill="none"
        />
        <circle
          cx="42"
          cy="42"
          r="36"
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ * 0.25}
          strokeLinecap="round"
          transform="rotate(-90 42 42)"
        />
        <text
          x="42"
          y="48"
          textAnchor="middle"
          fontSize="20"
          fontWeight="600"
          fill="#fafafa"
        >
          {Math.round(value)}
        </text>
      </svg>
      {label && <p className="text-xs text-neutral-400 max-w-[12ch]">{label}</p>}
    </div>
  );
}
