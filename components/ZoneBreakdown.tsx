"use client";

import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ZONE_COLORS, ZONE_KEYS, ZONE_LABELS, type ZoneSeconds } from "@/lib/zones";

export default function ZoneBreakdown({ zones }: { zones: ZoneSeconds | null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!zones) {
    return (
      <div className="flex h-56 items-center justify-center text-neutral-500 text-sm">
        No zone data for the latest activity.
      </div>
    );
  }

  const data = ZONE_KEYS
    .map((k) => ({ name: ZONE_LABELS[k], value: Math.round(zones[k] / 60), key: k }))
    .filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-neutral-500 text-sm">
        Empty zone distribution.
      </div>
    );
  }
  if (!mounted) return <div className="h-56" />;

  return (
    <div className="w-full">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <PieChart>
            <Tooltip
              formatter={(value) => [`${value as number} min`, ""]}
              contentStyle={{ background: "#0a0a0a", border: "1px solid #262626", fontSize: 12 }}
            />
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
              {data.map((entry) => (
                <Cell key={entry.key} fill={ZONE_COLORS[entry.key]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-neutral-400">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: ZONE_COLORS[d.key] }} />
            {d.name}: {d.value}m
          </li>
        ))}
      </ul>
    </div>
  );
}
