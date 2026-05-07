import type { HRVHistoryPoint } from "@/lib/garmin";

type Baseline = {
  lowUpper: number | null;
  balancedLow: number | null;
  balancedUpper: number | null;
};

const STATUS_DOT: Record<string, string> = {
  BALANCED: "#22c55e",
  UNBALANCED: "#eab308",
  LOW: "#fb923c",
  POOR: "#ef4444",
};

const STATUS_LABEL: Record<string, string> = {
  BALANCED: "Balanced",
  UNBALANCED: "Unbalanced",
  LOW: "Low",
  POOR: "Poor",
};

function colorForValue(v: number, b: Baseline): string {
  if (b.balancedLow !== null && b.balancedUpper !== null) {
    if (v >= b.balancedLow && v <= b.balancedUpper) return "#22c55e";
    if (b.lowUpper !== null && v < b.lowUpper) return "#ef4444";
    if (v < b.balancedLow) return "#fb923c";
    return "#eab308";
  }
  return "#737373";
}

export default function HRVStatusCard({
  status,
  weeklyAvg,
  lastNightAvg,
  baseline,
  history,
}: {
  status: string | null;
  weeklyAvg: number | null;
  lastNightAvg: number | null;
  baseline: Baseline;
  history: HRVHistoryPoint[];
}) {
  const dot = status ? STATUS_DOT[status] ?? "#737373" : "#737373";
  const label = status ? STATUS_LABEL[status] ?? status : "—";

  const lowMax = baseline.lowUpper ?? 30;
  const balLow = baseline.balancedLow ?? 40;
  const balHigh = baseline.balancedUpper ?? 80;
  const scaleMin = Math.max(0, lowMax - 10);
  const scaleMax = balHigh + 20;
  const span = scaleMax - scaleMin;

  const pos = (v: number) => `${Math.max(0, Math.min(100, ((v - scaleMin) / span) * 100))}%`;

  const points = history.filter((h) => h.lastNightAvg !== null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-full" style={{ background: dot }} />
        <span className="text-2xl font-semibold text-neutral-100">{label}</span>
      </div>

      {weeklyAvg !== null && (
        <div>
          <p className="text-3xl font-semibold tabular-nums">
            {weeklyAvg} <span className="text-base font-normal text-neutral-400">ms</span>
          </p>
          <p className="text-xs text-neutral-500">7d Avg</p>
        </div>
      )}

      <div>
        <div className="relative h-2.5 w-full rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0"
            style={{ left: 0, width: pos(lowMax), background: "#ef4444" }}
          />
          <div
            className="absolute inset-y-0"
            style={{ left: pos(lowMax), width: `calc(${pos(balLow)} - ${pos(lowMax)})`, background: "#fb923c" }}
          />
          <div
            className="absolute inset-y-0"
            style={{ left: pos(balLow), width: `calc(${pos(balHigh)} - ${pos(balLow)})`, background: "#22c55e" }}
          />
          <div
            className="absolute inset-y-0"
            style={{ left: pos(balHigh), right: 0, background: "#eab308" }}
          />
          {weeklyAvg !== null && (
            <div
              className="absolute -top-1 -bottom-1 w-0.5 bg-neutral-100"
              style={{ left: pos(weeklyAvg) }}
            />
          )}
        </div>
      </div>

      {points.length > 0 && (
        <div>
          <div className="relative h-12 w-full">
            <div className="absolute left-0 right-0 top-1/2 h-px bg-neutral-800" />
            {points.map((p, i) => {
              const x = (i / Math.max(1, history.length - 1)) * 100;
              const v = p.lastNightAvg as number;
              const yPct = 100 - Math.max(0, Math.min(100, ((v - scaleMin) / span) * 100));
              return (
                <div
                  key={i}
                  className="absolute h-1.5 w-1.5 rounded-full -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${x}%`, top: `${yPct}%`, background: colorForValue(v, baseline) }}
                />
              );
            })}
          </div>
          <p className="mt-1 text-[10px] text-neutral-500">Last 4w</p>
        </div>
      )}

      {lastNightAvg !== null && (
        <p className="text-[11px] text-neutral-500">
          Last night · <span className="text-neutral-200">{lastNightAvg} ms</span>
        </p>
      )}
    </div>
  );
}
