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
import type { ZwiftWattsPoint } from "@/lib/zwift";

export default function ZwiftWattsTrend({ data }: { data: ZwiftWattsPoint[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-neutral-500 text-sm">
        No power data.
      </div>
    );
  }
  if (!mounted) return <div className="h-56" />;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#737373" fontSize={11} />
          <YAxis stroke="#737373" fontSize={11} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ background: "#0a0a0a", border: "1px solid #262626", fontSize: 12 }}
            labelStyle={{ color: "#fafafa" }}
          />
          <Line
            type="monotone"
            dataKey="avgWatts"
            name="Avg watts"
            stroke="#a78bfa"
            strokeWidth={2}
            dot={{ r: 2.5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
