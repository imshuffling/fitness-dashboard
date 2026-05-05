import { saveTokens } from "@/lib/tokens";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) return new Response(`Strava authorisation failed: ${error}`, { status: 400 });
  if (!code) return new Response("Missing code parameter", { status: 400 });

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    return new Response(`Token exchange failed: ${res.status} ${await res.text()}`, {
      status: 500,
    });
  }

  const t = await res.json();
  await saveTokens({
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at: t.expires_at,
  });

  return Response.redirect(new URL("/", req.url));
}
