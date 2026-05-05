"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { ts: number; value: number };

export default function IntradayChart({
  points,
  color,
  yDomain,
  yLabel,
}: {
  points: Point[];
  color: string;
  yDomain?: [number | string, number | string];
  yLabel?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (points.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-neutral-500 text-xs">
        No intraday data
      </div>
    );
  }
  if (!mounted) return <div className="h-40" />;
  const data = points.map((p) => ({
    time: new Date(p.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    value: p.value,
  }));
  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.5} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="time"
            stroke="#525252"
            fontSize={10}
            interval={Math.max(1, Math.floor(data.length / 6))}
          />
          <YAxis
            stroke="#525252"
            fontSize={10}
            domain={yDomain ?? [0, "dataMax + 5"]}
            label={
              yLabel
                ? { value: yLabel, angle: -90, position: "insideLeft", fill: "#525252", fontSize: 10 }
                : undefined
            }
          />
          <Tooltip
            contentStyle={{ background: "#0a0a0a", border: "1px solid #262626", fontSize: 11 }}
            labelStyle={{ color: "#fafafa" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={`url(#grad-${color.replace("#", "")})`}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
