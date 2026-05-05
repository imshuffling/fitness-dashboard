"use client";

import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS: Record<string, string> = {
  zone1: "#3b82f6",
  zone2: "#22c55e",
  zone3: "#eab308",
  zone4: "#f97316",
  zone5: "#ef4444",
};

const LABELS: Record<string, string> = {
  zone1: "Z1 Recovery",
  zone2: "Z2 Endurance",
  zone3: "Z3 Tempo",
  zone4: "Z4 Threshold",
  zone5: "Z5 VO2",
};

export type Zones = {
  zone1: number;
  zone2: number;
  zone3: number;
  zone4: number;
  zone5: number;
  [k: string]: number;
};

export default function ZoneBreakdown({ zones }: { zones: Zones | null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!zones) {
    return (
      <div className="flex h-64 items-center justify-center text-neutral-500 text-sm">
        No zone data for the latest activity.
      </div>
    );
  }

  const data = (Object.keys(zones) as (keyof Zones)[])
    .map((k) => ({ name: LABELS[k], value: Math.round(zones[k] / 60), key: k }))
    .filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-neutral-500 text-sm">
        Empty zone distribution.
      </div>
    );
  }
  if (!mounted) return <div className="h-64" />;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <PieChart>
          <Tooltip
            formatter={(value) => [`${value as number} min`, ""]}
            contentStyle={{ background: "#0a0a0a", border: "1px solid #262626", fontSize: 12 }}
          />
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
            {data.map((entry) => (
              <Cell key={entry.key} fill={COLORS[entry.key]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-neutral-400">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: COLORS[d.key] }} />
            {d.name}: {d.value}m
          </li>
        ))}
      </ul>
    </div>
  );
}
