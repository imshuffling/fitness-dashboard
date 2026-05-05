import { promises as fs } from "node:fs";
import path from "node:path";
import { redis } from "./kv";

export type StravaTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

const KEY = "strava:tokens";
const DEV_FILE = path.join(process.cwd(), ".data", "tokens.json");

async function readFile(): Promise<StravaTokens | null> {
  try {
    const raw = await fs.readFile(DEV_FILE, "utf8");
    return JSON.parse(raw) as StravaTokens;
  } catch {
    return null;
  }
}

async function writeFile(t: StravaTokens): Promise<void> {
  await fs.mkdir(path.dirname(DEV_FILE), { recursive: true });
  await fs.writeFile(DEV_FILE, JSON.stringify(t, null, 2), "utf8");
}

export async function loadTokens(): Promise<StravaTokens | null> {
  const r = redis();
  if (!r) return readFile();
  return (await r.get<StravaTokens>(KEY)) ?? null;
}

export async function saveTokens(t: StravaTokens): Promise<void> {
  const r = redis();
  if (!r) {
    await writeFile(t);
    return;
  }
  await r.set(KEY, t);
}

export async function clearTokens(): Promise<void> {
  const r = redis();
  if (!r) {
    try {
      await fs.unlink(DEV_FILE);
    } catch {}
    return;
  }
  await r.del(KEY);
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

export async function isConnected(): Promise<boolean> {
  return (await loadTokens()) !== null;
}
