// Activities pushed in from outside Garmin (IFTTT Strava webhook). Summary-only
// — no streams, no HR zones. Stored as a single KV list and merged into the
// Garmin feed, deduping anything Garmin already has (Zwift rides reach both).

import { cacheGet, cacheScanDelete, cacheSet } from "./kv";
import { getActivities, type GarminActivity } from "./garminActivities";

const KEY = "extacts:v1";
const TTL = 2 * 365 * 86400;
const MAX_ENTRIES = 500;
/** Garmin activity starting within this window of an external one = same workout. */
const DEDUP_WINDOW_MS = 20 * 60 * 1000;

export type ExternalActivity = GarminActivity & { external_url?: string };

export type ExternalActivityInput = {
  name?: string;
  type?: string;
  date?: string;
  duration?: string | number;
  distance?: string | number;
  url?: string;
};

const toNum = (v: string | number | undefined): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = parseFloat(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** IFTTT sends dates like "August 11, 2026 at 07:53PM"; also accept ISO. */
function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  for (const candidate of [
    s,
    s.replace(" at ", " ").replace(/(\d)(AM|PM)$/i, "$1 $2"),
  ]) {
    const d = new Date(candidate);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function toIsoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Strava sport types arrive as-is; normalise the odd spaced variant. */
function normaliseType(t: string | undefined): string {
  const s = (t ?? "").replace(/\s+/g, "");
  return s || "Workout";
}

export function shapeExternalActivity(input: ExternalActivityInput): ExternalActivity {
  const date = parseDate(input.date) ?? new Date();
  const idFromUrl = /\/activities\/(\d+)/.exec(input.url ?? "")?.[1];
  const id = idFromUrl ? Number(idFromUrl) : Math.floor(date.getTime() / 1000);
  const type = normaliseType(input.type);
  const duration = Math.round(toNum(input.duration));
  return {
    id,
    name: (input.name ?? "").trim() || type,
    type,
    sport_type: type,
    start_date: toIsoLocal(date),
    start_date_local: toIsoLocal(date),
    elapsed_time: duration,
    moving_time: duration,
    distance: toNum(input.distance),
    has_heartrate: false,
    total_photo_count: 0,
    photo_count: 0,
    external_url: input.url || undefined,
  };
}

export async function recordExternalActivity(input: ExternalActivityInput): Promise<ExternalActivity> {
  const activity = shapeExternalActivity(input);
  const list = (await cacheGet<ExternalActivity[]>(KEY)) ?? [];
  const next = [activity, ...list.filter((a) => a.id !== activity.id)]
    .sort((x, y) => y.start_date_local.localeCompare(x.start_date_local))
    .slice(0, MAX_ENTRIES);
  await cacheSet(KEY, next, TTL);
  // Drop cached summaries so the new workout appears without waiting out SWR.
  await cacheScanDelete("summary:v7:*");
  return activity;
}

export async function getExternalActivities(days: number): Promise<ExternalActivity[]> {
  const list = (await cacheGet<ExternalActivity[]>(KEY)) ?? [];
  const cutoffMs = Date.now() - days * 86400 * 1000;
  return list.filter((a) => {
    const t = Date.parse(a.start_date_local);
    return Number.isFinite(t) ? t >= cutoffMs : true;
  });
}

/**
 * Garmin activities plus external ones Garmin doesn't know about. An external
 * activity starting within 20 minutes of a Garmin one is the same workout
 * seen twice (Zwift syncs to both) — the Garmin copy wins, it has streams.
 */
export async function getMergedActivities(
  opts: { days?: number; per_page?: number } = {},
): Promise<ExternalActivity[]> {
  const { days = 30 } = opts;
  const [garmin, external] = await Promise.all([
    getActivities(opts),
    getExternalActivities(days).catch(() => [] as ExternalActivity[]),
  ]);
  const garminStarts = garmin.map((a) => Date.parse(a.start_date_local));
  const extra = external.filter((e) => {
    const t = Date.parse(e.start_date_local);
    return !garminStarts.some((g) => Math.abs(g - t) < DEDUP_WINDOW_MS);
  });
  return [...garmin, ...extra].sort((x, y) =>
    y.start_date_local.localeCompare(x.start_date_local),
  );
}
