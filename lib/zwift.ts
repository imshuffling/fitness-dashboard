import {
  buildHealthSummary,
  defaultTargetWatts,
  type ActivitySummary,
  type HRAtPowerPoint,
} from "./health";
import { formatTrainingDay, parseTrainingDay, weekStart } from "./trainingDay";

const VIRTUAL_RIDE = "VirtualRide";

export type ZwiftWeekBucket = {
  weekStart: string;
  totalMin: number;
  km: number;
  rides: number;
};

export type ZwiftWattsPoint = { date: string; avgWatts: number };

export type ZwiftSummary = {
  rides: ActivitySummary[];
  weekly: ZwiftWeekBucket[];
  wattsTrend: ZwiftWattsPoint[];
  hrAtPower: HRAtPowerPoint[];
  targetWatts: number;
  totals: { rides: number; totalMin: number; km: number };
  generatedAt: string;
};

function bucketByWeek(rides: ActivitySummary[]): ZwiftWeekBucket[] {
  const map = new Map<string, ZwiftWeekBucket>();
  for (const r of rides) {
    const ws = formatTrainingDay(weekStart(parseTrainingDay(r.date)));
    const cur =
      map.get(ws) ?? ({ weekStart: ws, totalMin: 0, km: 0, rides: 0 } as ZwiftWeekBucket);
    cur.totalMin += r.durationMin;
    cur.km += r.distanceKm;
    cur.rides += 1;
    map.set(ws, cur);
  }
  return Array.from(map.values())
    .map((w) => ({ ...w, km: Math.round(w.km * 10) / 10 }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

export async function buildZwiftSummary(opts: { days?: number; targetWatts?: number } = {}): Promise<ZwiftSummary> {
  const days = opts.days ?? 90;
  const targetWatts = opts.targetWatts ?? defaultTargetWatts();
  const summary = await buildHealthSummary({ days, targetWatts });

  const rides = summary.recentActivities.filter((a) => a.type === VIRTUAL_RIDE);
  const ascending = rides.slice().sort((a, b) => a.date.localeCompare(b.date));

  const weekly = bucketByWeek(rides);
  const wattsTrend: ZwiftWattsPoint[] = ascending
    .filter((r) => r.avgWatts !== null)
    .map((r) => ({ date: r.date.slice(0, 10), avgWatts: r.avgWatts as number }));

  const hrAtPower = summary.trends.hrAtPower.filter((p) => p.type === VIRTUAL_RIDE);

  const totals = rides.reduce(
    (acc, r) => ({
      rides: acc.rides + 1,
      totalMin: acc.totalMin + r.durationMin,
      km: acc.km + r.distanceKm,
    }),
    { rides: 0, totalMin: 0, km: 0 }
  );
  totals.km = Math.round(totals.km * 10) / 10;

  return {
    rides,
    weekly,
    wattsTrend,
    hrAtPower,
    targetWatts,
    totals,
    generatedAt: summary.generatedAt,
  };
}
