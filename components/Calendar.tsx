"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import ZoneBreakdown from "./ZoneBreakdown";
import type { ZoneSeconds } from "@/lib/zones";

type Activity = {
  id: number;
  name: string;
  date: string;
  type: string;
  durationMin: number;
  distanceKm: number;
  avgHR: number | null;
  avgWatts: number | null;
  zone2Pct: number | null;
  zones: ZoneSeconds | null;
};

type View = "week" | "month";

const TYPE_COLORS: Record<string, string> = {
  Ride: "bg-orange-500",
  VirtualRide: "bg-orange-500",
  EBikeRide: "bg-orange-400",
  Run: "bg-sky-500",
  TrailRun: "bg-sky-500",
  Walk: "bg-emerald-500",
  Hike: "bg-emerald-600",
  WeightTraining: "bg-purple-500",
  Workout: "bg-yellow-500",
  Yoga: "bg-pink-500",
  Swim: "bg-cyan-500",
};

const TYPE_ICONS: Record<string, string> = {
  Ride: "🚴",
  VirtualRide: "🚴",
  EBikeRide: "🚴",
  Velomobile: "🚴",
  Run: "🏃",
  TrailRun: "🏃",
  VirtualRun: "🏃",
  Walk: "🚶",
  Hike: "🥾",
  WeightTraining: "🏋️",
  Workout: "💪",
  Yoga: "🧘",
  Swim: "🏊",
  Rowing: "🚣",
  Crossfit: "🤸",
  Elliptical: "🏃",
  StairStepper: "🪜",
  AlpineSki: "⛷️",
  BackcountrySki: "🎿",
  Snowboard: "🏂",
  Kayaking: "🛶",
  StandUpPaddling: "🏄",
  Surfing: "🏄",
};

function colorFor(type: string): string {
  return TYPE_COLORS[type] ?? "bg-neutral-500";
}

function iconFor(type: string): string {
  return TYPE_ICONS[type] ?? "•";
}

