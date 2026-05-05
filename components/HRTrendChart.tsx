"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { date: string; hr: number; watts: number };

export default function HRTrendChart({
  points,
  targetWatts,
}: {
  points: Point[];
  targetWatts: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (points.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-neutral-500 text-sm">
        No HR-at-{targetWatts}W samples yet. Ride at this wattage for ~30+ seconds to populate.
      </div>
    );
  }
  if (!mounted) return <div className="h-64" />;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#737373" fontSize={11} />
          <YAxis
            stroke="#737373"
            fontSize={11}
            domain={["dataMin - 5", "dataMax + 5"]}
            label={{ value: "HR (bpm)", angle: -90, position: "insideLeft", fill: "#737373", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{ background: "#0a0a0a", border: "1px solid #262626", fontSize: 12 }}
            labelStyle={{ color: "#fafafa" }}
          />
          <Line
            type="monotone"
            dataKey="hr"
            stroke="#fb923c"
            strokeWidth={2}
            dot={{ r: 3, fill: "#fb923c" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
