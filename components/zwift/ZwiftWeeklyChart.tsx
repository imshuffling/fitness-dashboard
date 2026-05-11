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
import type { ZwiftWeekBucket } from "@/lib/zwift";

export default function ZwiftWeeklyChart({ data }: { data: ZwiftWeekBucket[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-neutral-500 text-sm">
        No Zwift rides in this window.
      </div>
    );
  }
  if (!mounted) return <div className="h-64" />;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" />
          <XAxis dataKey="weekStart" stroke="#737373" fontSize={11} />
          <YAxis yAxisId="left" stroke="#737373" fontSize={11} />
          <YAxis yAxisId="right" orientation="right" stroke="#737373" fontSize={11} />
          <Tooltip
            contentStyle={{ background: "#0a0a0a", border: "1px solid #262626", fontSize: 12 }}
            labelStyle={{ color: "#fafafa" }}
          />
          <Bar yAxisId="left" dataKey="totalMin" name="Minutes" fill="#f97316" radius={[4, 4, 0, 0]} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="km"
            name="km"
            stroke="#38bdf8"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
