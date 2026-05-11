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
import type { HRAtPowerPoint } from "@/lib/health";

export default function ZwiftHRAtPowerTrend({
  points,
  watts,
}: {
  points: HRAtPowerPoint[];
  watts: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (points.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-neutral-500 text-sm">
        Not enough Zwift rides with HR + power streams at {watts}W.
      </div>
    );
  }
  if (!mounted) return <div className="h-56" />;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#737373" fontSize={11} />
          <YAxis stroke="#737373" fontSize={11} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ background: "#0a0a0a", border: "1px solid #262626", fontSize: 12 }}
            labelStyle={{ color: "#fafafa" }}
            formatter={(v) => [`${Math.round(Number(v))} bpm`, `HR @ ${watts}W`]}
          />
          <Line
            type="monotone"
            dataKey="hr"
            name={`HR @ ${watts}W`}
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 2.5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
