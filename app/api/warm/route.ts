import { NextResponse } from "next/server";
import {
  getDailyTile,
  getHRTile,
  getHRVTile,
  getPulseOxTile,
  getSleepTile,
  getStressTile,
  getYesterdaySection,
} from "@/lib/garmin";
import { isGarminConnected } from "@/lib/garminTokens";
import { buildHealthSummary, getLatestActivity } from "@/lib/health";
import { getTrainingLoadTrend, isIntervalsConfigured } from "@/lib/intervals";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new NextResponse("unauthorized", { status: 401 });
    }
  }

  if (!isIntervalsConfigured()) {
    return NextResponse.json({ skipped: "intervals.icu not configured" });
  }

  const tasks: Array<Promise<unknown>> = [
    buildHealthSummary({ days: 90 }).catch((e) => ({ summaryError: (e as Error).message })),
    getLatestActivity().catch((e) => ({ latestError: (e as Error).message })),
    getTrainingLoadTrend(90).catch((e) => ({ intervalsError: (e as Error).message })),
  ];

  if (await isGarminConnected()) {
    tasks.push(
      getSleepTile().catch((e) => ({ sleepError: (e as Error).message })),
      getHRTile().catch((e) => ({ hrError: (e as Error).message })),
      getStressTile().catch((e) => ({ stressError: (e as Error).message })),
      getDailyTile().catch((e) => ({ dailyError: (e as Error).message })),
      getPulseOxTile().catch((e) => ({ pulseOxError: (e as Error).message })),
      getHRVTile().catch((e) => ({ hrvError: (e as Error).message })),
      getYesterdaySection().catch((e) => ({ yesterdayError: (e as Error).message })),
    );
  }

  const results = await Promise.all(tasks);
  const errors = results.filter((r) => r && typeof r === "object" && Object.keys(r).length > 0 && Object.keys(r)[0]?.endsWith("Error"));

  return NextResponse.json({
    warmed: tasks.length,
    errors,
    at: new Date().toISOString(),
  });
}
