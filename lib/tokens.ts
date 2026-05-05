import { createTokenStore } from "./tokenStore";

export type StravaTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

const store = createTokenStore<StravaTokens>({ kvKey: "strava:tokens" });

export const loadTokens = store.load;
export const saveTokens = store.save;
export const clearTokens = store.clear;
export const isConnected = store.isPresent;

export async function getAccessToken(): Promise<string> {
  const t = await store.load();
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
  await store.save({
    access_token: fresh.access_token,
    refresh_token: fresh.refresh_token,
    expires_at: fresh.expires_at,
  });
  return fresh.access_token;
}
