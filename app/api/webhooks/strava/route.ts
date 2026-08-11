import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { recordExternalActivity, type ExternalActivityInput } from "@/lib/externalActivities";

export const runtime = "nodejs";

// Receives IFTTT "New activity by you" webhooks (Strava). Body template:
// {"name":"{{ActivityName}}","type":"{{ActivityType}}","date":"{{StartDate}}",
//  "duration":"{{ElapsedTimeInSeconds}}","distance":"{{DistanceMeters}}",
//  "url":"{{LinkToActivity}}"}
// Auth: ?key=<STRAVA_WEBHOOK_SECRET> (IFTTT can't set custom headers).

function keyMatches(provided: string | null, secret: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const secret = process.env.STRAVA_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
  }
  if (!keyMatches(new URL(req.url).searchParams.get("key"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: ExternalActivityInput;
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("json")) {
      body = (await req.json()) as ExternalActivityInput;
    } else {
      // Form fields (urlencoded/multipart) — no-code senders like Make
      // mangle hand-typed JSON, so this is the more robust path.
      const form = await req.formData();
      body = Object.fromEntries(
        [...form.entries()].map(([k, v]) => [k, String(v)]),
      ) as ExternalActivityInput;
    }
  } catch {
    return NextResponse.json({ error: "unparseable body" }, { status: 400 });
  }

  const activity = await recordExternalActivity(body);
  return NextResponse.json({ ok: true, id: activity.id, type: activity.type });
}
