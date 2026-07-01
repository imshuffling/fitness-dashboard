import { cacheGet, cacheGetOrSetSwr, cacheScanDelete, cacheSet } from "./kv";
import {
  getActivities,
  getActivityStreams,
  getAthleteProfile,
  getMostRecentActivity,
  type GarminActivity,
} from "./garminActivities";
import {
  avgHRAtPower,
  calcZoneDistribution,
  totalSeconds,
  type ZoneSeconds,
} from "./zones";
import {
  formatTrainingDay,
  parseTrainingDay,
  today,
  weekStart,
} from "./trainingDay";

const DEFAULT_TARGET_WATTS_FALLBACK = 190;

export function defaultTargetWatts(): number {
  const raw = process.env.DEFAULT_TARGET_WATTS;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TARGET_WATTS_FALLBACK;
}

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
  photoUrl: string | null;
  videoUrl: string | null;
  photoCount: number;
};

export type WeekBucket = {
  weekStart: string;
  totalMin: number;
  zone2Min: number;
  pct: number;
  activities: number;
  rides: number;
  byType: Record<string, number>;
};

export type HRAtPowerPoint = { date: string; hr: number; watts: number; type: string };

export type HealthSummary = {
  athlete: { name: string; weight?: number; avatar?: string };
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

export async function clearSummaryCache(): Promise<number> {
  const patterns = ["summary:v1:*", "summary:v2:*", "summary:v3:*", "summary:v4:*", "summary:v5:*", "summary:v6:*", "summary:v7:*", "garminact:*", "intervals:load:*", "garmin:week:*", "garmin:dash:*", "garmin:tile:*"];
  let deleted = 0;
  for (const pattern of patterns) {
    deleted += await cacheScanDelete(pattern);
  }
  return deleted;
}

type ActivityEnrichment = { zones: ZoneSeconds | null; avgHR: number | null };

/**
 * Fetch streams for an activity and derive the zone distribution and the
 * average HR at the target wattage. Stream-shape (`streams.heartrate?.data`,
 * length-equality between channels) is hidden inside this function so the
 * summary loop stays oblivious. Result is cached per-activity for 30 days
 * since Strava activity data is immutable once uploaded.
 */
async function enrichActivity(
  a: GarminActivity,
  targetWatts: number
): Promise<ActivityEnrichment> {
  // v3 = bumped after HR zone bands recalibrated (2026-05-05)
  const cacheKey = `activity:v3:${a.id}:${targetWatts}`;
  const cached = await cacheGet<ActivityEnrichment>(cacheKey);
  if (cached) return cached;

  const isCycling = CYCLING_TYPES.has(a.sport_type ?? a.type);
  const hasHR = a.has_heartrate || (a.average_heartrate ?? 0) > 0;

  let result: ActivityEnrichment = { zones: null, avgHR: null };
  if (hasHR) {
    try {
      const streams = await getActivityStreams(a.id);
      const hr = streams.heartrate?.data ?? [];
      const time = streams.time?.data ?? [];
      const watts = streams.watts?.data ?? [];
      const zones = hr.length && time.length ? calcZoneDistribution(hr, time) : null;
      const avgHR =
        isCycling && hr.length && watts.length && hr.length === watts.length
          ? avgHRAtPower({ hr, watts }, targetWatts)
          : null;
      result = { zones, avgHR };
    } catch {
      // streams unavailable for this activity — leave nulls
    }
  }

  await cacheSet(cacheKey, result, 30 * 86400);
  return result;
}

function summariseActivity(
  a: GarminActivity,
  zones: ZoneSeconds | null,
  media: ActivityMedia
): ActivitySummary {
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
    photoUrl: media.photoUrl,
    videoUrl: media.videoUrl,
    photoCount: media.photoCount,
  };
}

type ActivityMedia = {
  photoUrl: string | null;
  videoUrl: string | null;
  photoCount: number;
};

