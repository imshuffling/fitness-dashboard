"use client";

import { useEffect, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { date: string; ctl: number; atl: number; tsb: number };

export default function TrainingLoadChart({ points }: { points: Point[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (points.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-neutral-500 text-sm">
        No training load data yet. Sync activities to intervals.icu first.
      </div>
    );
  }
  if (!mounted) return <div className="h-72" />;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <ComposedChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#737373" fontSize={11} />
          <YAxis stroke="#737373" fontSize={11} />
          <Tooltip
            contentStyle={{ background: "#0a0a0a", border: "1px solid #262626", fontSize: 12 }}
            labelStyle={{ color: "#fafafa" }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={0} stroke="#525252" />
          <Area
            type="monotone"
            dataKey="ctl"
            name="Fitness (CTL)"
            stroke="#22c55e"
            fill="#22c55e22"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="atl"
            name="Fatigue (ATL)"
            stroke="#fb923c"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="tsb"
            name="Form (TSB)"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
