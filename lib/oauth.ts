import { createHash, randomBytes } from "node:crypto";
import { redis } from "./kv";

// Single client (DCR returns this for everyone — single-user app).
export const CLIENT_ID = "fitness-dashboard-mcp";

// In-memory fallback when KV not configured (dev only).
const memCodes = new Map<string, AuthCode>();
const memTokens = new Map<string, AccessToken>();

export type AuthCode = {
  code_challenge: string;
  code_challenge_method: string;
  client_id: string;
  redirect_uri: string;
  expires_at: number;
};

export type AccessToken = {
  client_id: string;
  expires_at: number;
};

export const CODE_TTL = 10 * 60; // 10 min
export const TOKEN_TTL = 60 * 60 * 24 * 365; // 1 year

function sha256base64url(input: string): string {
  return createHash("sha256")
    .update(input)
    .digest("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function verifyPkce(code_verifier: string, code_challenge: string, method: string): boolean {
  if (method !== "S256") return false;
  return sha256base64url(code_verifier) === code_challenge;
}

export function newToken(): string {
  return randomBytes(32).toString("hex");
}

export async function saveAuthCode(code: string, data: AuthCode): Promise<void> {
  const r = redis();
  if (r) {
    await r.set(`oauth:code:${code}`, data, { ex: CODE_TTL });
    return;
  }
  memCodes.set(code, data);
  setTimeout(() => memCodes.delete(code), CODE_TTL * 1000);
}

export async function consumeAuthCode(code: string): Promise<AuthCode | null> {
  const r = redis();
  if (r) {
    const key = `oauth:code:${code}`;
    const data = await r.get<AuthCode>(key);
    if (data) await r.del(key);
    return data ?? null;
  }
  const data = memCodes.get(code) ?? null;
  if (data) memCodes.delete(code);
  return data;
}

export async function saveAccessToken(token: string, data: AccessToken): Promise<void> {
  const r = redis();
  if (r) {
    await r.set(`oauth:token:${token}`, data, { ex: TOKEN_TTL });
    return;
  }
  memTokens.set(token, data);
}

export async function isValidAccessToken(token: string): Promise<boolean> {
  // Allow the static MCP_SECRET_TOKEN as a backwards-compatible bearer.
  if (process.env.MCP_SECRET_TOKEN && token === process.env.MCP_SECRET_TOKEN) return true;
  const r = redis();
  if (r) {
    const data = await r.get<AccessToken>(`oauth:token:${token}`);
    return data !== null && data.expires_at > Math.floor(Date.now() / 1000);
  }
  const mem = memTokens.get(token);
  return mem !== undefined && mem.expires_at > Math.floor(Date.now() / 1000);
}
