import { NextResponse } from "next/server";
import {
  consumeAuthCode,
  newToken,
  saveAccessToken,
  TOKEN_TTL,
  verifyPkce,
} from "@/lib/oauth";

export const runtime = "nodejs";

function err(error: string, description?: string, status = 400) {
  return NextResponse.json(
    { error, ...(description ? { error_description: description } : {}) },
    { status }
  );
}

export async function POST(req: Request) {
  let params: URLSearchParams;
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    params = new URLSearchParams(text);
  } else if (ct.includes("application/json")) {
    const json = (await req.json()) as Record<string, string>;
    params = new URLSearchParams(json);
  } else {
    const text = await req.text();
    params = new URLSearchParams(text);
  }

  const grant_type = params.get("grant_type");
  if (grant_type !== "authorization_code") {
    return err("unsupported_grant_type");
  }

  const code = params.get("code") ?? "";
  const redirect_uri = params.get("redirect_uri") ?? "";
  const code_verifier = params.get("code_verifier") ?? "";

  if (!code || !code_verifier) return err("invalid_request");

  const stored = await consumeAuthCode(code);
  if (!stored) return err("invalid_grant", "code expired or unknown");
  if (stored.redirect_uri !== redirect_uri) return err("invalid_grant", "redirect_uri mismatch");
  if (!verifyPkce(code_verifier, stored.code_challenge, stored.code_challenge_method)) {
    return err("invalid_grant", "PKCE verification failed");
  }

  const access_token = newToken();
  const expires_at = Math.floor(Date.now() / 1000) + TOKEN_TTL;
  await saveAccessToken(access_token, { client_id: stored.client_id, expires_at });

  return NextResponse.json({
    access_token,
    token_type: "Bearer",
    expires_in: TOKEN_TTL,
    scope: "mcp",
  });
}
