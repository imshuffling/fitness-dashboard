// intervals.icu API client. Docs: https://intervals.icu/api-docs.html
// Auth: HTTP Basic with username "API_KEY" and password = the key from
// https://intervals.icu/settings (API section).

import { cacheGetOrSetSwr } from "./kv";
import { daysAgo, formatTrainingDay, today } from "./trainingDay";

const BASE = "https://intervals.icu/api/v1";

function authHeader(): string {
  const key = process.env.INTERVALS_ICU_API_KEY;
  if (!key) throw new Error("INTERVALS_ICU_API_KEY not configured");
  return "Basic " + Buffer.from(`API_KEY:${key}`).toString("base64");
}

function athleteId(): string {
  return process.env.INTERVALS_ICU_ATHLETE_ID || "0";
}

async function icu<T>(path: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${BASE}${path}`, {
        headers: { Authorization: authHeader(), Accept: "application/json" },
      });
    } catch (err) {
      if (attempt > 0) throw err;
      continue;
    }
    if (res.status >= 500 && attempt === 0) continue;
    if (!res.ok) {
      throw new Error(`intervals.icu ${path} → ${res.status} ${await res.text()}`);
    }
    return res.json();
  }
}

export type IntervalsAthlete = {
  id: string;
  name: string;
  sex?: string;
  city?: string;
  ftp?: number;
  weight?: number | null;
  icu_weight?: number | null;
  profile_medium?: string | null;
  hr_rest?: number;
  threshold_hr?: number;
};

export type IntervalsWellness = {
  id: string; // YYYY-MM-DD
  ctl: number | null; // chronic training load (fitness)
  atl: number | null; // acute training load (fatigue)
  rampRate: number | null;
  ctlLoad: number | null;
  atlLoad: number | null;
  weight: number | null;
  restingHR: number | null;
  hrv: number | null;
  hrvSDNN: number | null;
  sleepSecs: number | null;
  sleepScore: number | null;
  sleepQuality: number | null;
  steps: number | null;
  fatigue: number | null;
  soreness: number | null;
  stress: number | null;
  mood: number | null;
  vo2max: number | null;
  bodyFat: number | null;
  abdomen: number | null;
  comments: string | null;
};

export type IntervalsActivity = {
  id: string;
  start_date_local: string;
  type: string | null;
  name: string | null;
  // "STRAVA"-sourced activities are stubs: the intervals.icu API may not
  // re-expose Strava data, so every field except id/date/source is null.
  source?: string | null;
  strava_id?: number | string | null;
  moving_time: number | null;
  distance: number | null;
  total_elevation_gain: number | null;
  average_heartrate: number | null;
  max_heartrate: number | null;
  icu_average_watts: number | null;
  icu_weighted_avg_watts: number | null;
  icu_joules: number | null;
  calories: number | null;
  device_name: string | null;
  external_id: string | null;
  trainer: boolean | null;
  stream_types: string[] | null;
  icu_training_load: number | null;
  icu_intensity: number | null;
  icu_efficiency_factor: number | null;
  icu_ftp: number | null;
  icu_pm_cp: number | null;
};

/** Numeric Strava activity id this intervals activity was synced from, if any. */
export function stravaIdOf(a: { strava_id?: number | string | null }): number | null {
  const raw = a.strava_id;
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

/** Strava-sourced activities are API-blocked stubs — filter them out. */
function isApiVisible(a: IntervalsActivity): boolean {
  return a.source !== "STRAVA" && a.type != null;
}

export async function getIntervalsAthlete(): Promise<IntervalsAthlete> {
  return icu(`/athlete/${athleteId()}`);
}

export async function getIntervalsWellness(opts: {
  oldest: string; // YYYY-MM-DD
  newest: string; // YYYY-MM-DD
}): Promise<IntervalsWellness[]> {
  const params = new URLSearchParams({ oldest: opts.oldest, newest: opts.newest });
  return icu(`/athlete/${athleteId()}/wellness?${params}`);
}

export async function getIntervalsActivities(opts: {
  oldest: string;
  newest: string;
}): Promise<IntervalsActivity[]> {
  const params = new URLSearchParams({ oldest: opts.oldest, newest: opts.newest });
  return icu(`/athlete/${athleteId()}/activities?${params}`);
}

async function fetchActivitiesForDaysFresh(days: number): Promise<IntervalsActivity[]> {
  const acts = await getIntervalsActivities({
    oldest: formatTrainingDay(daysAgo(days)),
    newest: formatTrainingDay(today()),
  });
  return acts
    .filter(isApiVisible)
    .sort((x, y) => y.start_date_local.localeCompare(x.start_date_local));
}

export async function getIntervalsActivitiesForDays(days: number): Promise<IntervalsActivity[]> {
  return cacheGetOrSetSwr(`intervals:activities:v1:${days}`, 5 * 60, () =>
    fetchActivitiesForDaysFresh(days),
  );
}

export async function getMostRecentIntervalsActivity(): Promise<IntervalsActivity | null> {
  return cacheGetOrSetSwr("intervals:latest:v1", 5 * 60, async () => {
    const acts = await fetchActivitiesForDaysFresh(7);
    return acts[0] ?? null;
  });
}

export type IntervalsStreamSet = {
  time?: { data: number[] };
  heartrate?: { data: number[] };
  watts?: { data: number[] };
  cadence?: { data: number[] };
  velocity_smooth?: { data: number[] };
  // GPS: latitudes in `data`, longitudes in `data2`
  latlng?: { data: number[]; data2: number[] };
};

export async function getIntervalsStreams(
  id: string,
  types: string[],
): Promise<IntervalsStreamSet> {
  const params = new URLSearchParams({ types: types.join(",") });
  const arr = await icu<{ type: string; data: number[] | null; data2?: number[] | null }[]>(
    `/activity/${id}/streams.json?${params}`,
  );
  const out: Record<string, { data: number[]; data2?: number[] }> = {};
  for (const s of arr) {
    if (!s.data) continue;
    out[s.type] = { data: s.data, ...(s.data2 ? { data2: s.data2 } : {}) };
  }
  return out as IntervalsStreamSet;
}

/** CTL = fitness, ATL = fatigue, TSB = form (CTL - ATL). */
export type LoadPoint = { date: string; ctl: number; atl: number; tsb: number };

export async function getTrainingLoadTrend(days = 90): Promise<LoadPoint[]> {
  return cacheGetOrSetSwr(`intervals:load:v2:${days}`, 30 * 60, async () => {
    const wellness = await getIntervalsWellness({
      oldest: formatTrainingDay(daysAgo(days)),
      newest: formatTrainingDay(today()),
    });
    return wellness
      .filter((w) => w.ctl !== null && w.atl !== null)
      .map((w) => ({
        date: w.id,
        ctl: Math.round((w.ctl ?? 0) * 10) / 10,
        atl: Math.round((w.atl ?? 0) * 10) / 10,
        tsb: Math.round(((w.ctl ?? 0) - (w.atl ?? 0)) * 10) / 10,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  });
}

export function isIntervalsConfigured(): boolean {
  return Boolean(process.env.INTERVALS_ICU_API_KEY);
}

export type IntervalsActivityDetail = {
  load: number | null;
  intensity: number | null;
  efficiencyFactor: number | null;
  decoupling: number | null;
  variabilityIndex: number | null;
  eftp: number | null;
  ftpAt: number | null;
  recoveryTime: number | null;
};

export type IntervalsActivityFull = IntervalsActivity & {
  elapsed_time: number | null;
  max_watts: number | null;
  icu_pa_hr: number | null;
  icu_variability_index: number | null;
  icu_eftp: number | null;
  icu_recovery_time: number | null;
};

export async function getIntervalsActivityFull(id: string): Promise<IntervalsActivityFull> {
  return icu(`/activity/${id}`);
}

export function intervalsMetricsFrom(
  raw: Record<string, unknown>,
): IntervalsActivityDetail {
  const num = (k: string): number | null => {
    const v = raw[k];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };
  return {
    load: num("icu_training_load"),
    intensity: num("icu_intensity"),
    efficiencyFactor: num("icu_efficiency_factor"),
    decoupling: num("icu_pa_hr"),
    variabilityIndex: num("icu_variability_index"),
    eftp: num("icu_eftp"),
    ftpAt: num("icu_ftp"),
    recoveryTime: num("icu_recovery_time"),
  };
}
