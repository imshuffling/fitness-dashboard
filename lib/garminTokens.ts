import { promises as fs } from "node:fs";
import path from "node:path";
import type { IGarminTokens } from "garmin-connect/dist/garmin/types";
import { redis } from "./kv";

const KEY = "garmin:tokens";
const FALLBACK_DIR = ".data";
const FALLBACK_FILE = path.join(FALLBACK_DIR, "garmin-tokens.json");

async function readFallback(): Promise<IGarminTokens | null> {
  try {
    const raw = await fs.readFile(FALLBACK_FILE, "utf8");
    return JSON.parse(raw) as IGarminTokens;
  } catch {
    return null;
  }
}

async function writeFallback(t: IGarminTokens): Promise<void> {
  await fs.mkdir(FALLBACK_DIR, { recursive: true });
  await fs.writeFile(FALLBACK_FILE, JSON.stringify(t, null, 2), "utf8");
}

export async function saveGarminTokens(tokens: IGarminTokens): Promise<void> {
  const r = redis();
  if (r) {
    await r.set(KEY, tokens);
    return;
  }
  await writeFallback(tokens);
}

export async function loadGarminTokens(): Promise<IGarminTokens | null> {
  const r = redis();
  if (r) {
    return (await r.get<IGarminTokens>(KEY)) ?? null;
  }
  return readFallback();
}

export async function clearGarminTokens(): Promise<void> {
  const r = redis();
  if (r) {
    await r.del(KEY);
    return;
  }
  try {
    await fs.unlink(FALLBACK_FILE);
  } catch {
    // ignore
  }
}

export async function isGarminConnected(): Promise<boolean> {
  return (await loadGarminTokens()) !== null;
}
