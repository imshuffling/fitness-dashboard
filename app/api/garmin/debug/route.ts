import { cookies } from "next/headers";
import { GarminConnect } from "garmin-connect";
import { COOKIE_NAME, isValid } from "@/lib/session";
import { isGarminConnected, loadGarminTokens } from "@/lib/garminTokens";
import { formatTrainingDay, parseTrainingDay, today } from "@/lib/trainingDay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  if (!isValid(cookieStore.get(COOKIE_NAME)?.value)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!(await isGarminConnected())) {
    return Response.json({ error: "garmin not connected" }, { status: 400 });
  }

  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? formatTrainingDay(today());

  const tokens = await loadGarminTokens();
  if (!tokens) {
    return Response.json({ error: "no tokens" }, { status: 400 });
  }
  const client = new GarminConnect({ username: "", password: "" });
  client.loadToken(tokens.oauth1, tokens.oauth2);

  let displayName: string | null = null;
  try {
    const profile = (await client.getUserProfile()) as { displayName?: string };
    displayName = profile?.displayName ?? null;
  } catch (e) {
    return Response.json({ error: `profile failed: ${(e as Error).message}` }, { status: 500 });
  }

  const base = "https://connectapi.garmin.com";
  const paths: Record<string, string> = {
    daily: displayName
      ? `${base}/usersummary-service/usersummary/daily/${displayName}?calendarDate=${date}`
      : `${base}/usersummary-service/usersummary/daily?calendarDate=${date}`,
    stress: `${base}/wellness-service/wellness/dailyStress/${date}`,
    bodyBattery: `${base}/wellness-service/wellness/bodyBattery/reports/daily?startDate=${date}&endDate=${date}`,
    hrv: `${base}/hrv-service/hrv/${date}`,
    readiness: `${base}/metrics-service/metrics/trainingreadiness/${date}`,
  };

  type Result = { ok: boolean; status?: number; sample?: unknown; error?: string };
  const results: Record<string, Result> = {};
  for (const [name, path] of Object.entries(paths)) {
    try {
      const data = await client.get<unknown>(path);
      results[name] = { ok: true, sample: summarize(data) };
    } catch (e) {
      results[name] = { ok: false, error: (e as Error).message };
    }
  }

  let sleepResult: Result;
  try {
    const sleep = await client.getSleepData(parseTrainingDay(date));
    sleepResult = { ok: true, sample: summarize(sleep) };
  } catch (e) {
    sleepResult = { ok: false, error: (e as Error).message };
  }

  let hrResult: Result;
  try {
    const hr = await client.getHeartRate(parseTrainingDay(date));
    hrResult = { ok: true, sample: summarize(hr) };
  } catch (e) {
    hrResult = { ok: false, error: (e as Error).message };
  }

  return Response.json({
    date,
    displayName,
    endpoints: { ...results, sleep: sleepResult, heartRate: hrResult },
  });
}

function summarize(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return { _isArray: true, length: data.length, first: data[0] ? topKeys(data[0]) : null };
  }
  if (typeof data === "object") return topKeys(data);
  return data;
}

function topKeys(obj: unknown): Record<string, unknown> {
  if (typeof obj !== "object" || obj === null) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v === null || v === undefined) {
      out[k] = v;
    } else if (Array.isArray(v)) {
      out[k] = `[Array length=${v.length}]`;
    } else if (typeof v === "object") {
      out[k] = `[Object keys=${Object.keys(v as Record<string, unknown>).length}]`;
    } else {
      out[k] = v;
    }
  }
  return out;
}
