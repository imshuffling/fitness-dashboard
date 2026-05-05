// Access-token module — owns OAuth 2.1 PKCE issuance, validation, and the
// Bearer header check used by /api/* routes. Single concept, single seam.

import { createHash, randomBytes } from "node:crypto";
import { cacheDelete, cacheGet, cacheSet } from "./kv";

// Dynamic Client Registration returns this for everyone — single-user app.
export const CLIENT_ID = "fitness-dashboard-mcp";

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

const codeKey = (code: string) => `oauth:code:${code}`;
const tokenKey = (token: string) => `oauth:token:${token}`;

function sha256base64url(input: string): string {
  return createHash("sha256")
    .update(input)
    .digest("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function verifyPkce(verifier: string, challenge: string, method: string): boolean {
  if (method !== "S256") return false;
  return sha256base64url(verifier) === challenge;
}

export function newToken(): string {
  return randomBytes(32).toString("hex");
}

export async function saveAuthCode(code: string, data: AuthCode): Promise<void> {
  await cacheSet(codeKey(code), data, CODE_TTL);
}

export async function consumeAuthCode(code: string): Promise<AuthCode | null> {
  const data = await cacheGet<AuthCode>(codeKey(code));
  if (data) await cacheDelete(codeKey(code));
  return data;
}

export async function saveAccessToken(token: string, data: AccessToken): Promise<void> {
  await cacheSet(tokenKey(token), data, TOKEN_TTL);
}

export async function isValidAccessToken(token: string): Promise<boolean> {
  // Static fallback: legacy MCP_SECRET_TOKEN, used by curl / Claude Desktop.
  if (process.env.MCP_SECRET_TOKEN && token === process.env.MCP_SECRET_TOKEN) return true;
  const data = await cacheGet<AccessToken>(tokenKey(token));
  return data !== null && data.expires_at > Math.floor(Date.now() / 1000);
}

/* -- Bearer header check (used to live in lib/auth.ts) ------------------- */

function unauthorized(req: Request): Response {
  const url = new URL(req.url);
  const origin = `${url.protocol}//${url.host}`;
  return new Response("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
    },
  });
}

/**
 * Validate the Bearer header on an incoming request. Returns null when the
 * request is authenticated; otherwise returns a 401 Response with the
 * WWW-Authenticate header pointing at the OAuth metadata so MCP clients can
 * discover the auth server.
 */
export async function requireBearer(req: Request): Promise<Response | null> {
  const hdr = req.headers.get("authorization");
  if (!hdr?.toLowerCase().startsWith("bearer ")) return unauthorized(req);
  const token = hdr.slice(7).trim();
  if (!token) return unauthorized(req);
  if (!(await isValidAccessToken(token))) return unauthorized(req);
  return null;
}
