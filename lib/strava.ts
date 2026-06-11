// Strava is photos-only: activity data comes from intervals.icu (lib/intervals.ts).
// Strava has no free-tier API access for anything beyond the athlete's own
// uploaded media, so every call here must be best-effort for callers.

import { getAccessToken } from "./tokens";

const BASE = "https://www.strava.com/api/v3";

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

export async function getActivityPhotos(id: number, size = 1024): Promise<StravaPhoto[]> {
  return stravaFetch<StravaPhoto[]>(`/activities/${id}/photos`, {
    size,
    photo_sources: "true",
  });
}
