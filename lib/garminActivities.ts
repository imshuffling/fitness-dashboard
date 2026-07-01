// Activity data sourced from Garmin Connect, shaped to the surface that
// health.ts / rides.ts previously consumed from Strava. Garmin is the primary
// source now that the Strava API connection is dead. Wellness data lives in
// lib/garmin.ts; this module covers workouts/rides and their time-series.

import { getGarminClient, persistGarminTokens } from "./garmin";
import { cacheGetOrSetSwr } from "./kv";

const GARMIN_API_BASE = "https://connectapi.garmin.com";

/** Garmin activityType.typeKey → the Strava-style type strings the app keys on. */
const TYPE_MAP: Record<string, string> = {
  cycling: "Ride",
  road_biking: "Ride",
  gravel_cycling: "Ride",
  mountain_biking: "Ride",
  cyclocross: "Ride",
  virtual_ride: "VirtualRide",
  indoor_cycling: "VirtualRide",
  e_bike_fitness: "EBikeRide",
  running: "Run",
  treadmill_running: "Run",
  trail_running: "Run",
  indoor_running: "Run",
  walking: "Walk",
  hiking: "Hike",
  lap_swimming: "Swim",
  open_water_swimming: "Swim",
  strength_training: "WeightTraining",
  indoor_cardio: "Workout",
};

