import { getAccessToken } from "./tokens";

const BASE = "https://www.strava.com/api/v3";

export type StravaActivity = {
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
  device_watts?: boolean;
  has_heartrate?: boolean;
  total_elevation_gain?: number;
  total_photo_count?: number;
  photo_count?: number;
};

export type StravaPhoto = {
  id?: number | string;
  unique_id?: string;
  activity_id?: number;
  urls: Record<string, string>;
  caption?: string | null;
  created_at?: string;
  // Strava uses `type` for media kind: 1 = photo, 2 = video
  type?: number;
  video_url?: string;
  duration?: number;
};

export function isVideoPhoto(p: StravaPhoto): boolean {
  return p.type === 2 || Boolean(p.video_url);
}

export function videoSrc(p: StravaPhoto): string | null {
  return p.video_url ?? null;
}

export type StravaAthlete = {
  id: number;
  firstname: string;
  lastname: string;
  weight?: number;
  profile?: string;
  profile_medium?: string;
};

export type StreamSet = {
  time?: { data: number[] };
  heartrate?: { data: number[] };
  watts?: { data: number[] };
  cadence?: { data: number[] };
  velocity_smooth?: { data: number[] };
};

async function stravaFetch<T>(pathname: string, params?: Record<string, string | number>): Promise<T> {
  const token = await getAccessToken();
  const qs = params
    ? "?" +
      new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString()
    : "";
  const url = `${BASE}${pathname}${qs}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after") ?? 15);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`Strava ${pathname} ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  }
  throw new Error(`Strava ${pathname} rate limited after retries`);
}

export async function getAthleteProfile(): Promise<StravaAthlete> {
  return stravaFetch<StravaAthlete>("/athlete");
}

export async function getActivities(opts: { days?: number; per_page?: number } = {}): Promise<StravaActivity[]> {
  const { days = 30, per_page = 100 } = opts;
  const after = Math.floor((Date.now() - days * 86400 * 1000) / 1000);
  const out: StravaActivity[] = [];
  let page = 1;
  while (true) {
    const batch = await stravaFetch<StravaActivity[]>("/athlete/activities", {
      after,
      per_page,
      page,
    });
    out.push(...batch);
    if (batch.length < per_page) break;
    page++;
    if (page > 5) break;
  }
  return out;
}

export async function getActivityStreams(
  id: number,
  keys: string[] = ["heartrate", "watts", "time", "cadence"]
): Promise<StreamSet> {
  const arr = await stravaFetch<{ type: string; data: number[] }[]>(
    `/activities/${id}/streams`,
    { keys: keys.join(","), key_by_type: "true" } as Record<string, string>
  );
  // when key_by_type=true Strava returns an object keyed by type
  return arr as unknown as StreamSet;
}

export async function getActivityDetail(id: number): Promise<StravaActivity & Record<string, unknown>> {
  return stravaFetch(`/activities/${id}`);
}

export async function getActivityPhotos(id: number, size = 1024): Promise<StravaPhoto[]> {
  return stravaFetch<StravaPhoto[]>(`/activities/${id}/photos`, {
    size,
    photo_sources: "true",
  });
}
