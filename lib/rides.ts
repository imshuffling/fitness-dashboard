import { cacheGet, cacheSet } from "./kv";
import {
  findIntervalsActivityByStart,
  getIntervalsActivity,
  isIntervalsConfigured,
  type IntervalsActivityDetail,
} from "./intervals";
import {
  getActivityDetail,
  getActivityStreams,
  type GarminActivityDetail,
  type StreamSet,
} from "./garminActivities";
import { getActivityPhotos, type StravaPhoto } from "./strava";
import { calcZoneDistribution, type ZoneSeconds } from "./zones";

export type PowerCurvePoint = { duration: number; watts: number };

export type VirtualPlatform = "zwift" | "mywhoosh" | "other";

export type RideDetail = {
  id: number;
  name: string;
  date: string;
  type: string;
  platform: VirtualPlatform | null;
  durationMin: number;
  distanceKm: number;
  elevationGainM: number | null;
  avgHR: number | null;
  maxHR: number | null;
  avgWatts: number | null;
  maxWatts: number | null;
  weightedAvgWatts: number | null;
  kilojoules: number | null;
  kudosCount: number;
  photos: StravaPhoto[];
  polyline: [number, number][];
  powerCurve: PowerCurvePoint[];
  zones: ZoneSeconds | null;
  intervals: IntervalsActivityDetail | null;
};

const POWER_DURATIONS = [5, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600];

function computePowerCurve(watts: number[], time: number[]): PowerCurvePoint[] {
  const n = watts.length;
  if (n < 2 || watts.length !== time.length) return [];

  const totalSpan = time[n - 1] - time[0];
  const sum = new Array(n + 1).fill(0);
  for (let i = 0; i < n; i++) {
    const dt = i > 0 ? Math.max(0, time[i] - time[i - 1]) : 1;
    sum[i + 1] = sum[i] + (watts[i] || 0) * dt;
  }

  const out: PowerCurvePoint[] = [];
  for (const d of POWER_DURATIONS) {
    if (d > totalSpan) continue;
    let lo = 0;
    let max = 0;
    for (let hi = 0; hi < n; hi++) {
      while (lo + 1 < hi && time[hi] - time[lo + 1] >= d) lo++;
      const span = time[hi] - time[lo];
      if (span >= d * 0.95) {
        const avg = (sum[hi + 1] - sum[lo]) / span;
        if (avg > max) max = avg;
      }
    }
    if (max > 0) out.push({ duration: d, watts: Math.round(max) });
  }
  return out;
}

function detectPlatform(detail: GarminActivityDetail): VirtualPlatform | null {
  const dn = (detail.device_name ?? "").toLowerCase();
  const name = (detail.name ?? "").toLowerCase();
  const haystack = `${dn} ${name}`;
  if (haystack.includes("zwift")) return "zwift";
  if (haystack.includes("mywhoosh") || haystack.includes("my whoosh") || haystack.includes("my-whoosh")) {
    return "mywhoosh";
  }
  const sport = detail.sport_type ?? detail.type;
  if (sport && sport.startsWith("Virtual")) return "other";
  return null;
}

export async function getRideDetail(id: number): Promise<RideDetail> {
  const cacheKey = `ride:v5:${id}`;
  const cached = await cacheGet<RideDetail>(cacheKey);
  if (cached) return cached;

  const detail = await getActivityDetail(id);

  // Link to intervals.icu by start time (Zwift/Garmin rides aren't keyed by
  // garmin_id there). The match also yields the Strava id used for photos.
  const match = isIntervalsConfigured()
    ? await findIntervalsActivityByStart(detail.start_date_local).catch(() => null)
    : null;

  const [streams, intervals, photos] = await Promise.all([
    getActivityStreams(id).catch(() => ({}) as StreamSet),
    match ? getIntervalsActivity(match.intervalsId).catch(() => null) : Promise.resolve(null),
    match?.stravaId != null
      ? getActivityPhotos(match.stravaId, 2048).catch(() => [] as StravaPhoto[])
      : Promise.resolve([] as StravaPhoto[]),
  ]);

  const hr = streams.heartrate?.data ?? [];
  const time = streams.time?.data ?? [];
  const watts = streams.watts?.data ?? [];

  const zones = hr.length && time.length ? calcZoneDistribution(hr, time) : null;
  const powerCurve =
    watts.length && time.length && watts.length === time.length
      ? computePowerCurve(watts, time)
      : [];

  const result: RideDetail = {
    id: detail.id,
    name: detail.name,
    date: detail.start_date_local,
    type: detail.sport_type ?? detail.type,
    platform: detectPlatform(detail),
    durationMin: Math.round(detail.moving_time / 60),
    distanceKm: Math.round((detail.distance / 1000) * 10) / 10,
    elevationGainM:
      detail.total_elevation_gain != null ? Math.round(detail.total_elevation_gain) : null,
    avgHR: detail.average_heartrate ? Math.round(detail.average_heartrate) : null,
    maxHR: detail.max_heartrate ? Math.round(detail.max_heartrate) : null,
    avgWatts: detail.average_watts ? Math.round(detail.average_watts) : null,
    maxWatts: detail.max_watts ? Math.round(detail.max_watts) : null,
    weightedAvgWatts: detail.weighted_average_watts
      ? Math.round(detail.weighted_average_watts)
      : null,
    kilojoules: detail.kilojoules,
    kudosCount: 0,
    photos,
    polyline: detail.polyline,
    powerCurve,
    zones,
    intervals,
  };

  await cacheSet(cacheKey, result, 30 * 86400);
  return result;
}
