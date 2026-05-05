import { promises as fs } from "node:fs";
import path from "node:path";
import { redis } from "./kv";
import {
  getActivities,
  getActivityStreams,
  getAthleteProfile,
  type StravaActivity,
} from "./strava";
import {
  avgHRAtPower,
  calcZone2Pct,
  calcZoneDistribution,
  totalSeconds,
  type ZoneSeconds,
} from "./zones";
import { startOfWeek, format, parseISO } from "date-fns";

export type ActivitySummary = {
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

export type WeekBucket = {
  weekStart: string;
  totalMin: number;
  zone2Min: number;
  pct: number;
  rides: number;
};

export type HRAtPowerPoint = { date: string; hr: number; watts: number };

export type HealthSummary = {
  athlete: { name: string; weight?: number };
  thisWeek: {
    activities: number;
    rides: number;
    totalMinutes: number;
    zone2Minutes: number;
    zone2Pct: number;
  };
  trends: { hrAtPower: HRAtPowerPoint[]; targetWatts: number };
  weekly: WeekBucket[];
  recentActivities: ActivitySummary[];
  fitnessScore: "improving" | "stable" | "declining" | "insufficient_data";
  generatedAt: string;
};

const CYCLING_TYPES = new Set(["Ride", "VirtualRide", "EBikeRide", "Velomobile"]);

const CACHE_DIR = ".data/cache";

function cacheFile(key: string): string {
  return path.join(CACHE_DIR, key.replace(/[^a-zA-Z0-9._-]/g, "_") + ".json");
}

async function cacheGet<T>(key: string): Promise<T | null> {
  const r = redis();
  if (r) return (await r.get<T>(key)) ?? null;
  // Local file fallback
  try {
    const raw = await fs.readFile(cacheFile(key), "utf8");
    const { value, expiresAt } = JSON.parse(raw) as { value: T; expiresAt: number };
    if (expiresAt < Date.now()) return null;
    return value;
  } catch {
    return null;
  }
}

async function cacheSet<T>(key: string, val: T, ttlSeconds: number): Promise<void> {
  const r = redis();
  if (r) {
    await r.set(key, val, { ex: ttlSeconds });
    return;
  }
  // Local file fallback
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(
    cacheFile(key),
    JSON.stringify({ value: val, expiresAt: Date.now() + ttlSeconds * 1000 }),
    "utf8"
  );
}

export async function clearSummaryCache(): Promise<number> {
  const r = redis();
  if (r) {
    let cursor = "0";
    let deleted = 0;
    do {
      const res = (await r.scan(cursor, { match: "summary:v1:*", count: 100 })) as [
        string,
        string[]
      ];
      cursor = res[0];
      if (res[1].length > 0) {
        await r.del(...res[1]);
        deleted += res[1].length;
      }
    } while (cursor !== "0");
    return deleted;
  }
  // Local file fallback
  try {
    const files = await fs.readdir(CACHE_DIR);
    let deleted = 0;
    for (const f of files) {
      if (f.startsWith("summary_v1_")) {
        await fs.unlink(path.join(CACHE_DIR, f));
        deleted++;
      }
    }
    return deleted;
  } catch {
    return 0;
  }
}

function summariseActivity(a: StravaActivity, zones: ZoneSeconds | null): ActivitySummary {
  return {
    id: a.id,
    name: a.name,
    date: a.start_date_local,
    type: a.sport_type ?? a.type,
    durationMin: Math.round(a.moving_time / 60),
    distanceKm: Math.round((a.distance / 1000) * 10) / 10,
    avgHR: a.average_heartrate ? Math.round(a.average_heartrate) : null,
    avgWatts: a.average_watts ? Math.round(a.average_watts) : null,
    zone2Pct: zones ? Math.round((zones.zone2 / Math.max(1, totalSeconds(zones))) * 100) : null,
    zones,
  };
}

function bucketByWeek(activities: ActivitySummary[]): WeekBucket[] {
  const map = new Map<string, WeekBucket>();
  for (const a of activities) {
    const ws = format(startOfWeek(parseISO(a.date), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const cur =
      map.get(ws) ??
      ({ weekStart: ws, totalMin: 0, zone2Min: 0, pct: 0, rides: 0 } as WeekBucket);
    cur.totalMin += a.durationMin;
    if (a.zones) cur.zone2Min += Math.round(a.zones.zone2 / 60);
    cur.rides += 1;
    map.set(ws, cur);
  }
  return Array.from(map.values())
    .map((w) => ({ ...w, pct: w.totalMin === 0 ? 0 : Math.round((w.zone2Min / w.totalMin) * 100) }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

function classifyTrend(points: HRAtPowerPoint[]): HealthSummary["fitnessScore"] {
  if (points.length < 4) return "insufficient_data";
  const first = points.slice(0, Math.ceil(points.length / 2));
  const last = points.slice(Math.ceil(points.length / 2));
  const avg = (xs: HRAtPowerPoint[]) => xs.reduce((s, p) => s + p.hr, 0) / xs.length;
  const delta = avg(last) - avg(first);
  if (delta <= -2) return "improving";
  if (delta >= 2) return "declining";
  return "stable";
}

export async function buildHealthSummary(opts: { days?: number; targetWatts?: number } = {}): Promise<HealthSummary> {
  const days = opts.days ?? 30;
  const targetWatts = opts.targetWatts ?? 190;
  const cacheKey = `summary:v1:${days}:${targetWatts}`;
  const cached = await cacheGet<HealthSummary>(cacheKey);
  if (cached) return cached;

  const [athlete, activities] = await Promise.all([getAthleteProfile(), getActivities({ days })]);

  const summaries: ActivitySummary[] = [];
  const hrAtPower: HRAtPowerPoint[] = [];

  for (const a of activities) {
    const isCycling = CYCLING_TYPES.has(a.sport_type ?? a.type);
    const hasHR = a.has_heartrate || (a.average_heartrate ?? 0) > 0;

    // Per-activity cache. Activity data is immutable once uploaded.
    const actCacheKey = `activity:v1:${a.id}:${targetWatts}`;
    type ActCache = { zones: ZoneSeconds | null; avgHR: number | null };
    let zones: ZoneSeconds | null = null;
    let avgHR: number | null = null;
    const cachedAct = await cacheGet<ActCache>(actCacheKey);
    if (cachedAct) {
      zones = cachedAct.zones;
      avgHR = cachedAct.avgHR;
    } else if (hasHR) {
      try {
        const keys = isCycling ? ["heartrate", "watts", "time"] : ["heartrate", "time"];
        const streams = await getActivityStreams(a.id, keys);
        const hr = streams.heartrate?.data ?? [];
        const time = streams.time?.data ?? [];
        const watts = streams.watts?.data ?? [];
        if (hr.length && time.length) zones = calcZoneDistribution(hr, time);
        if (isCycling && hr.length && watts.length && hr.length === watts.length) {
          avgHR = avgHRAtPower({ hr, watts }, targetWatts);
        }
        // Cache 30 days — activity data doesn't change.
        await cacheSet(actCacheKey, { zones, avgHR }, 30 * 86400);
      } catch {
        // ignore stream errors per-activity
      }
    } else {
      // Cache the no-HR result too so we don't keep checking.
      await cacheSet(actCacheKey, { zones: null, avgHR: null }, 30 * 86400);
    }

    summaries.push(summariseActivity(a, zones));

    if (avgHR !== null) {
      hrAtPower.push({
        date: a.start_date_local.slice(0, 10),
        hr: avgHR,
        watts: targetWatts,
      });
    }
  }

  hrAtPower.sort((a, b) => a.date.localeCompare(b.date));
  const weekly = bucketByWeek(summaries);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekActs = summaries.filter((s) => parseISO(s.date) >= weekStart);
  const thisWeekRides = thisWeekActs.filter((a) => CYCLING_TYPES.has(a.type)).length;
  const thisWeekZ2 = thisWeekActs.reduce(
    (s, a) => s + (a.zones ? Math.round(a.zones.zone2 / 60) : 0),
    0
  );
  const thisWeekTotal = thisWeekActs.reduce((s, a) => s + a.durationMin, 0);

  const summary: HealthSummary = {
    athlete: {
      name: `${athlete.firstname} ${athlete.lastname}`.trim(),
      weight: athlete.weight,
    },
    thisWeek: {
      activities: thisWeekActs.length,
      rides: thisWeekRides,
      totalMinutes: thisWeekTotal,
      zone2Minutes: thisWeekZ2,
      zone2Pct: thisWeekTotal === 0 ? 0 : Math.round((thisWeekZ2 / thisWeekTotal) * 100),
    },
    trends: { hrAtPower, targetWatts },
    weekly,
    recentActivities: summaries.slice().sort((a, b) => b.date.localeCompare(a.date)),
    fitnessScore: classifyTrend(hrAtPower),
    generatedAt: new Date().toISOString(),
  };

  await cacheSet(cacheKey, summary, 15 * 60);
  return summary;
}

export async function calcZone2Trend(weeks: number): Promise<WeekBucket[]> {
  const days = weeks * 7;
  const summary = await buildHealthSummary({ days });
  return summary.weekly.slice(-weeks);
}

export async function calcHRAtPowerTrend(watts: number, days = 90): Promise<HRAtPowerPoint[]> {
  const summary = await buildHealthSummary({ days, targetWatts: watts });
  return summary.trends.hrAtPower;
}

// re-export so route handlers can compute zone2 pct when needed
export { calcZone2Pct };
