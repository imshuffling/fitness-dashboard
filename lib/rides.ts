import { cacheGet, cacheSet } from "./kv";
import {
  getActivityDetail,
  getActivityPhotos,
  getActivityStreams,
  type StravaPhoto,
  type StreamSet,
} from "./strava";
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
};

const POWER_DURATIONS = [5, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600];

function decodePolyline(encoded: string): [number, number][] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coords: [number, number][] = [];
  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}

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

type StravaActivityDetail = Awaited<ReturnType<typeof getActivityDetail>> & {
  total_elevation_gain?: number;
  max_heartrate?: number;
  weighted_average_watts?: number;
  max_watts?: number;
  kilojoules?: number;
  kudos_count?: number;
  device_name?: string;
  external_id?: string;
  trainer?: boolean;
  map?: { summary_polyline?: string; polyline?: string };
};

function detectPlatform(detail: StravaActivityDetail): VirtualPlatform | null {
  const dn = (detail.device_name ?? "").toLowerCase();
  const ext = (detail.external_id ?? "").toLowerCase();
  const name = (detail.name ?? "").toLowerCase();
  const haystack = `${dn} ${ext} ${name}`;
  if (haystack.includes("zwift")) return "zwift";
  if (haystack.includes("mywhoosh") || haystack.includes("my whoosh") || haystack.includes("my-whoosh")) {
    return "mywhoosh";
  }
  const sport = detail.sport_type ?? detail.type;
  if (sport && sport.startsWith("Virtual")) return "other";
  return null;
}

export async function getRideDetail(id: number): Promise<RideDetail> {
  const cacheKey = `ride:v3:${id}`;
  const cached = await cacheGet<RideDetail>(cacheKey);
  if (cached) return cached;

  const detail = (await getActivityDetail(id)) as StravaActivityDetail;

  const [photos, streams] = await Promise.all([
    (detail.total_photo_count ?? detail.photo_count ?? 0) > 0
      ? getActivityPhotos(id, 2048).catch(() => [] as StravaPhoto[])
      : Promise.resolve([] as StravaPhoto[]),
    getActivityStreams(id, ["heartrate", "watts", "time"]).catch(() => ({}) as StreamSet),
  ]);

  const hr = streams.heartrate?.data ?? [];
  const time = streams.time?.data ?? [];
  const watts = streams.watts?.data ?? [];

  const zones = hr.length && time.length ? calcZoneDistribution(hr, time) : null;
  const powerCurve =
    watts.length && time.length && watts.length === time.length
      ? computePowerCurve(watts, time)
      : [];

  const polylineStr = detail.map?.polyline || detail.map?.summary_polyline || "";
  const polyline = polylineStr ? decodePolyline(polylineStr) : [];

  const result: RideDetail = {
    id: detail.id,
    name: detail.name,
    date: detail.start_date_local,
    type: detail.sport_type ?? detail.type,
    platform: detectPlatform(detail),
    durationMin: Math.round(detail.moving_time / 60),
    distanceKm: Math.round((detail.distance / 1000) * 10) / 10,
    elevationGainM: detail.total_elevation_gain
      ? Math.round(detail.total_elevation_gain)
      : null,
    avgHR: detail.average_heartrate ? Math.round(detail.average_heartrate) : null,
    maxHR: detail.max_heartrate ? Math.round(detail.max_heartrate) : null,
    avgWatts: detail.average_watts ? Math.round(detail.average_watts) : null,
    maxWatts: detail.max_watts ? Math.round(detail.max_watts) : null,
    weightedAvgWatts: detail.weighted_average_watts
      ? Math.round(detail.weighted_average_watts)
      : null,
    kilojoules: detail.kilojoules ? Math.round(detail.kilojoules) : null,
    kudosCount: detail.kudos_count ?? 0,
    photos,
    polyline,
    powerCurve,
    zones,
  };

  await cacheSet(cacheKey, result, 30 * 86400);
  return result;
}
