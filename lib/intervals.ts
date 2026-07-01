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
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: authHeader(), Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`intervals.icu ${path} → ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export type IntervalsAthlete = {
  id: string;
  name: string;
  sex?: string;
  city?: string;
  ftp?: number;
  weight?: number;
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
  source: string | null;
  strava_id: string | number | null;
  start_date_local: string;
  type: string;
  name: string;
  moving_time: number;
  icu_training_load: number | null;
  icu_intensity: number | null;
  icu_efficiency_factor: number | null;
  icu_ftp: number | null;
  icu_pm_cp: number | null;
  icu_average_watts: number | null;
  average_heartrate: number | null;
};

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

/** Intervals activity linkage resolved from an activity's local start time. */
export type IntervalsMatch = { intervalsId: string; stravaId: number | null };

/**
 * Garmin/Zwift activities aren't keyed by Garmin id in intervals.icu (the
 * `garmin_id` field is usually null for Zwift-synced rides). But the local
 * start time matches to the second, so link on that. Returns the intervals
 * activity id (for detail lookup) and its `strava_id` (for photo linkage).
 * `source: "STRAVA"` rows are API-blocked stubs — skip them.
 */
export async function findIntervalsActivityByStart(
  startLocalIso: string,
): Promise<IntervalsMatch | null> {
  const day = startLocalIso.slice(0, 10);
  if (!day) return null;
  let acts: IntervalsActivity[];
  try {
    acts = await getIntervalsActivities({ oldest: day, newest: day });
  } catch {
    return null;
  }
  const target = Date.parse(startLocalIso.slice(0, 19));
  let best: IntervalsActivity | null = null;
  let bestDelta = Infinity;
  for (const a of acts) {
    if (a.source === "STRAVA") continue;
    const t = Date.parse((a.start_date_local || "").slice(0, 19));
    if (!Number.isFinite(t)) continue;
    const delta = Math.abs(t - target);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = a;
    }
  }
  if (!best || bestDelta > 120_000) return null; // within 2 minutes
  const sid = best.strava_id != null ? Number(best.strava_id) : NaN;
  return { intervalsId: best.id, stravaId: Number.isFinite(sid) ? sid : null };
}

export async function getIntervalsActivity(
  intervalsId: string,
): Promise<IntervalsActivityDetail | null> {
  try {
    // Correct detail path is /activity/{id}; the old /athlete/{id}/activity/{id}
    // form 404s (silently returned null for months).
    const raw = await icu<Record<string, unknown>>(`/activity/${intervalsId}`);
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
  } catch {
    return null;
  }
}
