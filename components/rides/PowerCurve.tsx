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
import type { PowerCurvePoint } from "@/lib/rides";

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${(sec / 3600).toFixed(1)}h`;
}

export default function PowerCurve({ points }: { points: PowerCurvePoint[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (points.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-neutral-500 text-sm">
        No power data.
      </div>
    );
  }
  if (!mounted) return <div className="h-56" />;

  const data = points.map((p) => ({ ...p, label: formatDuration(p.duration) }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="#737373" fontSize={11} />
          <YAxis stroke="#737373" fontSize={11} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ background: "#0a0a0a", border: "1px solid #262626", fontSize: 12 }}
            labelStyle={{ color: "#fafafa" }}
            formatter={(v) => [`${Math.round(Number(v))} W`, "Max avg"]}
          />
          <Line
            type="monotone"
            dataKey="watts"
            stroke="#a78bfa"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
