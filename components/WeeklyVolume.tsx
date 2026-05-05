"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Bucket = { weekStart: string; zone2Min: number; totalMin: number; pct: number; rides: number };

export default function WeeklyVolume({ data }: { data: Bucket[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-neutral-500 text-sm">
        No weekly data.
      </div>
    );
  }
  if (!mounted) return <div className="h-64" />;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" />
          <XAxis dataKey="weekStart" stroke="#737373" fontSize={11} />
          <YAxis
            stroke="#737373"
            fontSize={11}
            label={{ value: "Z2 min", angle: -90, position: "insideLeft", fill: "#737373", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{ background: "#0a0a0a", border: "1px solid #262626", fontSize: 12 }}
            labelStyle={{ color: "#fafafa" }}
          />
          <ReferenceLine y={180} stroke="#22c55e" strokeDasharray="4 4" />
          <Bar dataKey="zone2Min" fill="#fb923c" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
