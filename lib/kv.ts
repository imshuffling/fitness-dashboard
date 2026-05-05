import { Redis } from "@upstash/redis";

let _redis: Redis | null | undefined; // undefined = uninitialised, null = no creds

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
  // Must be HTTPS REST URL, not redis://
  if (!/^https?:\/\//i.test(url)) return null;
  return { url, token };
}

export function redis(): Redis | null {
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

export function isKvConfigured(): boolean {
  return resolveCreds() !== null;
}