/**
 * Garmin Connect carries no social photos, so summary cards are photo-free.
 * Activity photos (via the Strava linkage) are resolved lazily on the ride
 * detail page instead — see getRideDetail in lib/rides.ts.
 */
const EMPTY_MEDIA: ActivityMedia = { photoUrl: null, videoUrl: null, photoCount: 0 };

function bucketByWeek(activities: ActivitySummary[]): WeekBucket[] {
  const map = new Map<string, WeekBucket>();
  for (const a of activities) {
    const ws = formatTrainingDay(weekStart(parseTrainingDay(a.date)));
    const cur =
      map.get(ws) ??
      ({
        weekStart: ws,
        totalMin: 0,
        zone2Min: 0,
        pct: 0,
        activities: 0,
        rides: 0,
        byType: {},
      } as WeekBucket);
    cur.totalMin += a.durationMin;
    if (a.zones) cur.zone2Min += Math.round(a.zones.zone2 / 60);
    cur.activities += 1;
    if (CYCLING_TYPES.has(a.type)) cur.rides += 1;
    cur.byType[a.type] = (cur.byType[a.type] ?? 0) + 1;
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
  const targetWatts = opts.targetWatts ?? defaultTargetWatts();
  const cacheKey = `summary:v7:${days}:${targetWatts}`;
  return cacheGetOrSetSwr(cacheKey, 15 * 60, () => buildHealthSummaryFresh(days, targetWatts));
}

async function buildHealthSummaryFresh(days: number, targetWatts: number): Promise<HealthSummary> {
  const [athlete, activities] = await Promise.all([getAthleteProfile(), getActivities({ days })]);

  const summaries: ActivitySummary[] = [];
  const hrAtPower: HRAtPowerPoint[] = [];

  for (const a of activities) {
    const { zones, avgHR } = await enrichActivity(a, targetWatts);
    summaries.push(summariseActivity(a, zones, EMPTY_MEDIA));
    if (avgHR !== null) {
      hrAtPower.push({
        date: a.start_date_local.slice(0, 10),
        hr: avgHR,
        watts: targetWatts,
        type: a.sport_type ?? a.type,
      });
    }
  }

  hrAtPower.sort((a, b) => a.date.localeCompare(b.date));
  const weekly = bucketByWeek(summaries);

  const ws = weekStart(today());
  const thisWeekActs = summaries.filter((s) => parseTrainingDay(s.date) >= ws);
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
      avatar: athlete.profile,
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

  return summary;
}

/**
 * Lightweight fetch of just the most-recent activity, enriched. Avoids
 * waiting on the 90-day summary build so the hero "Latest Activity" card
 * can paint quickly. Strava per-activity streams + media are cached for
 * 30 days inside enrichActivity / fetchActivityMedia.
 */
export async function getLatestActivity(): Promise<ActivitySummary | null> {
  const targetWatts = defaultTargetWatts();
  const a = await getMostRecentActivity();
  if (!a) return null;
  const { zones } = await enrichActivity(a, targetWatts);
  return summariseActivity(a, zones, EMPTY_MEDIA);
}

/**
 * Every activity sharing the most-recent activity's calendar day, enriched
 * and sorted newest-first. Backs the "Latest Activity" section so a day with
 * more than one workout shows them all stacked.
 */
export async function getLatestDayActivities(): Promise<ActivitySummary[]> {
  const targetWatts = defaultTargetWatts();
  const recent = await getActivities({ days: 7 });
  if (recent.length === 0) return [];
  const latestDay = recent[0].start_date_local.slice(0, 10);
  const sameDay = recent.filter((a) => a.start_date_local.slice(0, 10) === latestDay);
  return Promise.all(
    sameDay.map(async (a) => {
      const { zones } = await enrichActivity(a, targetWatts);
      return summariseActivity(a, zones, EMPTY_MEDIA);
    }),
  );
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

