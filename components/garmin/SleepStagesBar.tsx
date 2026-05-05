type Stages = {
  deepHours: number | null;
  lightHours: number | null;
  remHours: number | null;
  awakeHours: number | null;
};

const COLORS = {
  deep: "#1d4ed8",
  light: "#60a5fa",
  rem: "#a78bfa",
  awake: "#f97316",
};

export default function SleepStagesBar({ stages }: { stages: Stages }) {
  const segments = [
    { key: "deep", label: "Deep", value: stages.deepHours ?? 0, color: COLORS.deep },
    { key: "light", label: "Light", value: stages.lightHours ?? 0, color: COLORS.light },
    { key: "rem", label: "REM", value: stages.remHours ?? 0, color: COLORS.rem },
    { key: "awake", label: "Awake", value: stages.awakeHours ?? 0, color: COLORS.awake },
  ];
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) {
    return <p className="text-xs text-neutral-500">No sleep stage data.</p>;
  }
  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-neutral-800">
        {segments.map((s) => (
          <div
            key={s.key}
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
            title={`${s.label}: ${s.value}h`}
          />
        ))}
      </div>
      <ul className="grid grid-cols-4 gap-2 text-[11px]">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
            <span className="text-neutral-400">{s.label}</span>
            <span className="ml-auto text-neutral-200 font-medium">{s.value}h</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
