import { cacheGet, cacheSet } from "./kv";
import {
  getIntervalsActivityFull,
  getIntervalsStreams,
  intervalsMetricsFrom,
  stravaIdOf,
  type IntervalsActivityDetail,
  type IntervalsActivityFull,
  type IntervalsStreamSet,
} from "./intervals";
import { getActivityPhotos, type StravaPhoto } from "./strava";
import { isConnected as isStravaConnected } from "./tokens";
import { calcZoneDistribution, type ZoneSeconds } from "./zones";

export type PowerCurvePoint = { duration: number; watts: number };

export type VirtualPlatform = "zwift" | "mywhoosh" | "other";

export type RideDetail = {
  id: string;
  stravaId: number | null;
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
  photos: StravaPhoto[];
  polyline: [number, number][];
  powerCurve: PowerCurvePoint[];
  zones: ZoneSeconds | null;
  intervals: IntervalsActivityDetail | null;
};

const POWER_DURATIONS = [5, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600];

// intervals.icu also offers /activity/{id}/power-curve.json, but the watts and
// time streams are already fetched for the zone breakdown, so compute locally.
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

// GPS arrives as parallel arrays: latitudes in `data`, longitudes in `data2`.
function coordsFromStreams(streams: IntervalsStreamSet): [number, number][] {
  const lat = streams.latlng?.data ?? [];
  const lng = streams.latlng?.data2 ?? [];
  const n = Math.min(lat.length, lng.length);
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    if (lat[i] == null || lng[i] == null) continue;
    out.push([lat[i], lng[i]]);
  }
  return out;
}

function detectPlatform(detail: IntervalsActivityFull): VirtualPlatform | null {
  const dn = (detail.device_name ?? "").toLowerCase();
  const ext = (detail.external_id ?? "").toLowerCase();
  const name = (detail.name ?? "").toLowerCase();
  const haystack = `${dn} ${ext} ${name}`;
  if (haystack.includes("zwift")) return "zwift";
  if (haystack.includes("mywhoosh") || haystack.includes("my whoosh") || haystack.includes("my-whoosh")) {
    return "mywhoosh";
  }
  if (detail.type?.startsWith("Virtual")) return "other";
  return null;
}

export async function getRideDetail(id: string): Promise<RideDetail> {
  const cacheKey = `ride:v5:${id}`;
  const cached = await cacheGet<RideDetail>(cacheKey);
  if (cached) return cached;

  const detailP = getIntervalsActivityFull(id);
  const streamsP = getIntervalsStreams(id, ["heartrate", "watts", "time", "latlng"]).catch(
    () => ({}) as IntervalsStreamSet,
  );
  const photosP = detailP
    .then(async (d) => {
      const stravaId = stravaIdOf(d);
      if (stravaId === null || !(await isStravaConnected())) return [] as StravaPhoto[];
      return getActivityPhotos(stravaId, 2048).catch(() => [] as StravaPhoto[]);
    })
    .catch(() => [] as StravaPhoto[]);

  const [detail, streams, photos] = await Promise.all([detailP, streamsP, photosP]);

  const metrics = intervalsMetricsFrom(detail as unknown as Record<string, unknown>);
  const hasMetrics = Object.values(metrics).some((v) => v !== null);

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
    stravaId: stravaIdOf(detail),
    name: detail.name ?? "Activity",
    date: detail.start_date_local,
    type: detail.type ?? "Workout",
    platform: detectPlatform(detail),
    durationMin: Math.round((detail.moving_time ?? 0) / 60),
    distanceKm: Math.round(((detail.distance ?? 0) / 1000) * 10) / 10,
    elevationGainM: detail.total_elevation_gain
      ? Math.round(detail.total_elevation_gain)
      : null,
    avgHR: detail.average_heartrate ? Math.round(detail.average_heartrate) : null,
    maxHR: detail.max_heartrate ? Math.round(detail.max_heartrate) : null,
    avgWatts: detail.icu_average_watts ? Math.round(detail.icu_average_watts) : null,
    maxWatts: detail.max_watts ? Math.round(detail.max_watts) : null,
    weightedAvgWatts: detail.icu_weighted_avg_watts
      ? Math.round(detail.icu_weighted_avg_watts)
      : null,
    kilojoules: detail.icu_joules ? Math.round(detail.icu_joules / 1000) : null,
    photos,
    polyline: coordsFromStreams(streams),
    powerCurve,
    zones,
    intervals: hasMetrics ? metrics : null,
  };

  await cacheSet(cacheKey, result, 30 * 86400);
  return result;
}
