"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { date: string; resting: number | null; min: number | null; max: number | null };

export default function RestingHRTrend({
  points,
  showDots = true,
}: {
  points: Point[];
  showDots?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const valid = points.filter((p) => p.resting !== null);
  if (valid.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center text-neutral-500 text-xs">
        No resting HR history.
      </div>
    );
  }
  if (!mounted) return <div className="h-44" />;
  const data = points.map((p) => ({
    date: p.date.slice(5), // MM-DD
    resting: p.resting,
    range: p.min !== null && p.max !== null ? p.max - p.min : null,
    min: p.min,
    max: p.max,
  }));
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" stroke="#525252" fontSize={10} />
          <YAxis
            stroke="#525252"
            fontSize={10}
            domain={["dataMin - 5", "dataMax + 5"]}
            label={{ value: "bpm", angle: -90, position: "insideLeft", fill: "#525252", fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{ background: "#0a0a0a", border: "1px solid #262626", fontSize: 11 }}
            labelStyle={{ color: "#fafafa" }}
          />
          <Bar dataKey="range" fill="#7f1d1d" opacity={0.4} radius={[2, 2, 0, 0]} />
          <Line
            type="monotone"
            dataKey="resting"
            stroke="#ef4444"
            strokeWidth={2}
            dot={showDots ? { r: 3, fill: "#ef4444" } : false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