function buildDays(view: View, cursor: Date): Date[] {
  if (view === "week") {
    const start = startOfWeek(cursor, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);
  return days;
}

export default function Calendar({ activities }: { activities: Activity[] }) {
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [selected, setSelected] = useState<Activity | null>(null);

  const days = useMemo(() => buildDays(view, cursor), [view, cursor]);

  const byDay = useMemo(() => {
    const m = new Map<string, Activity[]>();
    for (const a of activities) {
      const key = a.date.slice(0, 10);
      const list = m.get(key) ?? [];
      list.push(a);
      m.set(key, list);
    }
    for (const list of m.values()) {
      list.sort((a, b) => a.date.localeCompare(b.date));
    }
    return m;
  }, [activities]);

  const navPrev = () =>
    setCursor((c) => (view === "week" ? addWeeks(c, -1) : addMonths(c, -1)));
  const navNext = () =>
    setCursor((c) => (view === "week" ? addWeeks(c, 1) : addMonths(c, 1)));
  const navToday = () => setCursor(new Date());

  const heading =
    view === "week"
      ? `${format(days[0], "d MMM")} – ${format(days[6], "d MMM yyyy")}`
      : format(cursor, "MMMM yyyy");

  const today = new Date();
  const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={navPrev}
            className="rounded-md bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 text-sm"
            aria-label="Previous"
          >
            ←
          </button>
          <button
            onClick={navToday}
            className="rounded-md bg-neutral-800 hover:bg-neutral-700 px-3 py-1 text-sm"
          >
            Today
          </button>
          <button
            onClick={navNext}
            className="rounded-md bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 text-sm"
            aria-label="Next"
          >
            →
          </button>
          <span className="ml-2 text-base font-medium">{heading}</span>
        </div>
        <div className="inline-flex rounded-md bg-neutral-800 p-0.5 text-sm">
          <button
            onClick={() => setView("week")}
            className={`px-3 py-1 rounded ${view === "week" ? "bg-neutral-700" : "text-neutral-400"}`}
          >
            Week
          </button>
          <button
            onClick={() => setView("month")}
            className={`px-3 py-1 rounded ${view === "month" ? "bg-neutral-700" : "text-neutral-400"}`}
          >
            Month
          </button>
        </div>
      </div>

      <div className="-mx-3 sm:mx-0 px-3 sm:px-0 overflow-x-auto">
        <div className="min-w-[700px] sm:min-w-0 space-y-1">
          <div className="grid grid-cols-7 gap-1 text-xs text-neutral-500">
            {weekdayLabels.map((d) => (
              <div key={d} className="px-2 py-1 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          <div className={`grid grid-cols-7 gap-1 ${view === "week" ? "" : "auto-rows-fr"}`}>
            {days.map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const acts = byDay.get(key) ?? [];
              const isToday = isSameDay(d, today);
              const muted = view === "month" && !isSameMonth(d, cursor);
              const limit = view === "week" ? 6 : 3;
              return (
                <div
                  key={key}
                  className={`rounded-md border p-2 ${
                    view === "week" ? "min-h-44" : "min-h-24"
                  } ${
                    isToday
                      ? "border-orange-500/50 bg-orange-500/5"
                      : "border-neutral-800 bg-neutral-900/40"
                  } ${muted ? "opacity-40" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs ${
                        isToday ? "text-orange-400 font-semibold" : "text-neutral-400"
                      }`}
                    >
                      {format(d, "d")}
                    </span>
                    {acts.length > 1 && (
                      <span className="text-[10px] text-neutral-500">{acts.length}</span>
                    )}
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {acts.slice(0, limit).map((a) => (
                      <li key={a.id}>
                        <button
                          onClick={() => setSelected(a)}
                          className={`w-full text-left rounded px-1.5 py-1 text-[11px] leading-tight ${colorFor(
                            a.type
                          )} bg-opacity-90 hover:brightness-110`}
                          title={`${a.name} · ${a.durationMin}m${
                            a.zone2Pct !== null ? ` · Z2 ${a.zone2Pct}%` : ""
                          }`}
                        >
                          <div className="truncate text-white font-medium flex items-center gap-1.5">
                            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-black/30 text-[10px] leading-none">
                              {iconFor(a.type)}
                            </span>
                            <span className="truncate">{a.name}</span>
                          </div>
                          <div className="text-white/85">
                            {a.durationMin}m
                            {a.zone2Pct !== null ? ` · Z2 ${a.zone2Pct}%` : ""}
                          </div>
                        </button>
                      </li>
                    ))}
                    {acts.length > limit && (
                      <li className="text-[10px] text-neutral-500 px-1.5">
                        +{acts.length - limit} more
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selected && <ActivityModal activity={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ActivityModal({ activity, onClose }: { activity: Activity; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-950 p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">{activity.name}</h3>
            <p className="text-xs text-neutral-500">
              {format(parseISO(activity.date), "EEEE d MMM yyyy")} · {activity.type}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-200 text-lg"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Stat label="Duration" value={`${activity.durationMin} min`} />
          {activity.distanceKm > 0 && (
            <Stat label="Distance" value={`${activity.distanceKm} km`} />
          )}
          {activity.avgHR !== null && <Stat label="Avg HR" value={`${activity.avgHR} bpm`} />}
          {activity.avgWatts !== null && (
            <Stat label="Avg Power" value={`${activity.avgWatts} W`} />
          )}
          {activity.zone2Pct !== null && (
            <Stat label="Zone 2" value={`${activity.zone2Pct}%`} />
          )}
        </dl>
        {activity.zones &&
          activity.zones.zone1 +
            activity.zones.zone2 +
            activity.zones.zone3 +
            activity.zones.zone4 +
            activity.zones.zone5 >
            0 && (
            <div className="mt-5 pt-4 border-t border-neutral-800">
              <h4 className="text-[11px] uppercase tracking-wider text-neutral-500 mb-2">
                Zone breakdown
              </h4>
              <ZoneBreakdown zones={activity.zones} />
            </div>
          )}
        <div className="mt-4 flex gap-4">
          <a
            href={`/rides/${activity.id}`}
            className="text-xs text-orange-400 hover:text-orange-300"
          >
            Open detail →
          </a>
          <a
            href={`https://www.strava.com/activities/${activity.id}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-neutral-400 hover:text-neutral-200"
          >
            Open on Strava ↗
          </a>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-neutral-900 border border-neutral-800 p-2.5">
      <dt className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
