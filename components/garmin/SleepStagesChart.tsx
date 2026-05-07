import type { SleepLevelPoint } from "@/lib/garmin";

const COLORS = {
  deep: "#1d4ed8",
  light: "#60a5fa",
  rem: "#d946ef",
  awake: "#f59e0b",
};

function colorForLevel(level: number): string {
  if (level <= 0.5) return COLORS.deep;
  if (level <= 1.5) return COLORS.light;
  if (level <= 2.5) return COLORS.rem;
  return COLORS.awake;
}

function heightForLevel(level: number): number {
  if (level <= 0.5) return 26;
  if (level <= 1.5) return 50;
  if (level <= 2.5) return 80;
  return 100;
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function SleepStagesChart({
  intraday,
  startTs,
  endTs,
}: {
  intraday: SleepLevelPoint[];
  startTs: number | null;
  endTs: number | null;
}) {
  if (!intraday.length || !startTs || !endTs) {
    return <p className="text-xs text-neutral-500">No sleep data.</p>;
  }
  const span = endTs - startTs;
  if (span <= 0) {
    return <p className="text-xs text-neutral-500">No sleep data.</p>;
  }
  return (
    <div className="space-y-2">
      <div className="relative h-32 w-full">
        {intraday.map((seg, i) => {
          const left = ((seg.start - startTs) / span) * 100;
          const width = Math.max(0.3, ((seg.end - seg.start) / span) * 100);
          const h = heightForLevel(seg.level);
          return (
            <div
              key={i}
              className="absolute bottom-0 rounded-sm"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                height: `${h}%`,
                background: colorForLevel(seg.level),
              }}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-neutral-500 tabular-nums">
        <span>{fmtTime(startTs)}</span>
        <span>{fmtTime(endTs)}</span>
      </div>
    </div>
  );
}
