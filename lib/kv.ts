// Cache module — single seam for time-bounded persistence.
// Two adapters live behind it: Upstash Redis (when KV env is set), and a
// local-file store (for dev / unconfigured environments). Callers do not
// know which one is in use.

import { Redis } from "@upstash/redis";
import { after } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

interface CacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  scanDelete(pattern: string): Promise<number>;
}

/* -- Redis adapter -------------------------------------------------------- */

class RedisAdapter implements CacheAdapter {
  constructor(private client: Redis) {}
  async get<T>(key: string): Promise<T | null> {
    return (await this.client.get<T>(key)) ?? null;
  }
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, { ex: ttlSeconds });
  }
  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }
  async scanDelete(pattern: string): Promise<number> {
    let cursor = "0";
    let deleted = 0;
    do {
      const res = (await this.client.scan(cursor, { match: pattern, count: 100 })) as [
        string,
        string[]
      ];
      cursor = res[0];
      if (res[1].length > 0) {
        await this.client.del(...res[1]);
        deleted += res[1].length;
      }
    } while (cursor !== "0");
    return deleted;
  }
}

/* -- File adapter --------------------------------------------------------- */

const FILE_DIR = ".data/cache";

function fileSafe(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function patternToRegex(pattern: string): RegExp {
  // glob-ish: only `*` is supported (matches greedy)
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp("^" + fileSafe(escaped) + "\\.json$");
}

class FileAdapter implements CacheAdapter {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await fs.readFile(path.join(FILE_DIR, fileSafe(key) + ".json"), "utf8");
      const { value, expiresAt } = JSON.parse(raw) as { value: T; expiresAt: number };
      if (expiresAt < Date.now()) return null;
      return value;
    } catch {
      return null;
    }
  }
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await fs.mkdir(FILE_DIR, { recursive: true });
    await fs.writeFile(
      path.join(FILE_DIR, fileSafe(key) + ".json"),
      JSON.stringify({ value, expiresAt: Date.now() + ttlSeconds * 1000 }),
      "utf8"
    );
  }
  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(path.join(FILE_DIR, fileSafe(key) + ".json"));
    } catch {
      // ignore
    }
  }
  async scanDelete(pattern: string): Promise<number> {
    const re = patternToRegex(pattern);
    let deleted = 0;
    try {
      const entries = await fs.readdir(FILE_DIR);
      for (const f of entries) {
        if (re.test(f)) {
          await fs.unlink(path.join(FILE_DIR, f));
          deleted++;
        }
      }
    } catch {
      // dir doesn't exist
    }
    return deleted;
  }
}

/* -- Adapter selection ---------------------------------------------------- */

let _adapter: CacheAdapter | undefined;
let _redis: Redis | null | undefined;

function resolveCreds(): { url: string; token: string } | null {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.REDIS_URL ||
    "";
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.REDIS_TOKEN ||
    "";
  if (!url || !token) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  return { url, token };
}

function redisClient(): Redis | null {
  if (_redis !== undefined) return _redis;
  const creds = resolveCreds();
  if (!creds) {
    _redis = null;
    return null;
  }
  try {
    _redis = new Redis({ url: creds.url, token: creds.token });
  } catch {
    _redis = null;
  }
  return _redis;
}

function adapter(): CacheAdapter {
  if (_adapter) return _adapter;
  const r = redisClient();
  _adapter = r ? new RedisAdapter(r) : new FileAdapter();
  return _adapter;
}

/* -- Public interface ----------------------------------------------------- */

export function cacheGet<T>(key: string): Promise<T | null> {
  return adapter().get<T>(key);
}

export function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  return adapter().set(key, value, ttlSeconds);
}

export function cacheDelete(key: string): Promise<void> {
  return adapter().delete(key);
}

export function cacheScanDelete(pattern: string): Promise<number> {
  return adapter().scanDelete(pattern);
}

export async function cacheGetOrSet<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const hit = await adapter().get<T>(key);
  if (hit !== null) return hit;
  const value = await fn();
  await adapter().set(key, value, ttlSeconds);
  return value;
}

type SwrEntry<T> = { v: T; freshUntil: number };

function isSwrEntry<T>(x: unknown): x is SwrEntry<T> {
  return !!x && typeof x === "object" && "freshUntil" in x && "v" in x;
}

function scheduleRefresh(fn: () => Promise<void>): void {
  try {
    after(fn);
  } catch {
    void fn();
  }
}

/**
 * Stale-while-revalidate: return cached value immediately if present, even if
 * past the freshness window, and refresh in the background. Hard expiry =
 * freshSeconds * graceMultiplier; after that, the next caller pays the fetch.
 */
export async function cacheGetOrSetSwr<T>(
  key: string,
  freshSeconds: number,
  fn: () => Promise<T>,
  graceMultiplier = 6,
): Promise<T> {
  const a = adapter();
  const ttl = freshSeconds * graceMultiplier;
  const hit = await a.get<unknown>(key);

  if (isSwrEntry<T>(hit)) {
    if (hit.freshUntil > Date.now()) return hit.v;
    scheduleRefresh(async () => {
      try {
        const next = await fn();
        await a.set(key, { v: next, freshUntil: Date.now() + freshSeconds * 1000 }, ttl);
      } catch {
        // background refresh failed — keep stale until next attempt
      }
    });
    return hit.v;
  }

  const value = await fn();
  await a.set(key, { v: value, freshUntil: Date.now() + freshSeconds * 1000 }, ttl);
  return value;
}

export function isKvConfigured(): boolean {
  return resolveCreds() !== null;
}

/* -- Test seam: allow tests to inject an in-memory adapter ---------------- */

export function _setAdapterForTests(a: CacheAdapter): void {
  _adapter = a;
}

/* -- Backwards-compat: existing callers still import { redis } ----------- */

export function redis(): Redis | null {
  return redisClient();
}
