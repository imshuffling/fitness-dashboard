import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { saveAuthCode, CODE_TTL } from "@/lib/oauth";

export const runtime = "nodejs";

// /authorize is gated by proxy.ts dashboard cookie.
// If user reaches here, they're authenticated. Auto-approve and redirect.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = url.searchParams;

  const response_type = params.get("response_type");
  const client_id = params.get("client_id") ?? "";
  const redirect_uri = params.get("redirect_uri") ?? "";
  const code_challenge = params.get("code_challenge") ?? "";
  const code_challenge_method = params.get("code_challenge_method") ?? "";
  const state = params.get("state") ?? "";

  if (response_type !== "code") {
    return new NextResponse("unsupported_response_type", { status: 400 });
  }
  if (!redirect_uri) {
    return new NextResponse("missing redirect_uri", { status: 400 });
  }
  if (!code_challenge || code_challenge_method !== "S256") {
    return new NextResponse("PKCE S256 required", { status: 400 });
  }

  const code = randomBytes(32).toString("hex");
  await saveAuthCode(code, {
    code_challenge,
    code_challenge_method,
    client_id,
    redirect_uri,
    expires_at: Math.floor(Date.now() / 1000) + CODE_TTL,
  });

  const back = new URL(redirect_uri);
  back.searchParams.set("code", code);
  if (state) back.searchParams.set("state", state);
  return NextResponse.redirect(back, 303);
}