function mapType(typeKey: string | undefined): string {
  if (!typeKey) return "Workout";
  if (TYPE_MAP[typeKey]) return TYPE_MAP[typeKey];
  // Fallback: "virtual_ride" → "VirtualRide"
  return typeKey
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

/** Garmin returns local time as "YYYY-MM-DD HH:mm:ss"; normalise to ISO-ish. */
function toIsoLocal(s: string | undefined): string {
  return (s ?? "").replace(" ", "T");
}

/**
 * A Garmin activity mapped onto the Strava-shaped fields the summary loop
 * reads. Keeping the field names identical means health.ts only swaps its
 * import, not its logic.
 */
export type GarminActivity = {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_watts?: number;
  weighted_average_watts?: number;
  max_watts?: number;
  has_heartrate?: boolean;
  total_elevation_gain?: number;
  total_photo_count?: number;
  photo_count?: number;
};

export type StreamSet = {
  time?: { data: number[] };
  heartrate?: { data: number[] };
  watts?: { data: number[] };
  cadence?: { data: number[] };
};

type RawGarminActivity = {
  activityId: number;
  activityName: string;
  activityType?: { typeKey?: string };
  startTimeGMT?: string;
  startTimeLocal?: string;
  elapsedDuration?: number;
  movingDuration?: number;
  duration?: number;
  distance?: number;
  averageHR?: unknown;
  maxHR?: unknown;
  avgPower?: unknown;
  maxPower?: unknown;
  normPower?: unknown;
  elevationGain?: unknown;
  deviceId?: unknown;
};

function mapActivity(a: RawGarminActivity): GarminActivity {
  const type = mapType(a.activityType?.typeKey);
  const avgHR = num(a.averageHR);
  return {
    id: a.activityId,
    name: a.activityName,
    type,
    sport_type: type,
    start_date: toIsoLocal(a.startTimeGMT),
    start_date_local: toIsoLocal(a.startTimeLocal),
    elapsed_time: Math.round(a.elapsedDuration ?? a.duration ?? 0),
    moving_time: Math.round(a.movingDuration ?? a.duration ?? 0),
    distance: a.distance ?? 0,
    average_heartrate: avgHR,
    max_heartrate: num(a.maxHR),
    average_watts: num(a.avgPower),
    weighted_average_watts: num(a.normPower),
    max_watts: num(a.maxPower),
    has_heartrate: (avgHR ?? 0) > 0,
    total_elevation_gain: num(a.elevationGain),
    total_photo_count: 0,
    photo_count: 0,
  };
}

async function fetchActivitiesFresh(days: number, limit: number): Promise<GarminActivity[]> {
  const c = await getGarminClient();
  const raw = (await c.getActivities(0, limit)) as unknown as RawGarminActivity[];
  await persistGarminTokens(c);

  const cutoffMs = Date.now() - days * 86400 * 1000;
  return raw
    .map(mapActivity)
    .filter((a) => {
      const t = Date.parse(a.start_date || a.start_date_local);
      return Number.isFinite(t) ? t >= cutoffMs : true;
    })
    .sort((x, y) => y.start_date_local.localeCompare(x.start_date_local));
}

export async function getActivities(
  opts: { days?: number; per_page?: number } = {},
): Promise<GarminActivity[]> {
  const { days = 30, per_page = 100 } = opts;
  return cacheGetOrSetSwr(
    `garminact:list:v1:${days}:${per_page}`,
    5 * 60,
    () => fetchActivitiesFresh(days, per_page),
  );
}

export async function getMostRecentActivity(): Promise<GarminActivity | null> {
  return cacheGetOrSetSwr("garminact:latest:v1", 5 * 60, async () => {
    const c = await getGarminClient();
    const raw = (await c.getActivities(0, 1)) as unknown as RawGarminActivity[];
    await persistGarminTokens(c);
    return raw[0] ? mapActivity(raw[0]) : null;
  });
}

/* -------------------------------------------------------------------------- */
/* Time-series ("streams"), from the unofficial activity details endpoint.     */
/* -------------------------------------------------------------------------- */

type ActivityDetails = {
  metricDescriptors?: { metricsIndex: number; key: string }[];
  activityDetailMetrics?: { metrics: (number | null)[] }[];
  geoPolylineDTO?: { polyline?: { lat: number; lon: number }[] };
};

async function getDetails(id: number): Promise<ActivityDetails | null> {
  const c = await getGarminClient();
  try {
    const d = await c.get<ActivityDetails>(
      `${GARMIN_API_BASE}/activity-service/activity/${id}/details?maxChartSize=4000&maxPolylineSize=4000`,
    );
    await persistGarminTokens(c);
    return d ?? null;
  } catch (e) {
    console.warn(`[garmin] details ${id} failed:`, (e as Error).message);
    return null;
  }
}

function detailsToStreams(d: ActivityDetails | null): StreamSet {
  const descriptors = d?.metricDescriptors ?? [];
  const samples = d?.activityDetailMetrics ?? [];
  if (!descriptors.length || !samples.length) return {};

  const idx = (key: string) => descriptors.find((m) => m.key === key)?.metricsIndex ?? -1;
  const iTs = idx("directTimestamp");
  const iDur = idx("sumDuration");
  const iHr = idx("directHeartRate");
  const iPow = idx("directPower");
  const iCad = idx("directBikeCadence");

  const time: number[] = [];
  const heartrate: number[] = [];
  const watts: number[] = [];
  const cadence: number[] = [];

  let t0: number | null = null;
  for (const s of samples) {
    const m = s.metrics;
    // Prefer Garmin's own elapsed-seconds channel; fall back to timestamps.
    let sec: number | null = iDur >= 0 && typeof m[iDur] === "number" ? (m[iDur] as number) : null;
    if (sec === null && iTs >= 0 && typeof m[iTs] === "number") {
      const ts = m[iTs] as number;
      if (t0 === null) t0 = ts;
      sec = Math.round((ts - t0) / 1000);
    }
    time.push(sec ?? time.length);
    heartrate.push(iHr >= 0 && typeof m[iHr] === "number" ? (m[iHr] as number) : 0);
    watts.push(iPow >= 0 && typeof m[iPow] === "number" ? (m[iPow] as number) : 0);
    cadence.push(iCad >= 0 && typeof m[iCad] === "number" ? (m[iCad] as number) : 0);
  }

  const out: StreamSet = { time: { data: time } };
  if (heartrate.some((v) => v > 0)) out.heartrate = { data: heartrate };
  if (watts.some((v) => v > 0)) out.watts = { data: watts };
  if (cadence.some((v) => v > 0)) out.cadence = { data: cadence };
  return out;
}

export async function getActivityStreams(id: number): Promise<StreamSet> {
  return detailsToStreams(await getDetails(id));
}

/* -------------------------------------------------------------------------- */
/* Ride detail — richer per-activity fields + GPS track.                       */
/* -------------------------------------------------------------------------- */

export type GarminActivityDetail = GarminActivity & {
  device_name: string;
  polyline: [number, number][];
  kilojoules: number | null;
};

export async function getActivityDetail(id: number): Promise<GarminActivityDetail> {
  const c = await getGarminClient();
  const [summary, details] = await Promise.all([
    c.getActivity({ activityId: id }) as unknown as Promise<RawGarminActivity & Record<string, unknown>>,
    getDetails(id),
  ]);
  await persistGarminTokens(c);

  const base = mapActivity(summary);
  const poly = details?.geoPolylineDTO?.polyline ?? [];
  const polyline: [number, number][] = poly
    .filter((p) => typeof p?.lat === "number" && typeof p?.lon === "number")
    .map((p) => [p.lat, p.lon]);

  // Mechanical work: avg power × moving seconds. (Garmin `calories` is
  // metabolic energy — several times larger — so don't use it here.)
  const kilojoules =
    base.average_watts != null && base.moving_time > 0
      ? Math.round((base.average_watts * base.moving_time) / 1000)
      : null;
  return {
    ...base,
    device_name:
      (summary.deviceId != null ? String(summary.deviceId) : "") +
      " " +
      (summary.activityType?.typeKey ?? ""),
    polyline,
    kilojoules,
  };
}

/* -------------------------------------------------------------------------- */
/* Athlete profile.                                                            */
/* -------------------------------------------------------------------------- */

export type AthleteProfile = { firstname: string; lastname: string; weight?: number; profile?: string };

export async function getAthleteProfile(): Promise<AthleteProfile> {
  return cacheGetOrSetSwr("garminact:athlete:v1", 24 * 3600, async () => {
    const c = await getGarminClient();
    const p = (await c.getUserProfile()) as {
      fullName?: string;
      displayName?: string;
      profileImageUrlMedium?: string;
    };
    await persistGarminTokens(c);
    const full = (p.fullName || p.displayName || "").trim();
    const [firstname, ...rest] = full.split(" ");
    return {
      firstname: firstname || "Athlete",
      lastname: rest.join(" "),
      profile: p.profileImageUrlMedium,
    };
  });
}
