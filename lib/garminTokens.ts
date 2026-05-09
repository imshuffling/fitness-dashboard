import type { IGarminTokens } from "garmin-connect/dist/garmin/types";
import { cacheDelete, cacheGet, cacheSet } from "./kv";

const KEY = "garmin:tokens";
const DURABLE_TTL = 10 * 365 * 86400;

export function loadGarminTokens(): Promise<IGarminTokens | null> {
  return cacheGet<IGarminTokens>(KEY);
}

export async function saveGarminTokens(value: IGarminTokens): Promise<void> {
  await cacheSet(KEY, value, DURABLE_TTL);
}

export async function clearGarminTokens(): Promise<void> {
  await cacheDelete(KEY);
}

export async function isGarminConnected(): Promise<boolean> {
  return (await cacheGet<IGarminTokens>(KEY)) !== null;
}
