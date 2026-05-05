// Token-store module — generic durable storage for OAuth-style credentials.
// Two adapters live behind it (Strava, Garmin) — same shape, different
// payload types. Persistence is delegated to the Cache module so the file
// fallback / Redis selection happens in exactly one place.

import { cacheDelete, cacheGet, cacheSet } from "./kv";

// ~10 years. Tokens are durable state; we lean on the SDK to refresh them
// before they expire. The TTL exists only to satisfy the Cache interface.
const DURABLE_TTL = 10 * 365 * 86400;

export type TokenStore<T> = {
  load(): Promise<T | null>;
  save(value: T): Promise<void>;
  clear(): Promise<void>;
  isPresent(): Promise<boolean>;
};

export function createTokenStore<T>(opts: { kvKey: string }): TokenStore<T> {
  const { kvKey } = opts;
  return {
    load() {
      return cacheGet<T>(kvKey);
    },
    async save(value) {
      await cacheSet(kvKey, value, DURABLE_TTL);
    },
    async clear() {
      await cacheDelete(kvKey);
    },
    async isPresent() {
      return (await cacheGet<T>(kvKey)) !== null;
    },
  };
}
