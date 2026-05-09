import { cacheDelete, cacheGet, cacheSet } from "./kv";

export type StravaTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

const KEY = "strava:tokens";
// ~10 years — tokens are durable; SDK refreshes before expiry.
const DURABLE_TTL = 10 * 365 * 86400;

export function loadTokens(): Promise<StravaTokens | null> {
  return cacheGet<StravaTokens>(KEY);
}

export async function saveTokens(value: StravaTokens): Promise<void> {
  await cacheSet(KEY, value, DURABLE_TTL);
}

export async function clearTokens(): Promise<void> {
  await cacheDelete(KEY);
}

export async function isConnected(): Promise<boolean> {
  return (await cacheGet<StravaTokens>(KEY)) !== null;
}

export async function getAccessToken(): Promise<string> {
  const t = await loadTokens();
  if (!t) throw new Error("Not connected to Strava");
  if (t.expires_at * 1000 > Date.now() + 60_000) return t.access_token;

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: t.refresh_token,
    }),
  });
  if (!res.ok) throw new Error(`Strava refresh failed: ${res.status} ${await res.text()}`);
  const fresh = (await res.json()) as StravaTokens;
  await saveTokens({
    access_token: fresh.access_token,
    refresh_token: fresh.refresh_token,
    expires_at: fresh.expires_at,
  });
  return fresh.access_token;
}
